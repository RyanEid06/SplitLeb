import { afterEach, expect, it, vi } from "vitest";
import { handleAndroidBack } from "./androidBack";

afterEach(() => vi.unstubAllGlobals());

function environment(pathname: string, dialog: EventTarget | null = null) {
  vi.stubGlobal("document", {
    querySelectorAll: () => (dialog ? [dialog] : []),
  });
  vi.stubGlobal("window", { location: { pathname } });
  return { navigate: vi.fn(), minimize: vi.fn() };
}

it("closes the top dialog before navigating away from edited fields", () => {
  const dialog = Object.assign(new EventTarget(), { close: vi.fn() });
  const actions = environment("/bills/123", dialog);
  const canceled = vi.fn();
  dialog.addEventListener("cancel", canceled);
  handleAndroidBack(true, actions.navigate, actions.minimize);
  expect(canceled).toHaveBeenCalledOnce();
  expect(dialog.close).toHaveBeenCalledOnce();
  expect(actions.navigate).not.toHaveBeenCalled();
  expect(actions.minimize).not.toHaveBeenCalled();
});

it("honors a dialog that prevents cancellation", () => {
  const dialog = Object.assign(new EventTarget(), { close: vi.fn() });
  dialog.addEventListener("cancel", (event) => event.preventDefault());
  const actions = environment("/bills/123", dialog);
  handleAndroidBack(true, actions.navigate, actions.minimize);
  expect(dialog.close).not.toHaveBeenCalled();
  expect(actions.navigate).not.toHaveBeenCalled();
});

it("uses router history so the existing unsaved-change blocker still runs", () => {
  const actions = environment("/bills/new");
  handleAndroidBack(true, actions.navigate, actions.minimize);
  expect(actions.navigate).toHaveBeenCalledWith(-1);
  expect(actions.minimize).not.toHaveBeenCalled();
});

it("returns a cold deep link to home through the router", () => {
  const actions = environment("/history");
  handleAndroidBack(false, actions.navigate, actions.minimize);
  expect(actions.navigate).toHaveBeenCalledWith("/");
});

it("backgrounds the logical home screen without destroying the activity", () => {
  const actions = environment("/");
  handleAndroidBack(true, actions.navigate, actions.minimize);
  expect(actions.minimize).toHaveBeenCalledOnce();
  expect(actions.navigate).not.toHaveBeenCalled();
});
