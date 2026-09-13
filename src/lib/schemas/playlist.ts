import { z } from "zod";

export const playlistInputSchema = z.object({
  name: z.string().trim().min(1, "חסר שם למסלול").max(80),
  episodeIds: z.array(z.string()).default([]),
});
export type PlaylistInput = z.infer<typeof playlistInputSchema>;

export const playlistSchema = z.object({
  id: z.string(),
  name: z.string(),
  episodeIds: z.array(z.string()),
  createdAt: z.string(),
});
export type Playlist = z.infer<typeof playlistSchema>;

export const playlistPatchSchema = playlistInputSchema.partial();
export type PlaylistPatch = z.infer<typeof playlistPatchSchema>;
