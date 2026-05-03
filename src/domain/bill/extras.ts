import type {
  BillExtra,
  BillExtraAllocationMethod,
  BillExtraKind,
  Person,
} from "./types";

export type PersonSubtotalById = Record<string, number>;

export type ExtraAllocation = {
  extraId: string;
  extraName: string;
  extraKind: BillExtraKind;
  personId: string;
  amountCents: number;
};

export const DEFAULT_EXTRA_ALLOCATION_METHOD: Record<
  BillExtraKind,
  BillExtraAllocationMethod
> = {
  service: "proportional",
  tip: "proportional",
  delivery: "equal",
  discount: "proportional",
  custom: "equal",
};

export const DEFAULT_EXTRA_NAMES: Record<BillExtraKind, string> = {
  service: "Service",
  tip: "Tip",
  delivery: "Delivery",
  discount: "Discount",
  custom: "Custom extra",
};

export function createDefaultExtra(kind: BillExtraKind, id: string): BillExtra {
  return {
    id,
    kind,
    name: DEFAULT_EXTRA_NAMES[kind],
    amountCents: 0,
    allocationMethod: DEFAULT_EXTRA_ALLOCATION_METHOD[kind],
    selectedPersonIds: [],
    customAmountsByPersonId: {},
  };
}

export function getSignedExtraAmountCents(extra: BillExtra): number {
  const amount = Math.abs(extra.amountCents);
  return extra.kind === "discount" ? -amount : amount;
}

export function validateExtra(extra: BillExtra, people: Person[]): string[] {
  const errors: string[] = [];
  const personIds = new Set(people.map((person) => person.id));

  if (!extra.name.trim()) {
    errors.push("Extra name is required.");
  }

  if (!Number.isInteger(extra.amountCents) || extra.amountCents < 0) {
    errors.push("Extra amount must be a positive whole number of cents.");
  }

  if (people.length === 0 && extra.amountCents > 0) {
    errors.push("Add people before adding extras.");
  }

  if (extra.allocationMethod === "selectedPeople") {
    const selected = extra.selectedPersonIds ?? [];

    if (selected.length === 0 && extra.amountCents > 0) {
      errors.push("Select at least one person for this extra.");
    }

    for (const personId of selected) {
      if (!personIds.has(personId)) {
        errors.push("Selected person does not exist.");
      }
    }
  }

  if (extra.allocationMethod === "customAmounts") {
    const customAmounts = extra.customAmountsByPersonId ?? {};
    let customTotal = 0;

    for (const [personId, amount] of Object.entries(customAmounts)) {
      if (!personIds.has(personId)) {
        errors.push("Custom amount person does not exist.");
      }

      if (!Number.isInteger(amount) || amount < 0) {
        errors.push("Custom amounts must be positive whole cents.");
      }

      customTotal += amount;
    }

    if (customTotal !== extra.amountCents) {
      errors.push("Custom amounts must add up exactly to the extra amount.");
    }
  }

  return errors;
}

export function validateExtras(extras: BillExtra[], people: Person[]): string[] {
  return extras.flatMap((extra) =>
    validateExtra(extra, people).map((error) => `${extra.name}: ${error}`),
  );
}

export function calculateExtraAllocations(params: {
  extras: BillExtra[];
  people: Person[];
  itemSubtotalByPersonId: PersonSubtotalById;
}): ExtraAllocation[] {
  const { extras, people, itemSubtotalByPersonId } = params;
  const allocations: ExtraAllocation[] = [];

  for (const extra of extras) {
    const errors = validateExtra(extra, people);

    if (errors.length > 0) {
      throw new Error(`Invalid extra "${extra.name}": ${errors.join(" ")}`);
    }

    if (extra.amountCents === 0) {
      continue;
    }

    const signedAmount = getSignedExtraAmountCents(extra);
    const amountByPersonId = allocateExtraAmount({
      extra,
      signedAmount,
      people,
      itemSubtotalByPersonId,
    });

    for (const person of people) {
      const amountCents = amountByPersonId[person.id] ?? 0;

      if (amountCents !== 0) {
        allocations.push({
          extraId: extra.id,
          extraName: extra.name,
          extraKind: extra.kind,
          personId: person.id,
          amountCents,
        });
      }
    }
  }

  return allocations;
}

