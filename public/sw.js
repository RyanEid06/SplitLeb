const CACHE_PREFIX = "splitleb-app-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const INDEX_URL = "/index.html";
const ROOT_URL = "/";
const CACHE_CURRENT_APP_SHELL_MESSAGE = "SPLITLEB_CACHE_CURRENT_APP_SHELL";

function isSameOrigin(requestUrl) {
  const url = new URL(requestUrl);
  return url.origin === self.location.origin;
}

function isBuildAsset(url) {
  return url.pathname.startsWith("/assets/");
}

function isPwaStaticFile(url) {
  return (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/favicon.ico" ||
    url.pathname.startsWith("/icons/")
  );
}

function getBuildAssetUrlsFromHtml(html) {
  const urls = new Set();
  const attributePattern = /(?:src|href)="([^"]+)"/g;

  for (const match of html.matchAll(attributePattern)) {
    const url = new URL(match[1], self.location.origin);

    if (isBuildAsset(url)) {
      urls.add(url.href);
    }
  }

  return [...urls];
}

async function findCachedResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);

  return (
    (await cache.match(request, { ignoreVary: true })) ||
    (await cache.match(url.href, { ignoreVary: true })) ||
    (await cache.match(url.pathname, { ignoreVary: true }))
  );
}

async function putCachedResponse(cache, cacheKey, response) {
  if (response.ok && response.type === "basic") {
    await cache.put(cacheKey, response.clone());
  }
}

async function cacheCurrentAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const indexResponse = await fetch(INDEX_URL, { cache: "no-store" });

  if (!indexResponse.ok) {
    throw new Error(`Could not cache SplitLeb app shell: ${indexResponse.status}`);
  }

  const html = await indexResponse.clone().text();
  const buildAssetUrls = getBuildAssetUrlsFromHtml(html);

  await cache.put(INDEX_URL, indexResponse.clone());
  await cache.put(ROOT_URL, indexResponse.clone());

  await Promise.all(
    buildAssetUrls.map(async (assetUrl) => {
      const response = await fetch(assetUrl, { cache: "no-store" });
      await putCachedResponse(cache, assetUrl, response);
    }),
  );
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);

    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(INDEX_URL, response.clone());
      await cache.put(ROOT_URL, response.clone());
    }

    return response;
  } catch {
    const cachedIndex = await caches.match(INDEX_URL, { ignoreVary: true });
    return cachedIndex || Response.error();
  }
}

async function handleStaticRequest(request) {
  const cachedResponse = await findCachedResponse(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  const url = new URL(request.url);

  if (response.ok && response.type === "basic" && (isBuildAsset(url) || isPwaStaticFile(url))) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    await cache.put(url.href, response.clone());
  }

  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheCurrentAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === CACHE_CURRENT_APP_SHELL_MESSAGE) {
    event.waitUntil(cacheCurrentAppShell().catch(() => undefined));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || !isSameOrigin(request.url)) {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isBuildAsset(url) || isPwaStaticFile(url)) {
    event.respondWith(handleStaticRequest(request));
  }
});