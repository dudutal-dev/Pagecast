import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  audioAssets,
  episodes,
  listenProgress,
  type EpisodeRow,
  type AudioAssetRow,
} from "@/server/db/schema";
import { newEpisodeId, nowIso } from "@/lib/ids";
import { buildBookCard, detectCardLang } from "@/lib/svg/bookCard";
import type {
  Episode,
  EpisodeCard,
  EpisodeInput,
  EpisodePatch,
  EpisodeStatus,
  LibraryQuery,
} from "@/lib/schemas/episode";
import { fail, ok, type Result } from "@/lib/result";

export interface EpisodeWithAudio extends Episode {
  audio: {
    assetId: string;
    durationSec: number;
    sizeBytes: number;
    voiceId: string;
    modelId: string;
    scriptHash: string;
    hasAlignment: boolean;
    createdAt: string;
  } | null;
  positionSec: number;
}

function toEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    title: row.title,
    titleEn: row.titleEn ?? undefined,
    author: row.author,
    authorEn: row.authorEn ?? undefined,
    year: row.year ?? undefined,
    domain: row.domain,
    kind: row.kind,
    message: row.message,
    summaryMd: row.summaryMd,
    script: row.script,
    performedScript: row.performedScript,
    takeaways: row.takeaways,
    takeawaysDone: row.takeawaysDone,
    caveat: row.caveat,
    knowledgeToday: row.knowledgeToday ?? undefined,
    coverUrl: row.coverUrl ?? undefined,
    cardSvg: row.cardSvg,
    status: row.status,
    favorite: row.favorite,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function makeCard(
  input: Pick<EpisodeInput, "title" | "author" | "domain" | "message">,
): string {
  // The subtitle line is tiny at grid size; only short messages stay legible there.
  const subtitle = input.message.length <= 70 ? input.message : undefined;
  return buildBookCard({
    title: input.title,
    author: input.author,
    domain: input.domain,
    ...(subtitle ? { subtitle } : {}),
    lang: detectCardLang(input.title),
  });
}

