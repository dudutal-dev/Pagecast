import type { VoiceModel } from "@/lib/schemas/settings";
import {
  countMasculine,
  decimalToHebrew,
  numberToHebrew,
  yearToHebrew,
} from "./hebrewNumbers";

/**
 * Turns a performed script into TTS-safe text, following hebrew-tts-expert and
 * hebrew-narration: numbers to words, acronyms expanded, markdown and stray
 * symbols removed, dashes softened into pauses. Expression tags ([pause],
 * [warm] …) are kept for eleven_v3 and translated to punctuation otherwise.
 */

const ACRONYMS: [RegExp, string][] = [
  [/בע"מ/g, "בערבון מוגבל"],
  [/מע"מ/g, "מס ערך מוסף"],
  [/ד"ר/g, "דוקטור"],
  [/פרופ'/g, "פרופסור"],
  [/ח"כ/g, "חבר כנסת"],
  [/רה"מ/g, "ראש הממשלה"],
  [/מנכ"ל/g, "מנהל כללי"],
  [/סמנכ"ל/g, "סגן מנהל כללי"],
  [/יו"ר/g, "יושב ראש"],
  [/רו"ח/g, "רואה חשבון"],
  [/עו"ד/g, "עורך דין"],
  [/ארה"ב/g, "ארצות הברית"],
  [/ת"א/g, "תל אביב"],
  [/י-ם/g, "ירושלים"],
  [/צה"ל/g, "צהל"],
  [/בכ"מ/g, "בכל מקום"],
  [/עמ'/g, "עמוד"],
  [/וכו'/g, "וכולי"],
  [/כ"כ/g, "כל כך"],
  [/אח"כ/g, "אחר כך"],
  [/ע"י/g, "על ידי"],
  [/ע"פ/g, "על פי"],
  [/בד"כ/g, "בדרך כלל"],
  [/לפנה"ס/g, "לפני הספירה"],
  [/לסה"נ/g, "לספירה"],
];

const NUM = "\\d{1,3}(?:,\\d{3})+|\\d+";

export interface PreprocessOptions {
  model: VoiceModel;
}

export function preprocessForTts(input: string, opts: PreprocessOptions): string {
  let t = input.replace(/\r\n?/g, "\n");

  // Markdown remnants
  t = t
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\[[^\]\n]{3,40}·[^\]\n]*\]\s*$/gm, "") // section headers like [אינטרו · 20 שנ']
    .replace(/^\s*\[(אינטרו|פתיח|רקע|גוף|הסתייגות|סיום|מעבר)[^\]\n]*\]\s*$/gm, "");

  // Expression tags
  if (opts.model !== "eleven_v3") {
    t = t.replace(/\[pause\]/gi, "…").replace(/\[[a-z][a-z _-]{0,24}\]/gi, "");
  }

  // Acronyms (before quotes handling)
  for (const [re, word] of ACRONYMS) t = t.replace(re, word);

  // Currency and percent (masculine nouns)
  t = t.replace(new RegExp(`(${NUM})\\s?%`, "g"), (_, n: string) =>
    countMasculine(parseNum(n), "אחוז", "אחוזים"),
  );
  t = t.replace(
    new RegExp(`₪\\s?(${NUM})|(${NUM})\\s?₪`, "g"),
    (_, a?: string, b?: string) =>
      countMasculine(parseNum(a ?? b ?? "0"), "שקל", "שקלים"),
  );
  t = t.replace(
    new RegExp(`\\$\\s?(${NUM})|(${NUM})\\s?\\$`, "g"),
    (_, a?: string, b?: string) =>
      countMasculine(parseNum(a ?? b ?? "0"), "דולר", "דולרים"),
  );
  t = t.replace(
    new RegExp(`€\\s?(${NUM})|(${NUM})\\s?€`, "g"),
    (_, a?: string, b?: string) => `${numberToHebrew(parseNum(a ?? b ?? "0"), "m")} יורו`,
  );

  // Ranges "3-5" / "3–5" → "שלוש עד חמש"
  t = t.replace(
    /(\d+)\s?[-–]\s?(\d+)/g,
    (_, a: string, b: string) =>
      `${numberToHebrew(Number(a))} עד ${numberToHebrew(Number(b))}`,
  );

  // Times "8:30"
  t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h: string, m: string) => {
    const hh = numberToHebrew(Number(h));
    const mm = Number(m);
    return mm === 0 ? hh : `${hh} ו${numberToHebrew(mm)}`;
  });

  // Decimals "1.5"
  t = t.replace(/(\d+)\.(\d+)/g, (_, i: string, f: string) =>
    decimalToHebrew(Number(i), f),
  );

  // Years: 4-digit numbers in a plausible range (with optional ב-/מ- prefixes kept)
  t = t.replace(
    /(^|[^\d,])(1[0-9]{3}|20[0-9]{2})(?![\d,])/g,
    (_, pre: string, y: string) => `${pre}${yearToHebrew(Number(y))}`,
  );

  // Remaining numbers (with thousands separators)
  t = t.replace(new RegExp(NUM, "g"), (n) => numberToHebrew(parseNum(n)));

  // Prefix letters glued to numbers via hyphen: "ב-אלף" → "באלף"
  // (\b does not work next to Hebrew letters, so anchor on start/whitespace/punctuation.)
  t = t.replace(/(^|[\s"'(])([בלמכהוש])-(?=[א-ת])/g, "$1$2");

  // Dashes and symbols
  t = t
    .replace(/\s[—–-]\s/g, ", ")
    .replace(/—/g, ", ")
    .replace(/\.{3}/g, "…")
    .replace(/&/g, " ו")
    .replace(/[*_#>|]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ,/g, ",")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return t;
}

function parseNum(s: string): number {
  return Number(s.replace(/,/g, ""));
}
