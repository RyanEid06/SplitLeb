import type { Bill, Person } from "./types";

type RecentPeopleParams = {
  bills: Pick<Bill, "people">[];
  currentPeople: Person[];
  limit?: number;
};

function normalizePersonName(name: string) {
  return name.trim().toLowerCase();
}

export function getRecentPeopleFromBills({
  bills,
  currentPeople,
  limit = 10,
}: RecentPeopleParams): Person[] {
  if (limit <= 0) {
    return [];
  }

  const currentNames = new Set(
    currentPeople
      .map((person) => normalizePersonName(person.name))
      .filter(Boolean),
  );

  const seenNames = new Set<string>();
  const recentPeople: Person[] = [];

  for (const bill of bills) {
    for (const person of bill.people) {
      const trimmedName = person.name.trim();
      const normalizedName = normalizePersonName(trimmedName);

      if (!normalizedName) {
        continue;
      }

      if (currentNames.has(normalizedName) || seenNames.has(normalizedName)) {
        continue;
      }

      seenNames.add(normalizedName);
      recentPeople.push({
        ...person,
        name: trimmedName,
      });

      if (recentPeople.length >= limit) {
        return recentPeople;
      }
    }
  }

  return recentPeople;
}