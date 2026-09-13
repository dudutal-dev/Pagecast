/* Seeds the database with the sample episode if the library is empty. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { episodeInputSchema } from "../src/lib/schemas/episode";
import { countEpisodes, createEpisode } from "../src/server/services/episodes";

const force = process.argv.includes("--force");
if (countEpisodes() > 0 && !force) {
  console.log("library not empty; skipping seed (use --force to add anyway)");
  process.exit(0);
}
const raw = JSON.parse(
  readFileSync(path.resolve("tests/fixtures/episode.frankl.json"), "utf8"),
) as unknown;
const input = episodeInputSchema.parse(raw);
const r = createEpisode(input);
if (!r.ok) {
  console.error(r.error.message);
  process.exit(1);
}
console.log(`seeded ${r.data.id}: ${r.data.title}`);
