import { describe, expect, it } from "vitest";
import type { Bill, CurrencyCode, Person } from "../bill/types";
import { calculateGroupStats } from "./groupStats";
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
  title?: string;
  currency?: CurrencyCode;
  groupId?: string;
  people: Person[];
  totalCents: number;
  payments?: { id: string; personId: string; amountCents: number }[];
}): Bill {
  return {
    id: params.id,
    title: params.title ?? `${params.id} title`,
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

function createBrokenBill(groupId: string): Bill {
  return {
    id: "broken-bill",
    title: "Broken bill",
    currency: "USD",
    groupId,
    people: [createPerson("ali-local", "Ali", "member-ali")],
    items: [
      {
        id: "broken-item",
        name: "Broken item",
        quantity: 1,
        unitPriceCents: 5000,
        split: {
          method: "equal",
          personIds: ["missing-person"],
        },
      },
    ],
    extras: [],
    payments: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("calculateGroupStats", () => {
  it("computes basic stats from group-linked bills and separates currencies", () => {
    const group = createGroup();

    const usdSmallBill = createEqualSplitBill({
      id: "usd-small-bill",
      title: "USD small",
      groupId: group.id,
      people: [
        createPerson("usd-small-ali", "Old Ali Snapshot", "member-ali"),
        createPerson("usd-small-maya", "Maya", "member-maya"),
      ],
      totalCents: 4000,
      payments: [
        { id: "usd-small-payment", personId: "usd-small-ali", amountCents: 4000 },
      ],
    });

    const usdLargeBill = createEqualSplitBill({
      id: "usd-large-bill",
      title: "USD large",
      groupId: group.id,
      people: [
        createPerson("usd-large-ali", "Ali", "member-ali"),
        createPerson("usd-large-maya", "Maya", "member-maya"),
        createPerson("usd-large-roro", "Roro", "member-roro"),
      ],
      totalCents: 9000,
      payments: [
        { id: "usd-large-payment", personId: "usd-large-roro", amountCents: 9000 },
      ],
    });

    const lbpBill = createEqualSplitBill({
      id: "lbp-bill",
      title: "LBP dinner",
      currency: "LBP",
      groupId: group.id,
      people: [
        createPerson("lbp-ali", "Ali", "member-ali"),
        createPerson("lbp-maya", "Maya", "member-maya"),
      ],
      totalCents: 90_000_000,
      payments: [
        { id: "lbp-payment", personId: "lbp-maya", amountCents: 90_000_000 },
      ],
    });

    const standaloneBill = createEqualSplitBill({
      id: "standalone-bill",
      people: [createPerson("standalone-ali", "Ali", "member-ali")],
      totalCents: 10_000,
      payments: [
        {
          id: "standalone-payment",
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
        { id: "other-payment", personId: "other-ali", amountCents: 20_000 },
      ],
    });

    const result = calculateGroupStats({
      group,
      bills: [
        usdSmallBill,
        usdLargeBill,
        lbpBill,
        standaloneBill,
        otherGroupBill,
      ],
    });

    expect(result.groupId).toBe(group.id);
    expect(result.issues).toEqual([]);

    expect(result.currencies.USD.billCount).toBe(2);
    expect(result.currencies.USD.totalSpentCents).toBe(13_000);
    expect(result.currencies.USD.averageBillTotalCents).toBe(6_500);
    expect(result.currencies.USD.largestBill).toEqual({
      billId: "usd-large-bill",
      billTitle: "USD large",
      totalCents: 9000,
    });
    expect(result.currencies.USD.memberTotals).toEqual([
      {
        groupMemberId: "member-ali",
        displayName: "Ali Current Name",
        amountOwedCents: 5000,
        amountPaidCents: 4000,
      },
      {
        groupMemberId: "member-maya",
        displayName: "Maya",
        amountOwedCents: 5000,
        amountPaidCents: 0,
      },
      {
        groupMemberId: "member-roro",
        displayName: "Roro Archived",
        archivedAt: timestamp,
        amountOwedCents: 3000,
        amountPaidCents: 9000,
      },
    ]);

    expect(result.currencies.LBP.billCount).toBe(1);
    expect(result.currencies.LBP.totalSpentCents).toBe(90_000_000);
    expect(result.currencies.LBP.averageBillTotalCents).toBe(90_000_000);
    expect(result.currencies.LBP.largestBill).toEqual({
      billId: "lbp-bill",
      billTitle: "LBP dinner",
      totalCents: 90_000_000,
    });
    expect(result.currencies.LBP.memberTotals).toEqual([
      {
        groupMemberId: "member-ali",
        displayName: "Ali Current Name",
        amountOwedCents: 45_000_000,
        amountPaidCents: 0,
      },
      {
        groupMemberId: "member-maya",
        displayName: "Maya",
        amountOwedCents: 45_000_000,
        amountPaidCents: 90_000_000,
      },
      {
        groupMemberId: "member-roro",
        displayName: "Roro Archived",
        archivedAt: timestamp,
        amountOwedCents: 0,
        amountPaidCents: 0,
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

    const result = calculateGroupStats({
      group,
      bills: [firstBill, secondBill],
    });

    expect(result.currencies.USD.memberTotals[0]).toEqual({
      groupMemberId: "member-ali",
      displayName: "Ali Current Name",
      amountOwedCents: 3500,
      amountPaidCents: 1000,
    });
  });

  it("keeps archived members valid in stats", () => {
    const group = createGroup();
    const bill = createEqualSplitBill({
      id: "archived-member-bill",
      groupId: group.id,
      people: [createPerson("roro-local", "Roro old name", "member-roro")],
      totalCents: 2200,
      payments: [
        { id: "roro-payment", personId: "roro-local", amountCents: 2200 },
      ],
    });

    const result = calculateGroupStats({ group, bills: [bill] });

    expect(result.currencies.USD.memberTotals[2]).toEqual({
      groupMemberId: "member-roro",
      displayName: "Roro Archived",
      archivedAt: timestamp,
      amountOwedCents: 2200,
      amountPaidCents: 2200,
    });
  });

  it("reports bill people with no group member id instead of matching by name", () => {
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

    const result = calculateGroupStats({ group, bills: [bill] });

    expect(result.currencies.USD.billCount).toBe(1);
    expect(result.currencies.USD.totalSpentCents).toBe(4000);
    expect(result.currencies.USD.memberTotals[0]).toEqual({
      groupMemberId: "member-ali",
      displayName: "Ali Current Name",
      amountOwedCents: 2000,
      amountPaidCents: 0,
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

    const result = calculateGroupStats({ group, bills: [bill] });

    expect(result.currencies.USD.billCount).toBe(1);
    expect(result.currencies.USD.totalSpentCents).toBe(3000);
    expect(result.currencies.USD.memberTotals[0]).toEqual({
      groupMemberId: "member-ali",
      displayName: "Ali Current Name",
      amountOwedCents: 0,
      amountPaidCents: 0,
    });
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

    const result = calculateGroupStats({ group, bills: [bill] });

    expect(result.currencies.USD.memberTotals[0]).toEqual({
      groupMemberId: "member-ali",
      displayName: "Ali Current Name",
      amountOwedCents: 2000,
      amountPaidCents: 0,
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

  it("skips uncalculable bills and reports why", () => {
    const group = createGroup();

    const result = calculateGroupStats({
      group,
      bills: [createBrokenBill(group.id)],
    });

    expect(result.currencies.USD.billCount).toBe(0);
    expect(result.currencies.USD.totalSpentCents).toBe(0);
    expect(result.currencies.USD.averageBillTotalCents).toBe(0);
    expect(result.currencies.USD.largestBill).toBeNull();
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      kind: "billCalculationFailed",
      billId: "broken-bill",
      billTitle: "Broken bill",
      currency: "USD",
    });
  });

  it("returns clean zero stats when the group has no linked bills", () => {
    const group = createGroup();
    const result = calculateGroupStats({ group, bills: [] });

    expect(result.issues).toEqual([]);
    expect(result.currencies.USD).toEqual({
      currency: "USD",
      billCount: 0,
      totalSpentCents: 0,
      averageBillTotalCents: 0,
      largestBill: null,
      memberTotals: [
        {
          groupMemberId: "member-ali",
          displayName: "Ali Current Name",
          amountOwedCents: 0,
          amountPaidCents: 0,
        },
        {
          groupMemberId: "member-maya",
          displayName: "Maya",
          amountOwedCents: 0,
          amountPaidCents: 0,
        },
        {
          groupMemberId: "member-roro",
          displayName: "Roro Archived",
          archivedAt: timestamp,
          amountOwedCents: 0,
          amountPaidCents: 0,
        },
      ],
    });
    expect(result.currencies.LBP.billCount).toBe(0);
    expect(result.currencies.LBP.totalSpentCents).toBe(0);
    expect(result.currencies.LBP.largestBill).toBeNull();
  });
});