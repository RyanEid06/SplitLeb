import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { SavedGroup } from "../../domain/groups/types";
import { calculateGroupRunningBalances } from "../../domain/groups/runningBalances";
import { calculateGroupStats } from "../../domain/groups/groupStats";
import { listBillsByGroupId } from "../../storage/billStorage";
import {
  archiveSavedGroup,
  renameSavedGroup,
  unarchiveSavedGroup,
} from "../../storage/groupStorage";
import type { StoredBill } from "../../storage/db";
import { GroupMembers } from "./GroupMembers";
import { GroupActivity } from "./GroupActivity";
import { GroupBalances } from "./GroupBalances";
import { GroupStats } from "./GroupStats";
type Section = "Activity" | "Balances" | "Stats" | "Members";
export function GroupDetail({
  group,
  onUpdate,
}: {
  group: SavedGroup;
  onUpdate: (group: SavedGroup) => void;
}) {
  const [section, setSection] = useState<Section>(
    group.members.length ? "Activity" : "Members",
  );
  const [bills, setBills] = useState<StoredBill[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(group.name);
  useEffect(() => {
    let active = true;
    listBillsByGroupId(group.id)
      .then((records) => {
        if (active) setBills(records);
      })
      .catch(() => {
        if (active)
          setLoadError("Could not load this group's bills. Try reloading.");
      });
    return () => {
      active = false;
    };
  }, [group.id]);
  const balances = useMemo(
    () => calculateGroupRunningBalances({ group, bills: bills ?? [] }),
    [group, bills],
  );
  const stats = useMemo(
    () => calculateGroupStats({ group, bills: bills ?? [] }),
    [group, bills],
  );
  async function run(
    operation: () => Promise<SavedGroup | undefined>,
    success: string,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await operation();
      if (!updated) throw new Error("This group could not be found.");
      onUpdate(updated);
      setMessage(success);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="group-detail">
      <header className="groups-detail-header">
        <div>
          <h2>{group.name}</h2>
          <p className="muted-text">
            {group.members.filter((member) => !member.archivedAt).length}{" "}
            members{group.archivedAt ? " · Archived" : ""}
          </p>
        </div>
        {!group.archivedAt ? (
          <Link
            className="button button-primary"
            to={"/bills/new?group=" + encodeURIComponent(group.id)}
          >
            New bill
          </Link>
        ) : (
          <button
            disabled={busy}
            onClick={() =>
              void run(() => unarchiveSavedGroup(group.id), "Group restored.")
            }
          >
            Restore group
          </button>
        )}
      </header>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="success-message" role="status">
          {message}
        </p>
      ) : null}
      <nav className="group-sections" aria-label="Group sections">
        {(["Activity", "Balances", "Stats", "Members"] as const).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={section === item}
            onClick={() => setSection(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="group-section-content">
        {section === "Members" ? (
          <GroupMembers group={group} busy={busy} run={run} />
        ) : loadError ? (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        ) : bills === null ? (
          <p role="status">Loading group activity…</p>
        ) : section === "Activity" ? (
          <GroupActivity bills={bills} />
        ) : section === "Balances" ? (
          <GroupBalances result={balances} />
        ) : (
          <GroupStats result={stats} />
        )}
      </div>
      <details className="group-settings">
        <summary>Group settings</summary>
        {group.archivedAt ? (
          <p>Restore this group to edit it. Past bills are kept.</p>
        ) : (
          <>
            <form
              className="inline-add-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(
                  () => renameSavedGroup(group.id, name),
                  "Group renamed.",
                );
              }}
            >
              <label>
                Group name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              <button disabled={busy || name.trim() === group.name}>
                Save name
              </button>
            </form>
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Archive " +
                      group.name +
                      "? Past bills will be kept. You can restore it later.",
                  )
                )
                  void run(
                    () => archiveSavedGroup(group.id),
                    "Group archived.",
                  );
              }}
            >
              Archive group
            </button>
          </>
        )}
      </details>
    </article>
  );
}
