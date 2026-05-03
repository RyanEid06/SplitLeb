import {
  assertValidSavedGroup,
  normalizeGroupName,
  normalizeMemberDisplayName,
  normalizeSavedGroup,
} from "../domain/groups/savedGroups";
import type { SavedGroup, SavedGroupMember } from "../domain/groups/types";
import { createId } from "../utils/ids";
import { getDb } from "./db";

export type CreateSavedGroupInput = {
  name: string;
  memberDisplayNames?: string[];
};

export type ListSavedGroupsOptions = {
  includeArchived?: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function createSavedGroupMember(
  displayName: string,
  timestamp: string,
): SavedGroupMember {
  return {
    id: createId("member"),
    displayName: normalizeMemberDisplayName(displayName),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function sortGroupsByUpdatedAtDesc(groups: SavedGroup[]) {
  return [...groups].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function putSavedGroup(group: SavedGroup): Promise<SavedGroup> {
  const normalizedGroup = normalizeSavedGroup(group);

  assertValidSavedGroup(normalizedGroup);

  const db = await getDb();
  await db.put("savedGroups", normalizedGroup);

  return normalizedGroup;
}

export async function createSavedGroup(
  input: CreateSavedGroupInput,
): Promise<SavedGroup> {
  const timestamp = nowIso();

  const group: SavedGroup = {
    id: createId("group"),
    name: normalizeGroupName(input.name),
    members: (input.memberDisplayNames ?? []).map((displayName) =>
      createSavedGroupMember(displayName, timestamp),
    ),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return putSavedGroup(group);
}

export async function saveSavedGroup(group: SavedGroup): Promise<SavedGroup> {
  return putSavedGroup(group);
}

export async function getSavedGroup(
  id: string,
): Promise<SavedGroup | undefined> {
  const db = await getDb();

  return db.get("savedGroups", id);
}

export async function listSavedGroups(
  options: ListSavedGroupsOptions = {},
): Promise<SavedGroup[]> {
  const db = await getDb();
  const groups = await db.getAll("savedGroups");

  const visibleGroups = options.includeArchived
    ? groups
    : groups.filter((group) => !group.archivedAt);

  return sortGroupsByUpdatedAtDesc(visibleGroups);
}

export async function renameSavedGroup(
  id: string,
  name: string,
): Promise<SavedGroup | undefined> {
  const existingGroup = await getSavedGroup(id);

  if (!existingGroup) {
    return undefined;
  }

  return putSavedGroup({
    ...existingGroup,
    name: normalizeGroupName(name),
    updatedAt: nowIso(),
  });
}

export async function archiveSavedGroup(
  id: string,
): Promise<SavedGroup | undefined> {
  const existingGroup = await getSavedGroup(id);

  if (!existingGroup) {
    return undefined;
  }

  const timestamp = nowIso();

  return putSavedGroup({
    ...existingGroup,
    archivedAt: existingGroup.archivedAt ?? timestamp,
    updatedAt: timestamp,
  });
}

export async function unarchiveSavedGroup(
  id: string,
): Promise<SavedGroup | undefined> {
  const existingGroup = await getSavedGroup(id);

  if (!existingGroup) {
    return undefined;
  }

  const activeGroup: SavedGroup = {
    ...existingGroup,
    updatedAt: nowIso(),
  };

  delete activeGroup.archivedAt;

  return putSavedGroup(activeGroup);
}

export async function addSavedGroupMember(
  groupId: string,
  displayName: string,
): Promise<SavedGroup | undefined> {
  const existingGroup = await getSavedGroup(groupId);

  if (!existingGroup) {
    return undefined;
  }

  const timestamp = nowIso();

  return putSavedGroup({
    ...existingGroup,
    members: [
      ...existingGroup.members,
      createSavedGroupMember(displayName, timestamp),
    ],
    updatedAt: timestamp,
  });
}

export async function renameSavedGroupMember(
  groupId: string,
  memberId: string,
  displayName: string,
): Promise<SavedGroup | undefined> {
  const existingGroup = await getSavedGroup(groupId);

  if (!existingGroup) {
    return undefined;
  }

  let foundMember = false;
  const timestamp = nowIso();

  const members = existingGroup.members.map((member) => {
    if (member.id !== memberId) {
      return member;
    }

    foundMember = true;

    return {
      ...member,
      displayName: normalizeMemberDisplayName(displayName),
      updatedAt: timestamp,
    };
  });

  if (!foundMember) {
    return undefined;
  }

  return putSavedGroup({
    ...existingGroup,
    members,
    updatedAt: timestamp,
  });
}

export async function archiveSavedGroupMember(
  groupId: string,
  memberId: string,
): Promise<SavedGroup | undefined> {
  const existingGroup = await getSavedGroup(groupId);

  if (!existingGroup) {
    return undefined;
  }

  let foundMember = false;
  const timestamp = nowIso();

  const members = existingGroup.members.map((member) => {
    if (member.id !== memberId) {
      return member;
    }

    foundMember = true;

    return {
      ...member,
      archivedAt: member.archivedAt ?? timestamp,
      updatedAt: timestamp,
    };
  });

  if (!foundMember) {
    return undefined;
  }

  return putSavedGroup({
    ...existingGroup,
    members,
    updatedAt: timestamp,
  });
}

export async function unarchiveSavedGroupMember(
  groupId: string,
  memberId: string,
): Promise<SavedGroup | undefined> {
  const existingGroup = await getSavedGroup(groupId);

  if (!existingGroup) {
    return undefined;
  }

  let foundMember = false;
  const timestamp = nowIso();

  const members = existingGroup.members.map((member) => {
    if (member.id !== memberId) {
      return member;
    }

    foundMember = true;

    const activeMember: SavedGroupMember = {
      ...member,
      updatedAt: timestamp,
    };

    delete activeMember.archivedAt;

    return activeMember;
  });

  if (!foundMember) {
    return undefined;
  }

  return putSavedGroup({
    ...existingGroup,
    members,
    updatedAt: timestamp,
  });
}