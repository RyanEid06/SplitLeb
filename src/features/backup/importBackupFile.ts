import { importBillsFromBackup } from "../../storage/billStorage";
import { BackupImportError } from "../../storage/backupImportError";

export async function importBackupFile(file: File) {
  let text: string;
  try {
    text = await file.text();
  } catch (cause) {
    throw new BackupImportError("file-read", undefined, cause);
  }
  let backup: unknown;
  try {
    backup = JSON.parse(text) as unknown;
  } catch (cause) {
    throw new BackupImportError("malformed-json", undefined, cause);
  }
  return importBillsFromBackup(backup);
}
