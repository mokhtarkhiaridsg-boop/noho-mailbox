// iter-109 — Scanner PWA service worker.
//
// Caches the /scanner shell so the tablet keeps working when wifi blips
// at the counter. Mutations are queued in IndexedDB by the page itself
// (not in the SW) — that's simpler and lets the page show a precise
// "N pending sync" badge.

const CACHE = "noho-scanner-v1";
const SHELL = ["/scanner", "/brand/logo-trans.png", "/scanner-manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/scanner") && !SHELL.includes(url.pathname)) return;

  // Network-first with cache fallback so the scanner gets fresh chrome
  // when online, the cached shell when offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || new Response("Offline — reconnect to update.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })))
  );
});
