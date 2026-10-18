/// <reference types="node" />
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fullBackup } from "./fixtures/fullBackup";

let storage: typeof import("./billStorage");
let database: typeof import("./db");
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  storage = await import("./billStorage");
  database = await import("./db");
});
afterEach(async () => {
  (await database.getDb().catch(() => null))?.close();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("imports all 18 schema-v2 bills and 3 groups unchanged into fresh storage and skips duplicates", async () => {
  const backup = fullBackup();
  expect(await storage.importBillsFromBackup(backup)).toMatchObject({
    importedBillCount: 18,
    importedGroupCount: 3,
    skippedBillCount: 0,
    skippedGroupCount: 0,
  });
  const db = await database.getDb();
  for (const bill of backup.bills)
    expect(await db.get("bills", bill.id)).toEqual(bill);
  for (const group of backup.groups)
    expect(await db.get("savedGroups", group.id)).toEqual(group);
  expect(await storage.importBillsFromBackup(backup)).toMatchObject({
    importedBillCount: 0,
    importedGroupCount: 0,
    skippedBillCount: 18,
    skippedGroupCount: 3,
  });
});

it.each([
  [1, false, false],
  [1, true, false],
  [2, false, false],
  [2, true, false],
  [2, true, true],
] as const)(
  "imports after v%i migration (groups=%s, incorrect index=%s) preserving existing records",
  async (version, withGroups, wrongIndex) => {
    const backup = fullBackup();
    const oldBill = {
      ...backup.bills[0],
      id: "existing-bill",
      note: "Keep exactly",
    };
    const oldGroup = { ...backup.groups[0], id: "existing-group" };
    const legacy = await openDB("splitleb-local-db", version, {
      upgrade(db) {
        const bills = db.createObjectStore("bills", { keyPath: "id" });
        if (wrongIndex)
          bills.createIndex("by-updatedAt", "createdAt", { unique: true });
        if (withGroups) db.createObjectStore("savedGroups", { keyPath: "id" });
      },
    });
    await legacy.put("bills", oldBill);
    if (withGroups) await legacy.put("savedGroups", oldGroup);
    legacy.close();
    await expect(storage.importBillsFromBackup(backup)).resolves.toMatchObject({
      importedBillCount: 18,
      importedGroupCount: 3,
    });
    const db = await database.getDb();
    expect(await db.get("bills", oldBill.id)).toEqual(oldBill);
    if (withGroups)
      expect(await db.get("savedGroups", oldGroup.id)).toEqual(oldGroup);
    expect(await storage.listRecentStoredBills(30)).toHaveLength(19);
    for (const storeName of ["bills", "savedGroups"] as const) {
      const store = db.transaction(storeName).store;
      const expected =
        storeName === "bills"
          ? ["by-createdAt", "by-status", "by-updatedAt"]
          : ["by-archivedAt", "by-createdAt", "by-updatedAt"];
      expect([...store.indexNames]).toEqual(expected);
      expect(store.index("by-updatedAt").keyPath).toBe("updatedAt");
      expect(store.index("by-updatedAt").unique).toBe(false);
    }
  },
);

it("aborts all prior group and bill writes on synchronous clone failure", async () => {
  const db = await database.getDb();
  const backup = fullBackup();
  const existing = { ...backup.bills[0], id: "existing" };
  await db.put("bills", existing);
  // Structurally valid data can still fail the IndexedDB structured clone.
  Object.assign(backup.bills[1], { uncloneable: () => {} });
  await expect(storage.importBillsFromBackup(backup)).rejects.toMatchObject({
    category: "transaction",
  });
  expect(await db.getAll("savedGroups")).toEqual([]);
  expect(await db.getAll("bills")).toEqual([existing]);
});

it("aborts all writes on an IndexedDB request failure", async () => {
  const db = await database.getDb();
  const backup = fullBackup();
  // Fault injection: force a real unique-index ConstraintError on bill two.
  db.close();
  const altered = await openDB("splitleb-local-db", db.version + 1, {
    upgrade(_db, _old, _new, tx) {
      tx.objectStore("bills").createIndex("test-unique", "currency", {
        unique: true,
      });
    },
  });
  vi.spyOn(database, "getDb").mockResolvedValue(altered as never);
  await expect(storage.importBillsFromBackup(backup)).rejects.toMatchObject({
    category: "transaction",
  });
  expect(await altered.getAll("bills")).toEqual([]);
  expect(await altered.getAll("savedGroups")).toEqual([]);
  altered.close();
});

it("retries a failed database open instead of caching rejection forever", async () => {
  const future = await openDB("splitleb-local-db", 99);
  future.close();
  await expect(database.getDb()).rejects.toMatchObject({
    name: "VersionError",
  });
  // Only discard this test's fake storage; production never deletes databases.
  vi.stubGlobal("indexedDB", new IDBFactory());
  await expect(
    storage.importBillsFromBackup(fullBackup()),
  ).resolves.toMatchObject({ importedBillCount: 18 });
});

it.each([
  [
    "invalid-bill",
    (b: ReturnType<typeof fullBackup>) => {
      Object.assign(b.bills[0], { people: [null] });
    },
  ],
  [
    "invalid-group",
    (b: ReturnType<typeof fullBackup>) => {
      b.groups[0].members[0].displayName = "";
    },
  ],
  [
    "missing-relationship",
    (b: ReturnType<typeof fullBackup>) => {
      b.groups = [];
    },
  ],
  [
    "missing-relationship",
    (b: ReturnType<typeof fullBackup>) => {
      b.bills[0].people[0].groupMemberId = "missing";
    },
  ],
  [
    "invalid-bill",
    (b: ReturnType<typeof fullBackup>) => {
      b.bills.push(b.bills[0]);
    },
  ],
  [
    "invalid-group",
    (b: ReturnType<typeof fullBackup>) => {
      b.groups.push(b.groups[0]);
    },
  ],
])("rejects %s without any writes", async (category, mutate) => {
  const backup = fullBackup();
  mutate(backup);
  await expect(storage.importBillsFromBackup(backup)).rejects.toMatchObject({
    category,
  });
  const db = await database.getDb();
  expect(await db.count("bills")).toBe(0);
  expect(await db.count("savedGroups")).toBe(0);
});

it("reports conflicts and preserves all prior data", async () => {
  const db = await database.getDb();
  const backup = fullBackup();
  const existing = { ...backup.groups[0], name: "Local name" };
  await db.put("savedGroups", existing);
  await expect(storage.importBillsFromBackup(backup)).rejects.toMatchObject({
    category: "group-conflict",
  });
  expect(await db.getAll("savedGroups")).toEqual([existing]);
  expect(await db.count("bills")).toBe(0);
});

it("reports database access failures without blaming valid backup data", async () => {
  vi.spyOn(database, "getDb").mockRejectedValue(
    new DOMException("Unavailable", "SecurityError"),
  );
  await expect(
    storage.importBillsFromBackup(fullBackup()),
  ).rejects.toMatchObject({
    category: "database",
    cause: expect.objectContaining({ name: "SecurityError" }),
  });
});

it("keeps a duplicate local bill unchanged even when the backup copy differs", async () => {
  const backup = fullBackup();
  const db = await database.getDb();
  const existing = { ...backup.bills[0], note: "Newer local edit" };
  await db.put("bills", existing);
  await expect(storage.importBillsFromBackup(backup)).resolves.toMatchObject({
    importedBillCount: 17,
    skippedBillCount: 1,
  });
  expect(await db.get("bills", existing.id)).toEqual(existing);
});

it("refuses an unknown primary-key layout without deleting records or partially upgrading", async () => {
  const legacy = await openDB("splitleb-local-db", 2, {
    upgrade(db) {
      db.createObjectStore("bills", { keyPath: "legacyId" });
    },
  });
  const existing = { legacyId: "old-key", note: "Do not destroy" };
  await legacy.put("bills", existing);
  legacy.close();
  await expect(
    storage.importBillsFromBackup(fullBackup()),
  ).rejects.toMatchObject({ category: "database" });
  const inspect = await openDB("splitleb-local-db");
  expect(inspect.version).toBe(2);
  expect(await inspect.getAll("bills")).toEqual([existing]);
  expect(inspect.objectStoreNames.contains("savedGroups")).toBe(false);
  inspect.close();
});

it("closes cached app connections on a schema change so another window can upgrade", async () => {
  const db = await database.getDb();
  const next = await openDB("splitleb-local-db", db.version + 1);
  next.close();
  // A fresh open sees the newer version instead of reusing a closed connection.
  await expect(database.getDb()).rejects.toMatchObject({
    name: "VersionError",
  });
});

it("reports a blocked legacy connection and can retry after that window closes", async () => {
  const legacy = await openDB("splitleb-local-db", 2, {
    upgrade(db) {
      db.createObjectStore("bills", { keyPath: "id" });
    },
  });
  const outcome = storage.importBillsFromBackup(fullBackup());
  try {
    await expect(outcome).rejects.toMatchObject({
      category: "database",
      cause: expect.objectContaining({ name: "InvalidStateError" }),
    });
  } finally {
    legacy.close();
  }
  await expect(
    storage.importBillsFromBackup(fullBackup()),
  ).resolves.toMatchObject({ importedBillCount: 18, importedGroupCount: 3 });
});

// Optional local acceptance of the original file without committing personal data.
it.skipIf(!process.env.SPLITLEB_REAL_BACKUP)(
  "imports the owner's original backup unchanged",
  async () => {
    const backup = JSON.parse(
      readFileSync(process.env.SPLITLEB_REAL_BACKUP!, "utf8"),
    );
    await expect(storage.importBillsFromBackup(backup)).resolves.toMatchObject({
      importedBillCount: 18,
      importedGroupCount: 3,
    });
  },
);
