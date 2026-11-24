// Bill Labs app shell: network first (always the latest when online), cached copy when offline.
const V = "bill-labs-v1";
const PRE = ["./", "./shell/shell.js", "./shell/thermal-printer.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./uber-bill/"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.all(PRE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x.startsWith("bill-labs-") && x !== V).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || (e.request.mode === "navigate" ? caches.match("./") : undefined))));
});
