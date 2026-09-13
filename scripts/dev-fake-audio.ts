/*
 * Dev helper: attaches FAKE narration (a soft tone, real MP3) to an episode so
 * the player and transcript sync can be tested before ElevenLabs is wired up.
 *   npx tsx scripts/dev-fake-audio.ts            # first episode in the library
 *   npx tsx scripts/dev-fake-audio.ts ep_xxx     # specific episode
 */
import { createHash } from "node:crypto";
import { FakeTtsProvider } from "../src/server/providers/tts/fake";
import { attachAudio } from "../src/server/services/audio";
import { getEpisode, listEpisodes } from "../src/server/services/episodes";
import { getSettings } from "../src/server/services/settings";
import { libraryQuerySchema } from "../src/lib/schemas/episode";
import { buildSentenceAlignment } from "../src/lib/narration/alignment";
import { stripExpressionTags, countWords } from "../src/lib/narration/sentences";

async function main() {
  const id = process.argv[2] ?? listEpisodes(libraryQuerySchema.parse({}))[0]?.id;
  if (!id) throw new Error("no episodes in the library; run npm run db:seed first");
  const ep = getEpisode(id);
  if (!ep.ok) throw new Error(ep.error.message);
  const settings = getSettings();
  const text = stripExpressionTags(ep.data.performedScript ?? ep.data.script);
  const tts = new FakeTtsProvider();
  const res = await tts.synthesize(text, {
    voiceId: "fake-noa",
    model: settings.voiceModel,
    settings: settings.voiceSettings,
    withTimestamps: true,
  });
  const durationSec = Math.max(1, Math.round((countWords(text) / 150) * 60));
  const alignment = buildSentenceAlignment([
    { text, alignment: res.alignment, offsetSec: 0, durationSec },
  ]);
  const scriptHash = createHash("sha256")
    .update(`fake|${text}`)
    .digest("hex")
    .slice(0, 24);
  const r = await attachAudio({
    episodeId: id,
    audio: res.audio,
    durationSec,
    voiceId: "fake-noa",
    modelId: settings.voiceModel,
    voiceSettings: settings.voiceSettings,
    scriptHash,
    alignment,
  });
  if (!r.ok) throw new Error(r.error.message);
  console.log(
    `attached fake audio to ${id}: ${durationSec}s, ${r.data.sizeBytes} bytes, ${alignment.length} sentences`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
