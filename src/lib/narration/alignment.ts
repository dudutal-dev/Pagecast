import { countWords, splitSentences, type Sentence } from "./sentences";

/** Per-sentence timing stored with an audio asset. */
export interface SentenceAlignment {
  start: number;
  end: number;
  text: string;
}

/**
 * ElevenLabs `with-timestamps` character alignment for ONE synthesized chunk:
 * parallel arrays of characters and their start/end times (seconds).
 */
export interface CharAlignment {
  characters: string[];
  startTimes: number[];
  endTimes: number[];
}

/**
 * Builds sentence timings from character alignments of consecutive chunks.
 * `chunks[i].text` is exactly what was sent to TTS for chunk i (post-preprocess);
 * `chunks[i].offsetSec` is where that chunk starts in the stitched file.
 * Characters are matched positionally after collapsing whitespace, which is
 * robust to the provider trimming or normalizing spaces.
 */
export function buildSentenceAlignment(
  chunks: {
    text: string;
    alignment: CharAlignment | null;
    offsetSec: number;
    durationSec: number;
  }[],
): SentenceAlignment[] {
  const out: SentenceAlignment[] = [];
  for (const chunk of chunks) {
    const sentences = splitSentences(chunk.text);
    if (!chunk.alignment || chunk.alignment.characters.length === 0) {
      out.push(...estimateForSentences(sentences, chunk.offsetSec, chunk.durationSec));
      continue;
    }
    // Map: index in "non-space text" -> time
    const starts: number[] = [];
    const ends: number[] = [];
    chunk.alignment.characters.forEach((ch, i) => {
      if (/\s/.test(ch)) return;
      starts.push(chunk.alignment!.startTimes[i] ?? 0);
      ends.push(chunk.alignment!.endTimes[i] ?? starts[starts.length - 1] ?? 0);
    });
    // Walk the source text, counting non-space characters to find each sentence's span.
    let nonSpaceBefore = 0;
    let cursor = 0;
    for (const s of sentences) {
      for (let i = cursor; i < s.start; i++)
        if (!/\s/.test(chunk.text[i]!)) nonSpaceBefore++;
      const len = s.text.replace(/\s/g, "").length;
      const a = Math.min(nonSpaceBefore, starts.length - 1);
      const b = Math.min(nonSpaceBefore + len - 1, ends.length - 1);
      const start = starts[a] ?? 0;
      const end = ends[b] ?? start;
      out.push({
        start: chunk.offsetSec + start,
        end: chunk.offsetSec + Math.max(end, start),
        text: s.text,
      });
      nonSpaceBefore += len;
      cursor = s.end;
    }
  }
  return smooth(out);
}

/** Word-count proportional estimate when no alignment exists ("בערך"). */
export function estimateAlignment(
  text: string,
  durationSec: number,
): SentenceAlignment[] {
  return smooth(estimateForSentences(splitSentences(text), 0, durationSec));
}

function estimateForSentences(
  sentences: Sentence[],
  offsetSec: number,
  durationSec: number,
): SentenceAlignment[] {
  const weights = sentences.map((s) => countWords(s.text) + 0.5);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let t = offsetSec;
  return sentences.map((s, i) => {
    const d = (weights[i]! / total) * durationSec;
    const item = { start: t, end: t + d, text: s.text };
    t += d;
    return item;
  });
}

/** Ensures monotonic, gap-free ranges so the highlight never "flickers off". */
function smooth(items: SentenceAlignment[]): SentenceAlignment[] {
  for (let i = 0; i < items.length; i++) {
    const cur = items[i]!;
    const next = items[i + 1];
    if (next && next.start > cur.end) cur.end = next.start;
    if (next && next.start < cur.start) next.start = cur.start;
    if (cur.end < cur.start) cur.end = cur.start;
  }
  return items;
}

/** Binary search for the sentence active at `t`. Returns -1 before the first. */
export function findActiveSentence(alignment: SentenceAlignment[], t: number): number {
  let lo = 0;
  let hi = alignment.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (alignment[mid]!.start <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}
