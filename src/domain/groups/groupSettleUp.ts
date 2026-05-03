import type { CurrencyCode } from "../bill/types";
import type { GroupRunningBalance } from "./runningBalances";

export type GroupSettleUpTransfer = {
  fromGroupMemberId: string;
  fromDisplayName: string;
  fromArchivedAt?: string;
  toGroupMemberId: string;
  toDisplayName: string;
  toArchivedAt?: string;
  amountCents: number;
};

export type GroupSettleUpImbalance =
  | {
      kind: "balanced";
      amountCents: 0;
    }
  | {
      kind: "overpaid";
      amountCents: number;
    }
  | {
      kind: "unpaid";
      amountCents: number;
    };

export type GroupSettleUpResult = {
  currency: CurrencyCode;
  transfers: GroupSettleUpTransfer[];
  totalPositiveCents: number;
  totalNegativeCents: number;
  matchedTransferTotalCents: number;
  imbalance: GroupSettleUpImbalance;
};

type SettleUpSide = {
  groupMemberId: string;
  displayName: string;
  archivedAt?: string;
  remainingCents: number;
};

export function calculateGroupSettleUp(params: {
  currency: CurrencyCode;
  balances: GroupRunningBalance[];
}): GroupSettleUpResult {
  const creditors = createSettleUpSide(params.balances, "creditor");
  const debtors = createSettleUpSide(params.balances, "debtor");

  const totalPositiveCents = sumRemainingCents(creditors);
  const totalNegativeCents = sumRemainingCents(debtors);
  const transfers: GroupSettleUpTransfer[] = [];

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const transferAmountCents = normalizeCents(
      Math.min(creditor.remainingCents, debtor.remainingCents),
    );

    if (transferAmountCents <= 0) {
      break;
    }

    const transfer: GroupSettleUpTransfer = {
      fromGroupMemberId: debtor.groupMemberId,
      fromDisplayName: debtor.displayName,
      toGroupMemberId: creditor.groupMemberId,
      toDisplayName: creditor.displayName,
      amountCents: transferAmountCents,
    };

    if (debtor.archivedAt) {
      transfer.fromArchivedAt = debtor.archivedAt;
    }

    if (creditor.archivedAt) {
      transfer.toArchivedAt = creditor.archivedAt;
    }

    transfers.push(transfer);

    debtor.remainingCents = normalizeCents(
      debtor.remainingCents - transferAmountCents,
    );
    creditor.remainingCents = normalizeCents(
      creditor.remainingCents - transferAmountCents,
    );

    if (debtor.remainingCents === 0) {
      debtorIndex += 1;
    }

    if (creditor.remainingCents === 0) {
      creditorIndex += 1;
    }
  }

  return {
    currency: params.currency,
    transfers,
    totalPositiveCents,
    totalNegativeCents,
    matchedTransferTotalCents: sumTransferCents(transfers),
    imbalance: createImbalance(totalPositiveCents, totalNegativeCents),
  };
}

function createSettleUpSide(
  balances: GroupRunningBalance[],
  side: "creditor" | "debtor",
): SettleUpSide[] {
  return balances.flatMap((balance) => {
    const netBalanceCents = normalizeCents(balance.netBalanceCents);

    if (side === "creditor" && netBalanceCents <= 0) {
      return [];
    }

    if (side === "debtor" && netBalanceCents >= 0) {
      return [];
    }

    const settleUpSide: SettleUpSide = {
      groupMemberId: balance.groupMemberId,
      displayName: balance.displayName,
      remainingCents: Math.abs(netBalanceCents),
    };

    if (balance.archivedAt) {
      settleUpSide.archivedAt = balance.archivedAt;
    }

    return [settleUpSide];
  });
}

function createImbalance(
  totalPositiveCents: number,
  totalNegativeCents: number,
): GroupSettleUpImbalance {
  if (totalPositiveCents > totalNegativeCents) {
    return {
      kind: "overpaid",
      amountCents: normalizeCents(totalPositiveCents - totalNegativeCents),
    };
  }

  if (totalNegativeCents > totalPositiveCents) {
    return {
      kind: "unpaid",
      amountCents: normalizeCents(totalNegativeCents - totalPositiveCents),
    };
  }

  return {
    kind: "balanced",
    amountCents: 0,
  };
}

function sumRemainingCents(items: SettleUpSide[]): number {
  return normalizeCents(
    items.reduce((total, item) => total + item.remainingCents, 0),
  );
}

function sumTransferCents(transfers: GroupSettleUpTransfer[]): number {
  return normalizeCents(
    transfers.reduce((total, transfer) => total + transfer.amountCents, 0),
  );
}

function normalizeCents(amountCents: number): number {
  return Math.round(amountCents);
}