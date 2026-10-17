import { useState } from "react";
import type { BillReview } from "../../domain/bill/review";
import type { PersonSettlementBalance } from "../../domain/bill/types";
import { formatMoneyFromCents } from "../../utils/formatting";
import { Avatar } from "../../components/ui/Avatar";
export function ReviewPeople({
  review,
  balances,
}: {
  review: BillReview;
  balances: PersonSettlementBalance[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  return (
    <section className="panel review-people">
      <h2>Everyone's share</h2>
      <div className="review-column-labels" aria-hidden="true">
        <span>Person</span>
        <span>Total</span>
        <span>Paid</span>
        <span>Balance</span>
        <span />
      </div>
      {review.people.map((person) => {
        const balance = balances.find(
          (row) => row.personId === person.personId,
        );
        const net = balance?.netBalanceCents ?? -person.grossTotalCents;
        const open = expanded.has(person.personId);
        const balanceText =
          net > 0
            ? "Receives " + formatMoneyFromCents(net, review.currency)
            : net < 0
              ? "Owes " + formatMoneyFromCents(-net, review.currency)
              : "All square";
        return (
          <article className="review-person-block" key={person.personId}>
            <button
              className="review-person-row"
              type="button"
              aria-expanded={open}
              aria-controls={"breakdown-" + person.personId}
              onClick={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  if (open) next.delete(person.personId);
                  else next.add(person.personId);
                  return next;
                })
              }
            >
              <span className="review-person-name">
                <Avatar
                  name={person.personName}
                  emoji={person.emoji}
                  color={person.color}
                />
                <strong>{person.personName}</strong>
              </span>
              <strong className="review-share money">
                <span className="sr-only">Total </span>
                {formatMoneyFromCents(person.grossTotalCents, review.currency)}
              </strong>
              <span className="review-paid money">
                <span className="sr-only">Paid </span>
                {formatMoneyFromCents(
                  balance?.amountPaidCents ?? 0,
                  review.currency,
                )}
              </span>
              <strong
                className={
                  net > 0
                    ? "positive-status review-balance"
                    : net < 0
                      ? "warning-status review-balance"
                      : "review-balance"
                }
              >
                {balanceText}
              </strong>
              <span className="review-details-label">
                {open ? "Hide details" : "Details"}
              </span>
            </button>
            {open ? (
              <div
                className="review-breakdown"
                id={"breakdown-" + person.personId}
              >
                <dl className="review-breakdown-summary">
                  <div>
                    <dt>Items</dt>
                    <dd>
                      {formatMoneyFromCents(
                        person.itemSubtotalCents,
                        review.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Extras</dt>
                    <dd>
                      {formatMoneyFromCents(
                        person.extrasTotalCents,
                        review.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Discounts</dt>
                    <dd>
                      {formatMoneyFromCents(
                        person.discountTotalCents,
                        review.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Paid</dt>
                    <dd>
                      {formatMoneyFromCents(
                        balance?.amountPaidCents ?? 0,
                        review.currency,
                      )}
                    </dd>
                  </div>
                </dl>
                {person.lines.length ? (
                  person.lines.map((line) => (
                    <div className="breakdown-line" key={line.id}>
                      <div>
                        <strong>{line.label}</strong>
                        <small>{line.note ?? line.kind}</small>
                      </div>
                      <strong
                        className={
                          line.amountCents < 0 ? "negative-money" : "money"
                        }
                      >
                        {formatMoneyFromCents(
                          line.amountCents,
                          review.currency,
                        )}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p>No items or extras assigned.</p>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