export function calculateExtraTotalsByPerson(params: {
  extras: BillExtra[];
  people: Person[];
  itemSubtotalByPersonId: PersonSubtotalById;
}): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(
    params.people.map((person) => [person.id, 0]),
  );

  const allocations = calculateExtraAllocations(params);

  for (const allocation of allocations) {
    totals[allocation.personId] =
      (totals[allocation.personId] ?? 0) + allocation.amountCents;
  }

  return totals;
}

function allocateExtraAmount(params: {
  extra: BillExtra;
  signedAmount: number;
  people: Person[];
  itemSubtotalByPersonId: PersonSubtotalById;
}): Record<string, number> {
  const { extra, signedAmount, people, itemSubtotalByPersonId } = params;
  const allPersonIds = people.map((person) => person.id);

  switch (extra.allocationMethod) {
    case "equal":
      return splitEvenly(signedAmount, allPersonIds);

    case "proportional":
      return splitProportionally(signedAmount, allPersonIds, itemSubtotalByPersonId);

    case "selectedPeople":
      return splitEvenly(signedAmount, extra.selectedPersonIds ?? []);

    case "customAmounts":
      return applyCustomAmounts(signedAmount, extra.customAmountsByPersonId ?? {});

    default:
      return assertNever(extra.allocationMethod);
  }
}

function splitEvenly(
  signedAmount: number,
  personIds: string[],
): Record<string, number> {
  if (personIds.length === 0) {
    return {};
  }

  const sign = signedAmount < 0 ? -1 : 1;
  const absoluteAmount = Math.abs(signedAmount);
  const base = Math.floor(absoluteAmount / personIds.length);
  let remainder = absoluteAmount % personIds.length;

  const result: Record<string, number> = {};

  for (const personId of personIds) {
    const extraCent = remainder > 0 ? 1 : 0;
    result[personId] = sign * (base + extraCent);
    remainder -= extraCent;
  }

  return result;
}

function splitProportionally(
  signedAmount: number,
  personIds: string[],
  weightsByPersonId: Record<string, number>,
): Record<string, number> {
  if (personIds.length === 0) {
    return {};
  }

  const positiveWeights = personIds.map((personId) => ({
    personId,
    weight: Math.max(0, weightsByPersonId[personId] ?? 0),
  }));

  const totalWeight = positiveWeights.reduce((sum, row) => sum + row.weight, 0);

  if (totalWeight === 0) {
    return splitEvenly(signedAmount, personIds);
  }

  const sign = signedAmount < 0 ? -1 : 1;
  const absoluteAmount = Math.abs(signedAmount);

  const rows = positiveWeights.map((row, index) => {
    const exact = (absoluteAmount * row.weight) / totalWeight;
    const floored = Math.floor(exact);

    return {
      personId: row.personId,
      amount: floored,
      remainder: exact - floored,
      index,
    };
  });

  let remainingCents =
    absoluteAmount - rows.reduce((sum, row) => sum + row.amount, 0);

  const sortedByRemainder = [...rows].sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }

    return a.index - b.index;
  });

  for (const row of sortedByRemainder) {
    if (remainingCents <= 0) {
      break;
    }

    row.amount += 1;
    remainingCents -= 1;
  }

  return Object.fromEntries(
    rows.map((row) => [row.personId, sign * row.amount]),
  );
}

function applyCustomAmounts(
  signedAmount: number,
  customAmountsByPersonId: Record<string, number>,
): Record<string, number> {
  const sign = signedAmount < 0 ? -1 : 1;

  return Object.fromEntries(
    Object.entries(customAmountsByPersonId).map(([personId, amount]) => [
      personId,
      sign * Math.abs(amount),
    ]),
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled extra allocation method: ${String(value)}`);
}