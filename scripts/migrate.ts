/* Applies pending Drizzle migrations to the configured database. */
import { getDb } from "../src/server/db/client";

getDb();
console.log("migrations applied");
