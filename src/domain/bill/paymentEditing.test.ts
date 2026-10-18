import { expect, it } from "vitest";
import { getPaymentAmountForPersonCents, upsertPaymentForPerson } from "./settlements";
it("edits a person's total once when imported data has multiple payments", () => {
  const payments = [
    { id: "first", personId: "a", amountCents: 100, note: "Keep this note" },
    { id: "other", personId: "b", amountCents: 300 },
    { id: "second", personId: "a", amountCents: 200 },
  ];
  const updated = upsertPaymentForPerson({ payments, personId: "a", amountCents: 500, createId: () => "unused" });
  expect(getPaymentAmountForPersonCents(updated, "a")).toBe(500);
  expect(updated).toEqual([
    { id: "first", personId: "a", amountCents: 500, note: "Keep this note" },
    payments[1],
  ]);
});
