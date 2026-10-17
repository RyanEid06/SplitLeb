import { useEffect, useState } from "react";
export function PwaStatus() {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [dirty, setDirty] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [unavailable, setUnavailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
    let active = true;
    navigator.serviceWorker
      .getRegistration()
      .then((value) => {
        if (active && value?.waiting) setRegistration(value);
      })
      .catch(() => {});
    const update = (event: Event) =>
      setRegistration((event as CustomEvent<ServiceWorkerRegistration>).detail);
    const editing = (event: Event) =>
      setDirty((event as CustomEvent<boolean>).detail);
    const online = () => setOffline(!navigator.onLine);
    const failed = () => setUnavailable(true);
    window.addEventListener("splitleb:update", update);
    window.addEventListener("splitleb:editing", editing);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    window.addEventListener("splitleb:offline-unavailable", failed);
    return () => {
      active = false;
      window.removeEventListener("splitleb:update", update);
      window.removeEventListener("splitleb:editing", editing);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
      window.removeEventListener("splitleb:offline-unavailable", failed);
    };
  }, []);
  async function update() {
    if (dirty || !registration?.waiting || updating) return;
    setUpdating(true);
    const timeout = window.setTimeout(() => {
      setUpdating(false);
    }, 10000);
    const changed = () => {
      window.clearTimeout(timeout);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed, {
      once: true,
    });
    registration.waiting.postMessage({ type: "SPLITLEB_ACTIVATE_UPDATE" });
  }
  if (!registration && !offline && !unavailable) return null;
  return (
    <div className="pwa-status" role="status">
      {registration ? (
        <>
          <span>
            {dirty
              ? "Update available. Save your changes first."
              : "A SplitLeb update is ready."}
          </span>
          <button disabled={dirty || updating} onClick={() => void update()}>
            {updating ? "Updating…" : "Update"}
          </button>
        </>
      ) : (
        <span>
          {offline
            ? "You're offline. Your saved bills are here."
            : "Offline setup didn't finish. Reconnect and reload to try again."}
        </span>
      )}
    </div>
  );
}
