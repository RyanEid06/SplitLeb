import { useRef, useState } from "react";
import { saveBackupFile } from "../../platform/backupFile";
import { Capacitor } from "@capacitor/core";
import {
  exportAllBills,
  importBillsFromBackup,
} from "../../storage/billStorage";

export function BackupPanel({
  onImported,
}: {
  onImported: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function exportBackup() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const backup = await exportAllBills();
      const result = await saveBackupFile(
        "splitleb-backup-" + new Date().toISOString().slice(0, 10) + ".json",
        JSON.stringify(backup, null, 2),
      );
      setMessage(
        result === "downloaded"
          ? "Backup exported. Keep the file somewhere safe."
          : result === "canceled"
            ? "Export canceled. Your saved data is unchanged."
            : "Backup shared. Keep a copy somewhere safe.",
      );
    } catch {
      setError("Could not export your backup. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function importBackup(file: File) {
    if (
      !window.confirm(
        "Import this backup? Existing bills are kept. Duplicates are skipped; conflicting groups stop the import.",
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await importBillsFromBackup(
        JSON.parse(await file.text()) as unknown,
      );
      await onImported();
      setMessage(
        "Imported " +
          result.importedBillCount +
          " bills and " +
          result.importedGroupCount +
          " groups. Skipped " +
          (result.skippedBillCount + result.skippedGroupCount) +
          " duplicates.",
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      setError(
        detail.includes("Unsupported")
          ? "This backup version isn't supported."
          : detail.includes("conflicts")
            ? "A group in this backup conflicts with an existing group. Nothing was imported."
            : detail.includes("missing")
              ? "This backup has missing group or member records. Nothing was imported."
              : "This backup could not be imported. Check that it's a valid SplitLeb JSON backup.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="backup-panel" aria-label="Backup">
      <div className="backup-heading">
        <p>Your data is stored on this device.</p>
        <div className="button-row">
          <button disabled={busy} onClick={() => void exportBackup()}>
            Export backup
          </button>
          <button disabled={busy} onClick={() => inputRef.current?.click()}>
            Import backup
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        aria-label="Choose backup file"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importBackup(file);
          event.target.value = "";
        }}
      />
      {message ? (
        <p className="success-message" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <details>
        <summary>About your data</summary>
        <p>
          Export a backup before clearing browser data or switching devices.
          Backups include all bills and groups, including archived members.
          Importing merges records; it does not replace your data.
        </p>
        <p>
          {Capacitor.isNativePlatform()
            ? "SplitLeb works offline from installation. Uninstalling or clearing app data removes your saved data."
            : "SplitLeb works offline after the first visit. The offline app cache is separate from your saved data."}
        </p>
      </details>
    </section>
  );
}
