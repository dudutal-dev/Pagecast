/* Selects the narration voice: npm run set-voice -- <voiceId> [--model eleven_v3|eleven_multilingual_v2] */
import "./_env";
import { listRankedVoices } from "../src/server/services/narration/voices";
import { updateSettings } from "../src/server/services/settings";
import { VOICE_MODELS, type VoiceModel } from "../src/lib/schemas/settings";

const args = process.argv.slice(2);
const voiceId = args.find((a) => !a.startsWith("--"));
const modelIdx = args.indexOf("--model");
const model = modelIdx >= 0 ? (args[modelIdx + 1] as VoiceModel) : undefined;

async function main() {
  if (!voiceId) {
    console.error("usage: npm run set-voice -- <voiceId> [--model eleven_v3]");
    process.exit(1);
  }
  if (model && !(VOICE_MODELS as readonly string[]).includes(model)) {
    console.error(`unknown model ${model}`);
    process.exit(1);
  }
  const voices = await listRankedVoices(true);
  const v = voices.find((x) => x.voiceId === voiceId);
  if (!v) {
    console.error(`הקול ${voiceId} לא נמצא בחשבון`);
    process.exit(2);
  }
  const r = updateSettings({
    voiceId: v.voiceId,
    voiceName: v.name,
    ...(model ? { voiceModel: model } : {}),
  });
  if (!r.ok) throw new Error(r.error.message);
  console.log(`נבחר: ${v.name} (${v.voiceId}), מודל ${r.data.voiceModel}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
