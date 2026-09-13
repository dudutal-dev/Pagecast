import { createHash } from "node:crypto";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, PREVIEW_DIR } from "@/server/db/client";
import { voicePreviews } from "@/server/db/schema";
import { getTts } from "@/server/providers";
import type { VoiceInfo } from "@/server/providers/tts/types";
import { LocalFsStorage } from "@/server/providers/storage";
import { nowIso } from "@/lib/ids";
import { preprocessForTts } from "@/lib/narration/preprocess";
import type { VoiceModel, VoiceSettings } from "@/lib/schemas/settings";
import { fail, ok, type Result } from "@/lib/result";

/** ~20 seconds of Hebrew narration, from the book-message-expert sample episode. */
export const PREVIEW_TEXT =
  "בואו נתחיל מהאיש. ויקטור פרנקל היה פסיכיאטר בווינה. כשהנאצים הגיעו, הוא יכול היה לברוח לאמריקה. הייתה לו ויזה. הוא בחר להישאר עם ההורים שלו. ומה שהוא כתב אחר כך, בתשעה ימים בלבד, הפך לאחד הספרים החשובים של המאה העשרים. המשפט שאני רוצה שתצאו איתו הוא זה: אי אפשר לבחור מה יקרה לנו. אבל תמיד נשארת הבחירה איך להתייחס למה שקורה.";

export interface RankedVoice extends VoiceInfo {
  score: number;
  recommended: boolean;
  reason: string;
  female: boolean;
  hebrewCapable: boolean;
}

const FEMALE_RE = /\b(female|woman|girl|she|her|נשי|אישה)\b/i;
const MALE_RE = /\b(male|man|boy|he|his|גברי)\b/i;

const POSITIVE: [RegExp, number, string][] = [
  [/narrat|storytell|audiobook|story/i, 3, "מספרת סיפורים"],
  [/warm|soft|gentle|intimate|soothing/i, 3, "חמה ורכה"],
  [/calm|relax|meditat/i, 2, "רגועה"],
  [/conversational|casual|friendly/i, 2, "שיחתית"],
  [/expressive|emotive|emotional/i, 2, "אקספרסיבית"],
  [/mature|middle[- ]aged/i, 1, "בוגרת"],
  [/hebrew|israeli|עברית/i, 4, "עברית"],
  [/multilingual/i, 2, "רב-לשונית"],
];
const NEGATIVE: [RegExp, number][] = [
  [/news|anchor|announcer|broadcast|radio|commercial|advert|promo/i, 3],
  [/child|kid|young|teen|cartoon|robot|character|game/i, 2],
  [/whisper|asmr/i, 2],
];

export function rankVoices(voices: VoiceInfo[]): RankedVoice[] {
  const ranked = voices.map((v) => {
    const blob = [
      v.name,
      v.description ?? "",
      ...Object.values(v.labels),
      v.category ?? "",
    ].join(" ");
    const gender = (v.labels.gender ?? "").toLowerCase();
    const female = gender
      ? gender.startsWith("f")
      : FEMALE_RE.test(blob) && !MALE_RE.test(blob);
    const hebrewCapable =
      v.languages.includes("he") ||
      /hebrew|multilingual|israeli/i.test(blob) ||
      v.category === "premade" ||
      v.category === "professional" ||
      v.category === "fake";
    let score = 0;
    const reasons: string[] = [];
    for (const [re, w, label] of POSITIVE) {
      if (re.test(blob)) {
        score += w;
        reasons.push(label);
      }
    }
    for (const [re, w] of NEGATIVE) if (re.test(blob)) score -= w;
    if (v.languages.includes("he")) score += 3;
    if (v.category === "cloned" || v.category === "generated") score -= 1;
    return {
      ...v,
      score,
      female,
      hebrewCapable,
      recommended: false,
      reason: reasons.length ? reasons.slice(0, 3).join(" · ") : "קול נשי מתאים לקריינות",
    };
  });
  const eligible = ranked
    .filter((v) => v.female && v.hebrewCapable)
    .sort((a, b) => b.score - a.score);
  eligible.slice(0, 3).forEach((v) => (v.recommended = true));
  const rest = ranked
    .filter((v) => !(v.female && v.hebrewCapable))
    .sort((a, b) => b.score - a.score);
  return [...eligible, ...rest];
}

let cache: { at: number; voices: RankedVoice[] } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export async function listRankedVoices(force = false): Promise<RankedVoice[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.voices;
  const voices = await getTts().listVoices();
  const ranked = rankVoices(voices);
  cache = { at: Date.now(), voices: ranked };
  return ranked;
}

export function invalidateVoiceCache() {
  cache = null;
}

const previewStorage = () => new LocalFsStorage(PREVIEW_DIR);

export function previewKey(
  voiceId: string,
  model: VoiceModel,
  settings: VoiceSettings,
): string {
  return createHash("sha256")
    .update([voiceId, model, JSON.stringify(settings), PREVIEW_TEXT].join("|"))
    .digest("hex")
    .slice(0, 20);
}

/** Produces (or reuses) a ~20s Hebrew sample for a voice. */
export async function getOrCreatePreview(
  voiceId: string,
  model: VoiceModel,
  settings: VoiceSettings,
): Promise<Result<{ key: string; cached: boolean; model: VoiceModel }>> {
  const key = previewKey(voiceId, model, settings);
  const db = getDb();
  const existing = db
    .select()
    .from(voicePreviews)
    .where(eq(voicePreviews.key, key))
    .get();
  const storage = previewStorage();
  if (existing && (await storage.exists(existing.path))) {
    return ok({ key, cached: true, model });
  }
  const tts = getTts();
  const text = preprocessForTts(PREVIEW_TEXT, { model });
  let result;
  try {
    result = await tts.synthesize(text, {
      voiceId,
      model,
      settings,
      withTimestamps: false,
    });
  } catch (e) {
    if (e instanceof Error && "code" in e) return { ok: false, error: e as never };
    return fail("PROVIDER_ERROR", "הפקת הדוגמה נכשלה");
  }
  const rel = path.posix.join(voiceId, `${key}.mp3`);
  await storage.put(rel, result.audio);
  if (existing) {
    db.update(voicePreviews)
      .set({ path: rel, createdAt: nowIso() })
      .where(eq(voicePreviews.key, key))
      .run();
  } else {
    db.insert(voicePreviews)
      .values({ key, voiceId, path: rel, createdAt: nowIso() })
      .run();
  }
  return ok({ key, cached: false, model: result.model });
}

export function getPreviewFile(
  key: string,
): { storage: LocalFsStorage; path: string } | null {
  const row = getDb()
    .select()
    .from(voicePreviews)
    .where(eq(voicePreviews.key, key))
    .get();
  if (!row) return null;
  return { storage: previewStorage(), path: row.path };
}
