import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb, type StoredBill } from "./db";
import { saveBillEdits } from "./billEdits";

const original: StoredBill = {
  id: "editing-bill",
  title: "Dinner",
  currency: "USD",
  status: "draft",
  people: [
    { id: "a", name: "Ryan" },
    { id: "b", name: "Jad" },
  ],
  items: [
    {
      id: "item",
      name: "Dinner",
      quantity: 1,
      unitPriceCents: 1000,
      split: { method: "equal", personIds: ["a", "b"] },
    },
  ],
  extras: [],
  payments: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(async () => {
  const db = await getDb();
  await db.clear("bills");
  await db.put("bills", structuredClone(original));
});

describe("saving on-screen bill edits", () => {
  it("settles the current edited payments instead of reloading old values", async () => {
    const edited = {
      ...original,
      payments: [{ id: "payment", personId: "a", amountCents: 1000 }],
    };
    const saved = await saveBillEdits(edited, original.updatedAt, "settled");
    expect(saved.status).toBe("settled");
    expect((await (await getDb()).get("bills", original.id))?.payments).toEqual(
      edited.payments,
    );
    expect(saved.updatedAt > original.updatedAt).toBe(true);
  });

  it("rejects a stale tab without overwriting a newer bill", async () => {
    const first = await saveBillEdits(
      { ...original, note: "Newer edit" },
      original.updatedAt,
    );
    await expect(
      saveBillEdits({ ...original, note: "Old tab" }, original.updatedAt),
    ).rejects.toThrow("changed in another tab");
    expect(await (await getDb()).get("bills", original.id)).toEqual(first);
  });

  it("allows only one concurrent save of the same revision", async () => {
    const results = await Promise.allSettled([
      saveBillEdits({ ...original, note: "A" }, original.updatedAt),
      saveBillEdits({ ...original, note: "B" }, original.updatedAt),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
  });

  it("does not resurrect a bill deleted by another tab", async () => {
    await (await getDb()).delete("bills", original.id);
    await expect(saveBillEdits(original, original.updatedAt)).rejects.toThrow(
      "deleted",
    );
    expect(await (await getDb()).get("bills", original.id)).toBeUndefined();
  });

  it("keeps draft/active status unless the user explicitly changes it", async () => {
    const draft = await saveBillEdits(
      { ...original, note: "Still editing" },
      original.updatedAt,
    );
    expect(draft.status).toBe("draft");
    const active = await saveBillEdits(draft, draft.updatedAt, "active");
    expect(active.status).toBe("active");
  });
});