export function listEpisodes(q: LibraryQuery): EpisodeCard[] {
  const db = getDb();
  const filters = [];
  if (q.q) {
    const term = `%${q.q.replace(/[%_]/g, "")}%`;
    filters.push(
      or(
        like(episodes.title, term),
        like(episodes.titleEn, term),
        like(episodes.author, term),
        like(episodes.authorEn, term),
        like(episodes.message, term),
      ),
    );
  }
  if (q.domain) filters.push(eq(episodes.domain, q.domain));
  if (q.status) filters.push(eq(episodes.status, q.status));
  if (q.favorite !== undefined) filters.push(eq(episodes.favorite, q.favorite));

  const order =
    q.sort === "title"
      ? [asc(episodes.title)]
      : q.sort === "duration"
        ? [desc(sql`coalesce(${audioAssets.durationSec}, 0)`), desc(episodes.createdAt)]
        : q.sort === "unplayed"
          ? [
              sql`case ${episodes.status} when 'new' then 0 when 'in_progress' then 1 else 2 end`,
              desc(episodes.createdAt),
            ]
          : [desc(episodes.createdAt)];

  const rows = db
    .select({
      ep: episodes,
      durationSec: audioAssets.durationSec,
      positionSec: listenProgress.positionSec,
    })
    .from(episodes)
    .leftJoin(audioAssets, eq(audioAssets.episodeId, episodes.id))
    .leftJoin(listenProgress, eq(listenProgress.episodeId, episodes.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(...order)
    .all();

  return rows.map(({ ep, durationSec, positionSec }) => ({
    id: ep.id,
    title: ep.title,
    titleEn: ep.titleEn ?? undefined,
    author: ep.author,
    domain: ep.domain,
    kind: ep.kind,
    message: ep.message,
    cardSvg: ep.cardSvg,
    coverUrl: ep.coverUrl ?? undefined,
    status: ep.status,
    favorite: ep.favorite,
    createdAt: ep.createdAt,
    durationSec: durationSec ?? null,
    positionSec: positionSec ?? 0,
    hasAudio: durationSec != null,
  }));
}

export function getEpisode(id: string): Result<EpisodeWithAudio> {
  const db = getDb();
  const row = db.select().from(episodes).where(eq(episodes.id, id)).get();
  if (!row) return fail("NOT_FOUND", "הפרק לא נמצא");
  const asset = db.select().from(audioAssets).where(eq(audioAssets.episodeId, id)).get();
  const progress = db
    .select()
    .from(listenProgress)
    .where(eq(listenProgress.episodeId, id))
    .get();
  return ok({
    ...toEpisode(row),
    audio: asset ? toAudioSummary(asset) : null,
    positionSec: progress?.positionSec ?? 0,
  });
}

function toAudioSummary(a: AudioAssetRow): EpisodeWithAudio["audio"] {
  return {
    assetId: a.id,
    durationSec: a.durationSec,
    sizeBytes: a.sizeBytes,
    voiceId: a.voiceId,
    modelId: a.modelId,
    scriptHash: a.scriptHash,
    hasAlignment: Array.isArray(a.alignment) && a.alignment.length > 0,
    createdAt: a.createdAt,
  };
}

export function createEpisode(input: EpisodeInput): Result<Episode> {
  const db = getDb();
  const now = nowIso();
  const id = newEpisodeId();
  db.insert(episodes)
    .values({
      id,
      title: input.title,
      titleEn: input.titleEn ?? null,
      author: input.author,
      authorEn: input.authorEn ?? null,
      year: input.year ?? null,
      domain: input.domain,
      kind: input.kind,
      message: input.message,
      summaryMd: input.summaryMd,
      script: input.script,
      performedScript: null,
      takeaways: input.takeaways,
      takeawaysDone: input.takeaways.map(() => false),
      caveat: input.caveat,
      knowledgeToday: input.knowledgeToday ?? null,
      coverUrl: input.coverUrl ?? null,
      cardSvg: makeCard(input),
      status: "new",
      favorite: false,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const row = db.select().from(episodes).where(eq(episodes.id, id)).get();
  return ok(toEpisode(row!));
}

export function updateEpisode(id: string, patch: EpisodePatch): Result<Episode> {
  const db = getDb();
  const existing = db.select().from(episodes).where(eq(episodes.id, id)).get();
  if (!existing) return fail("NOT_FOUND", "הפרק לא נמצא");

  const { regenerateCard, ...rest } = patch;
  const set: Partial<typeof episodes.$inferInsert> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) (set as Record<string, unknown>)[k] = v;
  }
  // Nullable text columns: undefined-from-transform means "leave as is"; explicit "" clears.
  if (patch.takeaways) {
    const prev = existing.takeawaysDone;
    set.takeawaysDone = patch.takeaways.map((_, i) => prev[i] ?? false);
  }
  if (patch.takeawaysDone) {
    set.takeawaysDone = existing.takeaways.map(
      (_, i) => patch.takeawaysDone?.[i] ?? false,
    );
  }
  const identityChanged =
    (patch.title && patch.title !== existing.title) ||
    (patch.author && patch.author !== existing.author) ||
    (patch.domain && patch.domain !== existing.domain) ||
    (patch.message && patch.message !== existing.message);
  if (regenerateCard || identityChanged) {
    set.cardSvg = makeCard({
      title: patch.title ?? existing.title,
      author: patch.author ?? existing.author,
      domain: patch.domain ?? existing.domain,
      message: patch.message ?? existing.message,
    });
  }
  set.updatedAt = nowIso();
  db.update(episodes).set(set).where(eq(episodes.id, id)).run();
  const row = db.select().from(episodes).where(eq(episodes.id, id)).get();
  return ok(toEpisode(row!));
}

export function deleteEpisode(
  id: string,
): Result<{ id: string; audioPath: string | null }> {
  const db = getDb();
  const asset = db.select().from(audioAssets).where(eq(audioAssets.episodeId, id)).get();
  const res = db.delete(episodes).where(eq(episodes.id, id)).run();
  if (res.changes === 0) return fail("NOT_FOUND", "הפרק לא נמצא");
  return ok({ id, audioPath: asset?.path ?? null });
}

/**
 * Saves listening position and derives status. `done` is sticky: once completed,
 * scrubbing back does not demote the episode.
 */
export function saveProgress(
  id: string,
  positionSec: number,
  durationSec: number | null,
): Result<{ positionSec: number; status: EpisodeStatus }> {
  const db = getDb();
  const row = db.select().from(episodes).where(eq(episodes.id, id)).get();
  if (!row) return fail("NOT_FOUND", "הפרק לא נמצא");
  const now = nowIso();
  const completed =
    durationSec != null && durationSec > 0 && positionSec >= durationSec - 3;
  const status: EpisodeStatus =
    row.status === "done" || completed ? "done" : positionSec > 5 ? "in_progress" : "new";
  db.insert(listenProgress)
    .values({
      episodeId: id,
      positionSec,
      completedAt: completed ? now : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: listenProgress.episodeId,
      set: { positionSec, updatedAt: now, ...(completed ? { completedAt: now } : {}) },
    })
    .run();
  if (status !== row.status) {
    db.update(episodes).set({ status, updatedAt: now }).where(eq(episodes.id, id)).run();
  }
  return ok({ positionSec, status });
}

export function markStatus(id: string, status: EpisodeStatus): Result<Episode> {
  const db = getDb();
  const now = nowIso();
  const res = db
    .update(episodes)
    .set({ status, updatedAt: now })
    .where(eq(episodes.id, id))
    .run();
  if (res.changes === 0) return fail("NOT_FOUND", "הפרק לא נמצא");
  if (status === "new") {
    db.delete(listenProgress).where(eq(listenProgress.episodeId, id)).run();
  }
  const row = db.select().from(episodes).where(eq(episodes.id, id)).get();
  return ok(toEpisode(row!));
}

export function countEpisodes(): number {
  const db = getDb();
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(episodes)
      .get()?.n ?? 0
  );
}
