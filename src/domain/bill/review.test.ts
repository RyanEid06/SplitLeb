import { describe, expect, it } from "vitest";
import { calculateBillReview } from "./review";
import type { Bill } from "./types";

describe("calculateBillReview", () => {
  it("breaks down item totals, extras, discounts, and net balances per person", () => {
    const bill = createReviewTestBill();

    const review = calculateBillReview(bill, {
      paymentsByPersonId: {
        ali: 1500,
      },
    });

    expect(review.billSubtotalCents).toBe(4100);
    expect(review.extrasTotalCents).toBe(410);
    expect(review.discountTotalCents).toBe(-300);
    expect(review.grandTotalCents).toBe(4210);
    expect(review.paidTotalCents).toBe(1500);
    expect(review.remainingBalanceCents).toBe(2710);

    const ali = review.people.find((person) => person.personId === "ali");
    const maya = review.people.find((person) => person.personId === "maya");
    const karim = review.people.find((person) => person.personId === "karim");

    expect(ali).toBeDefined();
    expect(maya).toBeDefined();
    expect(karim).toBeDefined();

    expect(ali?.itemSubtotalCents).toBe(1300);
    expect(ali?.extrasTotalCents).toBe(130);
    expect(ali?.discountTotalCents).toBe(-95);
    expect(ali?.grossTotalCents).toBe(1335);
    expect(ali?.paidAmountCents).toBe(1500);
    expect(ali?.netBalanceCents).toBe(-165);

    expect(maya?.itemSubtotalCents).toBe(1600);
    expect(maya?.extrasTotalCents).toBe(160);
    expect(maya?.discountTotalCents).toBe(-117);
    expect(maya?.grossTotalCents).toBe(1643);
    expect(maya?.netBalanceCents).toBe(1643);

    expect(karim?.itemSubtotalCents).toBe(1200);
    expect(karim?.extrasTotalCents).toBe(120);
    expect(karim?.discountTotalCents).toBe(-88);
    expect(karim?.grossTotalCents).toBe(1232);
    expect(karim?.netBalanceCents).toBe(1232);
  });

  it("creates explainable lines for items, extras, discounts, and payments", () => {
    const bill = createReviewTestBill();

    const review = calculateBillReview(bill, {
      paymentsByPersonId: {
        ali: 1500,
      },
    });

    const ali = review.people.find((person) => person.personId === "ali");

    expect(ali?.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Pizza",
          amountCents: 1000,
          kind: "item",
        }),
        expect.objectContaining({
          label: "Salad",
          amountCents: 300,
          kind: "item",
        }),
        expect.objectContaining({
          label: "Service",
          amountCents: 130,
          kind: "extra",
        }),
        expect.objectContaining({
          label: "Promo",
          amountCents: -95,
          kind: "discount",
        }),
        expect.objectContaining({
          label: "Paid amount",
          amountCents: -1500,
          kind: "payment",
        }),
      ]),
    );
  });

  it("throws when the bill has invalid item splits", () => {
    const bill = createReviewTestBill();

    bill.items[0].split = {
      method: "custom",
      amounts: [
        {
          personId: "ali",
          amountCents: 100,
        },
      ],
    };

    expect(() => calculateBillReview(bill)).toThrow(
      /Custom amounts must add up exactly/,
    );
  });
});

function createReviewTestBill(): Bill {
 return {
  id: "bill-review-test",
  title: "Review test bill",
  currency: "USD",
  createdAt: "2026-04-27T00:00:00.000Z",
  updatedAt: "2026-04-27T00:00:00.000Z",
  people: [
    {
      id: "ali",
      name: "Ali",
    },
    {
      id: "maya",
      name: "Maya",
    },
    {
      id: "karim",
      name: "Karim",
    },
  ],
  items: [
    {
      id: "pizza",
      name: "Pizza",
      quantity: 2,
      unitPriceCents: 1000,
      split: {
        method: "equal",
        personIds: ["ali", "maya"],
      },
    },
    {
      id: "salad",
      name: "Salad",
      quantity: 1,
      unitPriceCents: 900,
      split: {
        method: "shares",
        shares: [
          {
            personId: "ali",
            shares: 1,
          },
          {
            personId: "maya",
            shares: 2,
          },
        ],
      },
    },
    {
      id: "dessert",
      name: "Dessert",
      quantity: 1,
      unitPriceCents: 1200,
      split: {
        method: "custom",
        amounts: [
          {
            personId: "karim",
            amountCents: 1200,
          },
        ],
      },
    },
  ],
  extras: [
    {
      id: "service",
      name: "Service",
      kind: "service",
      amountCents: 410,
      allocationMethod: "proportional",
    },
    {
      id: "promo",
      name: "Promo",
      kind: "discount",
      amountCents: 300,
      allocationMethod: "proportional",
    },
  ],
  payments: [],
};
}