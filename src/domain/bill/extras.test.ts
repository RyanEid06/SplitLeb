import { describe, expect, it } from "vitest";
import type { BillExtra, Person } from "./types";
import {
  calculateExtraAllocations,
  calculateExtraTotalsByPerson,
  validateExtra,
} from "./extras";

const people: Person[] = [
  { id: "p1", name: "Ali" },
  { id: "p2", name: "Maya" },
  { id: "p3", name: "Rami" },
];

describe("extras", () => {
  it("splits delivery equally", () => {
    const extras: BillExtra[] = [
      {
        id: "e1",
        name: "Delivery",
        kind: "delivery",
        amountCents: 300,
        allocationMethod: "equal",
      },
    ];

    const totals = calculateExtraTotalsByPerson({
      extras,
      people,
      itemSubtotalByPersonId: {
        p1: 1000,
        p2: 2000,
        p3: 3000,
      },
    });

    expect(totals).toEqual({
      p1: 100,
      p2: 100,
      p3: 100,
    });
  });

  it("splits service proportionally by item subtotal", () => {
    const extras: BillExtra[] = [
      {
        id: "e1",
        name: "Service",
        kind: "service",
        amountCents: 600,
        allocationMethod: "proportional",
      },
    ];

    const totals = calculateExtraTotalsByPerson({
      extras,
      people,
      itemSubtotalByPersonId: {
        p1: 1000,
        p2: 2000,
        p3: 3000,
      },
    });

    expect(totals).toEqual({
      p1: 100,
      p2: 200,
      p3: 300,
    });
  });

  it("makes discounts negative", () => {
    const extras: BillExtra[] = [
      {
        id: "e1",
        name: "Discount",
        kind: "discount",
        amountCents: 600,
        allocationMethod: "proportional",
      },
    ];

    const totals = calculateExtraTotalsByPerson({
      extras,
      people,
      itemSubtotalByPersonId: {
        p1: 1000,
        p2: 2000,
        p3: 3000,
      },
    });

    expect(totals).toEqual({
      p1: -100,
      p2: -200,
      p3: -300,
    });
  });

  it("splits selected people only", () => {
    const extras: BillExtra[] = [
      {
        id: "e1",
        name: "Private delivery",
        kind: "delivery",
        amountCents: 500,
        allocationMethod: "selectedPeople",
        selectedPersonIds: ["p1", "p3"],
      },
    ];

    const allocations = calculateExtraAllocations({
      extras,
      people,
      itemSubtotalByPersonId: {
        p1: 1000,
        p2: 2000,
        p3: 3000,
      },
    });

    expect(allocations).toEqual([
      {
        extraId: "e1",
        extraName: "Private delivery",
        extraKind: "delivery",
        personId: "p1",
        amountCents: 250,
      },
      {
        extraId: "e1",
        extraName: "Private delivery",
        extraKind: "delivery",
        personId: "p3",
        amountCents: 250,
      },
    ]);
  });

  it("supports custom amounts", () => {
    const extras: BillExtra[] = [
      {
        id: "e1",
        name: "Manual service",
        kind: "service",
        amountCents: 500,
        allocationMethod: "customAmounts",
        customAmountsByPersonId: {
          p1: 100,
          p2: 150,
          p3: 250,
        },
      },
    ];

    const totals = calculateExtraTotalsByPerson({
      extras,
      people,
      itemSubtotalByPersonId: {
        p1: 1000,
        p2: 2000,
        p3: 3000,
      },
    });

    expect(totals).toEqual({
      p1: 100,
      p2: 150,
      p3: 250,
    });
  });

  it("rejects custom amounts that do not match the extra amount", () => {
    const extra: BillExtra = {
      id: "e1",
      name: "Bad custom split",
      kind: "service",
      amountCents: 500,
      allocationMethod: "customAmounts",
      customAmountsByPersonId: {
        p1: 100,
        p2: 100,
      },
    };

    expect(validateExtra(extra, people)).toContain(
      "Custom amounts must add up exactly to the extra amount.",
    );
  });
});