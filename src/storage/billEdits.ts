import { getBillTitle } from "./billStorage";
import { getDb, type BillStatus, type StoredBill } from "./db";

/** Compare and write atomically so a stale tab cannot overwrite newer edits. */
export async function saveBillEdits(
  bill: StoredBill,
  expectedUpdatedAt: string,
  status: BillStatus = bill.status,
): Promise<StoredBill> {
  const db = await getDb();
  const tx = db.transaction("bills", "readwrite");
  const stored = await tx.store.get(bill.id);
  if (!stored || stored.updatedAt !== expectedUpdatedAt) {
    await tx.done;
    throw new Error(
      stored
        ? "This bill changed in another tab. Your edits are still here. Export a backup, then reopen the bill before saving."
        : "This bill was deleted in another tab. Your edits are still here.",
    );
  }
  const updatedAt = new Date(
    Math.max(Date.now(), (Date.parse(stored.updatedAt) || 0) + 1),
  ).toISOString();
  const saved: StoredBill = {
    ...bill,
    title: getBillTitle(bill),
    status,
    updatedAt,
  };
  await tx.store.put(saved);
  await tx.done;
  return saved;
}
