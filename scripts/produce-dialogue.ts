/*
 * Produces the podcast version of an episode with ElevenLabs text-to-dialogue:
 * a fixed interviewer voice and the guest voice render the exchange together, so
 * they react to each other instead of being stitched from solo reads.
 *
 *   npm run dialogue -- waking-up-sam-harris
 *   npm run dialogue -- waking-up-sam-harris --force
 *   npm run dialogue -- --all                  # every script that has no audio yet
 *   npm run dialogue -- --all --reserve 20000  # keep more of the quota back
 *
 * Input : content/dialogues/<slug>.json  { turns: [{ speaker: "host"|"guest", text }] }
 * Output: site/audio/<slug>.dialogue.mp3 + content/dialogues/<slug>.meta.json
 */
import "./_env";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ElevenLabsProvider } from "../src/server/providers/tts/elevenlabs";
import { concatMp3, detectFfmpeg, probeDurationSec } from "../src/server/ffmpeg";
import { getSettings } from "../src/server/services/settings";
import { formatDuration } from "../src/lib/format";
import type { VoiceModel } from "../src/lib/schemas/settings";

/** The interviewer is the same person in every episode. */
const HOST_VOICE_ID = process.env.PAGECAST_HOST_VOICE_ID ?? "iP95p4xoKVk53GoZ742B"; // Chris — charming, down-to-earth
const HOST_VOICE_NAME = process.env.PAGECAST_HOST_VOICE_NAME ?? "Chris";
/** The API caps a request at 2,000 characters across all turns. */
const MAX_REQUEST_CHARS = 1500;
/** Many short turns in one request come back with turns dropped; keep groups small. */
const MAX_TURNS_PER_REQUEST = 8;
/** Hebrew dialogue runs slower than narration: pauses between speakers. */
const CHARS_PER_SEC = 10.5;
/** A take shorter than this fraction of the expected length lost turns. */
const COMPLETE_RATIO = 0.75;
/** Characters held back so a run never empties the month's quota. */
const DEFAULT_RESERVE = 8000;

interface Turn {
  speaker: "host" | "guest";
  text: string;
}

const DIALOGUE_DIR = path.resolve("content/dialogues");

const args = process.argv.slice(2);
const all = args.includes("--all");
const force = args.includes("--force");
const reserveIdx = args.indexOf("--reserve");
const reserve =
  reserveIdx >= 0 ? Number(args[reserveIdx + 1] ?? DEFAULT_RESERVE) : DEFAULT_RESERVE;
const named = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--reserve");

if (!all && named.length === 0) {
  console.error("usage: npm run dialogue -- <slug> [--force]   |   --all [--reserve N]");
  process.exit(1);
}

