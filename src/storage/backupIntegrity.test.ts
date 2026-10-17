import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import fixtures from "../domain/bill/fixtures/golden-bills.json";
import { exportAllBills, importBillsFromBackup } from "./billStorage";
import { getDb } from "./db";

const bill = { ...fixtures[0].bill, status: "active" };
const legacy = {
  appName: "SplitLeb",
  schemaVersion: 1,
  exportedAt: bill.createdAt,
  bills: [bill],
};
beforeEach(async () => {
  const db = await getDb();
  await db.clear("bills");
  await db.clear("savedGroups");
});
it("round trips a legacy backup through the current format in IndexedDB", async () => {
  expect((await importBillsFromBackup(legacy)).importedBillCount).toBe(1);
  const backup = await exportAllBills();
  expect(backup.schemaVersion).toBe(2);
  expect(backup.bills).toEqual([bill]);
  expect((await importBillsFromBackup(backup)).skippedBillCount).toBe(1);
  expect((await exportAllBills()).bills).toEqual([bill]);
});
it.each([
  { people: [null] },
  { items: [{ ...bill.items[0], split: null }] },
  { payments: [{ personId: "p1", amountCents: "12" }] },
  { extras: [{ id: "extra", name: "Broken" }] },
])(
  "rejects malformed nested records before writing anything: %j",
  async (patch) => {
    await expect(
      importBillsFromBackup({
        ...legacy,
        bills: [bill, { ...bill, id: "bad", ...patch }],
      }),
    ).rejects.toThrow("invalid bill");
    expect((await exportAllBills()).bills).toEqual([]);
  },
);
