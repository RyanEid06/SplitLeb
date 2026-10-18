import { useUnsavedChanges } from "../bills/unsavedChanges";
import { useState, type FormEvent } from "react";
import type { SavedGroup } from "../../domain/groups/types";
import {
  addSavedGroupMember,
  archiveSavedGroupMember,
  renameSavedGroupMember,
  unarchiveSavedGroupMember,
} from "../../storage/groupStorage";
import { Avatar } from "../../components/ui/Avatar";
type Action = (
  operation: () => Promise<SavedGroup | undefined>,
  message: string,
) => Promise<boolean>;
export function GroupMembers({
  group,
  run,
  busy,
}: {
  group: SavedGroup;
  run: Action;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showArchived, setShowArchived] = useState(false);
  useUnsavedChanges(
    Boolean(
      name ||
      group.members.some(
        (member) =>
          drafts[member.id] !== undefined &&
          drafts[member.id] !== member.displayName,
      ),
    ),
  );
  const archivedCount = group.members.filter(
    (member) => member.archivedAt,
  ).length;
  function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const submittedName = name;
    void run(
      () => addSavedGroupMember(group.id, submittedName),
      "Member added.",
    ).then((success) => {
      if (success)
        setName((current) => (current === submittedName ? "" : current));
    });
  }
  return (
    <section className="group-members">
      <div className="section-heading">
        <h3>Members</h3>
        {archivedCount ? (
          <button
            type="button"
            aria-pressed={showArchived}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived
              ? "Hide archived"
              : "Show archived (" + archivedCount + ")"}
          </button>
        ) : null}
      </div>
      {!group.archivedAt ? (
        <form className="inline-add-form" onSubmit={add}>
          <label htmlFor="new-member-name">
            Add member
            <input
              id="new-member-name"
              value={name}
              maxLength={120}
              placeholder="Name"
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="button-primary" disabled={busy}>
            Add member
          </button>
        </form>
      ) : null}
      {group.members.length === 0 ? (
        <div className="empty-state">
          <p>Add the people you usually split with.</p>
        </div>
      ) : (
        <div className="group-member-list">
          {group.members
            .filter((member) => showArchived || !member.archivedAt)
            .map((member) => (
              <article className="group-member" key={member.id}>
                <div className="person-main">
                  <Avatar name={member.displayName} />
                  <div>
                    <strong>{member.displayName}</strong>
                    {member.archivedAt ? (
                      <small className="muted-text">Archived</small>
                    ) : null}
                  </div>
                </div>
                {!group.archivedAt ? (
                  <div className="group-member-actions">
                    {member.archivedAt ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              unarchiveSavedGroupMember(group.id, member.id),
                            "Member restored.",
                          )
                        }
                      >
                        Restore
                      </button>
                    ) : (
                      <>
                        <details>
                          <summary>Rename</summary>
                          <form
                            className="inline-add-form"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void run(
                                () =>
                                  renameSavedGroupMember(
                                    group.id,
                                    member.id,
                                    drafts[member.id] ?? member.displayName,
                                  ),
                                "Member renamed.",
                              );
                            }}
                          >
                            <label>
                              New name
                              <input
                                aria-label={
                                  "New name for " + member.displayName
                                }
                                value={drafts[member.id] ?? member.displayName}
                                onChange={(event) =>
                                  setDrafts({
                                    ...drafts,
                                    [member.id]: event.target.value,
                                  })
                                }
                                required
                              />
                            </label>
                            <button disabled={busy}>Save name</button>
                          </form>
                        </details>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () =>
                                archiveSavedGroupMember(group.id, member.id),
                              "Member archived. Past bills are kept.",
                            )
                          }
                        >
                          Archive
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </article>
            ))}
        </div>
      )}
    </section>
  );
}
