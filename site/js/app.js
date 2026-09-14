/* Pagecast — app: hash router, views, player wiring, PWA registration. */
import { store } from "./store.js";
import * as player from "./player.js";
import * as R from "./render.js";
import { esc } from "./markdown.js";

const main = document.getElementById("main");
const playerEl = document.getElementById("player");
let DATA = { version: "", episodes: [] };
let bySlug = {};
let route = { name: "home" };
let libQuery = { domain: "", sort: "newest", q: "" };
let bookTab = "summary";
let bookMode = "narration"; // "narration" | "dialogue"
let lastRouteKey = "";

/* ---------- boot ---------- */
async function boot() {
  applyTheme(store.get().settings.theme);
  try {
    const res = await fetch("data/episodes.json", { cache: "no-cache" });
    DATA = await res.json();
  } catch {
    main.innerHTML = `<div class="empty"><h3>לא הצלחנו לטעון את הספרייה</h3><p>בדוק חיבור ונסה שוב.</p></div>`;
    return;
  }
  bySlug = Object.fromEntries(DATA.episodes.map((e) => [e.slug, e]));
  player.bindCatalog((s) => bySlug[s]);
  player.onPlayer(renderPlayer);
  try {
    libQuery = {
      ...libQuery,
      ...JSON.parse(localStorage.getItem("pagecast:lib") || "{}"),
    };
  } catch {
    /* ignore */
  }
  window.addEventListener("hashchange", render);
  render();
  wireChrome();
  if ("serviceWorker" in navigator) {
    // A new worker takes over as soon as it installs (skipWaiting + clients.claim),
    // but this page is still running the old modules. Reload once so a returning
    // reader sees the new library instead of a cached one.
    // On the very first visit there is no previous controller, so claiming the
    // page is not an update and must not trigger a reload.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    });
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

/* ---------- router ---------- */
function parse() {
  const h = location.hash.replace(/^#\/?/, "");
  const [seg, arg] = h.split("/");
  if (!seg) return { name: "home" };
  if (seg === "book" && arg && bySlug[arg]) {
    if (route.name !== "book" || route.slug !== arg) bookMode = "narration";
    return { name: "book", slug: arg };
  }
  if (seg === "path" && arg) return { name: "path", id: arg };
  if (["library", "paths", "favorites", "settings", "about"].includes(seg))
    return { name: seg };
  return { name: "home" };
}

/** Identifies a screen, so a re-render of the same screen keeps its scroll. */
function routeKey(r) {
  return [r.name, r.slug, r.id].filter(Boolean).join("/");
}

function render() {
  route = parse();
  const st = store.get();
  const ps = player.current();
  document
    .querySelectorAll("[data-route]")
    .forEach((a) => a.classList.toggle("active", a.dataset.route === route.name));
  // Only a real navigation goes back to the top. Ticking a checkbox, switching
  // tabs or toggling a favourite re-renders in place and must not move the page.
  const key = routeKey(route);
  const navigated = key !== lastRouteKey;
  lastRouteKey = key;
  const keptScroll = window.scrollY;
  switch (route.name) {
    case "home": {
      const narrated = DATA.episodes.filter((e) => e.audio);
      main.innerHTML = R.home(DATA.episodes, st, {
        count: DATA.episodes.length,
        narrated: narrated.length,
        minutes: Math.round(narrated.reduce((a, e) => a + e.durationSec, 0) / 60),
      });
      break;
    }
    case "library":
      main.innerHTML = R.library(filtered(), st, libQuery, DATA.episodes);
      wireLibrary();
      break;
    case "favorites":
      main.innerHTML = R.favorites(
        DATA.episodes.filter((e) => st.favorites.includes(e.slug)),
        st,
      );
      break;
    case "book": {
      const ep = bySlug[route.slug];
      if (bookMode === "dialogue" && !ep.dialogue) bookMode = "narration";
      main.innerHTML = R.book(ep, st, ps, bookTab, bookMode);
      wireBook(ep);
      break;
    }
    case "paths":
      main.innerHTML = R.paths(st, DATA.episodes);
      document.getElementById("btn-new-path")?.addEventListener("click", () => {
        const name = prompt("שם המסלול:", "");
        if (name && name.trim()) {
          const id = store.addPath(name.trim());
          location.hash = `#/path/${id}`;
        }
      });
      break;
    case "path": {
      const p = st.paths.find((x) => x.id === route.id);
      if (!p) {
        location.hash = "#/paths";
        return;
      }
      main.innerHTML = R.path(p, st, DATA.episodes);
      wirePath(p);
      break;
    }
    case "settings":
      renderSettings();
      break;
    case "about":
      main.innerHTML = R.about({ version: DATA.version, count: DATA.episodes.length });
      break;
  }
  // After the new markup is in place, so the page never animates against itself.
  window.scrollTo({ top: navigated ? 0 : keptScroll, behavior: "instant" });
}

/**
 * Re-renders while keeping one element pinned where it sits on screen.
 * Switching the listening format or the tab changes how much markup sits above
 * the play button, so restoring the raw scroll offset is not enough: the
 * control the reader just pressed would still slide away under their thumb.
 */
function renderAnchored(selector) {
  const before = document.querySelector(selector)?.getBoundingClientRect().top;
  render();
  if (before == null) return;
  const after = document.querySelector(selector)?.getBoundingClientRect().top;
  if (after != null && after !== before) {
    window.scrollBy({ top: after - before, behavior: "instant" });
  }
}

function filtered() {
  const st = store.get();
  let eps = DATA.episodes.slice();
  if (libQuery.domain) eps = eps.filter((e) => e.domain === libQuery.domain);
  switch (libQuery.sort) {
    case "title":
      eps.sort((a, b) => a.title.localeCompare(b.title, "he"));
      break;
    case "duration":
      eps.sort((a, b) => (b.durationSec || 0) - (a.durationSec || 0));
      break;
    case "unplayed":
      eps.sort(
        (a, b) => rank(a, st) - rank(b, st) || b.createdAt.localeCompare(a.createdAt),
      );
      break;
    default:
      eps.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return eps;
}
const rank = (e, st) =>
  st.progress[e.slug]?.done ? 2 : st.progress[e.slug]?.pos > 5 ? 1 : 0;

function wireLibrary() {
  main.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => {
      libQuery.domain = c.dataset.domain;
      persistLib();
      render();
    }),
  );
  document.getElementById("sort")?.addEventListener("change", (e) => {
    libQuery.sort = e.target.value;
    persistLib();
    render();
  });
}
function persistLib() {
  try {
    localStorage.setItem("pagecast:lib", JSON.stringify(libQuery));
  } catch {
    /* ignore */
  }
}

/* ---------- book ---------- */
function wireBook(ep) {
  const st = store.get();
  const variant = bookMode === "dialogue" && ep.dialogue ? "dialogue" : "narration";
  main.querySelectorAll("[data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      bookMode = b.dataset.mode;
      renderAnchored(".mode-switch");
    }),
  );
  document.getElementById("btn-play")?.addEventListener("click", () => {
    const ps = player.current();
    if (ps.ep && ps.ep.slug === ep.slug && ps.variant === variant) player.toggle();
    else {
      player.load(ep, { variant });
    }
  });
  document.getElementById("btn-fav")?.addEventListener("click", () => {
    const on = store.toggleFavorite(ep.slug);
    toast(on ? "נוסף למועדפים" : "הוסר מהמועדפים");
    render();
  });
  document.getElementById("btn-done")?.addEventListener("click", () => {
    const key = variant === "dialogue" ? `${ep.slug}#dialogue` : ep.slug;
    const done = !store.get().progress[key]?.done;
    store.markDone(key, done);
    toast(done ? "סומן כהושמע" : "סומן כחדש");
    render();
  });
  document.getElementById("btn-path")?.addEventListener("click", () => {
    const paths = store.get().paths;
    if (!paths.length) {
      const name = prompt("אין עדיין מסלולים. שם למסלול חדש:", "");
      if (name && name.trim()) {
        const id = store.addPath(name.trim());
        store.pathAdd(id, ep.slug);
        toast(`נוסף למסלול "${name.trim()}"`);
      }
      return;
    }
    const choice = prompt(
      `לאיזה מסלול להוסיף? הקלד מספר:\n${paths.map((p, i) => `${i + 1}. ${p.name}`).join("\n")}\n${paths.length + 1}. מסלול חדש`,
      "1",
    );
    const n = Number(choice);
    if (!n) return;
    if (n === paths.length + 1) {
      const name = prompt("שם המסלול החדש:", "");
      if (name && name.trim()) {
        const id = store.addPath(name.trim());
        store.pathAdd(id, ep.slug);
        toast(`נוסף למסלול "${name.trim()}"`);
      }
    } else if (paths[n - 1]) {
      store.pathAdd(paths[n - 1].id, ep.slug);
      toast(`נוסף למסלול "${paths[n - 1].name}"`);
    }
  });
  main.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      bookTab = b.dataset.tab;
      renderAnchored(".tabs");
    }),
  );
  main.querySelectorAll("[data-tick]").forEach((b) =>
    b.addEventListener("click", () => {
      const ticks = (store.get().ticks[ep.slug] || ep.takeaways.map(() => false)).slice();
      const i = Number(b.dataset.tick);
      ticks[i] = !ticks[i];
      store.setTicks(ep.slug, ticks);
      render();
    }),
  );
  const notes = document.getElementById("notes");
  if (notes) {
    let t;
    notes.addEventListener("input", () => {
      document.getElementById("notes-status").textContent = "עריכה…";
      clearTimeout(t);
      t = setTimeout(() => {
        store.setNote(ep.slug, notes.value);
        document.getElementById("notes-status").textContent = "נשמר במכשיר";
      }, 600);
    });
  }
  void st;
}

