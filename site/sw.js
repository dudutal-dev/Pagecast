/* Pagecast — service worker.
   App shell + data + illustrations: cache-first (pre-cached on install).
   Audio: cache-first, filled on first play or via "שמור לאופליין".
   Fonts (Google): network-first with cache fallback. */
const VERSION = "pagecast-202609132107";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./js/store.js",
  "./js/player.js",
  "./js/render.js",
  "./js/markdown.js",
  "./data/episodes.json",
  "./data/precache.json",
  "./assets/icons/icon-64.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/emblem.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(SHELL);
      try {
        const res = await fetch("./data/precache.json", { cache: "no-store" });
        const { files } = await res.json();
        await Promise.allSettled(files.map((f) => cache.add(f)));
      } catch {
        /* illustrations will be cached on demand */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== VERSION && k !== "pagecast-audio" && k !== "pagecast-ext")
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;

  // Audio: cache-first with full-file caching; Range requests are served from the cached full file.
  if (same && /\/audio\/.+\.mp3$/.test(url.pathname)) {
    e.respondWith(audioResponse(req));
    return;
  }
  if (same) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }
  // Fonts and other externals
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open("pagecast-ext").then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req)),
  );
});

async function audioResponse(req) {
  const cache = await caches.open("pagecast-audio");
  const key = new Request(req.url); // strip Range for the cache key
  let full = await cache.match(key);
  if (!full) {
    const net = await fetch(key);
    if (!net.ok) return net;
    await cache.put(key, net.clone());
    full = net;
  }
  const range = req.headers.get("range");
  if (!range) return full;
  const buf = await full.clone().arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? Number(m[1]) : 0;
  let end = m && m[2] ? Number(m[2]) : size - 1;
  if (m && !m[1] && m[2]) {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  }
  end = Math.min(end, size - 1);
  if (start > end)
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}
