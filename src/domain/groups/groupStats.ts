import { calculateBillReview } from "../bill/review";
import type { Bill, CurrencyCode, Payment } from "../bill/types";
import type { SavedGroup, SavedGroupMember } from "./types";

export type GroupStatsMemberTotal = {
  groupMemberId: string;
  displayName: string;
  archivedAt?: string;
  amountPaidCents: number;
  amountOwedCents: number;
};

export type GroupStatsLargestBill = {
  billId: string;
  billTitle: string;
  totalCents: number;
};

export type GroupStatsCurrencyTotals = {
  currency: CurrencyCode;
  billCount: number;
  totalSpentCents: number;
  averageBillTotalCents: number;
  largestBill: GroupStatsLargestBill | null;
  memberTotals: GroupStatsMemberTotal[];
};

export type GroupStatsIssue =
  | {
      kind: "billCalculationFailed";
      billId: string;
      billTitle: string;
      currency: CurrencyCode;
      message: string;
    }
  | {
      kind: "billPersonMissingGroupMemberId";
      billId: string;
      billTitle: string;
      currency: CurrencyCode;
      personId: string;
      personName: string;
      amountOwedCents: number;
      amountPaidCents: number;
    }
  | {
      kind: "billPersonReferencesUnknownGroupMember";
      billId: string;
      billTitle: string;
      currency: CurrencyCode;
      personId: string;
      personName: string;
      groupMemberId: string;
      amountOwedCents: number;
      amountPaidCents: number;
    }
  | {
      kind: "paymentReferencesUnknownBillPerson";
      billId: string;
      billTitle: string;
      currency: CurrencyCode;
      paymentId: string;
      personId: string;
      amountCents: number;
    };

export type GroupStatsResult = {
  groupId: string;
  currencies: Record<CurrencyCode, GroupStatsCurrencyTotals>;
  issues: GroupStatsIssue[];
};

type MemberStatsAccumulator = {
  groupMember: SavedGroupMember;
  amountPaidCents: number;
  amountOwedCents: number;
};

type CurrencyStatsAccumulator = {
  currency: CurrencyCode;
  billCount: number;
  totalSpentCents: number;
  largestBill: GroupStatsLargestBill | null;
  memberAccumulators: Map<string, MemberStatsAccumulator>;
};

const CURRENCIES: CurrencyCode[] = ["USD", "LBP"];

export function calculateGroupStats(params: {
  group: SavedGroup;
  bills: Bill[];
}): GroupStatsResult {
  const groupMemberById = createGroupMemberMap(params.group);
  const currencyAccumulators = createCurrencyAccumulators(params.group.members);
  const issues: GroupStatsIssue[] = [];

  for (const bill of params.bills) {
    if (bill.groupId !== params.group.id) {
      continue;
    }

    const billTitle = getBillTitle(bill);
    const paymentsByPersonId = createPaymentsByPersonId(bill.payments);

    try {
      const review = calculateBillReview(bill, { paymentsByPersonId });
      const currencyAccumulator = currencyAccumulators[bill.currency];
      const billTotalCents = normalizeCents(review.grandTotalCents);

      currencyAccumulator.billCount += 1;
      currencyAccumulator.totalSpentCents += billTotalCents;
      currencyAccumulator.largestBill = getLargestBill({
        currentLargestBill: currencyAccumulator.largestBill,
        bill,
        billTitle,
        billTotalCents,
      });

      const billPersonById = new Map(
        bill.people.map((person) => [person.id, person]),
      );

      for (const payment of bill.payments) {
        if (!billPersonById.has(payment.personId)) {
          issues.push({
            kind: "paymentReferencesUnknownBillPerson",
            billId: bill.id,
            billTitle,
            currency: bill.currency,
            paymentId: payment.id,
            personId: payment.personId,
            amountCents: normalizeCents(payment.amountCents),
          });
        }
      }

      for (const personReview of review.people) {
        const billPerson = billPersonById.get(personReview.personId);

        if (!billPerson) {
          continue;
        }

        const amountOwedCents = normalizeCents(personReview.grossTotalCents);
        const amountPaidCents = normalizeCents(personReview.paidAmountCents);

        if (!billPerson.groupMemberId) {
          issues.push({
            kind: "billPersonMissingGroupMemberId",
            billId: bill.id,
            billTitle,
            currency: bill.currency,
            personId: billPerson.id,
            personName: billPerson.name,
            amountOwedCents,
            amountPaidCents,
          });
          continue;
        }

        const groupMember = groupMemberById.get(billPerson.groupMemberId);

        if (!groupMember) {
          issues.push({
            kind: "billPersonReferencesUnknownGroupMember",
            billId: bill.id,
            billTitle,
            currency: bill.currency,
            personId: billPerson.id,
            personName: billPerson.name,
            groupMemberId: billPerson.groupMemberId,
            amountOwedCents,
            amountPaidCents,
          });
          continue;
        }

        const memberAccumulator = currencyAccumulator.memberAccumulators.get(
          groupMember.id,
        );

        if (!memberAccumulator) {
          continue;
        }

        memberAccumulator.amountOwedCents += amountOwedCents;
        memberAccumulator.amountPaidCents += amountPaidCents;
      }
    } catch (error) {
      issues.push({
        kind: "billCalculationFailed",
        billId: bill.id,
        billTitle,
        currency: bill.currency,
        message:
          error instanceof Error ? error.message : "Could not calculate bill.",
      });
    }
  }

  return {
    groupId: params.group.id,
    currencies: Object.fromEntries(
      CURRENCIES.map((currency) => [
        currency,
        createCurrencyTotals(currencyAccumulators[currency]),
      ]),
    ) as Record<CurrencyCode, GroupStatsCurrencyTotals>,
    issues,
  };
}

