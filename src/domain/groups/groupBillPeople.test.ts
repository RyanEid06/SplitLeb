import { describe, expect, it } from "vitest";
import {
  createBillPeopleFromSavedGroup,
  getActiveSavedGroupMembers,
} from "./groupBillPeople";
import type { SavedGroup } from "./types";

const timestamp = "2026-01-01T00:00:00.000Z";

function createGroup(): SavedGroup {
  return {
    id: "group-1",
    name: "Friends",
    members: [
      {
        id: "member-1",
        displayName: "Roro",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "member-2",
        displayName: "Ryan",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "member-3",
        displayName: "Archived Maya",
        createdAt: timestamp,
        updatedAt: timestamp,
        archivedAt: timestamp,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("group bill people", () => {
  it("returns only active saved group members", () => {
    const activeMembers = getActiveSavedGroupMembers(createGroup());

    expect(activeMembers.map((member) => member.id)).toEqual([
      "member-1",
      "member-2",
    ]);
  });

  it("copies active group members into bill-local people", () => {
    let nextPersonNumber = 1;

    const people = createBillPeopleFromSavedGroup({
      group: createGroup(),
      createPersonId: () => `person-${nextPersonNumber++}`,
    });

    expect(people).toEqual([
      {
        id: "person-1",
        name: "Roro",
        groupMemberId: "member-1",
      },
      {
        id: "person-2",
        name: "Ryan",
        groupMemberId: "member-2",
      },
    ]);
  });

  it("does not reuse group member ids as bill-local person ids", () => {
    const people = createBillPeopleFromSavedGroup({
      group: createGroup(),
      createPersonId: () => "person-local-id",
    });

    expect(people[0].id).toBe("person-local-id");
    expect(people[0].id).not.toBe(people[0].groupMemberId);
  });
});