import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { settings as settingsTable, type SettingsRow } from "@/server/db/schema";
import { nowIso } from "@/lib/ids";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsPatch,
} from "@/lib/schemas/settings";
import { ok, type Result } from "@/lib/result";

const ROW_ID = 1;

function toSettings(row: SettingsRow): Settings {
  return {
    podcastName: row.podcastName,
    hostName: row.hostName,
    voiceId: row.voiceId,
    voiceName: row.voiceName,
    voiceModel: row.voiceModel,
    voiceSettings: row.voiceSettings,
    defaultRate: row.defaultRate,
    theme: row.theme,
    onboardingDone: row.onboardingDone,
    pricePerChar: row.pricePerChar,
  };
}

/** Returns the single settings row, creating it with defaults on first access. */
export function getSettings(): Settings {
  const db = getDb();
  const row = db.select().from(settingsTable).where(eq(settingsTable.id, ROW_ID)).get();
  if (row) return toSettings(row);
  const now = nowIso();
  db.insert(settingsTable)
    .values({ id: ROW_ID, ...DEFAULT_SETTINGS, updatedAt: now })
    .run();
  return { ...DEFAULT_SETTINGS };
}

export function updateSettings(patch: SettingsPatch): Result<Settings> {
  const db = getDb();
  getSettings(); // ensure row exists
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  );
  db.update(settingsTable)
    .set({ ...clean, updatedAt: nowIso() })
    .where(eq(settingsTable.id, ROW_ID))
    .run();
  return ok(getSettings());
}
