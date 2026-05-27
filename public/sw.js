// Wingpact PWA Service Worker
const CACHE_NAME = "wingpact-v1";

// Pages to cache for offline fallback
const PRECACHE = ["/", "/dashboard"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip Firebase, Analytics, and external requests
  const url = new URL(request.url);
  if (
    url.hostname !== self.location.hostname ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // Navigation requests: network-first, fall back to cached "/" if offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then((r) => r ?? Response.error())
      )
    );
    return;
  }

  // Static assets (_next/static): network-first for chunks (avoid stale chunk errors),
  // cache-first only for truly immutable assets like fonts/images
  if (url.pathname.startsWith("/_next/static/")) {
    const isChunk = url.pathname.includes("/chunks/");
    if (isChunk) {
      // Network-first: ensures fresh chunks after deploy
      event.respondWith(
        fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => caches.match(request).then((r) => r ?? Response.error()))
      );
    } else {
      // Cache-first for fonts, images, css
      event.respondWith(
        caches.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              return response;
            })
        )
      );
    }
    return;
  }
});
