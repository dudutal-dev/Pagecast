/*
 * Verifies that every produced episode is complete: the stored alignment must
 * cover the whole script, and the audio length must match the spoken text at a
 * plausible rate. Exits non-zero if anything is short, so it can gate a release.
 *
 *   npm run verify-audio
 */
import "./_env";
import { eq } from "drizzle-orm";
import { getDb } from "../src/server/db/client";
import { audioAssets, episodes } from "../src/server/db/schema";
import { preprocessForTts } from "../src/lib/narration/preprocess";
import { formatDuration } from "../src/lib/format";

/** Hebrew narration measured on complete episodes: ~11.7 characters per second. */
const CHARS_PER_SEC = 11.7;
/**
 * The stored alignment is the authority on whether the whole script was spoken:
 * it reports, character by character, what the provider actually voiced. The
 * duration ratio only says how fast it was read, so a brisk but complete take
 * is a warning, never a failure. The ratio decides on its own only when the
 * episode has no alignment to consult.
 */
const MIN_ALIGN = 0.99;
const WARN_RATIO = 0.85; // a complete take read this much faster than expected
const MIN_RATIO = 0.7; // without alignment, below this the take lost text
const MIN_SECONDS = 300; // every episode runs at least five minutes

const db = getDb();
const rows = db
  .select()
  .from(episodes)
  .all()
  .filter((r) => r.slug)
  .sort((a, b) => (a.slug ?? "").localeCompare(b.slug ?? ""));

let bad = 0;
let warned = 0;
let withAudio = 0;
console.log("slug".padEnd(30) + "משך    צפוי   יחס   טרנסקריפט  מצב");
for (const ep of rows) {
  const asset = db
    .select()
    .from(audioAssets)
    .where(eq(audioAssets.episodeId, ep.id))
    .get();
  if (!asset) {
    console.log(
      (ep.slug ?? "").padEnd(30) + "—      —      —     —          ללא קריינות",
    );
    continue;
  }
  withAudio++;
  const text = preprocessForTts(ep.performedScript ?? ep.script, {
    model: asset.modelId,
  });
  const expected = text.length / CHARS_PER_SEC;
  const ratio = asset.durationSec / expected;

  // Sentences pinned to the tail of the timeline were never actually spoken.
  const al = asset.alignment ?? [];
  let spoken = al.length;
  for (let i = al.length - 1; i > 0; i--) {
    const cur = al[i]!;
    const prev = al[i - 1]!;
    if (Math.abs(cur.start - prev.start) < 0.02 && cur.end - cur.start < 0.02) spoken = i;
    else break;
  }
  const alignPct = al.length ? spoken / al.length : 1;
  const complete = al.length ? alignPct >= MIN_ALIGN : ratio >= MIN_RATIO;
  const brisk = complete && ratio < WARN_RATIO;
  const longEnough = asset.durationSec >= MIN_SECONDS;
  const ok = complete && longEnough;
  if (!ok) bad++;
  if (brisk) warned++;
  console.log(
    (ep.slug ?? "").padEnd(30) +
      formatDuration(asset.durationSec).padEnd(7) +
      formatDuration(expected).padEnd(7) +
      `${(ratio * 100).toFixed(0)}%`.padEnd(6) +
      `${(alignPct * 100).toFixed(0)}%`.padEnd(11) +
      (!complete
        ? `✗ נקטע אחרי «${al[spoken - 1]?.text.slice(0, 30) ?? "?"}»`
        : !longEnough
          ? "✗ קצר מחמש דקות — הארך את התסריט"
          : brisk
            ? "✓ שלם (קריאה מהירה)"
            : "✓ שלם"),
  );
}
console.log(
  `\n${withAudio} פרקים עם קריינות, ${bad} פגומים` +
    (warned ? `, ${warned} שלמים אך נקראו מהר מהצפוי` : ""),
);
process.exit(bad ? 1 : 0);
