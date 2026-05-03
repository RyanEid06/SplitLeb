const SERVICE_WORKER_URL = "/sw.js";
const VITE_DEV_SERVER_PORT = "5173";
const CACHE_CURRENT_APP_SHELL_MESSAGE = "SPLITLEB_CACHE_CURRENT_APP_SHELL";

function shouldRegisterServiceWorker() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!("serviceWorker" in navigator)) {
    return false;
  }

  return window.location.port !== VITE_DEV_SERVER_PORT;
}

async function registerAndWarmOfflineCache() {
  try {
    await navigator.serviceWorker.register(SERVICE_WORKER_URL);
    const registration = await navigator.serviceWorker.ready;

    registration.active?.postMessage({
      type: CACHE_CURRENT_APP_SHELL_MESSAGE,
    });
  } catch (error) {
    console.warn("SplitLeb offline cache registration failed.", error);
  }
}

export function registerServiceWorker() {
  if (!shouldRegisterServiceWorker()) {
    return;
  }

  window.addEventListener("load", () => {
    void registerAndWarmOfflineCache();
  });
}