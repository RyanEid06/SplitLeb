import { describe, expect, it } from "vitest";
import type { BillItem, Person } from "./types";
import {
  calculateItemAllocations,
  createCustomAmountSplit,
  createEqualSplit,
  createShareSplit,
  getItemSubtotalCents,
  validateItem,
} from "./itemSplits";

const people: Person[] = [
  { id: "p1", name: "Ali" },
  { id: "p2", name: "Maya" },
  { id: "p3", name: "Rami" },
];

describe("item split calculations", () => {
  it("calculates item subtotal from quantity and unit price", () => {
    const item: BillItem = {
      id: "i1",
      name: "Burger",
      quantity: 2,
      unitPriceCents: 350,
      split: createEqualSplit(["p1", "p2"]),
    };

    expect(getItemSubtotalCents(item)).toBe(700);
  });

  it("splits equally and keeps cents exact", () => {
    const item: BillItem = {
      id: "i1",
      name: "Fries",
      quantity: 1,
      unitPriceCents: 1000,
      split: createEqualSplit(["p1", "p2", "p3"]),
    };

    expect(calculateItemAllocations(item, people)).toEqual([
      { itemId: "i1", personId: "p1", amountCents: 334 },
      { itemId: "i1", personId: "p2", amountCents: 333 },
      { itemId: "i1", personId: "p3", amountCents: 333 },
    ]);
  });

  it("splits by shares", () => {
    const item: BillItem = {
      id: "i1",
      name: "Pizza",
      quantity: 1,
      unitPriceCents: 900,
      split: createShareSplit([
        { personId: "p1", shares: 1 },
        { personId: "p2", shares: 2 },
      ]),
    };

    expect(calculateItemAllocations(item, people)).toEqual([
      { itemId: "i1", personId: "p1", amountCents: 300 },
      { itemId: "i1", personId: "p2", amountCents: 600 },
    ]);
  });

  it("accepts valid custom amounts", () => {
    const item: BillItem = {
      id: "i1",
      name: "Mixed grill",
      quantity: 1,
      unitPriceCents: 2000,
      split: createCustomAmountSplit([
        { personId: "p1", amountCents: 1200 },
        { personId: "p2", amountCents: 800 },
      ]),
    };

    expect(validateItem(item, people)).toEqual([]);
    expect(calculateItemAllocations(item, people)).toEqual([
      { itemId: "i1", personId: "p1", amountCents: 1200 },
      { itemId: "i1", personId: "p2", amountCents: 800 },
    ]);
  });

  it("rejects custom amounts that do not match the item total", () => {
    const item: BillItem = {
      id: "i1",
      name: "Sushi",
      quantity: 1,
      unitPriceCents: 2500,
      split: createCustomAmountSplit([
        { personId: "p1", amountCents: 1000 },
        { personId: "p2", amountCents: 1000 },
      ]),
    };

    expect(validateItem(item, people)).toContain(
      "Custom amounts must add up exactly to the item total.",
    );
  });
});