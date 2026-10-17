import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import {
  hasUnsavedChanges,
  subscribeToUnsavedChanges,
} from "../../features/bills/unsavedChanges";
export function PwaStatus() {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const dirty = useSyncExternalStore(
    subscribeToUnsavedChanges,
    hasUnsavedChanges,
    () => false,
  );
  const [offline, setOffline] = useState(!navigator.onLine);
  const [unavailable, setUnavailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activated, setActivated] = useState(false);
  const disposeActivation = useRef<(() => void) | null>(null);
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    };
  }, []);
  useEffect(() => {
    if (
      Capacitor.isNativePlatform() ||
      !("serviceWorker" in navigator) ||
      !import.meta.env.PROD
    )
      return;
    let active = true;
    const alreadyControlled = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker
      .getRegistration()
      .then((value) => {
        if (active && value?.waiting) setRegistration(value);
      })
      .catch(() => {});
    const update = (event: Event) => {
      setActivated(false);
      setRegistration((event as CustomEvent<ServiceWorkerRegistration>).detail);
    };
    const failed = () => setUnavailable(true);
    const installed = () => {
      setRegistration(null);
      if (alreadyControlled || disposeActivation.current) setActivated(true);
    };
    window.addEventListener("splitleb:update", update);
    window.addEventListener("splitleb:offline-unavailable", failed);
    navigator.serviceWorker.addEventListener("controllerchange", installed);
    return () => {
      active = false;
      disposeActivation.current?.();
      window.removeEventListener("splitleb:update", update);
      window.removeEventListener("splitleb:offline-unavailable", failed);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        installed,
      );
    };
  }, []);
  function update() {
    if (hasUnsavedChanges() || !registration?.waiting || updating) return;
    setUpdating(true);
    const cleanup = () => {
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
    };
    const changed = () => {
      cleanup();
      setUpdating(false);
      // The user may have started typing after choosing Update.
      if (!hasUnsavedChanges()) window.location.reload();
      else {
        setRegistration(null);
        setActivated(true);
      }
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      setUpdating(false);
    }, 10000);
    disposeActivation.current = cleanup;
    navigator.serviceWorker.addEventListener("controllerchange", changed, {
      once: true,
    });
    registration.waiting.postMessage({ type: "SPLITLEB_ACTIVATE_UPDATE" });
  }
  if (!registration && !offline && !unavailable && !activated) return null;
  return (
    <div className="pwa-status" role="status">
      {registration ? (
        <>
          <span>
            {dirty
              ? "Update available. Save your changes first."
              : "A SplitLeb update is ready."}
          </span>
          <button disabled={dirty || updating} onClick={update}>
            {updating ? "Updating…" : "Update"}
          </button>
        </>
      ) : activated ? (
        <>
          <span>
            {dirty
              ? "Update installed. Finish your changes before refreshing."
              : "Update installed. Refresh when you're ready."}
          </span>
          <button
            disabled={dirty}
            onClick={() => {
              if (!hasUnsavedChanges()) window.location.reload();
            }}
          >
            Refresh
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
