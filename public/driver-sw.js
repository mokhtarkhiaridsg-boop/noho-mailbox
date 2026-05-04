// iter-97 — Driver PWA service worker (offline shell only).
//
// Caches the /driver shell + brand assets so the driver can at least
// see their last-loaded route when wifi flickers in transit. Mutations
// (advanceDeliveryStatus, confirmDelivery) still need network — those
// fail loudly so the driver knows to retry.

const CACHE = "noho-driver-v1";
const SHELL = ["/driver/route", "/brand/logo-trans.png", "/driver-manifest.webmanifest"];

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
  // Only handle GETs in the /driver scope; let everything else passthrough.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/driver") && !SHELL.includes(url.pathname)) return;

  // Network-first with cache fallback. Keeps the driver on fresh data
  // when online; silent offline degradation when not.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || new Response("Offline — reconnect to update.", { status: 503, headers: { "Content-Type": "text/plain" } })))
  );
});
