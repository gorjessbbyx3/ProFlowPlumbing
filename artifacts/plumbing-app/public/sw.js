const CACHE_NAME = "proflow-plumbing-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-first strategy
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
