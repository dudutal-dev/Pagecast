/**
 * Splits narration text into sentences with character offsets. Used for
 * transcript highlighting (alignment mapping) and for chunking long scripts.
 * Hebrew has no capitalization cue, so we rely on terminal punctuation and
 * blank lines only. Abbreviations like ד"ר or א. (initials) are left alone
 * because the split requires whitespace or end-of-text after the punctuation.
 */
export interface Sentence {
  /** Sentence text, trimmed. */
  text: string;
  /** Start offset in the source text (inclusive). */
  start: number;
  /** End offset in the source text (exclusive). */
  end: number;
  /** Index of the paragraph the sentence belongs to (0-based). */
  paragraph: number;
}

/** Strips ElevenLabs v3 expression tags like [pause], [warm] for display/alignment. */
export function stripExpressionTags(text: string): string {
  return text.replace(/\[[a-z][a-z _-]{0,24}\]/gi, "");
}

const TERMINAL = /[.!?…]+["'”’)]*(?=\s|$)/g;

export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  let paragraph = 0;
  let cursor = 0;

  // Walk paragraphs separated by blank lines, keeping absolute offsets.
  const paraRe = /[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g;
  let pm: RegExpExecArray | null;
  while ((pm = paraRe.exec(text)) !== null) {
    const pStart = pm.index;
    const pText = pm[0];
    if (!pText.trim()) continue;
    let segStart = 0;
    TERMINAL.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TERMINAL.exec(pText)) !== null) {
      const segEnd = m.index + m[0].length;
      push(pText, segStart, segEnd, pStart, paragraph, out);
      segStart = segEnd;
    }
    if (segStart < pText.length)
      push(pText, segStart, pText.length, pStart, paragraph, out);
    paragraph++;
    cursor = pStart + pText.length;
  }
  void cursor;
  return out;
}

function push(
  pText: string,
  s: number,
  e: number,
  base: number,
  paragraph: number,
  out: Sentence[],
) {
  const raw = pText.slice(s, e);
  const leading = raw.length - raw.trimStart().length;
  const trailing = raw.length - raw.trimEnd().length;
  const text = raw.trim();
  if (!text) return;
  out.push({ text, start: base + s + leading, end: base + e - trailing, paragraph });
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