/* ---------- paths ---------- */
function wirePath(p) {
  document.getElementById("btn-play-path")?.addEventListener("click", () => {
    const q = p.slugs.filter((s) => bySlug[s]?.audio);
    if (!q.length) return;
    player.load(bySlug[q[0]], { from: 0, queue: q });
  });
  document.getElementById("btn-rename-path")?.addEventListener("click", () => {
    const name = prompt("שם חדש:", p.name);
    if (name && name.trim()) {
      store.renamePath(p.id, name.trim());
      render();
    }
  });
  document.getElementById("btn-delete-path")?.addEventListener("click", () => {
    if (confirm(`למחוק את המסלול "${p.name}"?`)) {
      store.removePath(p.id);
      location.hash = "#/paths";
    }
  });
  main.querySelectorAll("[data-move]").forEach((b) =>
    b.addEventListener("click", () => {
      store.pathMove(p.id, b.dataset.slug, Number(b.dataset.move));
      render();
    }),
  );
  main.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => {
      store.pathRemove(p.id, b.dataset.remove);
      render();
    }),
  );
}

/* ---------- settings ---------- */
function renderSettings() {
  const st = store.get();
  const narrated = DATA.episodes.filter((e) => e.audio);
  const listened = Math.round(
    Object.entries(st.progress).reduce(
      (a, [slug, p]) => a + (p.done ? bySlug[slug]?.durationSec || 0 : p.pos || 0),
      0,
    ) / 60,
  );
  main.innerHTML = R.settings(st, {
    count: DATA.episodes.length,
    narrated: narrated.length,
    done: Object.values(st.progress).filter((p) => p.done).length,
    listened,
    version: DATA.version,
  });
  main
    .querySelectorAll("[data-theme]")
    .forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.theme)));
  main.querySelectorAll("[data-rate]").forEach((b) =>
    b.addEventListener("click", () => {
      player.setRate(Number(b.dataset.rate));
      renderSettings();
    }),
  );
  document.getElementById("btn-export")?.addEventListener("click", () => {
    const blob = new Blob([store.export()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pagecast-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });
  document.getElementById("import-file")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      store.import(await f.text());
      toast("הגיבוי נטען");
      renderSettings();
    } catch {
      toast("קובץ לא תקין");
    }
  });
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    if (confirm("לאפס את כל ההתקדמות, ההערות והמסלולים במכשיר הזה?")) {
      store.reset();
      renderSettings();
      toast("אופס");
    }
  });
}

