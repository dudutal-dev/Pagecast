import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

export const DATA_DIR = path.resolve(
  process.cwd(),
  process.env.PAGECAST_DATA_DIR ?? "data",
);
export const AUDIO_DIR = path.join(DATA_DIR, "audio");
export const PREVIEW_DIR = path.join(DATA_DIR, "previews");
export const BACKUP_DIR = path.join(DATA_DIR, "backups");

function resolveDbPath(): string {
  const p = process.env.PAGECAST_DB_PATH;
  if (p === ":memory:") return p;
  return p ? path.resolve(process.cwd(), p) : path.join(DATA_DIR, "pagecast.db");
}

export function openDatabase(dbPath = resolveDbPath()): Db {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db;
}

// One connection per process (Next dev reloads modules; keep it on globalThis).
const g = globalThis as unknown as { __pagecastDb?: Db };

export function getDb(): Db {
  if (!g.__pagecastDb) g.__pagecastDb = openDatabase();
  return g.__pagecastDb;
}

/** Test helper: swap the singleton for a fresh in-memory database. */
export function resetDbForTests(): Db {
  g.__pagecastDb = openDatabase(":memory:");
  return g.__pagecastDb;
}
