import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { episodes } from "@/server/db/schema";
import { getTts } from "@/server/providers";
import { concatMp3, detectFfmpeg, probeDurationSec } from "@/server/ffmpeg";
import { attachAudio, getAudioAsset } from "@/server/services/audio";
import { getSettings } from "@/server/services/settings";
import { logger } from "@/server/logger";
import { scriptHash } from "./hash";
import { chunkText, type Chunk } from "@/lib/narration/chunk";
import { preprocessForTts } from "@/lib/narration/preprocess";
import { buildSentenceAlignment } from "@/lib/narration/alignment";
import { countWords } from "@/lib/narration/sentences";
import { AppError, fail, ok, type Result } from "@/lib/result";
import type { Settings } from "@/lib/schemas/settings";

export interface NarrationEstimate {
  episodeId: string;
  voiceId: string | null;
  voiceName: string | null;
  model: Settings["voiceModel"];
  hasPerformedScript: boolean;
  chars: number;
  words: number;
  chunks: number;
  estimatedDurationSec: number;
  estimatedCostUsd: number;
  scriptHash: string;
  upToDate: boolean;
  ffmpeg: boolean;
  ffmpegHint: string;
  needsFfmpeg: boolean;
}

export function estimateNarration(episodeId: string): Result<NarrationEstimate> {
  const ep = getDb().select().from(episodes).where(eq(episodes.id, episodeId)).get();
  if (!ep) return fail("NOT_FOUND", "הפרק לא נמצא");
  const settings = getSettings();
  const source = ep.performedScript ?? ep.script;
  const text = preprocessForTts(source, { model: settings.voiceModel });
  const chunks = chunkText(text);
  const hash = scriptHash({
    performedScript: source,
    voiceId: settings.voiceId ?? "",
    model: settings.voiceModel,
    settings: settings.voiceSettings,
  });
  const asset = getAudioAsset(episodeId);
  return ok({
    episodeId,
    voiceId: settings.voiceId,
    voiceName: settings.voiceName,
    model: settings.voiceModel,
    hasPerformedScript: ep.performedScript != null,
    chars: text.length,
    words: countWords(text),
    chunks: chunks.length,
    estimatedDurationSec: Math.round((countWords(text) / 150) * 60),
    estimatedCostUsd: Math.round(text.length * settings.pricePerChar * 1000) / 1000,
    scriptHash: hash,
    upToDate: asset?.scriptHash === hash,
    ffmpeg: false,
    ffmpegHint: "",
    needsFfmpeg: chunks.length > 1,
  });
}

export type ProduceStage =
  "preparing" | "synthesizing" | "stitching" | "aligning" | "saving";

export interface ProduceProgress {
  stage: ProduceStage;
  chunk: number;
  total: number;
  etaSec: number | null;
  message: string;
}

export interface ProduceResult {
  assetId: string;
  durationSec: number;
  sizeBytes: number;
  chunks: number;
  model: string;
  skipped: boolean;
}

/**
 * Full narration pipeline. Emits progress through `onProgress`; returns the
 * asset. Re-generation is skipped when the hash matches, unless `force`.
 */
