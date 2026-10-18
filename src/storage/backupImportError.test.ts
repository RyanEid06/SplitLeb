import { expect, it, vi } from "vitest";
import {
  BackupImportError,
  reportBackupImportError,
} from "./backupImportError";

it("reports the storage failure category and native exception without personal data", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const error = new BackupImportError(
      "transaction",
      "Private bill name",
      new DOMException("Private payload", "QuotaExceededError"),
    );
    expect(reportBackupImportError(error)).toContain("Nothing was imported");
    expect(log).toHaveBeenCalledWith("SplitLeb backup import failed", {
      category: "transaction",
      exception: "BackupImportError",
      cause: "QuotaExceededError",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("Private");
    expect(
      reportBackupImportError(new Error("Private unexpected error")),
    ).toContain("unexpected error");
    expect(log.mock.lastCall?.[1]).toMatchObject({ category: "unexpected" });
  } finally {
    log.mockRestore();
  }
});
