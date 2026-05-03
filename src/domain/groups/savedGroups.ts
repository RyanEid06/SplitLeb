import type { SavedGroup, SavedGroupMember } from "./types";

export function normalizeGroupName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeMemberDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, " ");
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function normalizeNameKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function validateSavedGroupMember(
  member: SavedGroupMember,
  index?: number,
): string[] {
  const label = typeof index === "number" ? `Member ${index + 1}` : "Member";
  const errors: string[] = [];

  if (!hasText(member.id)) {
    errors.push(`${label} is missing an id.`);
  }

  if (!hasText(member.displayName)) {
    errors.push(`${label} is missing a display name.`);
  }

  if (!hasText(member.createdAt)) {
    errors.push(`${label} is missing createdAt.`);
  }

  if (!hasText(member.updatedAt)) {
    errors.push(`${label} is missing updatedAt.`);
  }

  if (member.archivedAt !== undefined && !hasText(member.archivedAt)) {
    errors.push(`${label} has an invalid archivedAt value.`);
  }

  return errors;
}

export function validateSavedGroup(group: SavedGroup): string[] {
  const errors: string[] = [];

  if (!hasText(group.id)) {
    errors.push("Group is missing an id.");
  }

  if (!hasText(group.name)) {
    errors.push("Group is missing a name.");
  }

  if (!hasText(group.createdAt)) {
    errors.push("Group is missing createdAt.");
  }

  if (!hasText(group.updatedAt)) {
    errors.push("Group is missing updatedAt.");
  }

  if (group.archivedAt !== undefined && !hasText(group.archivedAt)) {
    errors.push("Group has an invalid archivedAt value.");
  }

  if (!Array.isArray(group.members)) {
    errors.push("Group members must be an array.");
    return errors;
  }

  const memberIds = new Set<string>();
  const activeMemberNames = new Set<string>();

  group.members.forEach((member, index) => {
    errors.push(...validateSavedGroupMember(member, index));

    const memberId = member.id.trim();

    if (memberId.length > 0) {
      if (memberIds.has(memberId)) {
        errors.push(`Member ${index + 1} has a duplicate id.`);
      }

      memberIds.add(memberId);
    }

    if (!member.archivedAt) {
      const nameKey = normalizeNameKey(member.displayName);

      if (nameKey.length > 0) {
        if (activeMemberNames.has(nameKey)) {
          errors.push(
            `Member ${index + 1} has a duplicate active display name.`,
          );
        }

        activeMemberNames.add(nameKey);
      }
    }
  });

  return errors;
}

export function assertValidSavedGroup(group: SavedGroup) {
  const errors = validateSavedGroup(group);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

export function normalizeSavedGroup(group: SavedGroup): SavedGroup {
  return {
    ...group,
    name: normalizeGroupName(group.name),
    members: group.members.map((member) => ({
      ...member,
      displayName: normalizeMemberDisplayName(member.displayName),
    })),
  };
}