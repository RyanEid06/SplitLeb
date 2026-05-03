import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedGroup } from "../domain/groups/types";
import { getDb } from "./db";
import {
  addSavedGroupMember,
  archiveSavedGroup,
  archiveSavedGroupMember,
  createSavedGroup,
  getSavedGroup,
  listSavedGroups,
  renameSavedGroup,
  renameSavedGroupMember,
  unarchiveSavedGroup,
  unarchiveSavedGroupMember,
} from "./groupStorage";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

const savedGroups = new Map<string, SavedGroup>();

function cloneGroup(group: SavedGroup): SavedGroup {
  return JSON.parse(JSON.stringify(group)) as SavedGroup;
}

function setNow(isoDate: string) {
  vi.setSystemTime(new Date(isoDate));
}

const fakeDb = {
  async put(storeName: string, group: SavedGroup) {
    if (storeName !== "savedGroups") {
      throw new Error(`Unexpected store: ${storeName}`);
    }

    savedGroups.set(group.id, cloneGroup(group));
    return group.id;
  },

  async get(storeName: string, id: string) {
    if (storeName !== "savedGroups") {
      throw new Error(`Unexpected store: ${storeName}`);
    }

    const group = savedGroups.get(id);

    return group ? cloneGroup(group) : undefined;
  },

  async getAll(storeName: string) {
    if (storeName !== "savedGroups") {
      throw new Error(`Unexpected store: ${storeName}`);
    }

    return Array.from(savedGroups.values()).map(cloneGroup);
  },
};

