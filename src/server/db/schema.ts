import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { DomainId } from "@/lib/domains";
import type { EpisodeKind, EpisodeStatus } from "@/lib/schemas/episode";
import type { Theme, VoiceModel, VoiceSettings } from "@/lib/schemas/settings";

export const episodes = sqliteTable(
  "episodes",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    titleEn: text("title_en"),
    author: text("author").notNull(),
    authorEn: text("author_en"),
    year: integer("year"),
    domain: text("domain").$type<DomainId>().notNull(),
    kind: text("kind").$type<EpisodeKind>().notNull().default("nonfiction"),
    message: text("message").notNull(),
    summaryMd: text("summary_md").notNull(),
    script: text("script").notNull(),
    performedScript: text("performed_script"),
    takeaways: text("takeaways", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    takeawaysDone: text("takeaways_done", { mode: "json" })
      .$type<boolean[]>()
      .notNull()
      .default([]),
    caveat: text("caveat").notNull().default(""),
    knowledgeToday: text("knowledge_today"),
    coverUrl: text("cover_url"),
    cardSvg: text("card_svg").notNull(),
    status: text("status").$type<EpisodeStatus>().notNull().default("new"),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("episodes_domain_idx").on(t.domain),
    index("episodes_status_idx").on(t.status),
    index("episodes_created_idx").on(t.createdAt),
  ],
);

export const audioAssets = sqliteTable(
  "audio_assets",
  {
    id: text("id").primaryKey(),
    episodeId: text("episode_id")
      .notNull()
      .unique()
      .references(() => episodes.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    durationSec: real("duration_sec").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    voiceId: text("voice_id").notNull(),
    modelId: text("model_id").$type<VoiceModel>().notNull(),
    voiceSettings: text("voice_settings", { mode: "json" })
      .$type<VoiceSettings>()
      .notNull(),
    scriptHash: text("script_hash").notNull(),
    alignment: text("alignment", { mode: "json" }).$type<SentenceAlignment[]>(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("audio_assets_episode_idx").on(t.episodeId)],
);

export interface SentenceAlignment {
  start: number;
  end: number;
  text: string;
}

export const listenProgress = sqliteTable("listen_progress", {
  episodeId: text("episode_id")
    .primaryKey()
    .references(() => episodes.id, { onDelete: "cascade" }),
  positionSec: real("position_sec").notNull().default(0),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at").notNull(),
});

export const playlists = sqliteTable("playlists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const playlistItems = sqliteTable(
  "playlist_items",
  {
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    episodeId: text("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.episodeId] })],
);

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  podcastName: text("podcast_name").notNull(),
  hostName: text("host_name").notNull().default(""),
  voiceId: text("voice_id"),
  voiceName: text("voice_name"),
  voiceModel: text("voice_model").$type<VoiceModel>().notNull(),
  voiceSettings: text("voice_settings", { mode: "json" })
    .$type<VoiceSettings>()
    .notNull(),
  defaultRate: real("default_rate").notNull().default(1),
  theme: text("theme").$type<Theme>().notNull().default("auto"),
  onboardingDone: integer("onboarding_done", { mode: "boolean" })
    .notNull()
    .default(false),
  pricePerChar: real("price_per_char").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Cached ElevenLabs voice previews, keyed by voice + model + settings hash. */
export const voicePreviews = sqliteTable("voice_previews", {
  key: text("key").primaryKey(),
  voiceId: text("voice_id").notNull(),
  path: text("path").notNull(),
  createdAt: text("created_at").notNull(),
});

export type EpisodeRow = typeof episodes.$inferSelect;
export type EpisodeInsert = typeof episodes.$inferInsert;
export type AudioAssetRow = typeof audioAssets.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type PlaylistRow = typeof playlists.$inferSelect;
