/*
 * Lists the account's voices ranked for a warm female Hebrew narrator and
 * renders a ~20s Hebrew sample for the top candidates into
 * data/previews/samples/ so you can listen and choose.
 *
 *   npm run voices              # top 5 eligible voices
 *   npm run voices -- --top 8
 *   npm run voices -- --all     # every voice in the account, no samples
 */
import "./_env";
import fs from "node:fs";
import path from "node:path";
import { PREVIEW_DIR } from "../src/server/db/client";
import {
  getOrCreatePreview,
  listRankedVoices,
} from "../src/server/services/narration/voices";
import { getSettings } from "../src/server/services/settings";

const args = process.argv.slice(2);
const all = args.includes("--all");
const topIdx = args.indexOf("--top");
const top = topIdx >= 0 ? Number(args[topIdx + 1]) : 5;

async function main() {
  const settings = getSettings();
  const voices = await listRankedVoices(true);
  const eligible = voices.filter((v) => v.female && v.hebrewCapable);
  console.log(
    `${voices.length} קולות בחשבון, ${eligible.length} נשיים עם תמיכה בעברית\n`,
  );
  const list = all ? voices : eligible.slice(0, top);
  for (const [i, v] of list.entries()) {
    const mark = v.voiceId === settings.voiceId ? "★" : v.recommended ? "☆" : " ";
    console.log(
      `${mark} ${String(i + 1).padStart(2)}. ${v.name.padEnd(22)} ${v.voiceId}  ${v.reason}  [${v.labels.gender ?? "?"}; ${v.category ?? "?"}]`,
    );
  }
  if (all) return;

  const outDir = path.join(PREVIEW_DIR, "samples");
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`\nמפיק דוגמאות (${settings.voiceModel})…`);
  for (const [i, v] of list.entries()) {
    const r = await getOrCreatePreview(
      v.voiceId,
      settings.voiceModel,
      settings.voiceSettings,
    );
    if (!r.ok) {
      console.error(
        `✗ ${v.name}: ${r.error.message}${r.error.hint ? ` — ${r.error.hint}` : ""}`,
      );
      if (r.error.code === "NO_API_KEY" || r.error.code === "INVALID_API_KEY")
        process.exit(2);
      continue;
    }
    const src = path.join(PREVIEW_DIR, v.voiceId, `${r.data.key}.mp3`);
    const safe = v.name.replace(/[^\w֐-׿-]+/g, "_");
    const dst = path.join(outDir, `${String(i + 1).padStart(2, "0")}-${safe}.mp3`);
    fs.copyFileSync(src, dst);
    console.log(
      `✓ ${dst}${r.data.cached ? "  (מהמטמון)" : ""}${r.data.model !== settings.voiceModel ? `  (הופק עם ${r.data.model})` : ""}`,
    );
  }
  console.log("\nלבחירה: npm run set-voice -- <voiceId>");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
