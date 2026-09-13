"use client";

import { create } from "zustand";

export interface PlayerTrack {
  episodeId: string;
  title: string;
  author: string;
  cardSvg: string;
  coverUrl?: string;
  durationSec: number;
  /** Where to resume from, in seconds. */
  startAt: number;
}

export const RATES = [0.8, 0.9, 1, 1.1, 1.2, 1.35, 1.5] as const;
export type Rate = (typeof RATES)[number];

interface PlayerState {
  track: PlayerTrack | null;
  queue: PlayerTrack[];
  playing: boolean;
  /** True while the browser is fetching/decoding. */
  buffering: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  error: string | null;
  /** Bumps whenever the UI asks the <audio> element to seek. */
  seekRequest: { t: number; n: number } | null;
  /** Bumps whenever the UI asks to (re)load a track; `autoplay` decides play(). */
  loadRequest: { n: number; autoplay: boolean } | null;
  /** `ended` count so playlist logic can react. */
  endedCount: number;

  load: (
    track: PlayerTrack,
    opts?: { autoplay?: boolean; queue?: PlayerTrack[] },
  ) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (deltaSec: number) => void;
  setRate: (r: number) => void;
  next: () => boolean;
  /** Internal, called by the <audio> element bridge. */
  _sync: (
    patch: Partial<
      Pick<PlayerState, "playing" | "buffering" | "currentTime" | "duration" | "error">
    >,
  ) => void;
  _ended: () => void;
  clear: () => void;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  track: null,
  queue: [],
  playing: false,
  buffering: false,
  currentTime: 0,
  duration: 0,
  rate: 1,
  error: null,
  seekRequest: null,
  loadRequest: null,
  endedCount: 0,

  load: (track, opts) => {
    const same = get().track?.episodeId === track.episodeId;
    set({
      track,
      queue: opts?.queue ?? (same ? get().queue : []),
      currentTime: track.startAt,
      duration: track.durationSec,
      error: null,
      loadRequest: same
        ? get().loadRequest && { n: get().loadRequest!.n, autoplay: false }
        : { n: (get().loadRequest?.n ?? 0) + 1, autoplay: opts?.autoplay ?? true },
      playing: same ? get().playing : (opts?.autoplay ?? true),
    });
    if (same && opts?.autoplay) get().play();
  },
  play: () => set({ playing: true, error: null }),
  pause: () => set({ playing: false }),
  toggle: () => set((s) => ({ playing: !s.playing, error: null })),
  seek: (t) =>
    set((s) => {
      const clamped = Math.max(0, Math.min(t, s.duration || t));
      return {
        currentTime: clamped,
        seekRequest: { t: clamped, n: (s.seekRequest?.n ?? 0) + 1 },
      };
    }),
  skip: (d) => get().seek(get().currentTime + d),
  setRate: (r) => set({ rate: Math.max(0.5, Math.min(2, r)) }),
  next: () => {
    const { queue, track } = get();
    const idx = queue.findIndex((q) => q.episodeId === track?.episodeId);
    const nextTrack = queue[idx + 1];
    if (!nextTrack) return false;
    get().load({ ...nextTrack, startAt: 0 }, { autoplay: true, queue });
    return true;
  },
  _sync: (patch) => set(patch),
  _ended: () => set((s) => ({ playing: false, endedCount: s.endedCount + 1 })),
  clear: () =>
    set({ track: null, queue: [], playing: false, currentTime: 0, duration: 0 }),
}));

/** Pure helper for UI: whether a given episode is the one loaded in the player. */
export function isCurrent(track: PlayerTrack | null, episodeId: string): boolean {
  return track?.episodeId === episodeId;
}