function createGroupMemberMap(group: SavedGroup): Map<string, SavedGroupMember> {
  return new Map(group.members.map((member) => [member.id, member]));
}

function createCurrencyAccumulators(
  members: SavedGroupMember[],
): Record<CurrencyCode, CurrencyStatsAccumulator> {
  return {
    USD: createCurrencyAccumulator("USD", members),
    LBP: createCurrencyAccumulator("LBP", members),
  };
}

function createCurrencyAccumulator(
  currency: CurrencyCode,
  members: SavedGroupMember[],
): CurrencyStatsAccumulator {
  return {
    currency,
    billCount: 0,
    totalSpentCents: 0,
    largestBill: null,
    memberAccumulators: createMemberAccumulators(members),
  };
}

function createMemberAccumulators(
  members: SavedGroupMember[],
): Map<string, MemberStatsAccumulator> {
  return new Map(
    members.map((member) => [
      member.id,
      {
        groupMember: member,
        amountPaidCents: 0,
        amountOwedCents: 0,
      },
    ]),
  );
}

function createCurrencyTotals(
  accumulator: CurrencyStatsAccumulator,
): GroupStatsCurrencyTotals {
  const totalSpentCents = normalizeCents(accumulator.totalSpentCents);

  return {
    currency: accumulator.currency,
    billCount: accumulator.billCount,
    totalSpentCents,
    averageBillTotalCents:
      accumulator.billCount > 0
        ? normalizeCents(totalSpentCents / accumulator.billCount)
        : 0,
    largestBill: accumulator.largestBill,
    memberTotals: Array.from(accumulator.memberAccumulators.values()).map(
      createMemberTotal,
    ),
  };
}

function createMemberTotal(
  accumulator: MemberStatsAccumulator,
): GroupStatsMemberTotal {
  const memberTotal: GroupStatsMemberTotal = {
    groupMemberId: accumulator.groupMember.id,
    displayName: accumulator.groupMember.displayName,
    amountPaidCents: normalizeCents(accumulator.amountPaidCents),
    amountOwedCents: normalizeCents(accumulator.amountOwedCents),
  };

  if (accumulator.groupMember.archivedAt) {
    memberTotal.archivedAt = accumulator.groupMember.archivedAt;
  }

  return memberTotal;
}

function getLargestBill(params: {
  currentLargestBill: GroupStatsLargestBill | null;
  bill: Bill;
  billTitle: string;
  billTotalCents: number;
}): GroupStatsLargestBill {
  if (
    params.currentLargestBill &&
    params.currentLargestBill.totalCents >= params.billTotalCents
  ) {
    return params.currentLargestBill;
  }

  return {
    billId: params.bill.id,
    billTitle: params.billTitle,
    totalCents: params.billTotalCents,
  };
}

function createPaymentsByPersonId(payments: Payment[]): Record<string, number> {
  return payments.reduce<Record<string, number>>((totals, payment) => {
    totals[payment.personId] =
      (totals[payment.personId] ?? 0) + payment.amountCents;

    return totals;
  }, {});
}

function normalizeCents(amountCents: number): number {
  return Math.round(amountCents);
}

function getBillTitle(bill: Bill): string {
  return bill.title.trim().length > 0 ? bill.title.trim() : "Untitled bill";
}