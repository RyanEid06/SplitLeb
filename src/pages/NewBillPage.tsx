import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CURRENCIES, type CurrencyCode } from "../constants/currencies";
import { getRecentPeopleFromBills } from "../domain/bill/recentPeople";
import type { Bill, Person } from "../domain/bill/types";
import {
  createBillPeopleFromSavedGroup,
  getActiveSavedGroupMembers,
} from "../domain/groups/groupBillPeople";
import type { SavedGroup, SavedGroupMember } from "../domain/groups/types";
import { PeopleEditor } from "../features/people/PeopleEditor";
import { listRecentStoredBills, saveBill } from "../storage/billStorage";
import { listSavedGroups } from "../storage/groupStorage";
import { createId } from "../utils/ids";
import "./NewBillPage.css";

type BillSetupMode = "standalone" | "savedGroup";

function formatActiveMemberCount(count: number) {
  return `${count} active ${count === 1 ? "member" : "members"}`;
}

export function NewBillPage() {
  const navigate = useNavigate();

  const [billMode, setBillMode] = useState<BillSetupMode>("standalone");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [people, setPeople] = useState<Person[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupsLoadError, setGroupsLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCurrency = useMemo(
    () => CURRENCIES.find((item) => item.code === currency),
    [currency],
  );

  const selectedGroup = useMemo(
    () => savedGroups.find((group) => group.id === selectedGroupId),
    [savedGroups, selectedGroupId],
  );

  const activeGroupMembers = useMemo(
    () => (selectedGroup ? getActiveSavedGroupMembers(selectedGroup) : []),
    [selectedGroup],
  );

  const recentPeople = useMemo(
    () =>
      getRecentPeopleFromBills({
        bills: recentBills,
        currentPeople: people,
        limit: 10,
      }),
    [people, recentBills],
  );

  const displayedPeopleCount =
    billMode === "savedGroup" ? activeGroupMembers.length : people.length;

  useEffect(() => {
    let isMounted = true;

    async function loadRecentBills() {
      try {
        const bills = await listRecentStoredBills(25);

        if (isMounted) {
          setRecentBills(bills);
        }
      } catch {
        if (isMounted) {
          setRecentBills([]);
        }
      }
    }

    async function loadGroups() {
      try {
        const groups = await listSavedGroups();

        if (!isMounted) return;

        setSavedGroups(groups);
        setGroupsLoadError("");
        setSelectedGroupId((currentSelectedGroupId) => {
          if (
            currentSelectedGroupId &&
            groups.some((group) => group.id === currentSelectedGroupId)
          ) {
            return currentSelectedGroupId;
          }

          return groups[0]?.id ?? "";
        });
      } catch {
        if (!isMounted) return;

        setSavedGroups([]);
        setSelectedGroupId("");
        setGroupsLoadError("Could not load active saved groups.");
      }
    }

    void loadRecentBills();
    void loadGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  function validateBill(): string | null {
    if (!title.trim()) return "Bill name is required.";
    if (title.trim().length > 60) return "Bill name is too long.";

    if (billMode === "savedGroup") {
      if (groupsLoadError) return groupsLoadError;
      if (!selectedGroup) return "Choose an active saved group.";

      if (activeGroupMembers.length < 2) {
        return "Saved group bills need at least two active group members.";
      }

      return null;
    }

    if (people.length < 2) {
      return "Add at least two people. One-person bills are pointless here.";
    }

    return null;
  }

  async function handleCreateBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateBill();

    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const now = new Date().toISOString();

      let billPeople = people;
      let groupId: string | undefined;

      if (billMode === "savedGroup") {
        if (!selectedGroup) {
          setSubmitError("Choose an active saved group.");
          setIsSubmitting(false);
          return;
        }

        groupId = selectedGroup.id;
        billPeople = createBillPeopleFromSavedGroup({
          group: selectedGroup,
          createPersonId: () => createId("person"),
        });
      }

      const draftBill: Bill = {
        id: createId("bill"),
        title: title.trim(),
        currency,
        ...(groupId ? { groupId } : {}),
        people: billPeople,
        items: [],
        extras: [],
        payments: [],
        createdAt: now,
        updatedAt: now,
      };

      const savedBill = await saveBill(draftBill, "draft");

      navigate(`/bills/${savedBill.id}/workspace`);
    } catch {
      setSubmitError("Could not save this bill. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="new-bill-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">SplitLeb setup</p>
          <h1>Create bill</h1>
          <p>
            Set the bill name, currency, and people. Item splitting starts after
            this.
          </p>
        </div>
      </header>

      <div className="setup-grid">
        <form
          className="setup-panel bill-details-panel"
          onSubmit={handleCreateBill}
        >
          <div className="section-heading">
            <div>
              <h2>Bill details</h2>
              <p>Keep this simple. You can edit the actual split later.</p>
            </div>
          </div>

          <div className="field">
            <label>Bill type</label>

            <div className="bill-source-options">
              <button
                type="button"
                className={
                  billMode === "standalone"
                    ? "bill-source-card selected"
                    : "bill-source-card"
                }
                onClick={() => {
                  setBillMode("standalone");
                  setSubmitError("");
                }}
              >
                <strong>Standalone bill</strong>
                <small>Add people manually, same as v1.5.</small>
              </button>

              <button
                type="button"
                className={
                  billMode === "savedGroup"
                    ? "bill-source-card selected"
                    : "bill-source-card"
                }
                onClick={() => {
                  setBillMode("savedGroup");
                  setSubmitError("");
                }}
              >
                <strong>From saved group</strong>
                <small>Pick an active group and copy active members.</small>
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="bill-title">Bill name</label>
            <input
              id="bill-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setSubmitError("");
              }}
              placeholder="Example: Friday dinner at Barbar"
              autoFocus
            />
          </div>

          {billMode === "savedGroup" ? (
            <div className="field">
              <label htmlFor="saved-group-select">Saved group</label>

              {groupsLoadError ? (
                <p className="form-error">{groupsLoadError}</p>
              ) : null}

              {savedGroups.length > 0 ? (
                <select
                  id="saved-group-select"
                  value={selectedGroupId}
                  onChange={(event) => {
                    setSelectedGroupId(event.target.value);
                    setSubmitError("");
                  }}
                >
                  {savedGroups.map((group) => {
                    const activeMemberCount =
                      getActiveSavedGroupMembers(group).length;

                    return (
                      <option key={group.id} value={group.id}>
                        {group.name} —{" "}
                        {formatActiveMemberCount(activeMemberCount)}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="empty-state">
                  <strong>No active saved groups.</strong>
                  <p>
                    Create a group with at least two active members before using
                    this mode.
                  </p>
                  <Link className="button" to="/groups">
                    Open saved groups
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          <div className="field">
            <label>Currency</label>

            <div className="currency-options">
              {CURRENCIES.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={
                    currency === option.code
                      ? "currency-card selected"
                      : "currency-card"
                  }
                  onClick={() => {
                    setCurrency(option.code);
                    setSubmitError("");
                  }}
                >
                  <strong>
                    {option.code} <span>{option.symbol}</span>
                  </strong>
                  <small>{option.label}</small>
                </button>
              ))}
            </div>

            {selectedCurrency ? (
              <p className="field-help">{selectedCurrency.note}</p>
            ) : null}
          </div>

          <div className="tax-note">
            <strong>Lebanon rule:</strong> menu prices are treated as
            tax-included by default. Do not add VAT on top.
          </div>

          {submitError ? <p className="form-error">{submitError}</p> : null}

          <button
            type="submit"
            className="create-bill-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create bill workspace"}
          </button>
        </form>

        {billMode === "standalone" ? (
          <PeopleEditor
            people={people}
            recentPeople={recentPeople}
            onChange={setPeople}
          />
        ) : (
          <GroupPeoplePreview
            group={selectedGroup}
            activeMembers={activeGroupMembers}
          />
        )}

        <aside className="setup-panel setup-summary">
          <div className="section-heading">
            <div>
              <h2>Setup summary</h2>
              <p>This bill will be saved locally before the workspace opens.</p>
            </div>
          </div>

          <dl>
            <div>
              <dt>Bill</dt>
              <dd>{title.trim() || "Untitled"}</dd>
            </div>

            <div>
              <dt>Type</dt>
              <dd>
                {billMode === "savedGroup" ? "Saved group" : "Standalone"}
              </dd>
            </div>

            {billMode === "savedGroup" ? (
              <div>
                <dt>Group</dt>
                <dd>{selectedGroup?.name ?? "None selected"}</dd>
              </div>
            ) : null}

            <div>
              <dt>Currency</dt>
              <dd>{currency}</dd>
            </div>

            <div>
              <dt>People</dt>
              <dd>{displayedPeopleCount}</dd>
            </div>

            <div>
              <dt>Status</dt>
              <dd>Draft</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}

function GroupPeoplePreview({
  group,
  activeMembers,
}: {
  group: SavedGroup | undefined;
  activeMembers: SavedGroupMember[];
}) {
  return (
    <section className="setup-panel group-people-panel">
      <div className="section-heading">
        <div>
          <h2>Group people</h2>
          <p>
            Active group members will be copied into this bill as bill-local
            people.
          </p>
        </div>

        <span className="count-pill">{activeMembers.length} people</span>
      </div>

      {!group ? (
        <div className="empty-state">
          <strong>No group selected.</strong>
          <p>Choose an active saved group from the bill details panel.</p>
        </div>
      ) : activeMembers.length === 0 ? (
        <div className="empty-state">
          <strong>No active members.</strong>
          <p>
            This group has no active members to copy. Add members on the Saved
            Groups page first.
          </p>
        </div>
      ) : (
        <div className="people-list group-people-list">
          {activeMembers.map((member, index) => (
            <div className="person-card group-person-card" key={member.id}>
              <div className="person-main">
                <span className="person-avatar group-person-avatar">
                  {index + 1}
                </span>

                <div>
                  <strong>{member.displayName}</strong>
                  <p>
                    Will keep a bill-local person id and this group member id.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}