/* ---------- chrome: theme, search ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", t === "light" ? "#efe9dc" : "#14171e");
}
function setTheme(t) {
  store.setSetting("theme", t);
  applyTheme(t);
  if (route.name === "settings") renderSettings();
}
/* ---------- version updates ---------- */
/**
 * Installed to the home screen, the app runs entirely from its own cache, so a
 * new library can sit on the server for days without the reader seeing it. The
 * button stays hidden until the published content version differs from the one
 * this page loaded; pressing it drops the caches and reloads. The audio cache is
 * kept, so narration already saved to the device is not downloaded twice.
 */
async function checkForUpdate() {
  if (!DATA.version) return;
  try {
    const res = await fetch("data/episodes.json", { cache: "no-store" });
    if (!res.ok) return;
    const { version } = await res.json();
    if (version && version !== DATA.version) {
      document.getElementById("btn-update")?.removeAttribute("hidden");
    }
  } catch {
    /* offline: nothing to update to */
  }
}

async function applyUpdate(btn) {
  btn.classList.add("working");
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== "pagecast-audio").map((k) => caches.delete(k)),
      );
    }
  } catch {
    /* clearing is best effort; the reload still helps */
  }
  location.reload();
}

function wireChrome() {
  const update = document.getElementById("btn-update");
  update?.addEventListener("click", () => applyUpdate(update));
  checkForUpdate();
  // Re-check whenever the reader comes back to the app. On a phone that is the
  // moment a home-screen app is reopened, which arrives as one of these three
  // depending on the browser, so listen for all of them and let the version
  // comparison decide whether anything actually changed.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
  window.addEventListener("focus", checkForUpdate);
  window.addEventListener("pageshow", checkForUpdate);
  document
    .getElementById("btn-theme")
    .addEventListener("click", () =>
      setTheme(store.get().settings.theme === "light" ? "dark" : "light"),
    );
  const layer = document.getElementById("search-layer");
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const open = () => {
    layer.hidden = false;
    input.value = "";
    results.innerHTML = "";
    setTimeout(() => input.focus(), 30);
  };
  const close = () => (layer.hidden = true);
  document.getElementById("btn-search").addEventListener("click", open);
  document.getElementById("bn-search").addEventListener("click", open);
  document.getElementById("search-close").addEventListener("click", close);
  layer.addEventListener("click", (e) => e.target === layer && close());
  document.addEventListener("keydown", (e) => e.key === "Escape" && close());
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = "";
      return;
    }
    const hits = DATA.episodes.filter((e) =>
      [e.title, e.titleEn, e.author, e.authorEn, e.message, e.domainLabel]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(q)),
    );
    results.innerHTML = R.searchResults(hits);
  });
  results.addEventListener("click", (e) => e.target.closest("a") && close());
}