describe("group storage", () => {
  beforeEach(() => {
    savedGroups.clear();
    vi.useFakeTimers();
    setNow("2026-01-01T00:00:00.000Z");
    vi.mocked(getDb).mockResolvedValue(fakeDb as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates and reads a saved group", async () => {
    const group = await createSavedGroup({
      name: "  Weekend   Crew  ",
      memberDisplayNames: [" Roro ", "Ryan"],
    });

    expect(group.id).toMatch(/^group_/);
    expect(group.name).toBe("Weekend Crew");
    expect(group.members).toHaveLength(2);
    expect(group.members[0]).toMatchObject({
      displayName: "Roro",
    });
    expect(group.members[0].id).toMatch(/^member_/);

    await expect(getSavedGroup(group.id)).resolves.toEqual(group);
  });

  it("lists active groups newest first", async () => {
    setNow("2026-01-01T00:00:00.000Z");
    const olderGroup = await createSavedGroup({ name: "Older" });

    setNow("2026-01-01T00:00:01.000Z");
    const newerGroup = await createSavedGroup({ name: "Newer" });

    setNow("2026-01-01T00:00:02.000Z");
    await renameSavedGroup(newerGroup.id, "Newest");

    const groups = await listSavedGroups();

    expect(groups.map((group) => group.id)).toEqual([
      newerGroup.id,
      olderGroup.id,
    ]);
  });

  it("archives groups without deleting them", async () => {
    const group = await createSavedGroup({ name: "Friends" });

    setNow("2026-01-01T00:00:01.000Z");
    const archivedGroup = await archiveSavedGroup(group.id);

    expect(archivedGroup?.archivedAt).toBeTruthy();

    await expect(listSavedGroups()).resolves.toEqual([]);
    await expect(listSavedGroups({ includeArchived: true })).resolves.toEqual([
      archivedGroup,
    ]);
    await expect(getSavedGroup(group.id)).resolves.toEqual(archivedGroup);
  });

  it("unarchives groups without deleting their old records", async () => {
    const group = await createSavedGroup({ name: "Friends" });

    setNow("2026-01-01T00:00:01.000Z");
    await archiveSavedGroup(group.id);

    setNow("2026-01-01T00:00:02.000Z");
    const restoredGroup = await unarchiveSavedGroup(group.id);

    expect(restoredGroup?.archivedAt).toBeUndefined();
    expect(restoredGroup?.updatedAt).toBe("2026-01-01T00:00:02.000Z");

    await expect(listSavedGroups()).resolves.toEqual([restoredGroup]);
    await expect(getSavedGroup(group.id)).resolves.toEqual(restoredGroup);
  });

  it("renames a group", async () => {
    const group = await createSavedGroup({ name: "Old Name" });

    setNow("2026-01-01T00:00:01.000Z");
    const renamedGroup = await renameSavedGroup(group.id, " New   Name ");

    expect(renamedGroup?.name).toBe("New Name");
    expect(renamedGroup?.id).toBe(group.id);
    expect(renamedGroup?.createdAt).toBe(group.createdAt);
  });

  it("adds a saved group member", async () => {
    const group = await createSavedGroup({ name: "Friends" });

    setNow("2026-01-01T00:00:01.000Z");
    const updatedGroup = await addSavedGroupMember(group.id, " Maya ");

    expect(updatedGroup?.members).toHaveLength(1);
    expect(updatedGroup?.members[0].displayName).toBe("Maya");
    expect(updatedGroup?.members[0].id).toMatch(/^member_/);
  });

  it("renames a member without changing the stable member id", async () => {
    const group = await createSavedGroup({
      name: "Friends",
      memberDisplayNames: ["Roro"],
    });

    const memberId = group.members[0].id;

    setNow("2026-01-01T00:00:01.000Z");
    const updatedGroup = await renameSavedGroupMember(
      group.id,
      memberId,
      "Roro Updated",
    );

    expect(updatedGroup?.members[0]).toMatchObject({
      id: memberId,
      displayName: "Roro Updated",
    });
  });

  it("archives a member without deleting it", async () => {
    const group = await createSavedGroup({
      name: "Friends",
      memberDisplayNames: ["Roro"],
    });

    const memberId = group.members[0].id;

    setNow("2026-01-01T00:00:01.000Z");
    const updatedGroup = await archiveSavedGroupMember(group.id, memberId);

    expect(updatedGroup?.members).toHaveLength(1);
    expect(updatedGroup?.members[0].id).toBe(memberId);
    expect(updatedGroup?.members[0].archivedAt).toBeTruthy();
  });

  it("unarchives a member without changing the stable member id", async () => {
    const group = await createSavedGroup({
      name: "Friends",
      memberDisplayNames: ["Roro"],
    });

    const memberId = group.members[0].id;

    setNow("2026-01-01T00:00:01.000Z");
    await archiveSavedGroupMember(group.id, memberId);

    setNow("2026-01-01T00:00:02.000Z");
    const updatedGroup = await unarchiveSavedGroupMember(group.id, memberId);

    expect(updatedGroup?.members).toHaveLength(1);
    expect(updatedGroup?.members[0]).toMatchObject({
      id: memberId,
      displayName: "Roro",
      updatedAt: "2026-01-01T00:00:02.000Z",
    });
    expect(updatedGroup?.members[0].archivedAt).toBeUndefined();
  });

  it("rejects invalid group names", async () => {
    await expect(createSavedGroup({ name: "   " })).rejects.toThrow(
      "Group is missing a name.",
    );
  });

  it("rejects duplicate active member names", async () => {
    await expect(
      createSavedGroup({
        name: "Friends",
        memberDisplayNames: ["Roro", " roro "],
      }),
    ).rejects.toThrow("duplicate active display name");
  });

  it("rejects unarchiving a member when that would duplicate an active name", async () => {
    const group = await createSavedGroup({
      name: "Friends",
      memberDisplayNames: ["Roro", "Ryan"],
    });

    const archivedMemberId = group.members[1].id;
    await archiveSavedGroupMember(group.id, archivedMemberId);
    await renameSavedGroupMember(group.id, archivedMemberId, "roro");

    await expect(
      unarchiveSavedGroupMember(group.id, archivedMemberId),
    ).rejects.toThrow("duplicate active display name");
  });

  it("returns undefined for missing groups or missing members", async () => {
    await expect(renameSavedGroup("missing", "Name")).resolves.toBeUndefined();
    await expect(archiveSavedGroup("missing")).resolves.toBeUndefined();
    await expect(unarchiveSavedGroup("missing")).resolves.toBeUndefined();
    await expect(addSavedGroupMember("missing", "Roro")).resolves.toBeUndefined();
    await expect(
      renameSavedGroupMember("missing", "member-1", "Roro"),
    ).resolves.toBeUndefined();
    await expect(
      archiveSavedGroupMember("missing", "member-1"),
    ).resolves.toBeUndefined();
    await expect(
      unarchiveSavedGroupMember("missing", "member-1"),
    ).resolves.toBeUndefined();

    const group = await createSavedGroup({ name: "Friends" });

    await expect(
      renameSavedGroupMember(group.id, "missing-member", "Roro"),
    ).resolves.toBeUndefined();
    await expect(
      archiveSavedGroupMember(group.id, "missing-member"),
    ).resolves.toBeUndefined();
    await expect(
      unarchiveSavedGroupMember(group.id, "missing-member"),
    ).resolves.toBeUndefined();
  });
});