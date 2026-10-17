import { useLayoutEffect, useId } from "react";
const owners = new Set<string>();
const listeners = new Set<() => void>();
export function hasUnsavedChanges() {
  return owners.size > 0;
}
export function subscribeToUnsavedChanges(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function setDirty(owner: string, dirty: boolean) {
  const previous = owners.size > 0;
  if (dirty) owners.add(owner);
  else owners.delete(owner);
  if (previous !== owners.size > 0)
    for (const listener of listeners) listener();
}
export function useUnsavedChanges(dirty: boolean) {
  const owner = useId();
  useLayoutEffect(() => {
    setDirty(owner, dirty);
    const unload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      setDirty(owner, false);
      window.removeEventListener("beforeunload", unload);
    };
  }, [owner, dirty]);
  return () => setDirty(owner, false);
}
