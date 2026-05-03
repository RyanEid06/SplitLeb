import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedGroup } from "../domain/groups/types";
import type { StoredBill } from "./db";
import { getDb } from "./db";
import {
  exportAllBills,
  importBillsFromBackup,
  listBillSummariesByGroupId,
} from "./billStorage";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

const bills = new Map<string, StoredBill>();
const savedGroups = new Map<string, SavedGroup>();

function cloneBill(bill: StoredBill): StoredBill {
  return JSON.parse(JSON.stringify(bill)) as StoredBill;
}

function cloneGroup(group: SavedGroup): SavedGroup {
  return JSON.parse(JSON.stringify(group)) as SavedGroup;
}

function createBill(
  overrides: Partial<StoredBill> & Pick<StoredBill, "id" | "updatedAt">,
): StoredBill {
  return {
    id: overrides.id,
    title: overrides.title ?? overrides.id,
    status: overrides.status ?? "draft",
    currency: overrides.currency ?? "USD",
    groupId: overrides.groupId,
    people:
      overrides.people ??
      [
        {
          id: "person-1",
          name: "Roro",
        },
      ],
    items:
      overrides.items ??
      [
        {
          id: "item-1",
          name: "Pizza",
          quantity: 1,
          unitPriceCents: 1200,
          split: {
            method: "equal",
            personIds: ["person-1"],
          },
        },
      ],
    extras: overrides.extras ?? [],
    payments: overrides.payments ?? [],
    note: overrides.note,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt,
    lastOpenedAt: overrides.lastOpenedAt,
  };
}

