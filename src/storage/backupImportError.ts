export type BackupImportCategory =
  | "file-read"
  | "malformed-json"
  | "unsupported-schema"
  | "invalid-backup"
  | "invalid-bill"
  | "invalid-group"
  | "missing-relationship"
  | "group-conflict"
  | "database"
  | "transaction";

const messages: Record<BackupImportCategory, string> = {
  "file-read": "Could not read this file. Please select the backup again.",
  "malformed-json":
    "This file contains malformed JSON. Please choose a SplitLeb JSON backup.",
  "unsupported-schema": "This backup version isn't supported.",
  "invalid-backup":
    "This file is not a valid SplitLeb backup. Nothing was imported.",
  "invalid-bill": "This backup contains an invalid bill. Nothing was imported.",
  "invalid-group":
    "This backup contains an invalid saved group. Nothing was imported.",
  "missing-relationship":
    "This backup has missing group or member records. Nothing was imported.",
  "group-conflict":
    "A group in this backup conflicts with an existing group. Nothing was imported.",
  database:
    "Could not open your saved data for import. Please close other SplitLeb windows and try again. Do not clear app data.",
  transaction:
    "Could not save this backup. Nothing was imported. Please try again and check available device storage.",
};

export class BackupImportError extends Error {
  readonly category: BackupImportCategory;
  constructor(
    category: BackupImportCategory,
    detail?: string,
    cause?: unknown,
  ) {
    super(detail ?? messages[category], { cause });
    this.name = "BackupImportError";
    this.category = category;
  }
  get userMessage() {
    return messages[this.category];
  }
}

export function reportBackupImportError(error: unknown): string {
  const known = error instanceof BackupImportError;
  // Report category and native exception name without logging backup contents,
  // personal names, IDs, file paths or amounts. The full cause stays on the error.
  console.error("SplitLeb backup import failed", {
    category: known ? error.category : "unexpected",
    exception: error instanceof Error ? error.name : typeof error,
    cause: known && error.cause instanceof Error ? error.cause.name : undefined,
  });
  return known
    ? error.userMessage
    : "An unexpected error stopped the import. Please try again.";
}
