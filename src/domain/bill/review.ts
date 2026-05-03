import { calculateExtraAllocations, getSignedExtraAmountCents } from "./extras";
import {
  calculateItemAllocations,
  getItemSubtotalCents,
  validateItem,
} from "./itemSplits";
import type { Bill, BillExtra, BillItem, CurrencyCode } from "./types";

export type ReviewLineKind =
  | "item"
  | "extra"
  | "discount"
  | "payment"
  | "rounding";

export type ReviewLine = {
  id: string;
  label: string;
  amountCents: number;
  kind: ReviewLineKind;
  note?: string;
};

export type PersonReviewBreakdown = {
  personId: string;
  personName: string;
  emoji?: string;
  color?: string;
  itemSubtotalCents: number;
  extrasTotalCents: number;
  discountTotalCents: number;
  roundingAdjustmentCents: number;
  grossTotalCents: number;
  paidAmountCents: number;
  netBalanceCents: number;
  lines: ReviewLine[];
};

export type BillReview = {
  currency: CurrencyCode;
  billSubtotalCents: number;
  extrasTotalCents: number;
  discountTotalCents: number;
  roundingTotalCents: number;
  grandTotalCents: number;
  paidTotalCents: number;
  remainingBalanceCents: number;
  people: PersonReviewBreakdown[];
};

export type CalculateBillReviewOptions = {
  paymentsByPersonId?: Record<string, number>;
};

export function calculateBillReview(
  bill: Bill,
  options: CalculateBillReviewOptions = {},
): BillReview {
  validateBillForReview(bill);

  const paymentsByPersonId = options.paymentsByPersonId ?? {};
  const itemSubtotalByPersonId = createZeroTotals(bill.people.map((person) => person.id));
  const linesByPersonId = createEmptyLines(bill.people.map((person) => person.id));

  const billSubtotalCents = bill.items.reduce(
    (sum, item) => sum + getItemSubtotalCents(item),
    0,
  );

  for (const item of bill.items) {
    const allocations = calculateItemAllocations(item, bill.people);

    for (const allocation of allocations) {
      itemSubtotalByPersonId[allocation.personId] =
        (itemSubtotalByPersonId[allocation.personId] ?? 0) +
        allocation.amountCents;

      linesByPersonId[allocation.personId]?.push({
        id: `item-${item.id}-${allocation.personId}`,
        label: item.name,
        amountCents: allocation.amountCents,
        kind: "item",
        note: describeItemSplit(item),
      });
    }
  }

  const extraAllocations = calculateExtraAllocations({
    extras: bill.extras,
    people: bill.people,
    itemSubtotalByPersonId,
  });

  for (const allocation of extraAllocations) {
    const extra = bill.extras.find((candidate) => candidate.id === allocation.extraId);

    linesByPersonId[allocation.personId]?.push({
      id: `extra-${allocation.extraId}-${allocation.personId}`,
      label: allocation.extraName,
      amountCents: allocation.amountCents,
      kind: allocation.amountCents < 0 ? "discount" : "extra",
      note: extra ? describeExtraAllocation(extra) : undefined,
    });
  }

  const extrasTotalCents = bill.extras
    .filter((extra) => extra.kind !== "discount")
    .reduce((sum, extra) => sum + Math.abs(extra.amountCents), 0);

  const discountTotalCents = bill.extras
    .filter((extra) => extra.kind === "discount")
    .reduce((sum, extra) => sum + getSignedExtraAmountCents(extra), 0);

  const grandTotalCents =
    billSubtotalCents + extrasTotalCents + discountTotalCents;

  const people = bill.people.map((person) => {
    const lines = linesByPersonId[person.id] ?? [];
    const itemSubtotalCents = itemSubtotalByPersonId[person.id] ?? 0;
    const extrasForPersonCents = sumLines(lines, "extra");
    const discountsForPersonCents = sumLines(lines, "discount");
    const paidAmountCents = Math.round(paymentsByPersonId[person.id] ?? 0);

    const grossBeforeRoundingCents =
      itemSubtotalCents + extrasForPersonCents + discountsForPersonCents;

    return {
      personId: person.id,
      personName: person.name,
      emoji: person.emoji,
      color: person.color,
      itemSubtotalCents,
      extrasTotalCents: extrasForPersonCents,
      discountTotalCents: discountsForPersonCents,
      roundingAdjustmentCents: 0,
      grossTotalCents: grossBeforeRoundingCents,
      paidAmountCents,
      netBalanceCents: grossBeforeRoundingCents - paidAmountCents,
      lines:
        paidAmountCents > 0
          ? [
              ...lines,
              {
                id: `payment-${person.id}`,
                label: "Paid amount",
                amountCents: -paidAmountCents,
                kind: "payment" as const,
                note: "Entered payment",
              },
            ]
          : lines,
    };
  });

  const peopleGrossTotalCents = people.reduce(
    (sum, person) => sum + person.grossTotalCents,
    0,
  );

  const roundingTotalCents = grandTotalCents - peopleGrossTotalCents;

  if (roundingTotalCents !== 0 && people.length > 0) {
    const firstPerson = people[0];

    firstPerson.roundingAdjustmentCents += roundingTotalCents;
    firstPerson.grossTotalCents += roundingTotalCents;
    firstPerson.netBalanceCents += roundingTotalCents;
    firstPerson.lines.push({
      id: `rounding-${firstPerson.personId}`,
      label: "Rounding adjustment",
      amountCents: roundingTotalCents,
      kind: "rounding",
      note: "Keeps person totals equal to the bill total.",
    });
  }

  const paidTotalCents = people.reduce(
    (sum, person) => sum + person.paidAmountCents,
    0,
  );

  return {
    currency: bill.currency,
    billSubtotalCents,
    extrasTotalCents,
    discountTotalCents,
    roundingTotalCents,
    grandTotalCents,
    paidTotalCents,
    remainingBalanceCents: grandTotalCents - paidTotalCents,
    people,
  };
}

