import { z } from "zod";
import { DOMAIN_IDS } from "@/lib/domains";

export const EPISODE_STATUSES = ["new", "in_progress", "done"] as const;
export type EpisodeStatus = (typeof EPISODE_STATUSES)[number];

export const EPISODE_KINDS = ["nonfiction", "fiction"] as const;
export type EpisodeKind = (typeof EPISODE_KINDS)[number];

const trimmed = z.string().trim();
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => v === undefined || /^https?:\/\/\S+$/i.test(v), {
    message: "קישור הכריכה חייב להתחיל ב-http:// או https://",
  });

/**
 * What the chat / AI / manual form is allowed to hand us. This is the contract with
 * book-message-expert: an Episode object WITHOUT id, timestamps, cardSvg or audio.
 * Tolerant of missing non-essential fields, strict about the essentials.
 */
const coreShape = {
  title: trimmed.min(1, "חסר כותר"),
  author: trimmed.min(1, "חסר שם מחבר"),
  domain: z.enum(DOMAIN_IDS, { message: "תחום לא מוכר" }),
  message: trimmed.min(1, "חסר המסר במשפט אחד"),
  summaryMd: trimmed.min(1, "חסר תקציר"),
  script: trimmed.min(1, "חסר תסריט קריינות"),
};

export const episodeInputSchema = z.object({
  ...coreShape,
  /** Optional stable key (a-z, 0-9, dashes) for authored content; ingest upserts by it. */
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: אותיות לטיניות קטנות, ספרות ומקפים בלבד")
    .optional(),
  /** Optional pre-written performed script (for the ear, with v3 tags where wanted). */
  performedScript: optionalText,
  titleEn: optionalText,
  authorEn: optionalText,
  year: z.coerce.number().int().min(-3000).max(2100).optional().catch(undefined),
  kind: z.enum(EPISODE_KINDS).default("nonfiction"),
  takeaways: z.array(trimmed.min(1)).default([]),
  caveat: z.string().trim().default(""),
  knowledgeToday: optionalText,
  coverUrl: optionalUrl,
  notes: z.string().trim().default(""),
});
export type EpisodeInput = z.infer<typeof episodeInputSchema>;

/** Full persisted episode as returned by the API. */
export const episodeSchema = episodeInputSchema.omit({ performedScript: true }).extend({
  id: z.string(),
  slug: z.string().nullable(),
  cardSvg: z.string(),
  performedScript: z.string().nullable(),
  status: z.enum(EPISODE_STATUSES),
  favorite: z.boolean(),
  takeawaysDone: z.array(z.boolean()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Episode = z.infer<typeof episodeSchema>;

/**
 * Editable fields via PATCH. No defaults here (a default would silently reset the
 * column on every patch). `null` clears a nullable column; `undefined` leaves it.
 */
const clearableText = z
  .string()
  .trim()
  .nullable()
  .transform((v) => (v === null || v.length === 0 ? null : v));

export const episodePatchSchema = z
  .object({
    ...coreShape,
    titleEn: clearableText,
    authorEn: clearableText,
    year: z.coerce.number().int().min(-3000).max(2100).nullable(),
    kind: z.enum(EPISODE_KINDS),
    takeaways: z.array(trimmed.min(1)),
    caveat: z.string().trim(),
    knowledgeToday: clearableText,
    coverUrl: clearableText.refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), {
      message: "קישור הכריכה חייב להתחיל ב-http:// או https://",
    }),
    notes: z.string().trim(),
    performedScript: z.string().nullable(),
    favorite: z.boolean(),
    status: z.enum(EPISODE_STATUSES),
    takeawaysDone: z.array(z.boolean()),
    regenerateCard: z.boolean(),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "אין שדות לעדכון",
  });
export type EpisodePatch = z.infer<typeof episodePatchSchema>;

/** Library listing item: enough for a card, without the heavy text fields. */
export const episodeCardSchema = episodeSchema
  .pick({
    id: true,
    title: true,
    titleEn: true,
    author: true,
    domain: true,
    kind: true,
    message: true,
    cardSvg: true,
    coverUrl: true,
    status: true,
    favorite: true,
    createdAt: true,
  })
  .extend({
    durationSec: z.number().nullable(),
    positionSec: z.number(),
    hasAudio: z.boolean(),
  });
export type EpisodeCard = z.infer<typeof episodeCardSchema>;

/** The shape the LLM returns for an unknown book. */
export const unknownBookSchema = z.object({
  unknown: z.literal(true),
  reason: z.string().optional(),
});

export const LIBRARY_SORTS = ["newest", "title", "duration", "unplayed"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export const libraryQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  domain: z.enum(DOMAIN_IDS).optional(),
  status: z.enum(EPISODE_STATUSES).optional(),
  favorite: z
    .enum(["1", "0"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "1")),
  sort: z.enum(LIBRARY_SORTS).default("newest"),
});
export type LibraryQuery = z.infer<typeof libraryQuerySchema>;

/** Turns a zod error into a compact, field-keyed Hebrew message list for the UI. */
export function flattenIssues(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}
