import { afterEach, describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./serviceWorkerRegistration";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function environment(production: boolean, port: string) {
  vi.stubEnv("PROD", production);
  const register = vi.fn().mockResolvedValue(
    Object.assign(new EventTarget(), {
      update: vi.fn().mockResolvedValue(undefined),
      waiting: null,
    }),
  );
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      location: { port },
      isSecureContext: true,
    }),
  );
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), {
      readyState: "complete",
      visibilityState: "visible",
    }),
  );
  vi.stubGlobal("navigator", { serviceWorker: { register } });
  return register;
}
describe("service worker environment", () => {
  it("observes a worker already installing when registration resolves", async () => {
    const register = environment(true, "4173");
    const worker = Object.assign(new EventTarget(), { state: "installing" });
    const registration = Object.assign(new EventTarget(), {
      installing: worker,
      waiting: null as EventTarget | null,
    });
    register.mockResolvedValue(registration);
    const announce = vi.fn();
    window.addEventListener("splitleb:update", announce);
    registerServiceWorker();
    await Promise.resolve();
    registration.waiting = worker;
    worker.dispatchEvent(new Event("statechange"));
    expect(announce).toHaveBeenCalledOnce();
  });
  it("never registers a worker in development, including custom ports", async () => {
    const register = environment(false, "5174");
    registerServiceWorker();
    await Promise.resolve();
    expect(register).not.toHaveBeenCalled();
  });
  it("registers a production build even when hosted on the old dev port", async () => {
    const register = environment(true, "5173");
    registerServiceWorker();
    await Promise.resolve();
    expect(register).toHaveBeenCalledWith("/sw.js", { updateViaCache: "none" });
  });
});
