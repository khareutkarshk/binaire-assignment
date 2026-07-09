const CACHE_VERSION = "streamline-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const API_HOST = "api.imdbapi.dev";

const PRECACHE_URLS = ["/", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.hostname === API_HOST) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (request.method === "GET" && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => cacheStatic(request, response))),
    );
  }
});

async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (cached) {
      return cached;
    }
    throw new Error("Offline and no cached API response available.");
  }
}

async function cacheStatic(request, response) {
  if (!response || response.status !== 200) {
    return response;
  }

  const cache = await caches.open(STATIC_CACHE);
  await cache.put(request, response.clone());
  return response;
}
