/* Loads .env.local for CLI scripts (Next does this for the server, tsx does not). */
import fs from "node:fs";
import path from "node:path";

for (const name of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), name);
  if (fs.existsSync(p)) {
    try {
      process.loadEnvFile(p);
    } catch {
      /* ignore malformed lines */
    }
  }
}
