/* Dev helper: prints/writes the exact text that is sent to ElevenLabs for an episode.
   npx tsx scripts/tts-input.ts <slug> [outFile] */
import fs from "node:fs";
import path from "node:path";
import { preprocessForTts } from "../src/lib/narration/preprocess";
import { chunkText } from "../src/lib/narration/chunk";

const slug = process.argv[2];
const out = process.argv[3];
if (!slug) {
  console.error("usage: tsx scripts/tts-input.ts <slug> [outFile]");
  process.exit(1);
}
const ep = JSON.parse(
  fs.readFileSync(path.resolve("content/episodes", `${slug}.json`), "utf8"),
) as {
  performedScript?: string;
  script: string;
};
const text = preprocessForTts(ep.performedScript ?? ep.script, { model: "eleven_v3" });
const chunks = chunkText(text);
const report = `# ${slug} — הטקסט שנשלח ל-ElevenLabs (eleven_v3)\n# ${text.length} תווים, ${chunks.length} קטעים\n\n${chunks.map((c, i) => `--- קטע ${i + 1} ---\n${c.text}`).join("\n\n")}\n`;
if (out) {
  fs.writeFileSync(out, report, "utf8");
  console.log(`wrote ${out} (${text.length} chars, ${chunks.length} chunks)`);
} else console.log(report);
