import { useRef, useState } from "react";
import { exportAllBills } from "../../storage/billStorage";
import { reportBackupImportError } from "../../storage/backupImportError";
import { importBackupFile } from "./importBackupFile";

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
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download =
        "splitleb-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Backup exported. Keep the file somewhere safe.");
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
      const result = await importBackupFile(file);
      setMessage(
        "Imported " +
          result.importedBillCount +
          " bills and " +
          result.importedGroupCount +
          " groups. Skipped " +
          (result.skippedBillCount + result.skippedGroupCount) +
          " duplicates.",
      );
      try {
        await onImported();
      } catch (cause) {
        console.error("SplitLeb backup imported; refresh failed", {
          category: "refresh",
          exception: cause instanceof Error ? cause.name : typeof cause,
        });
        setError(
          "Your backup was imported, but the list could not refresh. Please reopen History.",
        );
      }
    } catch (error) {
      setError(reportBackupImportError(error));
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
          SplitLeb works offline after the first visit. The offline app cache is
          separate from your saved data.
        </p>
      </details>
    </section>
  );
}
