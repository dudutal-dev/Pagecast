import { describe, expect, it } from "vitest";
import { coverage } from "@/server/services/narration/produce";
import { chunkText, MAX_CHUNK_CHARS } from "@/lib/narration/chunk";

describe("coverage", () => {
  const chars = (s: string) => ({ characters: Array.from(s) });

  it("is 1 when the provider spoke everything", () => {
    const t = "שלום עולם. מה נשמע?";
    expect(coverage(t, chars(t))).toBe(1);
  });

  it("ignores whitespace differences", () => {
    const t = "שלום עולם.";
    expect(coverage(t, chars("שלוםעולם."))).toBe(1);
  });

  it("detects a truncated take", () => {
    const t = "א".repeat(1000);
    expect(coverage(t, chars("א".repeat(540)))).toBeCloseTo(0.54, 2);
  });

  it("returns 1 when there is no alignment to judge by", () => {
    expect(coverage("abc", null)).toBe(1);
    expect(coverage("abc", { characters: [] })).toBe(1);
  });
});

describe("chunk sizing guards the provider's ~200s ceiling", () => {
  it("keeps every chunk under ~145 seconds of Hebrew narration", () => {
    // 11.7 chars/sec measured on produced episodes.
    expect(MAX_CHUNK_CHARS / 11.7).toBeLessThan(150);
  });

  it("splits a full-length episode into balanced chunks", () => {
    const para = "זה משפט באורך רגיל שנגמר בנקודה. ".repeat(8).trim();
    const text = Array.from({ length: 18 }, () => para).join("\n\n"); // ~4,700 chars
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
    const sizes = chunks.map((c) => c.text.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(MAX_CHUNK_CHARS * 0.75);
    expect(chunks.map((c) => c.text).join("\n\n")).toBe(text);
  });

  it("halving a chunk produces more than one piece (the truncation retry path)", () => {
    const text = Array.from({ length: 6 }, () =>
      "משפט לדוגמה שנגמר בנקודה. ".repeat(6).trim(),
    ).join("\n\n");
    expect(chunkText(text, Math.ceil(text.length / 2)).length).toBeGreaterThan(1);
  });
});