export async function produceNarration(
  episodeId: string,
  opts: {
    force?: boolean;
    onProgress?: (p: ProduceProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<Result<ProduceResult>> {
  const progress = (p: ProduceProgress) => opts.onProgress?.(p);
  const ep = getDb().select().from(episodes).where(eq(episodes.id, episodeId)).get();
  if (!ep) return fail("NOT_FOUND", "הפרק לא נמצא");
  const settings = getSettings();
  if (!settings.voiceId) {
    return fail("VOICE_NOT_FOUND", "עוד לא נבחר קול", { hint: "בחר קול בהגדרות → קול" });
  }
  const source = ep.performedScript ?? ep.script;
  const hash = scriptHash({
    performedScript: source,
    voiceId: settings.voiceId,
    model: settings.voiceModel,
    settings: settings.voiceSettings,
  });
  const existing = getAudioAsset(episodeId);
  if (existing && existing.scriptHash === hash && !opts.force) {
    return ok({
      assetId: existing.id,
      durationSec: existing.durationSec,
      sizeBytes: existing.sizeBytes,
      chunks: 0,
      model: existing.modelId,
      skipped: true,
    });
  }

  progress({
    stage: "preparing",
    chunk: 0,
    total: 0,
    etaSec: null,
    message: "מכין את הטקסט",
  });
  const text = preprocessForTts(source, { model: settings.voiceModel });
  const chunks = chunkText(text);
  if (chunks.length === 0) return fail("VALIDATION_ERROR", "התסריט ריק");

  const ffmpeg = await detectFfmpeg();
  if (chunks.length > 1 && !ffmpeg.available) {
    return fail("NO_FFMPEG", "ffmpeg לא מותקן, ואי אפשר לתפור פרק ארוך בלעדיו", {
      hint: ffmpeg.installHint,
    });
  }

  const tts = getTts();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pagecast-narrate-"));
  const parts: string[] = [];
  const perChunk: {
    text: string;
    alignment: Awaited<ReturnType<typeof tts.synthesize>>["alignment"];
    durationSec: number;
  }[] = [];
  let modelUsed: string = settings.voiceModel;
  const startedAt = Date.now();

  try {
    for (const chunk of chunks) {
      if (opts.signal?.aborted) return fail("PROVIDER_ERROR", "ההפקה בוטלה");
      const done = chunk.index;
      const elapsed = (Date.now() - startedAt) / 1000;
      const eta = done > 0 ? Math.round((elapsed / done) * (chunks.length - done)) : null;
      progress({
        stage: "synthesizing",
        chunk: done + 1,
        total: chunks.length,
        etaSec: eta,
        message: `מקריאה קטע ${done + 1} מתוך ${chunks.length}`,
      });
      const res = await tts.synthesize(chunk.text, {
        voiceId: settings.voiceId,
        model: settings.voiceModel,
        settings: settings.voiceSettings,
        withTimestamps: true,
        previousText: neighbour(chunks, chunk.index - 1),
        nextText: neighbour(chunks, chunk.index + 1),
      });
      modelUsed = res.model;
      const partPath = path.join(
        tmpDir,
        `part-${String(chunk.index).padStart(3, "0")}.mp3`,
      );
      await fs.writeFile(partPath, res.audio);
      parts.push(partPath);
      const alignEnd = res.alignment?.endTimes.at(-1);
      const durationSec = ffmpeg.available
        ? await probeDurationSec(partPath)
        : (alignEnd ?? (countWords(chunk.text) / 150) * 60);
      perChunk.push({ text: chunk.text, alignment: res.alignment, durationSec });
    }

    progress({
      stage: "stitching",
      chunk: chunks.length,
      total: chunks.length,
      etaSec: 0,
      message: "תופר את הקטעים",
    });
    const outPath = path.join(tmpDir, "episode.mp3");
    await concatMp3(parts, outPath);
    const totalDuration = ffmpeg.available
      ? await probeDurationSec(outPath)
      : perChunk.reduce((a, c) => a + c.durationSec, 0);

    progress({
      stage: "aligning",
      chunk: chunks.length,
      total: chunks.length,
      etaSec: 0,
      message: "מסנכרן את הטרנסקריפט",
    });
    let offset = 0;
    const alignment = buildSentenceAlignment(
      perChunk.map((c) => {
        const item = {
          text: c.text,
          alignment: c.alignment,
          offsetSec: offset,
          durationSec: c.durationSec,
        };
        offset += c.durationSec;
        return item;
      }),
    );

    progress({
      stage: "saving",
      chunk: chunks.length,
      total: chunks.length,
      etaSec: 0,
      message: "שומר",
    });
    const audio = await fs.readFile(outPath);
    const attached = await attachAudio({
      episodeId,
      audio,
      durationSec: totalDuration,
      voiceId: settings.voiceId,
      modelId:
        modelUsed === "eleven_multilingual_v2"
          ? "eleven_multilingual_v2"
          : settings.voiceModel,
      voiceSettings: settings.voiceSettings,
      scriptHash: hash,
      alignment,
    });
    if (!attached.ok) return attached;
    logger.info(
      { episodeId, chunks: chunks.length, durationSec: totalDuration, model: modelUsed },
      "narration produced",
    );
    return ok({
      assetId: attached.data.id,
      durationSec: totalDuration,
      sizeBytes: attached.data.sizeBytes,
      chunks: chunks.length,
      model: modelUsed,
      skipped: false,
    });
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e };
    logger.error(
      { episodeId, err: e instanceof Error ? e.message : String(e) },
      "narration failed",
    );
    return fail("PROVIDER_ERROR", "ההפקה נכשלה", {
      hint: e instanceof Error ? e.message : undefined,
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function neighbour(chunks: Chunk[], i: number): string | undefined {
  const c = chunks[i];
  if (!c) return undefined;
  // ElevenLabs uses previous/next text for prosody continuity; a few hundred chars suffice.
  return i < 0 ? undefined : c.text.slice(i > 0 ? -600 : 0, i > 0 ? undefined : 600);
}
