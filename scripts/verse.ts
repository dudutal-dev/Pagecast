/*
 * Looks up a verse (or a short range) in the Hebrew Bible and prints it two ways:
 * as it is written with vowels and cantillation, and as plain letters for a
 * narration script. Use it to verify every quotation before it ships.
 *
 *   npm run verse -- "Genesis 1.1"
 *   npm run verse -- "Ruth 1.16-17"
 *   npm run verse -- "בראשית 1.1"
 *
 * Source: Sefaria's Miqra According to the Masorah (Aleppo Codex based).
 * Fetches one reference at a time on purpose: pulling a whole book is a huge
 * response that stalls an agent and is never needed to check a quotation.
 */
const BASE = "https://www.sefaria.org/api/v3/texts";

/** Hebrew book names to the English refs the API expects. */
const BOOKS: Record<string, string> = {
  בראשית: "Genesis",
  שמות: "Exodus",
  ויקרא: "Leviticus",
  במדבר: "Numbers",
  דברים: "Deuteronomy",
  יהושע: "Joshua",
  שופטים: "Judges",
  "שמואל א": "I Samuel",
  "שמואל ב": "II Samuel",
  "מלכים א": "I Kings",
  "מלכים ב": "II Kings",
  ישעיהו: "Isaiah",
  ירמיהו: "Jeremiah",
  יחזקאל: "Ezekiel",
  הושע: "Hosea",
  יואל: "Joel",
  עמוס: "Amos",
  עובדיה: "Obadiah",
  יונה: "Jonah",
  מיכה: "Micah",
  נחום: "Nahum",
  חבקוק: "Habakkuk",
  צפניה: "Zephaniah",
  חגי: "Haggai",
  זכריה: "Zechariah",
  מלאכי: "Malachi",
  תהלים: "Psalms",
  משלי: "Proverbs",
  איוב: "Job",
  "שיר השירים": "Song of Songs",
  רות: "Ruth",
  איכה: "Lamentations",
  קהלת: "Ecclesiastes",
  אסתר: "Esther",
  דניאל: "Daniel",
  עזרא: "Ezra",
  נחמיה: "Nehemiah",
  "דברי הימים א": "I Chronicles",
  "דברי הימים ב": "II Chronicles",
};

/**
 * Turns a verse into a line a narrator can read: no vowels, no cantillation, no
 * markup — and the four-letter divine name rendered as it is read aloud, which
 * is also the series rule that it is never written out.
 */
export function plain(text: string): string {
  return (
    text
      .replace(/<[^>]+>/g, "")
      .replace(/&thinsp;|&nbsp;|&#8201;|&#160;/g, " ")
      .replace(/&amp;/g, "&")
      // The maqaf must become a space BEFORE the strip: it sits inside the same
      // Unicode block as the vowels, and removing it would fuse two words.
      .replace(/־/g, " ")
      .replace(/[֑-ֽֿ-ׇ]/g, "")
      .replace(/יהוה/g, "אדוני")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function toRef(input: string): string {
  const t = input.trim().replace(/[:,]/g, ".");
  for (const [he, en] of Object.entries(BOOKS)) {
    if (t.startsWith(he)) return (en + " " + t.slice(he.length).trim()).trim();
  }
  return t;
}

async function main() {
  const arg = process.argv.slice(2).join(" ").trim();
  if (!arg) {
    console.error('usage: npm run verse -- "Genesis 1.1"   |   "בראשית 1.1"');
    process.exit(1);
  }
  const ref = toRef(arg);
  const url = `${BASE}/${encodeURIComponent(ref)}?version=hebrew`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`לא נמצא: ${ref} (${res.status})`);
    process.exitCode = 2;
    return;
  }
  const json = (await res.json()) as {
    versions?: { text?: string | string[] }[];
    ref?: string;
  };
  const raw = json.versions?.[0]?.text;
  if (!raw) {
    console.error(`אין טקסט עבור ${ref}`);
    process.exitCode = 2;
    return;
  }
  const lines = Array.isArray(raw) ? raw : [raw];
  console.log(`\n${json.ref ?? ref}\n`);
  for (const line of lines) {
    const clean = String(line).replace(/<[^>]+>/g, "");
    console.log(`  מנוקד : ${clean}`);
    console.log(`  לקריינות: ${plain(clean)}`);
    console.log("");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
