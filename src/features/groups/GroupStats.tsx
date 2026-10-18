import { Link } from "react-router-dom";
import type { GroupStatsResult } from "../../domain/groups/groupStats";
import { formatMoneyFromCents } from "../../utils/formatting";
import { GroupIssues } from "./GroupIssues";
export function GroupStats({ result }: { result: GroupStatsResult }) {
  return (
    <section>
      <h3>Stats</h3>
      <GroupIssues issues={result.issues} />
      <div className="group-currencies">
        {(["USD", "LBP"] as const).map((currency) => {
          const stats = result.currencies[currency];
          return (
            <section className="group-currency" key={currency}>
              <h4>{currency}</h4>
              {stats.billCount ? (
                <>
                  <dl className="group-stats-summary">
                    <div>
                      <dt>Total spent</dt>
                      <dd>
                        {formatMoneyFromCents(stats.totalSpentCents, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt>Average bill</dt>
                      <dd>
                        {formatMoneyFromCents(
                          stats.averageBillTotalCents,
                          currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Bills</dt>
                      <dd>{stats.billCount}</dd>
                    </div>
                  </dl>
                  {stats.largestBill ? (
                    <p className="group-largest">
                      Largest bill:{" "}
                      <Link
                        to={"/bills/" + stats.largestBill.billId + "/workspace"}
                      >
                        {stats.largestBill.billTitle}
                      </Link>{" "}
                      ·{" "}
                      {formatMoneyFromCents(
                        stats.largestBill.totalCents,
                        currency,
                      )}
                    </p>
                  ) : null}
                  <details>
                    <summary>By member</summary>
                    <div>
                      {stats.memberTotals.map((member) => (
                        <div
                          className="group-stat-member"
                          key={member.groupMemberId}
                        >
                          <strong>
                            {member.displayName}
                            {member.archivedAt ? " · Archived" : ""}
                          </strong>
                          <span>
                            Share{" "}
                            {formatMoneyFromCents(
                              member.amountOwedCents,
                              currency,
                            )}
                          </span>
                          <span>
                            Paid{" "}
                            {formatMoneyFromCents(
                              member.amountPaidCents,
                              currency,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </>
              ) : (
                <p className="empty-note">No {currency} bills yet.</p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
