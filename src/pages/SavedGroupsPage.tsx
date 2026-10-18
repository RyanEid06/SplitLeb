import { useUnsavedChanges } from "../features/bills/unsavedChanges";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { SavedGroup } from "../domain/groups/types";
import { createSavedGroup, listSavedGroups } from "../storage/groupStorage";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { GroupDetail } from "../features/groups/GroupDetail";
import { storageLoadErrorMessage } from "../storage/storageLoadError";
export function SavedGroupsPage() {
  const [query, setQuery] = useSearchParams();
  const [groups, setGroups] = useState<SavedGroup[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const clearUnsaved = useUnsavedChanges(Boolean(name));
  useEffect(() => {
    let active = true;
    listSavedGroups({ includeArchived: true })
      .then((records) => {
        if (active) setGroups(records);
      })
      .catch((cause) => {
        if (active)
          setError(
            storageLoadErrorMessage(
              cause,
              "Could not load groups. Try reloading.",
            ),
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const selected =
    groups?.find((group) => group.id === query.get("group")) ??
    groups?.find((group) => !group.archivedAt) ??
    groups?.[0];
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (creating) return;
    const submittedName = name;
    setCreating(true);
    setError("");
    try {
      const group = await createSavedGroup({ name });
      setGroups((current) => [group, ...(current ?? [])]);
      setName((current) => (current === submittedName ? "" : current));
      if (name === submittedName) clearUnsaved();
      setQuery({ group: group.id }, { replace: true });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not create group.",
      );
    } finally {
      setCreating(false);
    }
  }
  function update(group: SavedGroup) {
    setGroups(
      (current) =>
        current?.map((row) => (row.id === group.id ? group : row)) ?? null,
    );
  }
  return (
    <section className="page groups-page">
      <PageHeader
        title="Your groups"
        description="For the people you keep coming back to."
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="groups-layout">
        <aside className="group-chooser">
          <form className="inline-add-form" onSubmit={create}>
            <label htmlFor="new-group-name">
              New group
              <input
                id="new-group-name"
                disabled={creating}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Dinner crew"
                maxLength={120}
                required
              />
            </label>
            <button className="button-primary" disabled={creating}>
              Create group
            </button>
          </form>
          {groups === null ? (
            !error && <p role="status">Loading groups…</p>
          ) : groups.length === 0 ? (
            <p className="empty-note">Create a group, then add your people.</p>
          ) : (
            <div className="group-choices">
              {groups
                .filter(
                  (group) =>
                    showArchived ||
                    !group.archivedAt ||
                    group.id === selected?.id,
                )
                .map((group) => (
                  <button
                    type="button"
                    key={group.id}
                    aria-pressed={selected?.id === group.id}
                    onClick={() =>
                      setQuery({ group: group.id }, { replace: true })
                    }
                  >
                    <Avatar name={group.name} />
                    <span>
                      <strong>{group.name}</strong>
                      <small>
                        {group.archivedAt
                          ? "Archived"
                          : group.members.filter((member) => !member.archivedAt)
                              .length + " members"}
                      </small>
                    </span>
                  </button>
                ))}
            </div>
          )}
          {groups?.some((group) => group.archivedAt) ? (
            <button
              type="button"
              aria-pressed={showArchived}
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? "Hide archived groups" : "Show archived groups"}
            </button>
          ) : null}
        </aside>
        {selected ? (
          <GroupDetail key={selected.id} group={selected} onUpdate={update} />
        ) : (
          <div className="empty-state group-detail">
            <h2>Keep your people together.</h2>
            <p>Use one group for dinners, trips, or your shared household.</p>
          </div>
        )}
      </div>
    </section>
  );
}
