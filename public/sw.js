/* Build placeholders are replaced by Vite after all assets have been emitted. */
const CACHE_PREFIX = "splitleb-app-shell-";
const CACHE_NAME = CACHE_PREFIX + "__SPLITLEB_BUILD_ID__";
const PRECACHE_URLS = __SPLITLEB_PRECACHE__;
const INDEX_URL = "/index.html";

function expectedType(path) {
  if (path.endsWith(".js")) return /javascript/;
  if (path.endsWith(".css")) return /text\/css/;
  if (path.endsWith(".html")) return /text\/html/;
  if (path.endsWith(".png")) return /image\/png/;
  if (path.endsWith(".svg")) return /image\/svg/;
  return /json/;
}
async function cacheShell() {
  const cache = await caches.open(CACHE_NAME);
  try {
    // Fetch everything before publishing HTML. A missing chunk fails installation.
    const responses = await Promise.all(
      PRECACHE_URLS.map(async (url) => {
        const response = await fetch(url, { cache: "reload" });
        if (
          !response.ok ||
          !expectedType(url).test(response.headers.get("content-type") || "")
        )
          throw new Error("Incomplete app shell");
        // Drain each stream as it arrives. Keeping several unread responses
        // open can exhaust the browser's connection pool during installation.
        const body = await response.arrayBuffer();
        return [url, new Response(body, { status: response.status, headers: response.headers })];
      }),
    );
    for (const [url, response] of responses) await cache.put(url, response);
  } catch (error) {
    await caches.delete(CACHE_NAME);
    throw error;
  }
}
self.addEventListener("install", (event) => {
  event.waitUntil(cacheShell());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Other open tabs can still need an older bundle. Keep their caches.
      if (clients.length <= 1) {
        const names = (await caches.keys()).filter((name) =>
          name.startsWith(CACHE_PREFIX),
        );
        const keep = new Set([
          CACHE_NAME,
          ...names.filter((name) => name !== CACHE_NAME).slice(-1),
        ]);
        await Promise.all(
          names
            .filter((name) => !keep.has(name))
            .map((name) => caches.delete(name)),
        );
      }
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SPLITLEB_ACTIVATE_UPDATE")
    event.waitUntil(self.skipWaiting());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(INDEX_URL)) || fetch(request);
      })(),
    );
  } else if (
    url.pathname.startsWith("/assets/") ||
    PRECACHE_URLS.includes(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        // Hashed old assets may still be requested by another open tab.
        return (
          (await cache.match(url.pathname)) ||
          (await caches.match(request)) ||
          fetch(request)
        );
      })(),
    );
  }
});