/** Every dialogue script on disk, in a stable order. */
function allSlugs(): string[] {
  return readdirSync(DIALOGUE_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".meta.json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

/** Splits the turns into requests under the API limit, never cutting a turn. */
function groupTurns(turns: Turn[]): Turn[][] {
  const groups: Turn[][] = [];
  let cur: Turn[] = [];
  let size = 0;
  for (const t of turns) {
    if (
      cur.length &&
      (size + t.text.length > MAX_REQUEST_CHARS || cur.length >= MAX_TURNS_PER_REQUEST)
    ) {
      groups.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(t);
    size += t.text.length;
  }
  if (cur.length) groups.push(cur);
  return groups;
}

interface Job {
  slug: string;
  turns: Turn[];
  chars: number;
  hash: string;
  outPath: string;
  metaPath: string;
}

/** Reads a script and decides whether it still needs rendering. */
async function plan(slug: string, guestVoiceId: string, model: VoiceModel) {
  const srcPath = path.join(DIALOGUE_DIR, `${slug}.json`);
  if (!existsSync(srcPath)) return { skip: `אין קובץ שיחה: ${slug}` };
  const { turns } = JSON.parse(await fs.readFile(srcPath, "utf8")) as { turns: Turn[] };
  const chars = turns.reduce((a, t) => a + t.text.length, 0);
  const hash = createHash("sha256")
    .update(JSON.stringify(turns) + HOST_VOICE_ID + guestVoiceId + model)
    .digest("hex")
    .slice(0, 24);
  const outPath = path.resolve("site/audio", `${slug}.dialogue.mp3`);
  const metaPath = path.join(DIALOGUE_DIR, `${slug}.meta.json`);
  if (!force && existsSync(metaPath) && existsSync(outPath)) {
    const meta = JSON.parse(await fs.readFile(metaPath, "utf8")) as { hash?: string };
    if (meta.hash === hash) return { skip: `${slug}: מעודכן` };
  }
  return { job: { slug, turns, chars, hash, outPath, metaPath } as Job };
}

async function render(job: Job, guestVoiceId: string, model: VoiceModel) {
  const settings = getSettings();
  const ffmpeg = await detectFfmpeg();
  const groups = groupTurns(job.turns);
  if (groups.length > 1 && !ffmpeg.available) {
    throw new Error(`השיחה ארוכה ודורשת תפירה. ${ffmpeg.installHint}`);
  }
  console.log(
    `\n▶ ${job.slug}: ${job.turns.length} תורות, ${job.chars.toLocaleString()} תווים, ${groups.length} בקשות`,
  );

  const tts = new ElevenLabsProvider();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pagecast-dialogue-"));
  const parts: string[] = [];
  try {
    // Queue, not a plain loop: a group the provider rendered short is split and requeued.
    const queue: Turn[][] = [...groups];
    let done = 0;
    while (queue.length) {
      const group = queue.shift()!;
      const total = done + queue.length + 1;
      const groupChars = group.reduce((a, t) => a + t.text.length, 0);
      process.stdout.write(`   בקשה ${done + 1}/${total} (${groupChars} תווים) `);
      const res = await tts.synthesizeDialogue(
        group.map((t) => ({
          voiceId: t.speaker === "host" ? HOST_VOICE_ID : guestVoiceId,
          text: t.text,
        })),
        { model, stability: settings.voiceSettings.stability, languageCode: "he" },
      );
      const partPath = path.join(tmpDir, `part-${String(done).padStart(3, "0")}.mp3`);
      await fs.writeFile(partPath, res.audio);
      const sec = ffmpeg.available ? await probeDurationSec(partPath) : 0;
      const ratio = ffmpeg.available ? sec / (groupChars / CHARS_PER_SEC) : 1;
      if (ratio < COMPLETE_RATIO && group.length > 1) {
        const mid = Math.ceil(group.length / 2);
        queue.unshift(group.slice(0, mid), group.slice(mid));
        await fs.rm(partPath, { force: true });
        console.log(`✗ ${formatDuration(sec)} (${Math.round(ratio * 100)}%) — מפצל`);
        continue;
      }
      parts.push(partPath);
      done++;
      console.log(`✓ ${formatDuration(sec)}`);
    }
    const stitched = path.join(tmpDir, "dialogue.mp3");
    await concatMp3(parts, stitched);
    const durationSec = ffmpeg.available ? await probeDurationSec(stitched) : 0;
    await fs.mkdir(path.dirname(job.outPath), { recursive: true });
    await fs.copyFile(stitched, job.outPath);
    const { size } = await fs.stat(job.outPath);
    await fs.writeFile(
      job.metaPath,
      JSON.stringify(
        {
          slug: job.slug,
          hash: job.hash,
          durationSec,
          sizeBytes: size,
          turns: job.turns.length,
          chars: job.chars,
          hostVoiceId: HOST_VOICE_ID,
          hostVoiceName: HOST_VOICE_NAME,
          guestVoiceId,
          guestVoiceName: settings.voiceName,
          model,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    const ratio = durationSec / (job.chars / CHARS_PER_SEC);
    console.log(
      `   ✓ ${formatDuration(durationSec)}, ${(size / 1048576).toFixed(1)} MB` +
        (ratio < 0.85 ? `  ✗ קצר מהצפוי (${Math.round(ratio * 100)}%)` : ""),
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function main() {
  const settings = getSettings();
  const guestVoiceId = settings.voiceId;
  if (!guestVoiceId) {
    console.error("לא נבחר קול אורח. הרץ: npm run set-voice -- <voiceId>");
    process.exit(2);
  }
  const model: VoiceModel = "eleven_v3"; // text-to-dialogue is a v3 feature

  const slugs = all ? allSlugs() : named;
  const jobs: Job[] = [];
  for (const slug of slugs) {
    const r = await plan(slug, guestVoiceId, model);
    if ("skip" in r && r.skip) {
      if (!all) console.log(r.skip);
      continue;
    }
    if (r.job) jobs.push(r.job);
  }
  if (!jobs.length) {
    console.log("אין מה להפיק.");
    return;
  }

  const needed = jobs.reduce((a, j) => a + j.chars, 0);
  const tts = new ElevenLabsProvider();
  let left = await tts.remainingCharacters();
  console.log(
    `${jobs.length} פרקים, ${needed.toLocaleString()} תווים` +
      (left == null
        ? ""
        : ` · במכסה ${left.toLocaleString()}, שמורים ${reserve.toLocaleString()}`),
  );

  let produced = 0;
  const held: string[] = [];
  for (const job of jobs) {
    // Refuse to start an episode the quota cannot finish: a run that dies halfway
    // spends the characters and leaves a truncated file behind.
    if (left != null && left - job.chars < reserve) {
      held.push(job.slug);
      continue;
    }
    await render(job, guestVoiceId, model);
    produced++;
    left = await tts.remainingCharacters();
  }

  console.log(
    `\n${produced} הופקו` +
      (held.length ? `, ${held.length} נדחו מחוסר מכסה: ${held.join(", ")}` : "") +
      (left == null ? "" : ` · נותרו ${left.toLocaleString()} תווים`),
  );
  if (held.length) process.exitCode = 5;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
