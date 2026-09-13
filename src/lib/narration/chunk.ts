import { splitSentences } from "./sentences";

export const MAX_CHUNK_CHARS = 4000;

export interface Chunk {
  index: number;
  text: string;
}

/**
 * Splits text into TTS requests of at most `maxChars`, preferring paragraph
 * boundaries, then sentence boundaries. Never splits inside a sentence unless a
 * single sentence exceeds the limit (then it is hard-split on whitespace).
 */
export function chunkText(text: string, maxChars = MAX_CHUNK_CHARS): Chunk[] {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let cur = "";
  const flush = () => {
    if (cur.trim()) chunks.push(cur.trim());
    cur = "";
  };
  const append = (piece: string) => {
    if (!cur) cur = piece;
    else if (cur.length + 2 + piece.length <= maxChars) cur = `${cur}\n\n${piece}`;
    else {
      flush();
      cur = piece;
    }
  };

  for (const p of paragraphs) {
    if (p.length <= maxChars) {
      append(p);
      continue;
    }
    // Paragraph too long: pack sentences.
    let buf = "";
    for (const s of splitSentences(p)) {
      const piece = s.text;
      if (piece.length > maxChars) {
        if (buf) append(buf);
        buf = "";
        for (const hard of hardSplit(piece, maxChars)) append(hard);
        continue;
      }
      if (!buf) buf = piece;
      else if (buf.length + 1 + piece.length <= maxChars) buf = `${buf} ${piece}`;
      else {
        append(buf);
        buf = piece;
      }
    }
    if (buf) append(buf);
  }
  flush();
  return chunks.map((text, index) => ({ index, text }));
}

function hardSplit(s: string, maxChars: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of s.split(/\s+/)) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += ` ${w}`;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}
