/* The single audio player: one <audio>, MediaSession, progress persistence,
   sentence tracking, continuous play for paths. */
import { store } from "./store.js";

const audio = document.getElementById("audio");
const el = document.getElementById("player");
const listeners = new Set();

const state = {
  ep: null, // episode object
  variant: "narration", // "narration" | "dialogue"
  queue: [], // slugs for continuous play
  playing: false,
  rate: store.get().settings.rate || 1,
  time: 0,
  duration: 0,
  error: null,
};

/*
 * The audio element is deliberately NOT routed through the Web Audio API. A
 * MediaElementAudioSourceNode makes the element's output depend on an
 * AudioContext, and iOS suspends that context the moment the app goes to the
 * background, which stops playback. Kept as a plain element, the system treats
 * it as media: it keeps playing behind other apps and on the lock screen.
 */
let episodesBySlug = () => null;
let lastSave = 0;

export function bindCatalog(fn) {
  episodesBySlug = fn;
}
export function onPlayer(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn(state);
}

export const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
};

/** Progress is kept per track, so the narration and the conversation do not overwrite each other. */
export function progressKey(slug, variant) {
  return variant === "dialogue" ? `${slug}#dialogue` : slug;
}

function saveProgress(force = false) {
  if (!state.ep) return;
  const now = Date.now();
  if (!force && now - lastSave < 5000) return;
  lastSave = now;
  store.setProgress(
    progressKey(state.ep.slug, state.variant),
    audio.currentTime,
    state.duration || 0,
  );
}

audio.addEventListener("timeupdate", () => {
  state.time = audio.currentTime;
  saveProgress();
  emit();
});
audio.addEventListener("loadedmetadata", () => {
  if (Number.isFinite(audio.duration)) state.duration = audio.duration;
  emit();
});
audio.addEventListener("play", () => {
  state.playing = true;
  state.error = null;
  emit();
});
audio.addEventListener("pause", () => {
  state.playing = false;
  saveProgress(true);
  emit();
});
audio.addEventListener("ended", () => {
  state.playing = false;
  if (state.ep)
    store.setProgress(
      progressKey(state.ep.slug, state.variant),
      state.duration,
      state.duration,
    );
  emit();
  next();
});
audio.addEventListener("error", () => {
  state.error = "לא הצלחנו לנגן את הקובץ. בדוק חיבור או שמור לאופליין.";
  state.playing = false;
  emit();
});

function mediaSession() {
  if (!("mediaSession" in navigator) || !state.ep) return;
  const ep = state.ep;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: state.variant === "dialogue" ? `${ep.title} · פודקאסט` : ep.title,
    artist: ep.author,
    album: "PAGECAST",
    artwork: [
      {
        src: new URL(ep.illustration, location.href).href,
        sizes: "1024x1024",
        type: ep.illustration.endsWith(".svg") ? "image/svg+xml" : "image/jpeg",
      },
    ],
  });
  const h = (a, f) => {
    try {
      navigator.mediaSession.setActionHandler(a, f);
    } catch {
      /* unsupported */
    }
  };
  h("play", () => play());
  h("pause", () => pause());
  h("seekbackward", (d) => skip(-(d.seekOffset || 15)));
  h("seekforward", (d) => skip(d.seekOffset || 30));
  h("seekto", (d) => d.seekTime != null && seek(d.seekTime));
  h("nexttrack", state.queue.length > 1 ? () => next() : null);
  h("previoustrack", state.queue.length > 1 ? () => prev() : null);
}

export function load(
  ep,
  { autoplay = true, from = null, queue = null, variant = "narration" } = {},
) {
  const track = variant === "dialogue" ? ep.dialogue : null;
  const src = variant === "dialogue" ? track?.audio : ep.audio;
  if (!ep || !src) return false;
  const same = state.ep && state.ep.slug === ep.slug && state.variant === variant;
  if (queue) state.queue = queue;
  else if (!same) state.queue = [];
  if (!same) {
    state.ep = ep;
    state.variant = variant;
    state.duration = (variant === "dialogue" ? track.durationSec : ep.durationSec) || 0;
    const saved = store.get().progress[progressKey(ep.slug, variant)];
    const start =
      from != null
        ? from
        : saved && !saved.done && saved.pos > 5 && saved.pos < state.duration - 5
          ? saved.pos
          : 0;
    audio.src = src;
    audio.load();
    audio.currentTime = start;
    state.time = start;
    audio.playbackRate = state.rate;
    el.hidden = false;
    document.documentElement.style.setProperty("--player-h", "158px");
    mediaSession();
  } else if (from != null) {
    seek(from);
  }
  if (autoplay) play();
  emit();
  return true;
}
export function play() {
  if (!state.ep) return;
  audio.play().catch(() => {
    state.playing = false;
    emit();
  });
}
export function pause() {
  audio.pause();
}
export function toggle() {
  state.playing ? pause() : play();
}
export function seek(t) {
  if (!state.ep) return;
  const max = state.duration || state.ep.durationSec || t;
  audio.currentTime = Math.max(0, Math.min(t, max));
  state.time = audio.currentTime;
  emit();
}
export function skip(d) {
  seek(audio.currentTime + d);
}
export function setRate(r) {
  state.rate = r;
  audio.playbackRate = r;
  store.setSetting("rate", r);
  emit();
}
export function next() {
  if (!state.ep || state.queue.length < 2) return false;
  const i = state.queue.indexOf(state.ep.slug);
  const s = state.queue[i + 1];
  const ep = s && episodesBySlug(s);
  if (!ep || !ep.audio) return false;
  load(ep, { autoplay: true, from: 0, queue: state.queue, variant: state.variant });
  return true;
}
export function prev() {
  if (!state.ep || state.queue.length < 2) return false;
  const i = state.queue.indexOf(state.ep.slug);
  const s = state.queue[i - 1];
  const ep = s && episodesBySlug(s);
  if (!ep || !ep.audio) return false;
  load(ep, { autoplay: true, from: 0, queue: state.queue, variant: state.variant });
  return true;
}
export function close() {
  pause();
  saveProgress(true);
  state.ep = null;
  state.queue = [];
  audio.removeAttribute("src");
  audio.load();
  el.hidden = true;
  document.documentElement.style.setProperty("--player-h", "0px");
  emit();
}
export function current() {
  return state;
}

window.addEventListener("pagehide", () => saveProgress(true));
