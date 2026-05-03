import { describe, expect, it } from "vitest";
import type { CurrencyCode } from "../bill/types";
import type { GroupRunningBalance } from "./runningBalances";
import { calculateGroupSettleUp } from "./groupSettleUp";

function createBalance(params: {
  groupMemberId: string;
  displayName: string;
  netBalanceCents: number;
  archivedAt?: string;
}): GroupRunningBalance {
  const amountPaidCents = Math.max(params.netBalanceCents, 0);
  const amountOwedCents = Math.max(-params.netBalanceCents, 0);

  const balance: GroupRunningBalance = {
    groupMemberId: params.groupMemberId,
    displayName: params.displayName,
    amountOwedCents,
    amountPaidCents,
    netBalanceCents: params.netBalanceCents,
  };

  if (params.archivedAt) {
    balance.archivedAt = params.archivedAt;
  }

  return balance;
}

function settleUp(
  currency: CurrencyCode,
  balances: GroupRunningBalance[],
) {
  return calculateGroupSettleUp({ currency, balances });
}

describe("calculateGroupSettleUp", () => {
  it("creates one transfer when positive and negative balances cancel out", () => {
    const result = settleUp("LBP", [
      createBalance({
        groupMemberId: "member-ryan",
        displayName: "Ryan",
        netBalanceCents: 6_400_000,
      }),
      createBalance({
        groupMemberId: "member-elio",
        displayName: "Elio",
        netBalanceCents: -6_400_000,
      }),
    ]);

    expect(result).toEqual({
      currency: "LBP",
      totalPositiveCents: 6_400_000,
      totalNegativeCents: 6_400_000,
      matchedTransferTotalCents: 6_400_000,
      imbalance: {
        kind: "balanced",
        amountCents: 0,
      },
      transfers: [
        {
          fromGroupMemberId: "member-elio",
          fromDisplayName: "Elio",
          toGroupMemberId: "member-ryan",
          toDisplayName: "Ryan",
          amountCents: 6_400_000,
        },
      ],
    });
  });

  it("only matches real debt when the group is overpaid", () => {
    const result = settleUp("LBP", [
      createBalance({
        groupMemberId: "member-ryan",
        displayName: "Ryan",
        netBalanceCents: 6_400_000,
      }),
      createBalance({
        groupMemberId: "member-elio",
        displayName: "Elio",
        netBalanceCents: -1_600_000,
      }),
    ]);

    expect(result.transfers).toEqual([
      {
        fromGroupMemberId: "member-elio",
        fromDisplayName: "Elio",
        toGroupMemberId: "member-ryan",
        toDisplayName: "Ryan",
        amountCents: 1_600_000,
      },
    ]);

    expect(result.totalPositiveCents).toBe(6_400_000);
    expect(result.totalNegativeCents).toBe(1_600_000);
    expect(result.matchedTransferTotalCents).toBe(1_600_000);
    expect(result.imbalance).toEqual({
      kind: "overpaid",
      amountCents: 4_800_000,
    });
  });

  it("only matches available credit when the group is unpaid", () => {
    const result = settleUp("LBP", [
      createBalance({
        groupMemberId: "member-ryan",
        displayName: "Ryan",
        netBalanceCents: 1_600_000,
      }),
      createBalance({
        groupMemberId: "member-elio",
        displayName: "Elio",
        netBalanceCents: -6_400_000,
      }),
    ]);

    expect(result.transfers).toEqual([
      {
        fromGroupMemberId: "member-elio",
        fromDisplayName: "Elio",
        toGroupMemberId: "member-ryan",
        toDisplayName: "Ryan",
        amountCents: 1_600_000,
      },
    ]);

    expect(result.totalPositiveCents).toBe(1_600_000);
    expect(result.totalNegativeCents).toBe(6_400_000);
    expect(result.matchedTransferTotalCents).toBe(1_600_000);
    expect(result.imbalance).toEqual({
      kind: "unpaid",
      amountCents: 4_800_000,
    });
  });

  it("matches multiple debtors and creditors without blending people together", () => {
    const result = settleUp("USD", [
      createBalance({
        groupMemberId: "member-ali",
        displayName: "Ali",
        netBalanceCents: 5_000,
      }),
      createBalance({
        groupMemberId: "member-maya",
        displayName: "Maya",
        netBalanceCents: 3_000,
      }),
      createBalance({
        groupMemberId: "member-roro",
        displayName: "Roro",
        netBalanceCents: -6_000,
      }),
      createBalance({
        groupMemberId: "member-joe",
        displayName: "Joe",
        netBalanceCents: -2_000,
      }),
    ]);

    expect(result.imbalance).toEqual({
      kind: "balanced",
      amountCents: 0,
    });

    expect(result.transfers).toEqual([
      {
        fromGroupMemberId: "member-roro",
        fromDisplayName: "Roro",
        toGroupMemberId: "member-ali",
        toDisplayName: "Ali",
        amountCents: 5_000,
      },
      {
        fromGroupMemberId: "member-roro",
        fromDisplayName: "Roro",
        toGroupMemberId: "member-maya",
        toDisplayName: "Maya",
        amountCents: 1_000,
      },
      {
        fromGroupMemberId: "member-joe",
        fromDisplayName: "Joe",
        toGroupMemberId: "member-maya",
        toDisplayName: "Maya",
        amountCents: 2_000,
      },
    ]);

    expect(result.matchedTransferTotalCents).toBe(8_000);
  });

  it("keeps archived members valid in settle-up suggestions", () => {
    const archivedAt = "2026-04-30T00:00:00.000Z";

    const result = settleUp("USD", [
      createBalance({
        groupMemberId: "member-ryan",
        displayName: "Ryan",
        netBalanceCents: 2_500,
      }),
      createBalance({
        groupMemberId: "member-roro",
        displayName: "Roro",
        netBalanceCents: -2_500,
        archivedAt,
      }),
    ]);

    expect(result.transfers).toEqual([
      {
        fromGroupMemberId: "member-roro",
        fromDisplayName: "Roro",
        fromArchivedAt: archivedAt,
        toGroupMemberId: "member-ryan",
        toDisplayName: "Ryan",
        amountCents: 2_500,
      },
    ]);

    expect(result.imbalance).toEqual({
      kind: "balanced",
      amountCents: 0,
    });
  });

  it("returns no transfers when everyone is settled", () => {
    const result = settleUp("USD", [
      createBalance({
        groupMemberId: "member-ali",
        displayName: "Ali",
        netBalanceCents: 0,
      }),
      createBalance({
        groupMemberId: "member-maya",
        displayName: "Maya",
        netBalanceCents: 0,
      }),
    ]);

    expect(result.transfers).toEqual([]);
    expect(result.totalPositiveCents).toBe(0);
    expect(result.totalNegativeCents).toBe(0);
    expect(result.matchedTransferTotalCents).toBe(0);
    expect(result.imbalance).toEqual({
      kind: "balanced",
      amountCents: 0,
    });
  });

  it("keeps the requested currency on the result so callers render USD and LBP separately", () => {
    const usdResult = settleUp("USD", [
      createBalance({
        groupMemberId: "member-ali",
        displayName: "Ali",
        netBalanceCents: 1_000,
      }),
      createBalance({
        groupMemberId: "member-maya",
        displayName: "Maya",
        netBalanceCents: -1_000,
      }),
    ]);

    const lbpResult = settleUp("LBP", [
      createBalance({
        groupMemberId: "member-ali",
        displayName: "Ali",
        netBalanceCents: 100_000,
      }),
      createBalance({
        groupMemberId: "member-maya",
        displayName: "Maya",
        netBalanceCents: -100_000,
      }),
    ]);

    expect(usdResult.currency).toBe("USD");
    expect(usdResult.transfers[0]?.amountCents).toBe(1_000);

    expect(lbpResult.currency).toBe("LBP");
    expect(lbpResult.transfers[0]?.amountCents).toBe(100_000);
  });
});