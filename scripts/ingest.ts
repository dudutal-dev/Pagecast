/*
 * Content ingest: loads every content/episodes/*.json (the book-message-expert
 * Episode contract, plus `slug` and optional `performedScript`) into the
 * library, upserting by slug. With --produce it also narrates every episode
 * whose audio is missing or out of date (needs ELEVENLABS_API_KEY and a
 * selected voice).
 *
 *   npm run ingest                # validate + upsert
 *   npm run ingest -- --produce   # + narration
 *   npm run ingest -- --only man-search-for-meaning --produce
 */
import "./_env";
import fs from "node:fs";
import path from "node:path";
import { episodeInputSchema, flattenIssues } from "../src/lib/schemas/episode";
import { upsertEpisodeBySlug } from "../src/server/services/episodes";
import {
  estimateNarration,
  produceNarration,
} from "../src/server/services/narration/produce";
import { getSettings } from "../src/server/services/settings";
import { formatDuration } from "../src/lib/format";

const args = process.argv.slice(2);
const produce = args.includes("--produce");
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : undefined;

const dir = path.resolve("content/episodes");
if (!fs.existsSync(dir)) {
  console.error(`missing ${dir}`);
  process.exit(1);
}

async function main() {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  let ok = 0;
  let failed = 0;
  const toProduce: { id: string; title: string }[] = [];

  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    if (only && slug !== only) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    } catch (e) {
      console.error(`✗ ${file}: JSON לא תקין (${(e as Error).message})`);
      failed++;
      continue;
    }
    const parsed = episodeInputSchema.safeParse({ ...(raw as object), slug });
    if (!parsed.success) {
      console.error(`✗ ${file}:`);
      for (const i of flattenIssues(parsed.error))
        console.error(`    ${i.path}: ${i.message}`);
      failed++;
      continue;
    }
    const r = upsertEpisodeBySlug({ ...parsed.data, slug });
    if (!r.ok) {
      console.error(`✗ ${file}: ${r.error.message}`);
      failed++;
      continue;
    }
    const words = parsed.data.script.split(/\s+/).length;
    console.log(
      `${r.data.created ? "＋" : "↻"} ${slug}  «${r.data.episode.title}»  ${words} מילים${
        parsed.data.performedScript ? "  (תסריט מבוצע)" : ""
      }`,
    );
    ok++;
    toProduce.push({ id: r.data.episode.id, title: r.data.episode.title });
  }
  console.log(`\n${ok} נקלטו, ${failed} נכשלו`);

  if (!produce) return;
  const settings = getSettings();
  if (!settings.voiceId) {
    console.error(
      "\nלא נבחר קול. הרץ: npm run voices  ואז  npm run set-voice -- <voiceId>",
    );
    process.exit(2);
  }
  console.log(
    `\nהפקה עם הקול ${settings.voiceName ?? settings.voiceId} (${settings.voiceModel})`,
  );
  for (const ep of toProduce) {
    const est = estimateNarration(ep.id);
    if (est.ok && est.data.upToDate && !force) {
      console.log(`= ${ep.title}: הקריינות מעודכנת`);
      continue;
    }
    if (est.ok) {
      console.log(
        `▶ ${ep.title}: ${est.data.chars.toLocaleString()} תווים, ${est.data.chunks} קטעים, ~${formatDuration(est.data.estimatedDurationSec)}, ~$${est.data.estimatedCostUsd.toFixed(2)}`,
      );
    }
    const r = await produceNarration(ep.id, {
      force,
      onProgress: (p) =>
        process.stdout.write(
          `   ${p.message}${p.total ? ` (${p.chunk}/${p.total})` : ""}\r`,
        ),
    });
    process.stdout.write("\n");
    if (!r.ok) {
      console.error(
        `✗ ${ep.title}: ${r.error.message}${r.error.hint ? ` — ${r.error.hint}` : ""}`,
      );
      continue;
    }
    console.log(
      `✓ ${ep.title}: ${formatDuration(r.data.durationSec)}, ${(r.data.sizeBytes / 1024 / 1024).toFixed(1)} MB, ${r.data.model}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
