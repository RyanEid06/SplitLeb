import type { Person } from "../bill/types";
import type { SavedGroup, SavedGroupMember } from "./types";

export function getActiveSavedGroupMembers(
  group: SavedGroup,
): SavedGroupMember[] {
  return group.members.filter((member) => !member.archivedAt);
}

export function createBillPeopleFromSavedGroup({
  group,
  createPersonId,
}: {
  group: SavedGroup;
  createPersonId: () => string;
}): Person[] {
  return getActiveSavedGroupMembers(group).map((member) => ({
    id: createPersonId(),
    name: member.displayName,
    groupMemberId: member.id,
  }));
}