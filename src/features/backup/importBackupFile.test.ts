import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { importBackupFile } from "./importBackupFile";
import { fullBackup } from "../../storage/fixtures/fullBackup";
import { getDb } from "../../storage/db";

afterEach(async () => {
  const db = await getDb();
  await db.clear("bills");
  await db.clear("savedGroups");
  vi.restoreAllMocks();
});
it("reads an actual File and imports its full schema-v2 payload", async () => {
  const file = new File([JSON.stringify(fullBackup())], "backup.json", {
    type: "application/json",
  });
  await expect(importBackupFile(file)).resolves.toMatchObject({
    importedBillCount: 18,
    importedGroupCount: 3,
  });
});
it("distinguishes a failed file read from JSON and database failures", async () => {
  const file = new File(["{}"], "backup.json");
  const cause = new DOMException(
    "Cannot read selected file",
    "NotReadableError",
  );
  vi.spyOn(file, "text").mockRejectedValue(cause);
  await expect(importBackupFile(file)).rejects.toMatchObject({
    category: "file-read",
    cause,
  });
  expect(await (await getDb()).count("bills")).toBe(0);
});
it("distinguishes malformed JSON from unsupported schema", async () => {
  await expect(
    importBackupFile(new File(["{"], "bad.json")),
  ).rejects.toMatchObject({
    category: "malformed-json",
    cause: expect.any(SyntaxError),
  });
  await expect(
    importBackupFile(
      new File(
        [JSON.stringify({ ...fullBackup(), schemaVersion: 99 })],
        "new.json",
      ),
    ),
  ).rejects.toMatchObject({ category: "unsupported-schema" });
});
