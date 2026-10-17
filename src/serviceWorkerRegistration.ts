import { Capacitor } from "@capacitor/core";

export function registerServiceWorker() {
  if (
    Capacitor.isNativePlatform() ||
    !import.meta.env.PROD ||
    typeof window === "undefined" ||
    !("serviceWorker" in navigator)
  )
    return;
  async function register() {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
      const announce = () => {
        if (registration.waiting)
          window.dispatchEvent(
            new CustomEvent("splitleb:update", { detail: registration }),
          );
      };
      announce();
      const watchInstalling = () => {
        registration.installing?.addEventListener("statechange", announce);
      };
      watchInstalling();
      registration.addEventListener("updatefound", watchInstalling);
      const check = () => {
        void registration.update().catch(() => {});
      };
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
      window.addEventListener("online", check);
    } catch {
      window.dispatchEvent(new CustomEvent("splitleb:offline-unavailable"));
    }
  }
  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register(), { once: true });
}
