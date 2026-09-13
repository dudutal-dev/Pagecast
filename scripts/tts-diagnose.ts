/* Diagnostic: synthesizes the same text through different paths to isolate a quality problem.
   npx tsx scripts/tts-diagnose.ts <slug> <outDir> */
import "./_env";
import fs from "node:fs";
import path from "node:path";
import { ElevenLabsProvider } from "../src/server/providers/tts/elevenlabs";
import { preprocessForTts } from "../src/lib/narration/preprocess";
import { chunkText } from "../src/lib/narration/chunk";
import { getSettings } from "../src/server/services/settings";

const slug = process.argv[2];
const outDir = process.argv[3] ?? path.resolve("data/diagnose");
if (!slug) throw new Error("usage: tsx scripts/tts-diagnose.ts <slug> [outDir]");
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const s = getSettings();
  const tts = new ElevenLabsProvider();
  const ep = JSON.parse(
    fs.readFileSync(path.resolve("content/episodes", `${slug}.json`), "utf8"),
  ) as {
    performedScript?: string;
    script: string;
  };
  const full = preprocessForTts(ep.performedScript ?? ep.script, { model: "eleven_v3" });
  const chunk1 = chunkText(full)[0]!.text;
  const short = full
    .split(/\n\s*\n/)
    .slice(0, 2)
    .join("\n\n");
  const base = { voiceId: s.voiceId!, settings: s.voiceSettings };

  const runs: {
    name: string;
    text: string;
    model: "eleven_v3" | "eleven_multilingual_v2";
    ts: boolean;
  }[] = [
    { name: "1-v3-short-no-timestamps", text: short, model: "eleven_v3", ts: false },
    { name: "2-v3-short-with-timestamps", text: short, model: "eleven_v3", ts: true },
    { name: "3-v3-chunk-with-timestamps", text: chunk1, model: "eleven_v3", ts: true },
  ];
  for (const r of runs) {
    const t0 = Date.now();
    const res = await tts.synthesize(r.text, {
      ...base,
      model: r.model,
      withTimestamps: r.ts,
    });
    const f = path.join(outDir, `${slug}-${r.name}.mp3`);
    fs.writeFileSync(f, res.audio);
    console.log(
      `${r.name}: ${r.text.length} chars → ${(res.audio.length / 1024).toFixed(0)} KB, model ${res.model}, ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
