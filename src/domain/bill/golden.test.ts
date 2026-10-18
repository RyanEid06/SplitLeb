import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/golden-bills.json";
import type { Bill } from "./types";
import { calculateBillReview } from "./review";
import { calculatePersonSettlementBalances, calculateSettlementTransfers } from "./settlements";

describe("portable financial golden fixtures", () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const bill = fixture.bill as Bill;
      const review = calculateBillReview(bill);
      expect(review.grandTotalCents).toBe(fixture.expected.totalCents);
      expect(review.people.map((person) => person.grossTotalCents)).toEqual(fixture.expected.personTotalsCents);
      const balances = calculatePersonSettlementBalances({
        personTotals: review.people.map((person) => ({ personId: person.personId, personName: person.personName, amountOwedCents: person.grossTotalCents })),
        payments: bill.payments,
      });
      expect(balances.map((row) => row.netBalanceCents)).toEqual(fixture.expected.balancesCents);
      expect(calculateSettlementTransfers(balances, { currency: bill.currency }).map((row) => [row.fromPersonId, row.toPersonId, row.amountCents])).toEqual(fixture.expected.transfers);
    });
  }
});
