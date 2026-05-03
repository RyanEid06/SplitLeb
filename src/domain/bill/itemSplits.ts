import type { BillItem, ItemSplit, Person } from "./types";

export type ItemAllocation = {
  itemId: string;
  personId: string;
  amountCents: number;
};

export function getItemSubtotalCents(item: BillItem): number {
  return Math.round(item.quantity * item.unitPriceCents);
}

export function createEqualSplit(personIds: string[]): ItemSplit {
  return {
    method: "equal",
    personIds: uniqueIds(personIds),
  };
}

export function createShareSplit(
  shares: { personId: string; shares: number }[],
): ItemSplit {
  return {
    method: "shares",
    shares: shares
      .filter((row) => row.shares > 0)
      .map((row) => ({
        personId: row.personId,
        shares: row.shares,
      })),
  };
}

export function createCustomAmountSplit(
  amounts: { personId: string; amountCents: number }[],
): ItemSplit {
  return {
    method: "custom",
    amounts: amounts
      .filter((row) => row.amountCents > 0)
      .map((row) => ({
        personId: row.personId,
        amountCents: Math.round(row.amountCents),
      })),
  };
}

export function getAssignedPersonIds(split: ItemSplit): string[] {
  if (split.method === "equal") {
    return uniqueIds(split.personIds);
  }

  if (split.method === "shares") {
    return uniqueIds(split.shares.map((row) => row.personId));
  }

  return uniqueIds(split.amounts.map((row) => row.personId));
}

export function validateItem(item: BillItem, people: Person[]): string[] {
  const errors: string[] = [];
  const knownPersonIds = new Set(people.map((person) => person.id));
  const assignedPersonIds = getAssignedPersonIds(item.split);

  if (!item.name.trim()) {
    errors.push("Item name is required.");
  }

  if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
    errors.push("Quantity must be greater than 0.");
  }

  if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
    errors.push("Unit price must be 0 or greater.");
  }

  if (assignedPersonIds.length === 0) {
    errors.push("Assign the item to at least one person.");
  }

  for (const personId of assignedPersonIds) {
    if (!knownPersonIds.has(personId)) {
      errors.push("Item is assigned to a person who no longer exists.");
      break;
    }
  }

  if (item.split.method === "shares") {
    const totalShares = item.split.shares.reduce(
      (sum, row) => sum + row.shares,
      0,
    );

    if (totalShares <= 0) {
      errors.push("Share split must have at least one positive share.");
    }

    if (item.split.shares.some((row) => row.shares <= 0)) {
      errors.push("Shares must be greater than 0.");
    }
  }

  if (item.split.method === "custom") {
    const subtotalCents = getItemSubtotalCents(item);
    const assignedTotalCents = item.split.amounts.reduce(
      (sum, row) => sum + row.amountCents,
      0,
    );

    if (item.split.amounts.some((row) => row.amountCents < 0)) {
      errors.push("Custom amounts cannot be negative.");
    }

    if (assignedTotalCents !== subtotalCents) {
      errors.push("Custom amounts must add up exactly to the item total.");
    }
  }

  return errors;
}

export function calculateItemAllocations(
  item: BillItem,
  people: Person[],
): ItemAllocation[] {
  const subtotalCents = getItemSubtotalCents(item);
  const knownPersonIds = new Set(people.map((person) => person.id));

  if (item.split.method === "equal") {
    const personIds = uniqueIds(item.split.personIds).filter((personId) =>
      knownPersonIds.has(personId),
    );

    return splitCentsByWeights(
      subtotalCents,
      personIds.map((personId) => ({
        personId,
        weight: 1,
      })),
      item.id,
    );
  }

  if (item.split.method === "shares") {
    return splitCentsByWeights(
      subtotalCents,
      item.split.shares
        .filter((row) => knownPersonIds.has(row.personId))
        .filter((row) => row.shares > 0)
        .map((row) => ({
          personId: row.personId,
          weight: row.shares,
        })),
      item.id,
    );
  }

  return item.split.amounts
    .filter((row) => knownPersonIds.has(row.personId))
    .map((row) => ({
      itemId: item.id,
      personId: row.personId,
      amountCents: Math.round(row.amountCents),
    }));
}

function splitCentsByWeights(
  totalCents: number,
  rows: { personId: string; weight: number }[],
  itemId: string,
): ItemAllocation[] {
  if (rows.length === 0) {
    return [];
  }

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);

  if (totalWeight <= 0) {
    return rows.map((row) => ({
      itemId,
      personId: row.personId,
      amountCents: 0,
    }));
  }

  const baseRows = rows.map((row, index) => {
    const rawAmount = (totalCents * row.weight) / totalWeight;
    const flooredAmount = Math.floor(rawAmount);

    return {
      itemId,
      personId: row.personId,
      amountCents: flooredAmount,
      remainder: rawAmount - flooredAmount,
      index,
    };
  });

  let remainingCents =
    totalCents - baseRows.reduce((sum, row) => sum + row.amountCents, 0);

  const rankedRows = [...baseRows].sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }

    return a.index - b.index;
  });

  for (const row of rankedRows) {
    if (remainingCents <= 0) {
      break;
    }

    row.amountCents += 1;
    remainingCents -= 1;
  }

  return baseRows.map((row) => ({
    itemId: row.itemId,
    personId: row.personId,
    amountCents: row.amountCents,
  }));
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}