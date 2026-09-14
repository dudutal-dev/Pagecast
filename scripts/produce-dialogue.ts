/*
 * Produces the conversation version of an episode with ElevenLabs text-to-dialogue:
 * a fixed interviewer voice and the guest voice render the exchange together, so
 * they react to each other instead of being stitched from solo reads.
 *
 *   npm run dialogue -- waking-up-sam-harris
 *   npm run dialogue -- waking-up-sam-harris --force
 *
 * Input : content/dialogues/<slug>.json  { turns: [{ speaker: "host"|"guest", text }] }
 * Output: site/audio/<slug>.dialogue.mp3 + content/dialogues/<slug>.meta.json
 */
import "./_env";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
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

interface Turn {
  speaker: "host" | "guest";
  text: string;
}

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const force = args.includes("--force");
if (!slug) {
  console.error("usage: npm run dialogue -- <slug> [--force]");
  process.exit(1);
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

async function main() {
  const srcPath = path.resolve("content/dialogues", `${slug}.json`);
  if (!existsSync(srcPath)) {
    console.error(`אין קובץ שיחה: ${srcPath}`);
    process.exit(2);
  }
  const { turns } = JSON.parse(await fs.readFile(srcPath, "utf8")) as { turns: Turn[] };
  const settings = getSettings();
  const guestVoiceId = settings.voiceId;
  if (!guestVoiceId) {
    console.error("לא נבחר קול אורח. הרץ: npm run set-voice -- <voiceId>");
    process.exit(2);
  }
  const model: VoiceModel = "eleven_v3"; // text-to-dialogue is a v3 feature
  const chars = turns.reduce((a, t) => a + t.text.length, 0);
  const hash = createHash("sha256")
    .update(JSON.stringify(turns) + HOST_VOICE_ID + guestVoiceId + model)
    .digest("hex")
    .slice(0, 24);

  const outDir = path.resolve("site/audio");
  const outPath = path.join(outDir, `${slug}.dialogue.mp3`);
  const metaPath = path.resolve("content/dialogues", `${slug}.meta.json`);
  if (!force && existsSync(metaPath) && existsSync(outPath)) {
    const meta = JSON.parse(await fs.readFile(metaPath, "utf8")) as { hash?: string };
    if (meta.hash === hash) {
      console.log("השיחה מעודכנת. אין מה להפיק.");
      return;
    }
  }

  const ffmpeg = await detectFfmpeg();
  const groups = groupTurns(turns);
  if (groups.length > 1 && !ffmpeg.available) {
    console.error(`השיחה ארוכה ודורשת תפירה. ${ffmpeg.installHint}`);
    process.exit(3);
  }
  console.log(
    `${turns.length} תורות, ${chars.toLocaleString()} תווים, ${groups.length} בקשות · מראיין ${HOST_VOICE_NAME} · אורחת ${settings.voiceName ?? guestVoiceId}`,
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
      process.stdout.write(
        `▶ בקשה ${done + 1} מתוך ${total} (${group.length} תורות, ${groupChars} תווים) `,
      );
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
        console.log(`✗ ${formatDuration(sec)} (${Math.round(ratio * 100)} אחוז) — מפצל`);
        continue;
      }
      parts.push(partPath);
      done++;
      console.log(`✓ ${formatDuration(sec)}`);
    }
    const stitched = path.join(tmpDir, "dialogue.mp3");
    await concatMp3(parts, stitched);
    const durationSec = ffmpeg.available ? await probeDurationSec(stitched) : 0;
    await fs.mkdir(outDir, { recursive: true });
    await fs.copyFile(stitched, outPath);
    const { size } = await fs.stat(outPath);
    await fs.writeFile(
      metaPath,
      JSON.stringify(
        {
          slug,
          hash,
          durationSec,
          sizeBytes: size,
          turns: turns.length,
          chars,
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
    // A dialogue that came back far shorter than the text implies was truncated.
    const expected = chars / CHARS_PER_SEC;
    const ratio = durationSec / expected;
    console.log(
      `\n✓ ${path.relative(process.cwd(), outPath)} — ${formatDuration(durationSec)}, ${(size / 1048576).toFixed(1)} MB` +
        (ratio < 0.85
          ? `  ✗ קצר מהצפוי (${Math.round(ratio * 100)} אחוז) — ייתכן שנקטע`
          : "  ✓ באורך צפוי"),
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
