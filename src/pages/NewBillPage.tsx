import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { Bill, CurrencyCode, Person } from "../domain/bill/types";
import { getRecentPeopleFromBills } from "../domain/bill/recentPeople";
import {
  createBillPeopleFromSavedGroup,
  getActiveSavedGroupMembers,
} from "../domain/groups/groupBillPeople";
import type { SavedGroup } from "../domain/groups/types";
import { PeopleEditor } from "../features/people/PeopleEditor";
import { listRecentStoredBills, saveBill } from "../storage/billStorage";
import { listSavedGroups } from "../storage/groupStorage";
import { createId } from "../utils/ids";
import { Avatar } from "../components/ui/Avatar";
import { PageHeader } from "../components/layout/PageHeader";
import "./NewBillPage.css";

export function NewBillPage() {
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const [mode, setMode] = useState(query.has("group") ? "group" : "standalone");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [people, setPeople] = useState<Person[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [groups, setGroups] = useState<SavedGroup[]>([]);
  const [groupId, setGroupId] = useState(query.get("group") ?? "");
  const [groupsError, setGroupsError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedGroup = groups.find((group) => group.id === groupId);
  const members = selectedGroup
    ? getActiveSavedGroupMembers(selectedGroup)
    : [];
  const recentPeople = useMemo(
    () =>
      getRecentPeopleFromBills({
        bills: recentBills,
        currentPeople: people,
        limit: 8,
      }),
    [people, recentBills],
  );
  useEffect(() => {
    let active = true;
    listRecentStoredBills(25)
      .then((bills) => {
        if (active) setRecentBills(bills);
      })
      .catch(() => {});
    listSavedGroups()
      .then((savedGroups) => {
        if (!active) return;
        setGroups(savedGroups);
        setGroupId((id) => id || savedGroups[0]?.id || "");
      })
      .catch(() => {
        if (active) setGroupsError("Could not load groups. Try reloading.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function createBill(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const billPeople =
      mode === "group" && selectedGroup
        ? createBillPeopleFromSavedGroup({
            group: selectedGroup,
            createPersonId: () => createId("person"),
          })
        : people;
    if (mode === "group" && !selectedGroup) {
      setError("Choose a group first.");
      return;
    }
    if (billPeople.length < 2) {
      setError("Add at least two people.");
      return;
    }
    setSubmitting(true);
    setError("");
    const now = new Date().toISOString();
    try {
      const bill: Bill = {
        id: createId("bill"),
        title: title.trim() || "Shared bill",
        currency,
        ...(mode === "group" && selectedGroup
          ? { groupId: selectedGroup.id }
          : {}),
        people: billPeople,
        items: [],
        extras: [],
        payments: [],
        createdAt: now,
        updatedAt: now,
      };
      const saved = await saveBill(bill, "draft");
      navigate("/bills/" + saved.id + "/workspace");
    } catch {
      setError("Could not create the bill. Please try again.");
      setSubmitting(false);
    }
  }
  return (
    <section className="new-bill-page">
      <PageHeader title="New bill" description="Who's sharing this one?" />
      <div className="setup-grid">
        <form
          id="bill-setup"
          className="setup-panel bill-details-panel"
          onSubmit={createBill}
        >
          <h2>Start with the basics</h2>
          <div className="field">
            <label htmlFor="bill-title">
              Bill name <span className="muted-text">(optional)</span>
            </label>
            <input
              id="bill-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Friday dinner"
            />
          </div>
          <fieldset>
            <legend>Currency</legend>
            <div className="currency-options">
              {(["USD", "LBP"] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={currency === option}
                  onClick={() => setCurrency(option)}
                >
                  {option === "USD" ? "$ USD" : "LBP"}
                </button>
              ))}
            </div>
            {currency === "LBP" ? (
              <p className="field-help">
                Enter amounts in thousands: 630 = LBP 630,000.
              </p>
            ) : null}
          </fieldset>
          <fieldset>
            <legend>People</legend>
            <div className="bill-source-options">
              <button
                type="button"
                aria-pressed={mode === "standalone"}
                onClick={() => setMode("standalone")}
              >
                Choose people
              </button>
              <button
                type="button"
                aria-pressed={mode === "group"}
                onClick={() => setMode("group")}
              >
                Use a group
              </button>
            </div>
          </fieldset>
          {mode === "group" ? (
            <div className="field">
              {groupsError ? (
                <p className="form-error" role="alert">
                  {groupsError}
                </p>
              ) : null}
              {groups.length ? (
                <>
                  <label htmlFor="group-select">Group</label>
                  <select
                    id="group-select"
                    value={groupId}
                    onChange={(event) => setGroupId(event.target.value)}
                  >
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <p>
                  No groups yet. <Link to="/groups">Create a group</Link> or
                  choose people.
                </p>
              )}
            </div>
          ) : null}
          <p className="field-help">
            Menu prices include tax. Add only the extras on your bill.
          </p>
        </form>
        {mode === "standalone" ? (
          <PeopleEditor
            people={people}
            recentPeople={recentPeople}
            onChange={setPeople}
          />
        ) : (
          <section className="setup-panel">
            <div className="section-heading">
              <h2>{selectedGroup?.name || "Group members"}</h2>
              <span className="count-pill">{members.length} people</span>
            </div>
            {members.length ? (
              <div className="people-list">
                {members.map((member) => (
                  <div className="person-card" key={member.id}>
                    <div className="person-main">
                      <Avatar name={member.displayName} />
                      <strong>{member.displayName}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">
                Add at least two active members in Groups.
              </p>
            )}
          </section>
        )}
      </div>
      <div className="setup-footer">
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          form="bill-setup"
          type="submit"
          className="button-primary"
          disabled={submitting}
        >
          {submitting ? "Creating…" : "Start splitting"}
        </button>
        <span className="muted-text">
          {mode === "group" ? members.length : people.length} people ·{" "}
          {currency}
        </span>
      </div>
    </section>
  );
}
