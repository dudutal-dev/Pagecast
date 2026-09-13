"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/store/player";
import { api } from "@/lib/api";
import { svgToDataUri } from "@/lib/svg/bookCard";
import { useSettings } from "@/components/providers/SettingsProvider";
import { registerAudioElement, resumeAudioContext } from "./audioElement";

const SAVE_EVERY_MS = 5000;

/**
 * The one <audio> element in the app. Lives in the root shell so playback
 * survives navigation. Bridges the zustand store <-> the element, handles
 * MediaSession (lock screen / headphones) and persists listening progress.
 */
export function GlobalPlayer() {
  const ref = useRef<HTMLAudioElement>(null);
  const { settings } = useSettings();
  const track = usePlayer((s) => s.track);
  const playing = usePlayer((s) => s.playing);
  const rate = usePlayer((s) => s.rate);
  const seekRequest = usePlayer((s) => s.seekRequest);
  const loadRequest = usePlayer((s) => s.loadRequest);
  const lastSaved = useRef(0);

  // Default playback rate from settings, once.
  useEffect(() => {
    usePlayer.getState().setRate(settings.defaultRate);
  }, [settings.defaultRate]);

  useEffect(() => {
    registerAudioElement(ref.current);
    return () => registerAudioElement(null);
  }, []);

  // Element events -> store
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = usePlayer.getState()._sync;
    const onTime = () => {
      sync({ currentTime: el.currentTime });
      maybeSave(el, false);
    };
    const onDuration = () => {
      if (Number.isFinite(el.duration) && el.duration > 0)
        sync({ duration: el.duration });
    };
    const onPlay = () => sync({ playing: true, buffering: false });
    const onPause = () => {
      sync({ playing: false });
      maybeSave(el, true);
    };
    const onWaiting = () => sync({ buffering: true });
    const onCanPlay = () => sync({ buffering: false });
    const onEnded = () => {
      void save(el, true);
      usePlayer.getState()._ended();
      usePlayer.getState().next();
    };
    const onError = () => {
      const code = el.error?.code;
      sync({
        playing: false,
        buffering: false,
        error:
          code === 4
            ? "קובץ השמע לא נמצא או לא נתמך. נסה להפיק מחדש."
            : "לא הצלחנו לנגן. בדוק את החיבור ונסה שוב.",
      });
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("durationchange", onDuration);
    el.addEventListener("loadedmetadata", onDuration);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("playing", onCanPlay);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", onDuration);
      el.removeEventListener("loadedmetadata", onDuration);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("playing", onCanPlay);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function maybeSave(el: HTMLAudioElement, force: boolean) {
    const now = Date.now();
    if (!force && now - lastSaved.current < SAVE_EVERY_MS) return;
    lastSaved.current = now;
    void save(el, false);
  }

  async function save(el: HTMLAudioElement, completed: boolean) {
    const t = usePlayer.getState().track;
    if (!t) return;
    const duration =
      Number.isFinite(el.duration) && el.duration > 0 ? el.duration : t.durationSec;
    const positionSec = completed ? duration : el.currentTime;
    try {
      await api.patch(`/api/episodes/${t.episodeId}/progress`, {
        positionSec: Math.round(positionSec * 10) / 10,
        durationSec: Math.round(duration * 10) / 10,
      });
    } catch {
      /* progress is best-effort */
    }
  }

  // Load requests
  useEffect(() => {
    const el = ref.current;
    if (!el || !track || !loadRequest) return;
    el.src = `/api/audio/${track.episodeId}`;
    el.currentTime = track.startAt;
    el.playbackRate = usePlayer.getState().rate;
    el.load();
    if (loadRequest.autoplay) {
      void resumeAudioContext();
      el.play().catch(() => usePlayer.getState()._sync({ playing: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRequest?.n]);

  // Play / pause intent
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    if (playing && el.paused) {
      void resumeAudioContext();
      el.play().catch(() => usePlayer.getState()._sync({ playing: false }));
    } else if (!playing && !el.paused) el.pause();
  }, [playing, track]);

  // Seek intent
  useEffect(() => {
    const el = ref.current;
    if (!el || !seekRequest) return;
    if (Number.isFinite(seekRequest.t)) el.currentTime = seekRequest.t;
  }, [seekRequest]);

  // Rate
  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
  }, [rate]);

  // MediaSession
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !track)
      return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: track.title,
      artist: track.author,
      album: settings.podcastName,
      artwork: [
        {
          src: track.coverUrl ?? svgToDataUri(track.cardSvg),
          sizes: "600x800",
          type: track.coverUrl ? "image/jpeg" : "image/svg+xml",
        },
      ],
    });
    const s = usePlayer.getState();
    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ["play", () => usePlayer.getState().play()],
      ["pause", () => usePlayer.getState().pause()],
      ["seekbackward", (d) => usePlayer.getState().skip(-(d.seekOffset ?? 15))],
      ["seekforward", (d) => usePlayer.getState().skip(d.seekOffset ?? 30)],
      ["seekto", (d) => d.seekTime != null && usePlayer.getState().seek(d.seekTime)],
      ["nexttrack", s.queue.length > 1 ? () => usePlayer.getState().next() : null],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* unsupported action */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      }
    };
  }, [track, settings.podcastName]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = track
      ? playing
        ? "playing"
        : "paused"
      : "none";
  }, [playing, track]);

  return <audio ref={ref} preload="metadata" className="hidden" aria-hidden />;
}
