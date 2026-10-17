// Navigation stays with React Router so its existing dirty-form blocker runs.
export function handleAndroidBack(
  canGoBack: boolean,
  navigate: (destination: number | string) => void,
  minimize: () => void,
) {
  const dialogs = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
  const dialog = dialogs[dialogs.length - 1];
  if (dialog) {
    if (dialog.dispatchEvent(new Event("cancel", { cancelable: true }))) {
      dialog.close();
    }
    return;
  }
  if (window.location.pathname === "/") minimize();
  else if (canGoBack) navigate(-1);
  else navigate("/");
}
