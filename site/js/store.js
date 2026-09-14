/* Listener state, kept on the device (localStorage). Nothing leaves the phone. */
const KEY = "pagecast:v1";

const DEFAULT = {
  progress: {}, // slug -> { pos, done, at }
  favorites: [],
  notes: {}, // slug -> text
  ticks: {}, // slug -> boolean[]
  paths: [], // { id, name, slugs: [] }
  settings: { theme: "light", rate: 1 },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT),
      ...parsed,
      settings: { ...DEFAULT.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

let state = load();
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: keep in memory */
  }
  for (const fn of listeners) fn(state);
}

export const store = {
  get() {
    return state;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  setProgress(slug, pos, durationSec) {
    const p = state.progress[slug] || { pos: 0, done: false };
    const done = p.done || (durationSec > 0 && pos >= durationSec - 3);
    state.progress[slug] = { pos: Math.max(0, pos), done, at: Date.now() };
    save();
  },
  markDone(slug, done) {
    const p = state.progress[slug] || { pos: 0 };
    state.progress[slug] = { ...p, done, pos: done ? p.pos : 0, at: Date.now() };
    save();
  },
  isFavorite(slug) {
    return state.favorites.includes(slug);
  },
  toggleFavorite(slug) {
    state.favorites = state.favorites.includes(slug)
      ? state.favorites.filter((s) => s !== slug)
      : [...state.favorites, slug];
    save();
    return state.favorites.includes(slug);
  },
  setNote(slug, text) {
    state.notes[slug] = text;
    save();
  },
  setTicks(slug, arr) {
    state.ticks[slug] = arr;
    save();
  },
  addPath(name) {
    const id = "p" + Date.now().toString(36);
    state.paths.push({ id, name, slugs: [] });
    save();
    return id;
  },
  renamePath(id, name) {
    const p = state.paths.find((x) => x.id === id);
    if (p) p.name = name;
    save();
  },
  removePath(id) {
    state.paths = state.paths.filter((x) => x.id !== id);
    save();
  },
  pathAdd(id, slug) {
    const p = state.paths.find((x) => x.id === id);
    if (p && !p.slugs.includes(slug)) p.slugs.push(slug);
    save();
  },
  pathRemove(id, slug) {
    const p = state.paths.find((x) => x.id === id);
    if (p) p.slugs = p.slugs.filter((s) => s !== slug);
    save();
  },
  pathMove(id, slug, delta) {
    const p = state.paths.find((x) => x.id === id);
    if (!p) return;
    const i = p.slugs.indexOf(slug);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= p.slugs.length) return;
    [p.slugs[i], p.slugs[j]] = [p.slugs[j], p.slugs[i]];
    save();
  },
  setSetting(k, v) {
    state.settings[k] = v;
    save();
  },
  reset() {
    state = structuredClone(DEFAULT);
    save();
  },
  export() {
    return JSON.stringify(state, null, 2);
  },
  import(json) {
    const parsed = JSON.parse(json);
    state = { ...structuredClone(DEFAULT), ...parsed };
    save();
  },
};
