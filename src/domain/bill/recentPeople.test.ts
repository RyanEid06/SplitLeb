import { describe, expect, it } from "vitest";
import { getRecentPeopleFromBills } from "./recentPeople";
import type { Bill, Person } from "./types";

function createBill(id: string, people: Person[]): Bill {
  return {
    id,
    title: id,
    currency: "USD",
    people,
    items: [],
    extras: [],
    payments: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("recent people helper", () => {
  it("returns unique people from bills in recent order", () => {
    const people = getRecentPeopleFromBills({
      bills: [
        createBill("recent", [
          { id: "p1", name: "Ali", emoji: "😎", color: "#111111" },
          { id: "p2", name: "Maya", emoji: "🍕", color: "#222222" },
        ]),
        createBill("older", [
          { id: "p3", name: "ali", emoji: "🙂", color: "#333333" },
          { id: "p4", name: "Rami", emoji: "🍔", color: "#444444" },
        ]),
      ],
      currentPeople: [],
    });

    expect(people).toEqual([
      { id: "p1", name: "Ali", emoji: "😎", color: "#111111" },
      { id: "p2", name: "Maya", emoji: "🍕", color: "#222222" },
      { id: "p4", name: "Rami", emoji: "🍔", color: "#444444" },
    ]);
  });

  it("excludes people already added to the current bill", () => {
    const people = getRecentPeopleFromBills({
      bills: [
        createBill("recent", [
          { id: "p1", name: " Ali " },
          { id: "p2", name: "Maya" },
        ]),
      ],
      currentPeople: [{ id: "current-1", name: "ali" }],
    });

    expect(people).toEqual([{ id: "p2", name: "Maya" }]);
  });

  it("ignores blank names and trims returned names", () => {
    const people = getRecentPeopleFromBills({
      bills: [
        createBill("recent", [
          { id: "p1", name: "   " },
          { id: "p2", name: "  Roro  " },
        ]),
      ],
      currentPeople: [],
    });

    expect(people).toEqual([{ id: "p2", name: "Roro" }]);
  });

  it("respects the requested limit", () => {
    const people = getRecentPeopleFromBills({
      bills: [
        createBill("recent", [
          { id: "p1", name: "Ali" },
          { id: "p2", name: "Maya" },
          { id: "p3", name: "Rami" },
        ]),
      ],
      currentPeople: [],
      limit: 2,
    });

    expect(people).toEqual([
      { id: "p1", name: "Ali" },
      { id: "p2", name: "Maya" },
    ]);
  });
});