import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Bill, CurrencyCode } from "../domain/bill/types";
import {
  calculateGroupRunningBalances,
  type GroupRunningBalanceIssue,
  type GroupRunningBalancesResult,
} from "../domain/groups/runningBalances";
import {
  calculateGroupSettleUp,
  type GroupSettleUpResult,
} from "../domain/groups/groupSettleUp";
import {
  calculateGroupStats,
  type GroupStatsIssue,
  type GroupStatsResult,
} from "../domain/groups/groupStats";
import type { SavedGroup, SavedGroupMember } from "../domain/groups/types";
import {
  listBillsByGroupId,
  listBillSummariesByGroupId,
  type BillSummary,
} from "../storage/billStorage";
import {
  addSavedGroupMember,
  archiveSavedGroup,
  archiveSavedGroupMember,
  createSavedGroup,
  listSavedGroups,
  renameSavedGroup,
  renameSavedGroupMember,
  unarchiveSavedGroup,
  unarchiveSavedGroupMember,
} from "../storage/groupStorage";
import { formatMoneyFromCents } from "../utils/formatting";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getActiveMemberCount(group: SavedGroup) {
  return group.members.filter((member) => !member.archivedAt).length;
}

function getArchivedMemberCount(group: SavedGroup) {
  return group.members.filter((member) => member.archivedAt).length;
}

function formatMemberCount(count: number) {
  return `${count} active ${count === 1 ? "member" : "members"}`;
}

function createMemberDrafts(group: SavedGroup) {
  const drafts: Record<string, string> = {};

  group.members.forEach((member) => {
    drafts[member.id] = member.displayName;
  });

  return drafts;
}

function isArchived(entity: SavedGroup | SavedGroupMember) {
  return Boolean(entity.archivedAt);
}

function statusLabel(status: BillSummary["status"]) {
  if (status === "draft") return "Draft";
  if (status === "active") return "Active";
  return "Settled";
}

function peopleLabel(count: number) {
  return `${count} ${count === 1 ? "person" : "people"}`;
}