function validateBillForReview(bill: Bill): void {
  for (const item of bill.items) {
    const errors = validateItem(item, bill.people);

    if (errors.length > 0) {
      throw new Error(`Invalid item "${item.name}": ${errors.join(" ")}`);
    }
  }
}

function createZeroTotals(personIds: string[]): Record<string, number> {
  return Object.fromEntries(personIds.map((personId) => [personId, 0]));
}

function createEmptyLines(personIds: string[]): Record<string, ReviewLine[]> {
  return Object.fromEntries(personIds.map((personId) => [personId, []]));
}

function sumLines(lines: ReviewLine[], kind: ReviewLineKind): number {
  return lines
    .filter((line) => line.kind === kind)
    .reduce((sum, line) => sum + line.amountCents, 0);
}

function describeItemSplit(item: BillItem): string {
  if (item.split.method === "equal") {
    return `Equal split across ${item.split.personIds.length} person${
      item.split.personIds.length === 1 ? "" : "s"
    }`;
  }

  if (item.split.method === "shares") {
    const totalShares = item.split.shares.reduce(
      (sum, row) => sum + row.shares,
      0,
    );

    return `Share split using ${totalShares} total share${
      totalShares === 1 ? "" : "s"
    }`;
  }

  return "Custom amount split";
}

function describeExtraAllocation(extra: BillExtra): string {
  switch (extra.allocationMethod) {
    case "equal":
      return "Equal across everyone";

    case "proportional":
      return "Proportional to item subtotal";

    case "selectedPeople":
      return `Equal across ${(extra.selectedPersonIds ?? []).length} selected person${
        (extra.selectedPersonIds ?? []).length === 1 ? "" : "s"
      }`;

    case "customAmounts":
      return "Custom amounts";

    default:
      return assertNever(extra.allocationMethod);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled review allocation method: ${String(value)}`);
}