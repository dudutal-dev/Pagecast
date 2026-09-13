/* The single audio player: one <audio>, MediaSession, progress persistence,
   sentence tracking, continuous play for paths. */
import { store } from "./store.js";

const audio = document.getElementById("audio");
const el = document.getElementById("player");
const listeners = new Set();

const state = {
  ep: null, // episode object
  queue: [], // slugs for continuous play
  playing: false,
  rate: store.get().settings.rate || 1,
  time: 0,
  duration: 0,
  activeIdx: -1,
  error: null,
};

let episodesBySlug = () => null;
let lastSave = 0;
let analyser = null;
let ctx = null;

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

function findActive(alignment, t) {
  if (!alignment) return -1;
  let lo = 0,
    hi = alignment.length - 1,
    ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (alignment[mid][0] <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

function saveProgress(force = false) {
  if (!state.ep) return;
  const now = Date.now();
  if (!force && now - lastSave < 5000) return;
  lastSave = now;
  store.setProgress(
    state.ep.slug,
    audio.currentTime,
    state.duration || state.ep.durationSec || 0,
  );
}

audio.addEventListener("timeupdate", () => {
  state.time = audio.currentTime;
  const idx = findActive(state.ep?.alignment, state.time);
  if (idx !== state.activeIdx) state.activeIdx = idx;
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
      state.ep.slug,
      state.duration || state.ep.durationSec,
      state.duration || state.ep.durationSec,
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
    title: ep.title,
    artist: ep.author,
    album: "פייג'קאסט",
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

export function load(ep, { autoplay = true, from = null, queue = null } = {}) {
  if (!ep || !ep.audio) return false;
  const same = state.ep && state.ep.slug === ep.slug;
  if (queue) state.queue = queue;
  else if (!same) state.queue = [];
  if (!same) {
    state.ep = ep;
    state.duration = ep.durationSec || 0;
    state.activeIdx = -1;
    const saved = store.get().progress[ep.slug];
    const start =
      from != null
        ? from
        : saved &&
            !saved.done &&
            saved.pos > 5 &&
            saved.pos < (ep.durationSec || Infinity) - 5
          ? saved.pos
          : 0;
    audio.src = ep.audio;
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
  ctx?.resume?.();
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
  load(ep, { autoplay: true, from: 0, queue: state.queue });
  return true;
}
export function prev() {
  if (!state.ep || state.queue.length < 2) return false;
  const i = state.queue.indexOf(state.ep.slug);
  const s = state.queue[i - 1];
  const ep = s && episodesBySlug(s);
  if (!ep || !ep.audio) return false;
  load(ep, { autoplay: true, from: 0, queue: state.queue });
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

/** Waveform analyser (created on first user gesture). */
export function getAnalyser() {
  if (analyser) return analyser;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const src = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.85;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    return analyser;
  } catch {
    return null;
  }
}

window.addEventListener("pagehide", () => saveProgress(true));
