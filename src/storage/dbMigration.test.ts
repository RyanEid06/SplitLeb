import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { openDB } from "idb";
import fixtures from "../domain/bill/fixtures/golden-bills.json";

it("upgrades a real v1 database without changing legacy bill records", async () => {
  const legacy = {
    ...fixtures[0].bill,
    status: "active",
    note: "Keep my history",
  };
  const v1 = await openDB("splitleb-local-db", 1, {
    upgrade(db) {
      const store = db.createObjectStore("bills", { keyPath: "id" });
      store.createIndex("by-updatedAt", "updatedAt");
      store.createIndex("by-createdAt", "createdAt");
      store.createIndex("by-status", "status");
    },
  });
  await v1.put("bills", legacy);
  v1.close();
  const { getDb } = await import("./db");
  const upgraded = await getDb();
  expect(upgraded.version).toBe(3);
  expect(await upgraded.get("bills", legacy.id)).toEqual(legacy);
  expect(await upgraded.getAll("savedGroups")).toEqual([]);
  expect([...upgraded.transaction("savedGroups").store.indexNames]).toEqual([
    "by-archivedAt",
    "by-createdAt",
    "by-updatedAt",
  ]);
});
