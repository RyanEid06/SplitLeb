import { calculateBillReview } from "../bill/review";
import type { Bill, CurrencyCode, Payment } from "../bill/types";
import type { SavedGroup, SavedGroupMember } from "./types";

export type GroupRunningBalance = {
  groupMemberId: string;
  displayName: string;
  archivedAt?: string;
  amountOwedCents: number;
  amountPaidCents: number;
  netBalanceCents: number;
};

export type GroupRunningBalanceCurrencyTotals = {
  currency: CurrencyCode;
  billCount: number;
  amountOwedCents: number;
  amountPaidCents: number;
  netBalanceCents: number;
  balances: GroupRunningBalance[];
};

export type GroupRunningBalanceIssue =
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
      netBalanceCents: number;
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
      netBalanceCents: number;
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

export type GroupRunningBalancesResult = {
  groupId: string;
  currencies: Record<CurrencyCode, GroupRunningBalanceCurrencyTotals>;
  issues: GroupRunningBalanceIssue[];
};

type RunningBalanceAccumulator = {
  groupMember: SavedGroupMember;
  amountOwedCents: number;
  amountPaidCents: number;
};

type CurrencyAccumulators = Record<
  CurrencyCode,
  Map<string, RunningBalanceAccumulator>
>;

const CURRENCIES: CurrencyCode[] = ["USD", "LBP"];

export function calculateGroupRunningBalances(params: {
  group: SavedGroup;
  bills: Bill[];
}): GroupRunningBalancesResult {
  const groupMemberById = createGroupMemberMap(params.group);
  const accumulators = createCurrencyAccumulators(params.group.members);
  const billCounts = createZeroCurrencyTotals();
  const issues: GroupRunningBalanceIssue[] = [];

  for (const bill of params.bills) {
    if (bill.groupId !== params.group.id) {
      continue;
    }

    const billTitle = getBillTitle(bill);
    const paymentsByPersonId = createPaymentsByPersonId(bill.payments);

    try {
      const review = calculateBillReview(bill, { paymentsByPersonId });
      billCounts[bill.currency] += 1;

      const personById = new Map(
        bill.people.map((person) => [person.id, person]),
      );

      for (const payment of bill.payments) {
        if (!personById.has(payment.personId)) {
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
        const billPerson = personById.get(personReview.personId);

        if (!billPerson) {
          continue;
        }

        const balanceSnapshot = {
          amountOwedCents: normalizeCents(personReview.grossTotalCents),
          amountPaidCents: normalizeCents(personReview.paidAmountCents),
          netBalanceCents: normalizeCents(
            personReview.paidAmountCents - personReview.grossTotalCents,
          ),
        };

        if (!billPerson.groupMemberId) {
          issues.push({
            kind: "billPersonMissingGroupMemberId",
            billId: bill.id,
            billTitle,
            currency: bill.currency,
            personId: billPerson.id,
            personName: billPerson.name,
            ...balanceSnapshot,
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
            ...balanceSnapshot,
          });
          continue;
        }

        const accumulator = accumulators[bill.currency].get(groupMember.id);

        if (!accumulator) {
          continue;
        }

        accumulator.amountOwedCents += balanceSnapshot.amountOwedCents;
        accumulator.amountPaidCents += balanceSnapshot.amountPaidCents;
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
        createCurrencyTotals({
          currency,
          billCount: billCounts[currency],
          accumulators: accumulators[currency],
        }),
      ]),
    ) as Record<CurrencyCode, GroupRunningBalanceCurrencyTotals>,
    issues,
  };
}

function createGroupMemberMap(group: SavedGroup): Map<string, SavedGroupMember> {
  return new Map(group.members.map((member) => [member.id, member]));
}

function createCurrencyAccumulators(
  members: SavedGroupMember[],
): CurrencyAccumulators {
  return {
    USD: createMemberAccumulators(members),
    LBP: createMemberAccumulators(members),
  };
}

function createMemberAccumulators(
  members: SavedGroupMember[],
): Map<string, RunningBalanceAccumulator> {
  return new Map(
    members.map((member) => [
      member.id,
      {
        groupMember: member,
        amountOwedCents: 0,
        amountPaidCents: 0,
      },
    ]),
  );
}

function createZeroCurrencyTotals(): Record<CurrencyCode, number> {
  return {
    USD: 0,
    LBP: 0,
  };
}

function createCurrencyTotals(params: {
  currency: CurrencyCode;
  billCount: number;
  accumulators: Map<string, RunningBalanceAccumulator>;
}): GroupRunningBalanceCurrencyTotals {
  const balances = Array.from(params.accumulators.values()).map(
    (accumulator) => {
      const amountOwedCents = normalizeCents(accumulator.amountOwedCents);
      const amountPaidCents = normalizeCents(accumulator.amountPaidCents);

      const balance: GroupRunningBalance = {
        groupMemberId: accumulator.groupMember.id,
        displayName: accumulator.groupMember.displayName,
        amountOwedCents,
        amountPaidCents,
        netBalanceCents: normalizeCents(amountPaidCents - amountOwedCents),
      };

      if (accumulator.groupMember.archivedAt) {
        balance.archivedAt = accumulator.groupMember.archivedAt;
      }

      return balance;
    },
  );

  const amountOwedCents = sumBalances(balances, "amountOwedCents");
  const amountPaidCents = sumBalances(balances, "amountPaidCents");

  return {
    currency: params.currency,
    billCount: params.billCount,
    amountOwedCents,
    amountPaidCents,
    netBalanceCents: normalizeCents(amountPaidCents - amountOwedCents),
    balances,
  };
}

function createPaymentsByPersonId(payments: Payment[]): Record<string, number> {
  return payments.reduce<Record<string, number>>((totals, payment) => {
    totals[payment.personId] =
      (totals[payment.personId] ?? 0) + payment.amountCents;

    return totals;
  }, {});
}

function sumBalances(
  balances: GroupRunningBalance[],
  key: "amountOwedCents" | "amountPaidCents",
): number {
  return normalizeCents(
    balances.reduce((sum, balance) => sum + balance[key], 0),
  );
}

function normalizeCents(amountCents: number): number {
  return Math.round(amountCents);
}

function getBillTitle(bill: Bill): string {
  return bill.title.trim().length > 0 ? bill.title.trim() : "Untitled bill";
}