import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { audioAssets, episodes, type AudioAssetRow } from "@/server/db/schema";
import { getStorage } from "@/server/providers";
import { newAssetId, nowIso } from "@/lib/ids";
import type { SentenceAlignment } from "@/lib/narration/alignment";
import type { VoiceModel, VoiceSettings } from "@/lib/schemas/settings";
import { fail, ok, type Result } from "@/lib/result";
import { audioRelPath } from "@/server/ffmpeg";

export function getAudioAsset(episodeId: string): AudioAssetRow | null {
  return (
    getDb()
      .select()
      .from(audioAssets)
      .where(eq(audioAssets.episodeId, episodeId))
      .get() ?? null
  );
}

export function getAudioAssetById(assetId: string): AudioAssetRow | null {
  return (
    getDb().select().from(audioAssets).where(eq(audioAssets.id, assetId)).get() ?? null
  );
}

export interface AttachAudioInput {
  episodeId: string;
  audio: Buffer;
  durationSec: number;
  voiceId: string;
  modelId: VoiceModel;
  voiceSettings: VoiceSettings;
  scriptHash: string;
  alignment: SentenceAlignment[] | null;
}

/**
 * Stores a produced MP3 and upserts the episode's audio asset. The previous
 * file (if any) is removed after the new one is safely written.
 */
export async function attachAudio(
  input: AttachAudioInput,
): Promise<Result<AudioAssetRow>> {
  const db = getDb();
  const ep = db
    .select({ id: episodes.id })
    .from(episodes)
    .where(eq(episodes.id, input.episodeId))
    .get();
  if (!ep) return fail("NOT_FOUND", "הפרק לא נמצא");

  const storage = getStorage();
  const key = audioRelPath(input.episodeId, input.scriptHash);
  const { sizeBytes } = await storage.put(key, input.audio);

  const previous = getAudioAsset(input.episodeId);
  const now = nowIso();
  const id = previous?.id ?? newAssetId();
  const values = {
    id,
    episodeId: input.episodeId,
    path: key,
    durationSec: input.durationSec,
    sizeBytes,
    voiceId: input.voiceId,
    modelId: input.modelId,
    voiceSettings: input.voiceSettings,
    scriptHash: input.scriptHash,
    alignment: input.alignment,
    createdAt: now,
  };
  if (previous) {
    db.update(audioAssets).set(values).where(eq(audioAssets.id, previous.id)).run();
    if (previous.path !== key) await storage.remove(previous.path);
  } else {
    db.insert(audioAssets).values(values).run();
  }
  db.update(episodes)
    .set({ updatedAt: now })
    .where(eq(episodes.id, input.episodeId))
    .run();
  return ok(getAudioAssetById(id)!);
}

export async function deleteAudio(
  episodeId: string,
): Promise<Result<{ removed: boolean }>> {
  const asset = getAudioAsset(episodeId);
  if (!asset) return ok({ removed: false });
  getDb().delete(audioAssets).where(eq(audioAssets.id, asset.id)).run();
  await getStorage().remove(asset.path);
  return ok({ removed: true });
}
