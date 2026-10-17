import type { GroupRunningBalancesResult } from "../../domain/groups/runningBalances";
import { calculateGroupSettleUp } from "../../domain/groups/groupSettleUp";
import { formatMoneyFromCents } from "../../utils/formatting";
import { GroupIssues } from "./GroupIssues";
export function GroupBalances({
  result,
}: {
  result: GroupRunningBalancesResult;
}) {
  return (
    <section>
      <h3>Balances</h3>
      <p className="muted-text">
        USD and LBP are kept separate. Transfers below are suggestions.
      </p>
      <GroupIssues issues={result.issues} />
      <div className="group-currencies">
        {(["USD", "LBP"] as const).map((currency) => {
          const rows = result.currencies[currency];
          const settlement = calculateGroupSettleUp({
            currency,
            balances: rows.balances,
          });
          return (
            <section className="group-currency" key={currency}>
              <h4>
                {currency}{" "}
                <small className="muted-text">
                  · {rows.billCount} {rows.billCount === 1 ? "bill" : "bills"}
                </small>
              </h4>
              {!rows.billCount ? (
                <p className="empty-note">No {currency} bills yet.</p>
              ) : (
                <>
                  <div className="group-balance-list">
                    {rows.balances.map((row) => (
                      <details
                        className="group-balance-row"
                        key={row.groupMemberId}
                      >
                        <summary>
                          <span>
                            {row.displayName}
                            {row.archivedAt ? <small> · Archived</small> : null}
                          </span>
                          <strong
                            className={
                              row.netBalanceCents > 0
                                ? "positive-status"
                                : row.netBalanceCents < 0
                                  ? "warning-status"
                                  : "muted-text"
                            }
                          >
                            {row.netBalanceCents === 0
                              ? "All square"
                              : (row.netBalanceCents > 0
                                  ? "Receives "
                                  : "Owes ") +
                                formatMoneyFromCents(
                                  Math.abs(row.netBalanceCents),
                                  currency,
                                )}
                          </strong>
                        </summary>
                        <dl className="summary-stack">
                          <div className="summary-row">
                            <dt>Total share</dt>
                            <dd>
                              {formatMoneyFromCents(
                                row.amountOwedCents,
                                currency,
                              )}
                            </dd>
                          </div>
                          <div className="summary-row">
                            <dt>Paid</dt>
                            <dd>
                              {formatMoneyFromCents(
                                row.amountPaidCents,
                                currency,
                              )}
                            </dd>
                          </div>
                        </dl>
                      </details>
                    ))}
                  </div>
                  <h4>Settle up</h4>
                  {settlement.transfers.length ? (
                    <ul className="settlement-transfer-list">
                      {settlement.transfers.map((transfer, index) => (
                        <li className="settlement-transfer-card" key={index}>
                          <span>
                            <strong>{transfer.fromDisplayName}</strong>
                            {transfer.fromArchivedAt
                              ? " (archived)"
                              : ""} pays{" "}
                            <strong>{transfer.toDisplayName}</strong>
                            {transfer.toArchivedAt ? " (archived)" : ""}
                          </span>
                          <strong className="money">
                            {formatMoneyFromCents(
                              transfer.amountCents,
                              currency,
                            )}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-note">No transfers needed.</p>
                  )}
                  {settlement.imbalance.kind !== "balanced" ? (
                    <p className="warning-box">
                      {settlement.imbalance.kind === "overpaid"
                        ? "Overpaid by "
                        : "Unpaid by "}
                      {formatMoneyFromCents(
                        settlement.imbalance.amountCents,
                        currency,
                      )}
                      . Check payments in your bills; transfers cannot cover
                      this difference.
                    </p>
                  ) : null}
                </>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
