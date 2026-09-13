import { describe, expect, it } from "vitest";
import {
  countMasculine,
  numberToHebrew,
  yearToHebrew,
} from "@/lib/narration/hebrewNumbers";
import { preprocessForTts } from "@/lib/narration/preprocess";
import { chunkText } from "@/lib/narration/chunk";

describe("numberToHebrew", () => {
  it("handles units, teens, tens, hundreds", () => {
    expect(numberToHebrew(0)).toBe("אפס");
    expect(numberToHebrew(1)).toBe("אחת");
    expect(numberToHebrew(12)).toBe("שתים עשרה");
    expect(numberToHebrew(20)).toBe("עשרים");
    expect(numberToHebrew(46)).toBe("ארבעים ושש");
    expect(numberToHebrew(100)).toBe("מאה");
    expect(numberToHebrew(200)).toBe("מאתיים");
    expect(numberToHebrew(123)).toBe("מאה עשרים ושלוש");
    expect(numberToHebrew(120)).toBe("מאה ועשרים");
  });
  it("handles thousands with the construct form", () => {
    expect(numberToHebrew(1000)).toBe("אלף");
    expect(numberToHebrew(2000)).toBe("אלפיים");
    expect(numberToHebrew(3000)).toBe("שלושת אלפים");
    expect(numberToHebrew(10000)).toBe("עשרת אלפים");
    expect(numberToHebrew(15000)).toBe("חמישה עשר אלף");
    expect(numberToHebrew(100000)).toBe("מאה אלף");
    expect(numberToHebrew(1500)).toBe("אלף וחמש מאות");
  });
  it("handles millions and masculine", () => {
    expect(numberToHebrew(1000000)).toBe("מיליון");
    expect(numberToHebrew(50000000)).toBe("חמישים מיליון");
    expect(numberToHebrew(3, "m")).toBe("שלושה");
    expect(numberToHebrew(12, "m")).toBe("שנים עשר");
  });
  it("reads years naturally", () => {
    expect(yearToHebrew(1946)).toBe("אלף תשע מאות ארבעים ושש");
    expect(yearToHebrew(2018)).toBe("אלפיים ושמונה עשרה");
    expect(yearToHebrew(2000)).toBe("אלפיים");
  });
  it("counts masculine nouns", () => {
    expect(countMasculine(1, "אחוז", "אחוזים")).toBe("אחוז אחד");
    expect(countMasculine(2, "אחוז", "אחוזים")).toBe("שני אחוזים");
    expect(countMasculine(10, "שקל", "שקלים")).toBe("עשרה שקלים");
  });
});

describe("preprocessForTts", () => {
  const v3 = { model: "eleven_v3" as const };
  const v2 = { model: "eleven_multilingual_v2" as const };

  it("spells numbers, percents, currency and years", () => {
    expect(preprocessForTts("הספר יצא ב-1946 ונמכר ב-10,000 עותקים.", v3)).toBe(
      "הספר יצא באלף תשע מאות ארבעים ושש ונמכר בעשרת אלפים עותקים.",
    );
    expect(preprocessForTts("רק 1% מהאנשים, וזה עלה 50$.", v3)).toBe(
      "רק אחוז אחד מהאנשים, וזה עלה חמישים דולרים.",
    );
    expect(preprocessForTts("₪120 לחודש", v3)).toBe("מאה ועשרים שקלים לחודש");
  });

  it("expands acronyms and softens dashes and markdown", () => {
    expect(preprocessForTts('ד"ר כהן — רו"ח **מוכר** — אמר.', v3)).toBe(
      "דוקטור כהן, רואה חשבון מוכר, אמר.",
    );
  });

  it("handles decimals, ranges and times", () => {
    expect(preprocessForTts("בין 3-5 שעות, בערך 1.5 ליטר, ב-8:30", v3)).toBe(
      "בין שלוש עד חמש שעות, בערך אחת נקודה חמש ליטר, בשמונה ושלושים",
    );
  });

  it("keeps expression tags for v3 and converts them for v2", () => {
    const src = "[warm] שלום.\n\n[pause] עוד משפט [softly] בסוף.";
    expect(preprocessForTts(src, v3)).toContain("[warm]");
    const out = preprocessForTts(src, v2);
    expect(out).not.toMatch(/\[[a-z]+\]/);
    expect(out).toContain("…");
  });

  it("removes section labels and bullets", () => {
    const out = preprocessForTts("[אינטרו · 20–40 שנ']\n- נקודה אחת\n## כותרת\nטקסט", v3);
    expect(out).toBe("נקודה אחת\nכותרת\nטקסט");
  });
});

describe("chunkText", () => {
  it("returns one chunk for short text", () => {
    expect(chunkText("א. ב.\n\nג.")).toEqual([{ index: 0, text: "א. ב.\n\nג." }]);
  });
  it("packs paragraphs up to the limit without splitting sentences", () => {
    const p = "משפט אחד שיש בו כמה מילים כדי שיהיה ארוך. ".repeat(20).trim(); // ~900 chars
    const text = Array.from({ length: 10 }, () => p).join("\n\n"); // ~9000 chars
    const chunks = chunkText(text, 4000);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(4000);
      expect(c.text.endsWith(".")).toBe(true);
    }
    expect(chunks.map((c) => c.text).join("\n\n")).toBe(text);
  });
  it("splits an oversized paragraph on sentence boundaries", () => {
    const sentence = "זה משפט באורך בינוני שנגמר בנקודה. ";
    const text = sentence.repeat(200).trim(); // ~7000 chars, one paragraph
    const chunks = chunkText(text, 4000);
    expect(chunks.length).toBe(2);
    for (const c of chunks) expect(c.text.endsWith(".")).toBe(true);
  });
  it("hard-splits a single giant sentence", () => {
    const text = "מילה ".repeat(2000).trim();
    const chunks = chunkText(text, 1000);
    expect(chunks.length).toBeGreaterThan(5);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(1000);
  });
});
