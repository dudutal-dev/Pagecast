import { describe, expect, it } from "vitest";
import {
  splitSentences,
  stripExpressionTags,
  countWords,
} from "@/lib/narration/sentences";
import {
  buildSentenceAlignment,
  estimateAlignment,
  findActiveSentence,
} from "@/lib/narration/alignment";
import { parseRange } from "@/lib/httpRange";
import { parseBlocks } from "@/lib/markdown";

describe("splitSentences", () => {
  it("splits on terminal punctuation and keeps offsets", () => {
    const text = "שלום עולם. מה שלומך? טוב!";
    const s = splitSentences(text);
    expect(s.map((x) => x.text)).toEqual(["שלום עולם.", "מה שלומך?", "טוב!"]);
    expect(text.slice(s[1]!.start, s[1]!.end)).toBe("מה שלומך?");
    expect(s.every((x) => x.paragraph === 0)).toBe(true);
  });

  it("treats blank lines as boundaries and numbers paragraphs", () => {
    const s = splitSentences("פסקה ראשונה בלי נקודה\n\nפסקה שנייה. עוד משפט");
    expect(s.map((x) => x.text)).toEqual([
      "פסקה ראשונה בלי נקודה",
      "פסקה שנייה.",
      "עוד משפט",
    ]);
    expect(s.map((x) => x.paragraph)).toEqual([0, 1, 1]);
  });

  it("does not split on abbreviation dots without trailing space", () => {
    const s = splitSentences('ד"ר כהן אמר 1.5 דברים. סוף.');
    expect(s).toHaveLength(2);
  });

  it("handles ellipsis and closing quotes", () => {
    const s = splitSentences('הוא אמר "כן." ואז הלך… נגמר.');
    expect(s.map((x) => x.text)).toEqual(['הוא אמר "כן."', "ואז הלך…", "נגמר."]);
  });

  it("strips expression tags", () => {
    expect(stripExpressionTags("[pause] שלום [warm] עולם [thoughtful]")).toBe(
      " שלום  עולם ",
    );
    expect(countWords("  א  ב ג ")).toBe(3);
  });
});

describe("alignment", () => {
  it("estimates proportionally to word count and is gap-free", () => {
    const a = estimateAlignment("אחת שתיים שלוש. ארבע.", 10);
    expect(a).toHaveLength(2);
    expect(a[0]!.start).toBe(0);
    expect(a[0]!.end).toBeCloseTo(a[1]!.start);
    expect(a[1]!.end).toBeCloseTo(10);
    expect(a[0]!.end).toBeGreaterThan(a[1]!.end - a[1]!.start);
  });

  it("maps character timestamps to sentences across chunks with offsets", () => {
    const t1 = "אב. גד.";
    const chars1 = Array.from(t1);
    const align1 = {
      characters: chars1,
      startTimes: chars1.map((_, i) => i),
      endTimes: chars1.map((_, i) => i + 1),
    };
    const t2 = "הו.";
    const chars2 = Array.from(t2);
    const align2 = {
      characters: chars2,
      startTimes: chars2.map((_, i) => i * 2),
      endTimes: chars2.map((_, i) => i * 2 + 2),
    };
    const out = buildSentenceAlignment([
      { text: t1, alignment: align1, offsetSec: 0, durationSec: 7 },
      { text: t2, alignment: align2, offsetSec: 7, durationSec: 6 },
    ]);
    expect(out.map((s) => s.text)).toEqual(["אב.", "גד.", "הו."]);
    expect(out[0]!.start).toBe(0);
    expect(out[1]!.start).toBe(4); // char index of ג after skipping the space
    expect(out[2]!.start).toBe(7);
  });

  it("falls back to estimation for chunks without alignment", () => {
    const out = buildSentenceAlignment([
      { text: "א ב. ג ד.", alignment: null, offsetSec: 3, durationSec: 4 },
    ]);
    expect(out[0]!.start).toBe(3);
    expect(out[1]!.end).toBeCloseTo(7);
  });

  it("finds the active sentence by binary search", () => {
    const a = [
      { start: 0, end: 2, text: "a" },
      { start: 2, end: 5, text: "b" },
      { start: 5, end: 9, text: "c" },
    ];
    expect(findActiveSentence(a, -1)).toBe(-1);
    expect(findActiveSentence(a, 0)).toBe(0);
    expect(findActiveSentence(a, 2.5)).toBe(1);
    expect(findActiveSentence(a, 100)).toBe(2);
  });
});

describe("parseRange", () => {
  it("parses open, closed and suffix ranges", () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange("bytes=0-", 100)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=10-19", 100)).toEqual({ start: 10, end: 19 });
    expect(parseRange("bytes=90-500", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=100-", 100)).toBe("unsatisfiable");
    expect(parseRange("bytes=5-2", 100)).toBe("unsatisfiable");
    expect(parseRange("items=1-2", 100)).toBeNull();
  });
});

describe("markdown parseBlocks", () => {
  it("parses paragraphs, headings and lists", () => {
    const blocks = parseBlocks(
      "**המסר:** משהו\n\n## כותרת\n\n1. אחד\n2. שתיים\n\n- נקודה\n- עוד\n\nפסקה\nהמשך",
    );
    expect(blocks.map((b) => b.type)).toEqual(["p", "h", "ol", "ul", "p"]);
    expect(blocks[2]).toEqual({ type: "ol", items: ["אחד", "שתיים"] });
    expect((blocks[4] as { text: string }).text).toBe("פסקה\nהמשך");
  });
});
