import { describe, expect, it } from "vitest";
import {
  normalizeGroupName,
  normalizeMemberDisplayName,
  validateSavedGroup,
} from "./savedGroups";
import type { SavedGroup } from "./types";

const timestamp = "2026-01-01T00:00:00.000Z";

function createValidGroup(overrides: Partial<SavedGroup> = {}): SavedGroup {
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
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe("saved group validation", () => {
  it("accepts a valid saved group", () => {
    expect(validateSavedGroup(createValidGroup())).toEqual([]);
  });

  it("rejects a blank group name", () => {
    const errors = validateSavedGroup(createValidGroup({ name: "   " }));

    expect(errors).toContain("Group is missing a name.");
  });

  it("rejects a blank member display name", () => {
    const group = createValidGroup({
      members: [
        {
          id: "member-1",
          displayName: "   ",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    });

    const errors = validateSavedGroup(group);

    expect(errors).toContain("Member 1 is missing a display name.");
  });

  it("rejects duplicate member ids", () => {
    const group = createValidGroup({
      members: [
        {
          id: "member-1",
          displayName: "Roro",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: "member-1",
          displayName: "Ryan",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    });

    const errors = validateSavedGroup(group);

    expect(errors).toContain("Member 2 has a duplicate id.");
  });

  it("rejects duplicate active member display names", () => {
    const group = createValidGroup({
      members: [
        {
          id: "member-1",
          displayName: " Roro ",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: "member-2",
          displayName: "roro",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    });

    const errors = validateSavedGroup(group);

    expect(errors).toContain(
      "Member 2 has a duplicate active display name.",
    );
  });

  it("allows archived members to keep duplicate display names", () => {
    const group = createValidGroup({
      members: [
        {
          id: "member-1",
          displayName: "Roro",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: "member-2",
          displayName: "roro",
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: timestamp,
        },
      ],
    });

    expect(validateSavedGroup(group)).toEqual([]);
  });

  it("normalizes group and member names", () => {
    expect(normalizeGroupName("  Weekend   Crew  ")).toBe("Weekend Crew");
    expect(normalizeMemberDisplayName("  Ryan   A  ")).toBe("Ryan A");
  });
});