function itemsLabel(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

type RunningBalanceCurrencyResult =
  GroupRunningBalancesResult["currencies"][CurrencyCode];

const GROUP_CURRENCIES: CurrencyCode[] = ["USD", "LBP"];

function getRunningBalanceStatusLabel(amountCents: number) {
  if (amountCents > 0) return "Should receive";
  if (amountCents < 0) return "Owes";
  return "Settled";
}

function getRunningBalanceStatusClass(amountCents: number) {
  if (amountCents > 0) return "groups-balance-positive";
  if (amountCents < 0) return "groups-balance-negative";
  return "groups-balance-zero";
}

function getRunningBalanceSummary(amountCents: number) {
  if (amountCents > 0) return "Overpaid by";
  if (amountCents < 0) return "Unpaid by";
  return "Balanced";
}

function getRunningBalanceSummaryAmount(amountCents: number) {
  return Math.abs(amountCents);
}

function hasRunningBalanceRows(result: RunningBalanceCurrencyResult) {
  return result.balances.length > 0;
}

function formatRunningBalanceIssue(issue: GroupRunningBalanceIssue) {
  if (issue.kind === "billCalculationFailed") {
    return `${issue.billTitle} (${issue.currency}) could not be calculated: ${issue.message}`;
  }

  if (issue.kind === "billPersonMissingGroupMemberId") {
    return `${issue.personName} in ${issue.billTitle} (${issue.currency}) is not linked to a group member, so their balance was skipped.`;
  }

  if (issue.kind === "billPersonReferencesUnknownGroupMember") {
    return `${issue.personName} in ${issue.billTitle} (${issue.currency}) points to a missing group member, so their balance was skipped.`;
  }

  return `${issue.billTitle} (${issue.currency}) has a payment of ${formatMoneyFromCents(
    issue.amountCents,
    issue.currency,
  )} for a missing bill person, so that payment was ignored.`;
}

function formatGroupStatsIssue(issue: GroupStatsIssue) {
  if (issue.kind === "billCalculationFailed") {
    return `${issue.billTitle} (${issue.currency}) could not be included in stats: ${issue.message}`;
  }

  if (issue.kind === "billPersonMissingGroupMemberId") {
    return `${issue.personName} in ${issue.billTitle} (${issue.currency}) is not linked to a group member, so their member stats were skipped.`;
  }

  if (issue.kind === "billPersonReferencesUnknownGroupMember") {
    return `${issue.personName} in ${issue.billTitle} (${issue.currency}) points to a missing group member, so their member stats were skipped.`;
  }

  return `${issue.billTitle} (${issue.currency}) has a payment of ${formatMoneyFromCents(
    issue.amountCents,
    issue.currency,
  )} for a missing bill person, so that paid stat was ignored.`;
}

function formatLargestBillLabel(totalCents: number, currency: CurrencyCode) {
  return totalCents > 0 ? formatMoneyFromCents(totalCents, currency) : "—";
}

function getSettleUpImbalanceClass(result: GroupSettleUpResult) {
  if (result.imbalance.kind === "overpaid") return "groups-settleup-overpaid";
  if (result.imbalance.kind === "unpaid") return "groups-settleup-unpaid";
  return "groups-settleup-balanced";
}

function getSettleUpStatusLabel(result: GroupSettleUpResult) {
  if (result.imbalance.kind === "overpaid") return "Overpaid";
  if (result.imbalance.kind === "unpaid") return "Unpaid";
  return "Balanced";
}

function getSettleUpMessage(result: GroupSettleUpResult) {
  if (result.imbalance.kind === "balanced") {
    if (result.transfers.length === 0) {
      return `No member-to-member transfers are needed for ${result.currency}.`;
    }

    return `All ${result.currency} positive and negative balances can be matched with member-to-member transfers.`;
  }

  if (result.imbalance.kind === "overpaid") {
    return `This group is overpaid by ${formatMoneyFromCents(
      result.imbalance.amountCents,
      result.currency,
    )}, so not all positive balances can be settled by member-to-member transfers. Check paid amounts in linked bills.`;
  }

  return `This group is unpaid by ${formatMoneyFromCents(
    result.imbalance.amountCents,
    result.currency,
  )}, so not all negative balances can be settled by member-to-member transfers. Check paid amounts in linked bills.`;
}

function GroupSettleUpPanel({ result }: { result: GroupSettleUpResult }) {
  const hasTransfers = result.transfers.length > 0;
  const statusClass = getSettleUpImbalanceClass(result);

  return (
    <div className="groups-settleup-panel">
      <div className="groups-settleup-header">
        <div>
          <h5>Settle-up suggestions</h5>
          <p>
            Suggested transfers only. Nothing is stored, changed, or marked as
            paid.
          </p>
        </div>

        <span className={`groups-settleup-pill ${statusClass}`}>
          {getSettleUpStatusLabel(result)}
        </span>
      </div>

      {hasTransfers ? (
        <div className="groups-settleup-list">
          {result.transfers.map((transfer, index) => (
            <div
              className="groups-settleup-transfer"
              key={`${result.currency}-${transfer.fromGroupMemberId}-${transfer.toGroupMemberId}-${transfer.amountCents}-${index}`}
            >
              <div className="groups-settleup-transfer-people">
                <span>
                  <strong>{transfer.fromDisplayName}</strong>
                  {transfer.fromArchivedAt ? (
                    <em className="groups-settleup-archived">Archived</em>
                  ) : null}
                </span>
                <span className="groups-settleup-arrow">pays</span>
                <span>
                  <strong>{transfer.toDisplayName}</strong>
                  {transfer.toArchivedAt ? (
                    <em className="groups-settleup-archived">Archived</em>
                  ) : null}
                </span>
              </div>

              <strong className="groups-history-money">
                {formatMoneyFromCents(transfer.amountCents, result.currency)}
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="groups-empty-detail groups-settleup-empty">
          No transfer suggestions for {result.currency}.
        </div>
      )}

      <div className={`groups-settleup-note ${statusClass}`}>
        <strong>{getSettleUpStatusLabel(result)}</strong>
        <p>{getSettleUpMessage(result)}</p>
      </div>
    </div>
  );
}

function GroupRunningBalancesPanel({
  result,
}: {
  result: GroupRunningBalancesResult;
}) {
  return (
    <section
      className="groups-balances-section"
      aria-labelledby="groups-running-balances-title"
    >
      <div className="groups-history-header">
        <div>
          <h3 id="groups-running-balances-title">Running balances</h3>
          <p>
            Positive means the member should receive money. Negative means the
            member owes money. USD and LBP stay separate.
          </p>
        </div>
      </div>

      {result.issues.length > 0 ? (
        <div className="groups-balance-issues">
          <strong>Balance warnings</strong>
          <ul>
            {result.issues.map((issue, index) => (
              <li key={`${issue.kind}-${issue.billId}-${index}`}>
                {formatRunningBalanceIssue(issue)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="groups-balance-grid">
        {GROUP_CURRENCIES.map((currency) => {
          const currencyResult = result.currencies[currency];
          const hasBalanceRows = hasRunningBalanceRows(currencyResult);
          const settleUpResult = calculateGroupSettleUp({
            currency,
            balances: currencyResult.balances,
          });

          return (
            <article className="groups-balance-card" key={currency}>
              <div className="groups-balance-card-header">
                <div>
                  <h4>{currency}</h4>
                  <p>
                    {currencyResult.billCount} calculable linked bill
                    {currencyResult.billCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="groups-balance-total">
                  <span>
                    {getRunningBalanceSummary(currencyResult.netBalanceCents)}
                  </span>
                  <strong
                    className={getRunningBalanceStatusClass(
                      currencyResult.netBalanceCents,
                    )}
                  >
                    {formatMoneyFromCents(
                      getRunningBalanceSummaryAmount(
                        currencyResult.netBalanceCents,
                      ),
                      currency,
                    )}
                  </strong>
                </div>
              </div>

              {!hasBalanceRows ? (
                <div className="groups-empty-detail groups-balance-empty">
                  No group members to show for {currency}.
                </div>
              ) : (
                <div className="table-wrap groups-balance-table-wrap">
                  <table className="groups-table groups-balance-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Status</th>
                        <th>Owed</th>
                        <th>Paid</th>
                        <th>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currencyResult.balances.map((balance) => (
                        <tr key={`${currency}-${balance.groupMemberId}`}>
                          <td>
                            <div className="groups-balance-member">
                              <strong>{balance.displayName}</strong>
                              {balance.archivedAt ? <span>Archived</span> : null}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`groups-balance-status ${getRunningBalanceStatusClass(
                                balance.netBalanceCents,
                              )}`}
                            >
                              {getRunningBalanceStatusLabel(
                                balance.netBalanceCents,
                              )}
                            </span>
                          </td>
                          <td className="groups-history-money">
                            {formatMoneyFromCents(
                              balance.amountOwedCents,
                              currency,
                            )}
                          </td>
                          <td className="groups-history-money">
                            {formatMoneyFromCents(
                              balance.amountPaidCents,
                              currency,
                            )}
                          </td>
                          <td
                            className={`groups-history-money ${getRunningBalanceStatusClass(
                              balance.netBalanceCents,
                            )}`}
                          >
                            {formatMoneyFromCents(
                              balance.netBalanceCents,
                              currency,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {hasBalanceRows ? (
                <GroupSettleUpPanel result={settleUpResult} />
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function GroupStatsPanel({ result }: { result: GroupStatsResult }) {
  return (
    <section
      className="groups-stats-section"
      aria-labelledby="groups-basic-stats-title"
    >
      <div className="groups-history-header">
        <div>
          <h3 id="groups-basic-stats-title">Basic stats</h3>
          <p>
            Read-only group stats from saved linked bills. Standalone bills are
            ignored, and USD/LBP stay completely separate.
          </p>
        </div>
      </div>

      {result.issues.length > 0 ? (
        <div className="groups-stats-issues">
          <strong>Stats warnings</strong>
          <ul>
            {result.issues.map((issue, index) => (
              <li key={`${issue.kind}-${issue.billId}-${index}`}>
                {formatGroupStatsIssue(issue)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="groups-stats-grid">
        {GROUP_CURRENCIES.map((currency) => {
          const currencyStats = result.currencies[currency];
          const hasMembers = currencyStats.memberTotals.length > 0;
          const largestBill = currencyStats.largestBill;

          return (
            <article className="groups-stats-card" key={currency}>
              <div className="groups-stats-card-header">
                <div>
                  <h4>{currency}</h4>
                  <p>
                    {currencyStats.billCount} calculable linked bill
                    {currencyStats.billCount === 1 ? "" : "s"}
                  </p>
                </div>
                <strong>
                  {formatMoneyFromCents(
                    currencyStats.totalSpentCents,
                    currency,
                  )}
                </strong>
              </div>

              <div className="groups-stats-metrics">
                <div>
                  <span>Total spent</span>
                  <strong>
                    {formatMoneyFromCents(
                      currencyStats.totalSpentCents,
                      currency,
                    )}
                  </strong>
                </div>
                <div>
                  <span>Average bill</span>
                  <strong>
                    {formatMoneyFromCents(
                      currencyStats.averageBillTotalCents,
                      currency,
                    )}
                  </strong>
                </div>
                <div>
                  <span>Largest bill</span>
                  <strong>
                    {formatLargestBillLabel(
                      largestBill?.totalCents ?? 0,
                      currency,
                    )}
                  </strong>
                  {largestBill ? (
                    <Link
                      className="groups-stats-largest-link"
                      to={`/bills/${largestBill.billId}/workspace`}
                    >
                      {largestBill.billTitle}
                    </Link>
                  ) : (
                    <small>No {currency} bills yet</small>
                  )}
                </div>
              </div>

              {!hasMembers ? (
                <div className="groups-empty-detail groups-stats-empty">
                  No group members to show for {currency}.
                </div>
              ) : (
                <div className="table-wrap groups-stats-table-wrap">
                  <table className="groups-table groups-stats-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Owed</th>
                        <th>Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currencyStats.memberTotals.map((memberTotal) => (
                        <tr key={`${currency}-${memberTotal.groupMemberId}`}>
                          <td>
                            <div className="groups-balance-member">
                              <strong>{memberTotal.displayName}</strong>
                              {memberTotal.archivedAt ? <span>Archived</span> : null}
                            </div>
                          </td>
                          <td className="groups-history-money">
                            {formatMoneyFromCents(
                              memberTotal.amountOwedCents,
                              currency,
                            )}
                          </td>
                          <td className="groups-history-money">
                            {formatMoneyFromCents(
                              memberTotal.amountPaidCents,
                              currency,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function GroupHistorySection({
  groupBillsError,
  isGroupBillsLoading,
  runningBalances,
  groupStats,
  groupBills,
}: {
  groupBillsError: string;
  isGroupBillsLoading: boolean;
  runningBalances: GroupRunningBalancesResult | null;
  groupStats: GroupStatsResult | null;
  groupBills: BillSummary[];
}) {
  return (
    <section className="card groups-history-section">
      <div className="groups-history-header">
        <div>
          <h3>Group history</h3>
          <p>
            Linked bills are found by group id. Standalone bills and old bills
            with matching names are ignored.
          </p>
        </div>
      </div>

      {groupBillsError ? <p className="form-error">{groupBillsError}</p> : null}

      {!groupBillsError && !isGroupBillsLoading && runningBalances ? (
        <GroupRunningBalancesPanel result={runningBalances} />
      ) : null}

      {!groupBillsError && !isGroupBillsLoading && groupStats ? (
        <GroupStatsPanel result={groupStats} />
      ) : null}

      {isGroupBillsLoading ? (
        <div className="groups-empty-detail">Loading group history...</div>
      ) : groupBills.length === 0 ? (
        <div className="groups-empty-detail">
          <h3>No linked bills yet</h3>
          <p>
            Create a new bill from this group and save it. Then it will appear
            here.
          </p>
        </div>
      ) : (
        <div className="table-wrap groups-history-table-wrap">
          <table className="groups-table groups-history-table">
            <thead>
              <tr>
                <th>Bill</th>
                <th>Status</th>
                <th>Currency</th>
                <th>People</th>
                <th>Items</th>
                <th>Total</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {groupBills.map((bill) => (
                <tr key={bill.id}>
                  <td>
                    <strong className="groups-history-bill-title">
                      {bill.title}
                    </strong>
                  </td>
                  <td>
                    <span className={`status-pill status-${bill.status}`}>
                      {statusLabel(bill.status)}
                    </span>
                  </td>
                  <td>{bill.currency}</td>
                  <td>{peopleLabel(bill.peopleCount)}</td>
                  <td>{itemsLabel(bill.itemsCount)}</td>
                  <td className="groups-history-money">
                    {bill.hasCalculationIssue
                      ? "—"
                      : formatMoneyFromCents(
                          bill.billTotalCents,
                          bill.currency,
                        )}
                  </td>
                  <td className="nowrap">{formatDate(bill.updatedAt)}</td>
                  <td>
                    <Link className="button" to={`/bills/${bill.id}/workspace`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function SavedGroupsPage() {
  const [groups, setGroups] = useState<SavedGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [memberNameDrafts, setMemberNameDrafts] = useState<
    Record<string, string>
  >({});

  const [groupBills, setGroupBills] = useState<BillSummary[]>([]);
  const [groupDetailBills, setGroupDetailBills] = useState<Bill[]>([]);
  const [isGroupBillsLoading, setIsGroupBillsLoading] = useState(false);
  const [groupBillsError, setGroupBillsError] = useState("");

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const runningBalances = useMemo(() => {
    if (!selectedGroup) {
      return null;
    }

    return calculateGroupRunningBalances({
      group: selectedGroup,
      bills: groupDetailBills,
    });
  }, [groupDetailBills, selectedGroup]);

  const groupStats = useMemo(() => {
    if (!selectedGroup) {
      return null;
    }

    return calculateGroupStats({
      group: selectedGroup,
      bills: groupDetailBills,
    });
  }, [groupDetailBills, selectedGroup]);

  async function loadGroups(preferredSelectedGroupId?: string) {
    setIsLoading(true);
    setError("");

    try {
      const savedGroups = await listSavedGroups({ includeArchived: true });
      setGroups(savedGroups);

      setSelectedGroupId((currentSelectedGroupId) => {
        if (
          preferredSelectedGroupId &&
          savedGroups.some((group) => group.id === preferredSelectedGroupId)
        ) {
          return preferredSelectedGroupId;
        }

        if (
          currentSelectedGroupId &&
          savedGroups.some((group) => group.id === currentSelectedGroupId)
        ) {
          return currentSelectedGroupId;
        }

        return savedGroups[0]?.id ?? "";
      });
    } catch {
      setError("Could not load saved groups.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadGroups();
  }, []);

  useEffect(() => {
    if (!selectedGroup) {
      setGroupNameDraft("");
      setNewMemberName("");
      setMemberNameDrafts({});
      return;
    }

    setGroupNameDraft(selectedGroup.name);
    setNewMemberName("");
    setMemberNameDrafts(createMemberDrafts(selectedGroup));
  }, [selectedGroup?.id, selectedGroup?.updatedAt]);

  useEffect(() => {
    let cancelled = false;

    async function loadGroupBills() {
      if (!selectedGroupId) {
        setGroupBills([]);
        setGroupDetailBills([]);
        setGroupBillsError("");
        setIsGroupBillsLoading(false);
        return;
      }

      setIsGroupBillsLoading(true);
      setGroupBills([]);
      setGroupDetailBills([]);
      setGroupBillsError("");

      try {
        const [billSummaries, bills] = await Promise.all([
          listBillSummariesByGroupId(selectedGroupId),
          listBillsByGroupId(selectedGroupId),
        ]);

        if (!cancelled) {
          setGroupBills(billSummaries);
          setGroupDetailBills(bills);
        }
      } catch {
        if (!cancelled) {
          setGroupBills([]);
          setGroupDetailBills([]);
          setGroupBillsError("Could not load group history.");
        }
      } finally {
        if (!cancelled) {
          setIsGroupBillsLoading(false);
        }
      }
    }

    void loadGroupBills();

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  function clearMessages() {
    setError("");
    setSuccessMessage("");
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const name = newGroupName.trim();

    if (!name) {
      setError("Group name is required.");
      return;
    }

    try {
      const createdGroup = await createSavedGroup({ name });
      setNewGroupName("");
      await loadGroups(createdGroup.id);
      setSuccessMessage(`Created ${createdGroup.name}.`);
    } catch (createError) {
      setError(getErrorMessage(createError, "Could not create group."));
    }
  }

  async function handleRenameGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (!selectedGroup) return;

    if (isArchived(selectedGroup)) {
      setError("Archived groups are read-only.");
      return;
    }

    const name = groupNameDraft.trim();

    if (!name) {
      setError("Group name is required.");
      return;
    }

    if (name === selectedGroup.name) {
      return;
    }

    try {
      const renamedGroup = await renameSavedGroup(selectedGroup.id, name);

      if (!renamedGroup) {
        setError("Could not find that group.");
        return;
      }

      await loadGroups(renamedGroup.id);
      setSuccessMessage(`Renamed group to ${renamedGroup.name}.`);
    } catch (renameError) {
      setError(getErrorMessage(renameError, "Could not rename group."));
    }
  }

  async function handleArchiveGroup() {
    clearMessages();

    if (!selectedGroup) return;

    if (isArchived(selectedGroup)) {
      setError("That group is already archived.");
      return;
    }

    const confirmed = window.confirm(
      `Archive ${selectedGroup.name}? The group will stay visible for old records, but it will become read-only.`,
    );

    if (!confirmed) return;

    try {
      const archivedGroup = await archiveSavedGroup(selectedGroup.id);

      if (!archivedGroup) {
        setError("Could not find that group.");
        return;
      }

      await loadGroups(archivedGroup.id);
      setSuccessMessage(`Archived ${archivedGroup.name}.`);
    } catch (archiveError) {
      setError(getErrorMessage(archiveError, "Could not archive group."));
    }
  }

  async function handleUnarchiveGroup() {
    clearMessages();

    if (!selectedGroup) return;

    if (!isArchived(selectedGroup)) {
      setError("That group is already active.");
      return;
    }

    try {
      const restoredGroup = await unarchiveSavedGroup(selectedGroup.id);

      if (!restoredGroup) {
        setError("Could not find that group.");
        return;
      }

      await loadGroups(restoredGroup.id);
      setSuccessMessage(`Restored ${restoredGroup.name}.`);
    } catch (unarchiveError) {
      setError(getErrorMessage(unarchiveError, "Could not unarchive group."));
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (!selectedGroup) return;

    if (isArchived(selectedGroup)) {
      setError("Archived groups are read-only.");
      return;
    }

    const displayName = newMemberName.trim();

    if (!displayName) {
      setError("Member name is required.");
      return;
    }

    try {
      const updatedGroup = await addSavedGroupMember(
        selectedGroup.id,
        displayName,
      );

      if (!updatedGroup) {
        setError("Could not find that group.");
        return;
      }

      setNewMemberName("");
      await loadGroups(updatedGroup.id);
      setSuccessMessage(`Added ${displayName} to ${updatedGroup.name}.`);
    } catch (addError) {
      setError(getErrorMessage(addError, "Could not add member."));
    }
  }

  async function handleRenameMember(
    event: FormEvent<HTMLFormElement>,
    member: SavedGroupMember,
  ) {
    event.preventDefault();
    clearMessages();

    if (!selectedGroup) return;

    if (isArchived(selectedGroup)) {
      setError("Archived groups are read-only.");
      return;
    }

    if (isArchived(member)) {
      setError("Archived members are read-only.");
      return;
    }

    const displayName = memberNameDrafts[member.id]?.trim() ?? "";

    if (!displayName) {
      setError("Member name is required.");
      return;
    }

    if (displayName === member.displayName) {
      return;
    }

    try {
      const updatedGroup = await renameSavedGroupMember(
        selectedGroup.id,
        member.id,
        displayName,
      );

      if (!updatedGroup) {
        setError("Could not find that member.");
        return;
      }

      await loadGroups(updatedGroup.id);
      setSuccessMessage(`Renamed member to ${displayName}.`);
    } catch (renameError) {
      setError(getErrorMessage(renameError, "Could not rename member."));
    }
  }

  async function handleArchiveMember(member: SavedGroupMember) {
    clearMessages();

    if (!selectedGroup) return;

    if (isArchived(selectedGroup)) {
      setError("Archived groups are read-only.");
      return;
    }

    if (isArchived(member)) {
      setError("That member is already archived.");
      return;
    }

    const confirmed = window.confirm(
      `Archive ${member.displayName}? The member will stay visible for old records, but cannot be used as an active member.`,
    );

    if (!confirmed) return;

    try {
      const updatedGroup = await archiveSavedGroupMember(
        selectedGroup.id,
        member.id,
      );

      if (!updatedGroup) {
        setError("Could not find that member.");
        return;
      }

      await loadGroups(updatedGroup.id);
      setSuccessMessage(`Archived ${member.displayName}.`);
    } catch (archiveError) {
      setError(getErrorMessage(archiveError, "Could not archive member."));
    }
  }

  async function handleUnarchiveMember(member: SavedGroupMember) {
    clearMessages();

    if (!selectedGroup) return;

    if (isArchived(selectedGroup)) {
      setError("Restore the group before restoring members.");
      return;
    }

    if (!isArchived(member)) {
      setError("That member is already active.");
      return;
    }

    try {
      const updatedGroup = await unarchiveSavedGroupMember(
        selectedGroup.id,
        member.id,
      );

      if (!updatedGroup) {
        setError("Could not find that member.");
        return;
      }

      await loadGroups(updatedGroup.id);
      setSuccessMessage(`Restored ${member.displayName}.`);
    } catch (unarchiveError) {
      setError(getErrorMessage(unarchiveError, "Could not unarchive member."));
    }
  }

  return (
    <main className="page-shell groups-page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Version 2 groups</p>
          <h1>Saved groups</h1>
          <p className="muted">
            Create reusable friend groups and keep old group records readable.
            New bills can now start from active groups.
          </p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {successMessage ? (
        <p className="success-message">{successMessage}</p>
      ) : null}

      <section className="groups-layout">
        <article className="card groups-list-card">
          <div className="groups-card-header">
            <div>
              <h2>Groups</h2>
              <p>
                Active and archived groups stay here. Archiving keeps the data;
                it does not delete it.
              </p>
            </div>
          </div>

          <form className="groups-create-form" onSubmit={handleCreateGroup}>
            <label htmlFor="new-group-name">
              New group
              <input
                id="new-group-name"
                type="text"
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="Example: Roro dinner crew"
              />
            </label>

            <button type="submit" className="button button-primary">
              Create group
            </button>
          </form>

          {isLoading ? (
            <div className="groups-empty-detail">Loading saved groups...</div>
          ) : groups.length === 0 ? (
            <div className="groups-empty-detail">
              <h3>No saved groups yet</h3>
              <p>Create one group, then add members from the detail panel.</p>
            </div>
          ) : (
            <div className="table-wrap groups-table-wrap">
              <table className="groups-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Members</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const activeMemberCount = getActiveMemberCount(group);
                    const selected = group.id === selectedGroupId;

                    return (
                      <tr
                        key={group.id}
                        className={selected ? "groups-row-selected" : undefined}
                      >
                        <td>
                          <div className="groups-name-cell">
                            <strong>{group.name}</strong>
                            {getArchivedMemberCount(group) > 0 ? (
                              <span>
                                {getArchivedMemberCount(group)} archived member
                                {getArchivedMemberCount(group) === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>{formatMemberCount(activeMemberCount)}</td>
                        <td>
                          <span
                            className={
                              isArchived(group)
                                ? "groups-status-pill groups-status-archived"
                                : "groups-status-pill groups-status-active"
                            }
                          >
                            {isArchived(group) ? "Archived" : "Active"}
                          </span>
                        </td>
                        <td className="nowrap">{formatDate(group.updatedAt)}</td>
                        <td>
                          <button
                            type="button"
                            className={
                              selected ? "button button-primary" : "button"
                            }
                            onClick={() => setSelectedGroupId(group.id)}
                          >
                            {selected ? "Selected" : "Open"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="card groups-detail-card">
          {!selectedGroup ? (
            <div className="groups-empty-detail">
              <h2>Select a group</h2>
              <p>
                Pick a group from the list, or create one first. This page
                manages saved groups; use New bill to start from an active
                group.
              </p>
            </div>
          ) : (
            <>
              <div className="groups-detail-header">
                <div>
                  <p className="eyebrow">Group detail</p>
                  <h2>{selectedGroup.name}</h2>
                  <div className="groups-meta-stack">
                    <span>
                      {formatMemberCount(getActiveMemberCount(selectedGroup))}
                    </span>
                    <span>Created {formatDate(selectedGroup.createdAt)}</span>
                    {selectedGroup.archivedAt ? (
                      <span>Archived {formatDate(selectedGroup.archivedAt)}</span>
                    ) : null}
                  </div>
                </div>

                <span
                  className={
                    isArchived(selectedGroup)
                      ? "groups-status-pill groups-status-archived"
                      : "groups-status-pill groups-status-active"
                  }
                >
                  {isArchived(selectedGroup) ? "Archived" : "Active"}
                </span>
              </div>

              <form className="groups-edit-form" onSubmit={handleRenameGroup}>
                <label htmlFor="group-name-draft">
                  Group name
                  <input
                    id="group-name-draft"
                    type="text"
                    value={groupNameDraft}
                    onChange={(event) => setGroupNameDraft(event.target.value)}
                    disabled={isArchived(selectedGroup)}
                  />
                </label>

                <div className="table-actions groups-edit-actions">
                  <button
                    type="submit"
                    className="button"
                    disabled={
                      isArchived(selectedGroup) ||
                      groupNameDraft.trim() === selectedGroup.name
                    }
                  >
                    Rename group
                  </button>

                  {isArchived(selectedGroup) ? (
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => void handleUnarchiveGroup()}
                    >
                      Unarchive group
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void handleArchiveGroup()}
                    >
                      Archive group
                    </button>
                  )}
                </div>
              </form>

              {isArchived(selectedGroup) ? (
                <div className="groups-readonly-note">
                  This group is archived, so it is read-only. Restore it first if
                  you need to rename it, add members, or restore archived members.
                </div>
              ) : null}

              <div className="groups-members-header">
                <div>
                  <h3>Members</h3>
                  <p>
                    Members are group identities. New group bills copy active
                    member names from here while keeping bill-local people
                    separate.
                  </p>
                </div>
              </div>

              <form className="groups-create-form" onSubmit={handleAddMember}>
                <label htmlFor="new-member-name">
                  Add member
                  <input
                    id="new-member-name"
                    type="text"
                    value={newMemberName}
                    onChange={(event) => setNewMemberName(event.target.value)}
                    placeholder="Example: Ryan"
                    disabled={isArchived(selectedGroup)}
                  />
                </label>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isArchived(selectedGroup)}
                >
                  Add member
                </button>
              </form>

              {selectedGroup.members.length === 0 ? (
                <div className="groups-empty-detail groups-members-empty">
                  <h3>No members yet</h3>
                  <p>Add the people who usually split bills in this group.</p>
                </div>
              ) : (
                <div className="table-wrap groups-members-table-wrap">
                  <table className="groups-table groups-members-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGroup.members.map((member) => {
                        const groupReadOnly = isArchived(selectedGroup);
                        const memberArchived = isArchived(member);
                        const memberRenameReadOnly =
                          groupReadOnly || memberArchived;

                        return (
                          <tr key={member.id}>
                            <td>
                              <form
                                className="groups-inline-form"
                                onSubmit={(event) =>
                                  void handleRenameMember(event, member)
                                }
                              >
                                <input
                                  type="text"
                                  value={
                                    memberNameDrafts[member.id] ??
                                    member.displayName
                                  }
                                  onChange={(event) =>
                                    setMemberNameDrafts((currentDrafts) => ({
                                      ...currentDrafts,
                                      [member.id]: event.target.value,
                                    }))
                                  }
                                  aria-label={`Rename ${member.displayName}`}
                                  disabled={memberRenameReadOnly}
                                />

                                <button
                                  type="submit"
                                  className="button"
                                  disabled={
                                    memberRenameReadOnly ||
                                    (memberNameDrafts[member.id] ?? "").trim() ===
                                      member.displayName
                                  }
                                >
                                  Rename
                                </button>
                              </form>
                            </td>
                            <td>
                              <span
                                className={
                                  isArchived(member)
                                    ? "groups-status-pill groups-status-archived"
                                    : "groups-status-pill groups-status-active"
                                }
                              >
                                {isArchived(member) ? "Archived" : "Active"}
                              </span>
                            </td>
                            <td className="nowrap">{formatDate(member.updatedAt)}</td>
                            <td>
                              {memberArchived ? (
                                <button
                                  type="button"
                                  className="button"
                                  disabled={groupReadOnly}
                                  onClick={() => void handleUnarchiveMember(member)}
                                >
                                  Unarchive
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="danger-button"
                                  disabled={groupReadOnly}
                                  onClick={() => void handleArchiveMember(member)}
                                >
                                  Archive
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </article>
      </section>

      {selectedGroup ? (
        <GroupHistorySection
          groupBillsError={groupBillsError}
          isGroupBillsLoading={isGroupBillsLoading}
          runningBalances={runningBalances}
          groupStats={groupStats}
          groupBills={groupBills}
        />
      ) : null}
    </main>
  );
}