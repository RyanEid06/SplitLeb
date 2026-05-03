import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import {
  calculateBillReview,
  type BillReview,
} from "../domain/bill/review";
import {
  calculatePaymentTotalStatus,
  calculatePersonSettlementBalances,
  calculateSettlementTransfers,
  upsertPaymentForPerson,
} from "../domain/bill/settlements";
import type { Bill } from "../domain/bill/types";
import { PaymentsAndSettlementPanel } from "../features/settlement/PaymentsAndSettlementPanel";
import { ShareSummaryPanel } from "../features/share/ShareSummaryPanel";
import { openBill, saveBill, updateBillStatus } from "../storage/billStorage";
import type { StoredBill } from "../storage/db";
import { formatMoneyFromCents } from "../utils/formatting";

type ReviewResult = {
  review: BillReview | null;
  error: string;
};

export function ReviewPage() {
  const { billId } = useParams();

  const [bill, setBill] = useState<StoredBill | null>(null);
  const [isLoadingBill, setIsLoadingBill] = useState(Boolean(billId));
  const [loadError, setLoadError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [expandedPersonIds, setExpandedPersonIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!billId) {
      setIsLoadingBill(false);
      setLoadError("Missing bill ID.");
      return;
    }

    const currentBillId = billId;

    async function loadBill() {
      setIsLoadingBill(true);
      setLoadError("");

      const savedBill = await openBill(currentBillId);

      if (!savedBill) {
        setBill(null);
        setLoadError("Saved bill not found.");
        setIsLoadingBill(false);
        return;
      }

      setBill(savedBill);
      setIsLoadingBill(false);
    }

    void loadBill();
  }, [billId]);

  const reviewResult = useMemo<ReviewResult>(() => {
    if (!bill) {
      return {
        review: null,
        error: "",
      };
    }

    try {
      return {
        review: calculateBillReview(bill),
        error: "",
      };
    } catch (error) {
      return {
        review: null,
        error:
          error instanceof Error
            ? error.message
            : "Could not calculate this review.",
      };
    }
  }, [bill]);

  const review = reviewResult.review;
  const reviewError = reviewResult.error;

  const settlementBalances = useMemo(() => {
    if (!bill || !review) return [];

    return calculatePersonSettlementBalances({
      personTotals: review.people.map((person) => ({
        personId: person.personId,
        personName: person.personName,
        amountOwedCents: person.grossTotalCents,
      })),
      payments: bill.payments,
    });
  }, [bill, review]);

 const settlementTransfers = useMemo(() => {
  if (!bill) return [];

  return calculateSettlementTransfers(settlementBalances, {
    currency: bill.currency,
  });
}, [bill, settlementBalances]);

  const paymentStatus = useMemo(() => {
    if (!bill || !review) return null;

    return calculatePaymentTotalStatus({
      billTotalCents: review.grandTotalCents,
      payments: bill.payments,
    });
  }, [bill, review]);

  const settlementBalanceByPersonId = useMemo(() => {
    return new Map(
      settlementBalances.map((balance) => [balance.personId, balance]),
    );
  }, [settlementBalances]);

  const shareSummaryInput = useMemo(() => {
    if (!bill || !paymentStatus) return null;

    return {
      billTitle: bill.title || "Untitled bill",
      currency: bill.currency,
      billTotals: {
        grandTotal: paymentStatus.billTotalCents / 100,
        paidTotal: paymentStatus.paidTotalCents / 100,
        difference: paymentStatus.differenceCents / 100,
        status: paymentStatus.status,
      },
      people: settlementBalances.map((balance) => ({
        personId: balance.personId,
        name: balance.personName,
        totalOwed: balance.amountOwedCents / 100,
        paidAmount: balance.amountPaidCents / 100,
        netBalance: balance.netBalanceCents / 100,
      })),
      settlements: settlementTransfers.map((transfer) => ({
        fromName: transfer.fromPersonName,
        toName: transfer.toPersonName,
        amount: transfer.amountCents / 100,
      })),
    };
  }, [bill, paymentStatus, settlementBalances, settlementTransfers]);

  function toggleExpanded(personId: string) {
    setExpandedPersonIds((current) => {
      const next = new Set(current);

      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }

      return next;
    });
  }

  function handleChangePayment(personId: string, amountCents: number) {
    setSaveMessage("");

    setBill((currentBill) => {
      if (!currentBill) return currentBill;

      return {
        ...currentBill,
        payments: upsertPaymentForPerson({
          payments: currentBill.payments,
          personId,
          amountCents,
          createId: createPaymentId,
        }),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function handleSaveReview() {
    if (!bill) return;

    const savedBill = await saveBill(bill, bill.status);
    setBill(savedBill);
    setSaveMessage("Review saved.");
  }

  async function handleMarkSettled() {
    if (!bill) return;

    const savedBill = await updateBillStatus(bill.id, "settled");

    if (!savedBill) {
      setSaveMessage("");
      setLoadError("Could not mark this bill as settled.");
      return;
    }

    setBill(savedBill);
    setSaveMessage("Marked as settled.");
  }

  if (isLoadingBill) {
    return (
      <section className="page review-page">
        <div className="panel">
          <p>Loading review...</p>
        </div>
      </section>
    );
  }

  if (!bill || !review || !paymentStatus || !shareSummaryInput) {
    const unavailableMessage =
      loadError || reviewError || "Could not calculate this review.";

    return (
      <section className="page review-page">
        <div className="panel review-error-panel">
          <p className="eyebrow">Review blocked</p>
          <h1>Review not available</h1>
          <p className="form-error">{unavailableMessage}</p>
          <p className="muted-text">
            Go back to the workspace, fix the highlighted split issue, then
            open Review again.
          </p>

          <div className="button-row">
            {bill ? (
              <Link className="button button-primary" to={`/bills/${bill.id}/workspace`}>
                Back to workspace
              </Link>
            ) : null}

            <Link className="button" to="/history">
              Back to history
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page review-page">
      <PageHeader
        eyebrow={`Review / ${bill.title || "Untitled bill"}`}
        title="Review every person’s total before settlement."
        description="Every person total is broken into items, extras, discounts, paid amount, and settlement balance."
        action={
          <div className="workspace-actions">
            <Link className="button" to={`/bills/${bill.id}/workspace`}>
              Back to workspace
            </Link>

            <button type="button" onClick={() => void handleSaveReview()}>
              Save review
            </button>

            <button type="button" onClick={() => void handleMarkSettled()}>
              Mark settled
            </button>
          </div>
        }
      />

      {saveMessage ? <p className="success-message">{saveMessage}</p> : null}
      {loadError ? <p className="form-error">{loadError}</p> : null}

      <div className="review-grid">
        <section className="panel review-main-panel">
          <div className="section-heading-row">
            <div>
              <h2>Person totals</h2>
              <p className="muted-text">
                Totals show what each person owes. Paid amounts and balances
                update from the settlement panel.
              </p>
            </div>
          </div>

          <div className="review-table">
            <div className="review-table-header">
              <span>Person</span>
              <span>Items</span>
              <span>Extras</span>
              <span>Discounts</span>
              <span>Total</span>
              <span>Paid</span>
              <span>Balance</span>
              <span></span>
            </div>

            {review.people.map((person) => {
              const isExpanded = expandedPersonIds.has(person.personId);
              const settlementBalance = settlementBalanceByPersonId.get(
                person.personId,
              );
              const amountPaidCents = settlementBalance?.amountPaidCents ?? 0;
              const netBalanceCents =
                settlementBalance?.netBalanceCents ?? -person.grossTotalCents;

              return (
                <div className="review-person-block" key={person.personId}>
                  <button
                    className="review-table-row"
                    type="button"
                    onClick={() => toggleExpanded(person.personId)}
                  >
                    <span className="person-name-cell">
                      <span
                        className="person-dot"
                        style={{ backgroundColor: person.color ?? "#d7dde8" }}
                      />
                      <span>
                        {person.emoji ? `${person.emoji} ` : ""}
                        {person.personName}
                      </span>
                    </span>

                    <strong>
                      {formatMoneyFromCents(
                        person.itemSubtotalCents,
                        review.currency,
                      )}
                    </strong>

                    <strong>
                      {formatMoneyFromCents(
                        person.extrasTotalCents,
                        review.currency,
                      )}
                    </strong>

                    <strong className="negative-money">
                      {formatMoneyFromCents(
                        person.discountTotalCents,
                        review.currency,
                      )}
                    </strong>

                    <strong>
                      {formatMoneyFromCents(
                        person.grossTotalCents,
                        review.currency,
                      )}
                    </strong>

                    <strong>
                      {formatMoneyFromCents(amountPaidCents, review.currency)}
                    </strong>

                    <strong
                      className={
                        netBalanceCents > 0
                          ? "positive-status"
                          : netBalanceCents < 0
                            ? "warning-status"
                            : "settled-status"
                      }
                    >
                      {formatSettlementBalanceLabel(
                        netBalanceCents,
                        review.currency,
                      )}
                    </strong>

                    <span className="expand-indicator">
                      {isExpanded ? "Hide" : "Details"}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="review-breakdown">
                      {person.lines.length === 0 ? (
                        <p className="placeholder-text">
                          No assigned items or extras for this person.
                        </p>
                      ) : (
                        person.lines.map((line) => (
                          <div className="breakdown-line" key={line.id}>
                            <div>
                              <strong>{line.label}</strong>
                              <span>{line.note ?? line.kind}</span>
                            </div>

                            <strong
                              className={
                                line.amountCents < 0 ? "negative-money" : ""
                              }
                            >
                              {formatMoneyFromCents(
                                line.amountCents,
                                review.currency,
                              )}
                            </strong>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <ShareSummaryPanel input={shareSummaryInput} />
        </section>

        <aside className="panel review-summary-panel">
          <h2>Bill summary</h2>

          <div className="summary-stack">
            <SummaryRow
              label="Item subtotal"
              value={formatMoneyFromCents(
                review.billSubtotalCents,
                review.currency,
              )}
            />
            <SummaryRow
              label="Extras"
              value={formatMoneyFromCents(
                review.extrasTotalCents,
                review.currency,
              )}
            />
            <SummaryRow
              label="Discounts"
              value={formatMoneyFromCents(
                review.discountTotalCents,
                review.currency,
              )}
              negative
            />
            <SummaryRow
              label="Rounding"
              value={formatMoneyFromCents(
                review.roundingTotalCents,
                review.currency,
              )}
            />
            <SummaryRow
              label="Grand total"
              value={formatMoneyFromCents(
                review.grandTotalCents,
                review.currency,
              )}
              strong
            />
            <SummaryRow
              label="Paid total"
              value={formatMoneyFromCents(
                paymentStatus.paidTotalCents,
                review.currency,
              )}
            />
            <SummaryRow
              label={
                paymentStatus.status === "overpaid" ? "Overpaid" : "Remaining"
              }
              value={formatMoneyFromCents(
                paymentStatus.differenceCents,
                review.currency,
              )}
              strong
            />
          </div>

          {review.roundingTotalCents !== 0 ? (
            <p className="warning-box">
              A rounding adjustment was added so person totals match the bill
              total exactly.
            </p>
          ) : null}

          <PaymentsAndSettlementPanel
            currency={bill.currency}
            payments={bill.payments}
            balances={settlementBalances}
            transfers={settlementTransfers}
            paymentStatus={paymentStatus}
            onChangePayment={handleChangePayment}
          />
        </aside>
      </div>
    </section>
  );
}

function SummaryRow(props: {
  label: string;
  value: string;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`summary-row ${props.strong ? "summary-row-strong" : ""}`}>
      <span>{props.label}</span>
      <strong className={props.negative ? "negative-money" : ""}>
        {props.value}
      </strong>
    </div>
  );
}

function formatSettlementBalanceLabel(
  netBalanceCents: number,
  currency: Bill["currency"],
): string {
  if (netBalanceCents > 0) {
    return `Receives ${formatMoneyFromCents(netBalanceCents, currency)}`;
  }

  if (netBalanceCents < 0) {
    return `Owes ${formatMoneyFromCents(Math.abs(netBalanceCents), currency)}`;
  }

  return "Settled";
}

function createPaymentId(): string {
  return `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}