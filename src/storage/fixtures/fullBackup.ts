import type { SplitLebBackupV2 } from "../billStorage";

// Synthetic equivalent of the reported 18-bill / 3-group backup. No private data.
const timestamp = "2026-10-17T12:00:00.000Z";
export function fullBackup(): SplitLebBackupV2 {
  const groups = Array.from({ length: 3 }, (_, i) => ({
    id: `group-${i}`,
    name: `Saved group ${i}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    members: [0, 1, 2].map((j) => ({
      id: `member-${i}-${j}`,
      displayName: `Member ${j}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(j === 2 ? { archivedAt: timestamp } : {}),
    })),
  }));
  return {
    appName: "SplitLeb",
    schemaVersion: 2,
    exportedAt: timestamp,
    groups,
    bills: Array.from({ length: 18 }, (_, i) => ({
      id: `bill-${i}`,
      title: `Bill ${i}`,
      currency: i % 2 ? "LBP" : "USD",
      status: (["draft", "active", "settled"] as const)[i % 3],
      groupId: groups[i % 3].id,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: timestamp,
      note: "Synthetic history",
      people: groups[i % 3].members.map((member, j) => ({
        id: `person-${j}`,
        name: member.displayName,
        groupMemberId: member.id,
      })),
      items: [
        {
          id: "equal",
          name: "Equal",
          quantity: 2,
          unitPriceCents: 1200,
          split: { method: "equal", personIds: ["person-0", "person-1"] },
        },
        {
          id: "shares",
          name: "Shares",
          quantity: 1,
          unitPriceCents: 900,
          split: {
            method: "shares",
            shares: [
              { personId: "person-0", shares: 1 },
              { personId: "person-1", shares: 2 },
            ],
          },
        },
        {
          id: "custom",
          name: "Custom",
          quantity: 1,
          unitPriceCents: 300,
          split: {
            method: "custom",
            amounts: [{ personId: "person-2", amountCents: 300 }],
          },
        },
      ],
      extras: [
        {
          id: "tip",
          name: "Tip",
          kind: "tip",
          amountCents: 100,
          allocationMethod: "equal",
        },
        {
          id: "service",
          name: "Service",
          kind: "service",
          amountCents: 100,
          allocationMethod: "proportional",
        },
        {
          id: "delivery",
          name: "Delivery",
          kind: "delivery",
          amountCents: 100,
          allocationMethod: "selectedPeople",
          selectedPersonIds: ["person-0"],
        },
        {
          id: "discount",
          name: "Discount",
          kind: "discount",
          amountCents: -100,
          allocationMethod: "customAmounts",
          customAmountsByPersonId: { "person-1": -100 },
        },
      ],
      payments: [
        {
          id: "payment",
          personId: "person-0",
          amountCents: 3900,
          note: "Paid",
        },
      ],
    })),
  };
}