function createGroup(overrides: Partial<SavedGroup> = {}): SavedGroup {
  return {
    id: overrides.id ?? "group-1",
    name: overrides.name ?? "Weekend Crew",
    members:
      overrides.members ??
      [
        {
          id: "member-1",
          displayName: "Roro",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    archivedAt: overrides.archivedAt,
  };
}

function getStore(storeName: string) {
  if (storeName === "bills") {
    return {
      async get(id: string) {
        const bill = bills.get(id);
        return bill ? cloneBill(bill) : undefined;
      },
      async put(bill: StoredBill) {
        bills.set(bill.id, cloneBill(bill));
        return bill.id;
      },
    };
  }

  if (storeName === "savedGroups") {
    return {
      async get(id: string) {
        const group = savedGroups.get(id);
        return group ? cloneGroup(group) : undefined;
      },
      async put(group: SavedGroup) {
        savedGroups.set(group.id, cloneGroup(group));
        return group.id;
      },
    };
  }

  throw new Error(`Unexpected store: ${storeName}`);
}

const fakeDb = {
  async getAll(storeName: string) {
    if (storeName === "bills") {
      return Array.from(bills.values()).map(cloneBill);
    }

    if (storeName === "savedGroups") {
      return Array.from(savedGroups.values()).map(cloneGroup);
    }

    throw new Error(`Unexpected store: ${storeName}`);
  },

  transaction() {
    return {
      objectStore(storeName: string) {
        return getStore(storeName);
      },
      done: Promise.resolve(),
    };
  },
};

describe("bill storage", () => {
  beforeEach(() => {
    bills.clear();
    savedGroups.clear();
    vi.mocked(getDb).mockResolvedValue(fakeDb as never);
  });

  it("lists only bills linked to the requested group newest first", async () => {
    const olderGroupBill = createBill({
      id: "older-group-bill",
      title: "Older group bill",
      groupId: "group-1",
      updatedAt: "2026-01-01T00:00:01.000Z",
    });
    const newerGroupBill = createBill({
      id: "newer-group-bill",
      title: "Newer group bill",
      groupId: "group-1",
      updatedAt: "2026-01-01T00:00:03.000Z",
    });
    const otherGroupBill = createBill({
      id: "other-group-bill",
      groupId: "group-2",
      updatedAt: "2026-01-01T00:00:04.000Z",
    });
    const standaloneBill = createBill({
      id: "standalone-bill",
      updatedAt: "2026-01-01T00:00:05.000Z",
    });

    [olderGroupBill, newerGroupBill, otherGroupBill, standaloneBill].forEach(
      (bill) => bills.set(bill.id, bill),
    );

    const summaries = await listBillSummariesByGroupId("group-1");

    expect(summaries.map((bill) => bill.id)).toEqual([
      newerGroupBill.id,
      olderGroupBill.id,
    ]);
    expect(summaries[0]).toMatchObject({
      title: "Newer group bill",
      currency: "USD",
      peopleCount: 1,
      itemsCount: 1,
      billTotalCents: 1200,
      hasCalculationIssue: false,
    });
  });

  it("keeps currencies separated in the returned summaries", async () => {
    const usdBill = createBill({
      id: "usd-bill",
      currency: "USD",
      groupId: "group-1",
      updatedAt: "2026-01-01T00:00:01.000Z",
    });
    const lbpBill = createBill({
      id: "lbp-bill",
      currency: "LBP",
      groupId: "group-1",
      updatedAt: "2026-01-01T00:00:02.000Z",
      items: [
        {
          id: "item-1",
          name: "Manoushe",
          quantity: 1,
          unitPriceCents: 630_000 * 100,
          split: {
            method: "equal",
            personIds: ["person-1"],
          },
        },
      ],
    });

    [usdBill, lbpBill].forEach((bill) => bills.set(bill.id, bill));

    const summaries = await listBillSummariesByGroupId("group-1");

    expect(summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "usd-bill", currency: "USD" }),
        expect.objectContaining({
          id: "lbp-bill",
          currency: "LBP",
          billTotalCents: 63_000_000,
        }),
      ]),
    );
  });

  it("returns an empty list when the group has no linked bills", async () => {
    bills.set(
      "standalone-bill",
      createBill({
        id: "standalone-bill",
        updatedAt: "2026-01-01T00:00:01.000Z",
      }),
    );

    await expect(listBillSummariesByGroupId("group-1")).resolves.toEqual([]);
  });

  it("exports bills and saved groups in a v2 backup", async () => {
    const bill = createBill({
      id: "group-bill",
      groupId: "group-1",
      updatedAt: "2026-01-01T00:00:01.000Z",
    });
    const group = createGroup({ id: "group-1" });

    bills.set(bill.id, bill);
    savedGroups.set(group.id, group);

    const backup = await exportAllBills();

    expect(backup).toMatchObject({
      appName: "SplitLeb",
      schemaVersion: 2,
      bills: [expect.objectContaining({ id: bill.id })],
      groups: [expect.objectContaining({ id: group.id })],
    });
  });

  it("imports old v1 bill-only backups as standalone bills", async () => {
    const bill = createBill({
      id: "standalone-bill",
      updatedAt: "2026-01-01T00:00:01.000Z",
    });

    const result = await importBillsFromBackup({
      appName: "SplitLeb",
      schemaVersion: 1,
      exportedAt: "2026-01-01T00:00:02.000Z",
      bills: [bill],
    });

    expect(result).toMatchObject({
      importedBillCount: 1,
      skippedBillCount: 0,
      importedGroupCount: 0,
      skippedGroupCount: 0,
    });
    expect(bills.get(bill.id)).toEqual(bill);
    expect(savedGroups.size).toBe(0);
  });

  it("imports v2 backups with groups, archived members, and linked bills", async () => {
    const group = createGroup({
      id: "group-1",
      members: [
        {
          id: "member-1",
          displayName: "Roro",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "member-2",
          displayName: "Ryan",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          archivedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    });
    const bill = createBill({
      id: "linked-bill",
      groupId: group.id,
      people: [
        {
          id: "person-1",
          name: "Roro",
          groupMemberId: "member-1",
        },
      ],
      updatedAt: "2026-01-01T00:00:01.000Z",
    });

    const result = await importBillsFromBackup({
      appName: "SplitLeb",
      schemaVersion: 2,
      exportedAt: "2026-01-01T00:00:02.000Z",
      bills: [bill],
      groups: [group],
    });

    expect(result).toMatchObject({
      importedBillCount: 1,
      skippedBillCount: 0,
      importedGroupCount: 1,
      skippedGroupCount: 0,
    });
    expect(savedGroups.get(group.id)).toEqual(group);
    expect(bills.get(bill.id)).toEqual(bill);
  });

  it("skips duplicate bills and identical duplicate groups on re-import", async () => {
    const group = createGroup({ id: "group-1" });
    const bill = createBill({
      id: "linked-bill",
      groupId: group.id,
      people: [
        {
          id: "person-1",
          name: "Roro",
          groupMemberId: "member-1",
        },
      ],
      updatedAt: "2026-01-01T00:00:01.000Z",
    });

    savedGroups.set(group.id, group);
    bills.set(bill.id, bill);

    const result = await importBillsFromBackup({
      appName: "SplitLeb",
      schemaVersion: 2,
      exportedAt: "2026-01-01T00:00:02.000Z",
      bills: [bill],
      groups: [group],
    });

    expect(result).toMatchObject({
      importedBillCount: 0,
      skippedBillCount: 1,
      importedGroupCount: 0,
      skippedGroupCount: 1,
    });
  });

  it("rejects group-linked bills when the saved group is missing", async () => {
    const bill = createBill({
      id: "orphan-linked-bill",
      groupId: "missing-group",
      updatedAt: "2026-01-01T00:00:01.000Z",
    });

    await expect(
      importBillsFromBackup({
        appName: "SplitLeb",
        schemaVersion: 2,
        exportedAt: "2026-01-01T00:00:02.000Z",
        bills: [bill],
        groups: [],
      }),
    ).rejects.toThrow("missing saved group");
  });

  it("rejects group-linked people when the saved member is missing", async () => {
    const group = createGroup({ id: "group-1" });
    const bill = createBill({
      id: "broken-member-bill",
      groupId: group.id,
      people: [
        {
          id: "person-1",
          name: "Roro",
          groupMemberId: "missing-member",
        },
      ],
      updatedAt: "2026-01-01T00:00:01.000Z",
    });

    await expect(
      importBillsFromBackup({
        appName: "SplitLeb",
        schemaVersion: 2,
        exportedAt: "2026-01-01T00:00:02.000Z",
        bills: [bill],
        groups: [group],
      }),
    ).rejects.toThrow("missing group member");
  });

  it("rejects duplicate group imports when the existing group state conflicts", async () => {
    const existingGroup = createGroup({
      id: "group-1",
      name: "Current Name",
    });
    const incomingGroup = createGroup({
      id: "group-1",
      name: "Backup Name",
    });

    savedGroups.set(existingGroup.id, existingGroup);

    await expect(
      importBillsFromBackup({
        appName: "SplitLeb",
        schemaVersion: 2,
        exportedAt: "2026-01-01T00:00:02.000Z",
        bills: [],
        groups: [incomingGroup],
      }),
    ).rejects.toThrow("conflicts with an existing saved group");
  });
});