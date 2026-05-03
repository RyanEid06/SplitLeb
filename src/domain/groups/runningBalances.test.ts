import { describe, expect, it } from "vitest";
import type { Bill, CurrencyCode, Person } from "../bill/types";
import { calculateGroupRunningBalances } from "./runningBalances";
import type { SavedGroup } from "./types";

const timestamp = "2026-04-30T00:00:00.000Z";

function createGroup(): SavedGroup {
  return {
    id: "group-1",
    name: "Friends",
    createdAt: timestamp,
    updatedAt: timestamp,
    members: [
      {
        id: "member-ali",
        displayName: "Ali Current Name",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "member-maya",
        displayName: "Maya",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "member-roro",
        displayName: "Roro Archived",
        createdAt: timestamp,
        updatedAt: timestamp,
        archivedAt: timestamp,
      },
    ],
  };
}

function createPerson(
  id: string,
  name: string,
  groupMemberId?: string,
): Person {
  return {
    id,
    name,
    groupMemberId,
  };
}

function createEqualSplitBill(params: {
  id: string;
  currency?: CurrencyCode;
  groupId?: string;
  people: Person[];
  totalCents: number;
  payments?: { id: string; personId: string; amountCents: number }[];
}): Bill {
  return {
    id: params.id,
    title: `${params.id} title`,
    currency: params.currency ?? "USD",
    groupId: params.groupId,
    people: params.people,
    items: [
      {
        id: `${params.id}-item`,
        name: `${params.id} item`,
        quantity: 1,
        unitPriceCents: params.totalCents,
        split: {
          method: "equal",
          personIds: params.people.map((person) => person.id),
        },
      },
    ],
    extras: [],
    payments: params.payments ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("calculateGroupRunningBalances", () => {
  it("computes running balances from group-linked bills and separates currencies", () => {
    const group = createGroup();

    const usdBill = createEqualSplitBill({
      id: "usd-bill",
      groupId: group.id,
      people: [
        createPerson("usd-ali", "Old Ali Snapshot", "member-ali"),
        createPerson("usd-maya", "Maya", "member-maya"),
        createPerson("usd-roro", "Roro", "member-roro"),
      ],
      totalCents: 6000,
      payments: [{ id: "payment-1", personId: "usd-ali", amountCents: 6000 }],
    });

    const lbpBill = createEqualSplitBill({
      id: "lbp-bill",
      currency: "LBP",
      groupId: group.id,
      people: [
        createPerson("lbp-ali", "Ali LBP Snapshot", "member-ali"),
        createPerson("lbp-maya", "Maya", "member-maya"),
      ],
      totalCents: 90_000_000,
      payments: [
        { id: "payment-2", personId: "lbp-maya", amountCents: 90_000_000 },
      ],
    });

    const standaloneBill = createEqualSplitBill({
      id: "standalone-bill",
      people: [createPerson("standalone-ali", "Ali", "member-ali")],
      totalCents: 10_000,
      payments: [
        {
          id: "payment-standalone",
          personId: "standalone-ali",
          amountCents: 10_000,
        },
      ],
    });

    const otherGroupBill = createEqualSplitBill({
      id: "other-group-bill",
      groupId: "group-2",
      people: [createPerson("other-ali", "Ali", "member-ali")],
      totalCents: 20_000,
      payments: [
        { id: "payment-other", personId: "other-ali", amountCents: 20_000 },
      ],
    });

    const result = calculateGroupRunningBalances({
      group,
      bills: [usdBill, lbpBill, standaloneBill, otherGroupBill],
    });

    expect(result.groupId).toBe(group.id);
    expect(result.issues).toEqual([]);

    expect(result.currencies.USD.billCount).toBe(1);
    expect(result.currencies.USD.amountOwedCents).toBe(6000);
    expect(result.currencies.USD.amountPaidCents).toBe(6000);
    expect(result.currencies.USD.netBalanceCents).toBe(0);
    expect(result.currencies.USD.balances).toEqual([
      {
        groupMemberId: "member-ali",
        displayName: "Ali Current Name",
        amountOwedCents: 2000,
        amountPaidCents: 6000,
        netBalanceCents: 4000,
      },
      {
        groupMemberId: "member-maya",
        displayName: "Maya",
        amountOwedCents: 2000,
        amountPaidCents: 0,
        netBalanceCents: -2000,
      },
      {
        groupMemberId: "member-roro",
        displayName: "Roro Archived",
        archivedAt: timestamp,
        amountOwedCents: 2000,
        amountPaidCents: 0,
        netBalanceCents: -2000,
      },
    ]);

    expect(result.currencies.LBP.billCount).toBe(1);
    expect(result.currencies.LBP.amountOwedCents).toBe(90_000_000);
    expect(result.currencies.LBP.amountPaidCents).toBe(90_000_000);
    expect(result.currencies.LBP.netBalanceCents).toBe(0);
    expect(result.currencies.LBP.balances).toEqual([
      {
        groupMemberId: "member-ali",
        displayName: "Ali Current Name",
        amountOwedCents: 45_000_000,
        amountPaidCents: 0,
        netBalanceCents: -45_000_000,
      },
      {
        groupMemberId: "member-maya",
        displayName: "Maya",
        amountOwedCents: 45_000_000,
        amountPaidCents: 90_000_000,
        netBalanceCents: 45_000_000,
      },
      {
        groupMemberId: "member-roro",
        displayName: "Roro Archived",
        archivedAt: timestamp,
        amountOwedCents: 0,
        amountPaidCents: 0,
        netBalanceCents: 0,
      },
    ]);
  });

  it("aggregates the same group member across different bill-local person ids", () => {
    const group = createGroup();

    const firstBill = createEqualSplitBill({
      id: "first-bill",
      groupId: group.id,
      people: [createPerson("first-local-id", "Ali old name", "member-ali")],
      totalCents: 1000,
      payments: [
        {
          id: "first-payment",
          personId: "first-local-id",
          amountCents: 1000,
        },
      ],
    });

    const secondBill = createEqualSplitBill({
      id: "second-bill",
      groupId: group.id,
      people: [createPerson("second-local-id", "Ali newer name", "member-ali")],
      totalCents: 2500,
      payments: [],
    });

    const result = calculateGroupRunningBalances({
      group,
      bills: [firstBill, secondBill],
    });

    expect(result.currencies.USD.balances[0]).toEqual({
      groupMemberId: "member-ali",
      displayName: "Ali Current Name",
      amountOwedCents: 3500,
      amountPaidCents: 1000,
      netBalanceCents: -2500,
    });
  });

  it("reports bill people with no group member id instead of pretending they are group members", () => {
    const group = createGroup();
    const bill = createEqualSplitBill({
      id: "guest-bill",
      groupId: group.id,
      people: [
        createPerson("ali-local", "Ali", "member-ali"),
        createPerson("guest-local", "Guest"),
      ],
      totalCents: 4000,
      payments: [
        { id: "guest-payment", personId: "guest-local", amountCents: 4000 },
      ],
    });

    const result = calculateGroupRunningBalances({ group, bills: [bill] });

    expect(result.currencies.USD.balances[0]).toEqual({
      groupMemberId: "member-ali",
      displayName: "Ali Current Name",
      amountOwedCents: 2000,
      amountPaidCents: 0,
      netBalanceCents: -2000,
    });
    expect(result.issues).toEqual([
      {
        kind: "billPersonMissingGroupMemberId",
        billId: "guest-bill",
        billTitle: "guest-bill title",
        currency: "USD",
        personId: "guest-local",
        personName: "Guest",
        amountOwedCents: 2000,
        amountPaidCents: 4000,
        netBalanceCents: 2000,
      },
    ]);
  });

  it("reports bill people that reference a missing saved group member", () => {
    const group = createGroup();
    const bill = createEqualSplitBill({
      id: "broken-reference-bill",
      groupId: group.id,
      people: [createPerson("ghost-local", "Ghost", "missing-member")],
      totalCents: 3000,
      payments: [
        { id: "ghost-payment", personId: "ghost-local", amountCents: 3000 },
      ],
    });

    const result = calculateGroupRunningBalances({ group, bills: [bill] });

    expect(result.currencies.USD.amountOwedCents).toBe(0);
    expect(result.currencies.USD.amountPaidCents).toBe(0);
    expect(result.issues).toEqual([
      {
        kind: "billPersonReferencesUnknownGroupMember",
        billId: "broken-reference-bill",
        billTitle: "broken-reference-bill title",
        currency: "USD",
        personId: "ghost-local",
        personName: "Ghost",
        groupMemberId: "missing-member",
        amountOwedCents: 3000,
        amountPaidCents: 3000,
        netBalanceCents: 0,
      },
    ]);
  });

  it("reports payments that reference an unknown bill-local person", () => {
    const group = createGroup();
    const bill = createEqualSplitBill({
      id: "orphan-payment-bill",
      groupId: group.id,
      people: [createPerson("ali-local", "Ali", "member-ali")],
      totalCents: 2000,
      payments: [
        { id: "orphan-payment", personId: "missing-local", amountCents: 2000 },
      ],
    });

    const result = calculateGroupRunningBalances({ group, bills: [bill] });

    expect(result.currencies.USD.balances[0]).toEqual({
      groupMemberId: "member-ali",
      displayName: "Ali Current Name",
      amountOwedCents: 2000,
      amountPaidCents: 0,
      netBalanceCents: -2000,
    });
    expect(result.issues).toEqual([
      {
        kind: "paymentReferencesUnknownBillPerson",
        billId: "orphan-payment-bill",
        billTitle: "orphan-payment-bill title",
        currency: "USD",
        paymentId: "orphan-payment",
        personId: "missing-local",
        amountCents: 2000,
      },
    ]);
  });

  it("reports invalid bills and does not include their totals", () => {
    const group = createGroup();
    const invalidBill = createEqualSplitBill({
      id: "invalid-bill",
      groupId: group.id,
      people: [
        createPerson("ali-local", "Ali", "member-ali"),
        createPerson("maya-local", "Maya", "member-maya"),
      ],
      totalCents: 5000,
      payments: [],
    });

    invalidBill.items[0].split = {
      method: "custom",
      amounts: [{ personId: "ali-local", amountCents: 1000 }],
    };

    const result = calculateGroupRunningBalances({
      group,
      bills: [invalidBill],
    });

    expect(result.currencies.USD.billCount).toBe(0);
    expect(result.currencies.USD.amountOwedCents).toBe(0);
    expect(result.currencies.USD.amountPaidCents).toBe(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        kind: "billCalculationFailed",
        billId: "invalid-bill",
        billTitle: "invalid-bill title",
        currency: "USD",
      }),
    );
  });
});