/* ---------- player bar ---------- */
let waveRaf = 0;
function renderPlayer(ps) {
  if (!ps.ep) {
    playerEl.innerHTML = "";
    cancelAnimationFrame(waveRaf);
    return;
  }
  const seeking = document.activeElement && document.activeElement.id === "p-seek";
  if (seeking) {
    // keep the slider stable while dragging; only update times
    const times = playerEl.querySelectorAll(".p-time");
    if (times[0])
      times[0].textContent = R.fmtTime ? R.fmtTime(ps.time) : player.fmt(ps.time);
    return;
  }
  playerEl.innerHTML = R.playerBar(ps);
  document.getElementById("p-toggle").addEventListener("click", () => {
    player.toggle();
  });
  document.getElementById("p-back").addEventListener("click", () => player.skip(-15));
  document.getElementById("p-fwd").addEventListener("click", () => player.skip(30));
  document.getElementById("p-close").addEventListener("click", () => {
    player.close();
    if (route.name === "book") render();
  });
  document.getElementById("p-rate").addEventListener("click", () => {
    const rates = [0.8, 0.9, 1, 1.1, 1.25, 1.5];
    const i = rates.indexOf(ps.rate);
    player.setRate(rates[(i + 1) % rates.length]);
  });
  const seek = document.getElementById("p-seek");
  seek.addEventListener("change", () => player.seek(Number(seek.value)));
  seek.addEventListener("input", () => {
    const pct = ps.duration ? (Number(seek.value) / ps.duration) * 100 : 0;
    playerEl.querySelector(".fill").style.width = `${pct}%`;
    playerEl.querySelector(".knob").style.insetInlineStart = `calc(${pct}% - 7px)`;
  });
  if (route.name === "book" && ps.ep.slug === route.slug && ps.variant === bookMode) {
    const btn = document.getElementById("btn-play");
    if (btn)
      btn.innerHTML = `${ps.playing ? R.ICONS.pause : R.ICONS.play} ${ps.playing ? "מנגן…" : "המשך"}`;
  }
  drawWave(ps);
}

function drawWave(ps) {
  cancelAnimationFrame(waveRaf);
  const canvas = document.getElementById("wave");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let t = 0;
  const bars = 16;
  const frame = () => {
    const dpr = devicePixelRatio || 1;
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (canvas.width !== w * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const gold = getComputedStyle(canvas).getPropertyValue("--gold").trim() || "#c9a24a";
    const gap = 2,
      bw = (w - gap * (bars - 1)) / bars;
    for (let i = 0; i < bars; i++) {
      // A drawn motion rather than a real spectrum: reading the spectrum would
      // mean routing the audio through an AudioContext, which stops playback
      // when the app goes to the background.
      const v =
        !ps.playing || reduce
          ? 0.15 + 0.1 * Math.sin(i * 0.9)
          : 0.25 + 0.2 * Math.sin(t / 9 + i * 0.7);
      const bh = Math.max(2, v * h);
      ctx.fillStyle = gold;
      ctx.globalAlpha = 0.35 + v * 0.65;
      ctx.fillRect(i * (bw + gap), (h - bh) / 2, bw, bh);
    }
    ctx.globalAlpha = 1;
    t++;
    if (ps.playing && !reduce) waveRaf = requestAnimationFrame(frame);
  };
  frame();
}

/* ---------- toast ---------- */
let toastEl, toastT;
function toast(msg) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    toastEl.setAttribute("role", "status");
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

boot();
void esc;
