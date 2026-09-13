/**
 * Hebrew number-to-words for narration. Numbers are the most common source of
 * TTS mistakes in Hebrew, so every digit sequence is spelled out before
 * synthesis. Feminine is the default counting form; masculine is used for
 * masculine nouns (אחוזים, שקלים, דולרים).
 *
 * The conjunction "ו" is attached only to the LAST component of a number:
 * 1946 → אלף תשע מאות ארבעים ושש, 123 → מאה עשרים ושלוש, 1500 → אלף וחמש מאות.
 */
export type Gender = "f" | "m";

const ONES: Record<Gender, string[]> = {
  f: ["", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע"],
  m: ["", "אחד", "שניים", "שלושה", "ארבעה", "חמישה", "שישה", "שבעה", "שמונה", "תשעה"],
};
const TEENS: Record<Gender, string[]> = {
  f: [
    "עשר",
    "אחת עשרה",
    "שתים עשרה",
    "שלוש עשרה",
    "ארבע עשרה",
    "חמש עשרה",
    "שש עשרה",
    "שבע עשרה",
    "שמונה עשרה",
    "תשע עשרה",
  ],
  m: [
    "עשרה",
    "אחד עשר",
    "שנים עשר",
    "שלושה עשר",
    "ארבעה עשר",
    "חמישה עשר",
    "שישה עשר",
    "שבעה עשר",
    "שמונה עשר",
    "תשעה עשר",
  ],
};
const TENS = [
  "",
  "",
  "עשרים",
  "שלושים",
  "ארבעים",
  "חמישים",
  "שישים",
  "שבעים",
  "שמונים",
  "תשעים",
];
const HUNDREDS = [
  "",
  "מאה",
  "מאתיים",
  "שלוש מאות",
  "ארבע מאות",
  "חמש מאות",
  "שש מאות",
  "שבע מאות",
  "שמונה מאות",
  "תשע מאות",
];
// Thousands use the masculine construct form: שלושת אלפים
const THOUSANDS_SMALL = [
  "",
  "אלף",
  "אלפיים",
  "שלושת אלפים",
  "ארבעת אלפים",
  "חמשת אלפים",
  "ששת אלפים",
  "שבעת אלפים",
  "שמונת אלפים",
  "תשעת אלפים",
  "עשרת אלפים",
];

/** Components of 0 < n < 1000, without conjunctions. */
function partsUnder1000(n: number, g: Gender): string[] {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) out.push(HUNDREDS[h]!);
  if (rest >= 10 && rest < 20) out.push(TEENS[g][rest - 10]!);
  else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (t) out.push(TENS[t]!);
    if (o) out.push(ONES[g][o]!);
  }
  return out;
}

/** Joins components with a single "ו" before the last one. */
function joinHe(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(" ")} ו${parts[parts.length - 1]}`;
}

function thousandsWord(k: number): string {
  if (k <= 10) return THOUSANDS_SMALL[k]!;
  // 11..999 thousand: "אחד עשר אלף", "עשרים ושלושה אלף", "מאה אלף"
  return `${joinHe(partsUnder1000(k, "m"))} אלף`;
}

/** Cardinal number in words. Supports 0 .. 999,999,999. */
export function numberToHebrew(n: number, gender: Gender = "f"): string {
  if (!Number.isFinite(n)) return String(n);
  if (n < 0) return `מינוס ${numberToHebrew(-n, gender)}`;
  n = Math.floor(n);
  if (n === 0) return "אפס";
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) {
    parts.push(
      millions === 1
        ? "מיליון"
        : millions === 2
          ? "שני מיליון"
          : `${joinHe(partsUnder1000(millions, "m"))} מיליון`,
    );
  }
  if (thousands) parts.push(thousandsWord(thousands));
  if (rest) parts.push(...partsUnder1000(rest, gender));
  return joinHe(parts);
}

/** Years read naturally: 1946 → אלף תשע מאות ארבעים ושש, 2018 → אלפיים ושמונה עשרה. */
export function yearToHebrew(year: number): string {
  return numberToHebrew(year, "f");
}

/** "1.5" → "אחת נקודה חמש" (digits after the point read one by one). */
export function decimalToHebrew(
  int: number,
  fraction: string,
  gender: Gender = "f",
): string {
  const digits = Array.from(fraction)
    .map((d) => (d === "0" ? "אפס" : ONES.f[Number(d)]!))
    .join(" ");
  return `${numberToHebrew(int, gender)} נקודה ${digits}`;
}

/** Count with a masculine noun that has singular/plural forms: (1, אחוז, אחוזים) → אחוז אחד. */
export function countMasculine(n: number, singular: string, plural: string): string {
  if (n === 1) return `${singular} אחד`;
  if (n === 2) return `שני ${plural}`;
  return `${numberToHebrew(n, "m")} ${plural}`;
}
