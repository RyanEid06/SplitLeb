import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { calculateBillReview } from "../domain/bill/review";
import {
  calculatePaymentTotalStatus,
  calculatePersonSettlementBalances,
  calculateSettlementTransfers,
  upsertPaymentForPerson,
} from "../domain/bill/settlements";
import { useBillEditor } from "../features/bills/useBillEditor";
import { ReviewPeople } from "../features/bills/ReviewPeople";
import { PaymentsAndSettlementPanel } from "../features/settlement/PaymentsAndSettlementPanel";
import { ShareSummaryPanel } from "../features/share/ShareSummaryPanel";
import { formatMoneyFromCents } from "../utils/formatting";
import { createId } from "../utils/ids";

export function ReviewPage() {
  const { billId } = useParams();
  const { bill, loading, error, dirty, saving, change, save } =
    useBillEditor(billId);
  const result = useMemo(() => {
    if (!bill) return null;
    try {
      return { review: calculateBillReview(bill), error: "" };
    } catch (error) {
      return {
        review: null,
        error:
          error instanceof Error
            ? error.message
            : "Check this bill's split before reviewing.",
      };
    }
  }, [bill]);
  const review = result?.review;
  const balances = useMemo(
    () =>
      bill && review
        ? calculatePersonSettlementBalances({
            personTotals: review.people.map((person) => ({
              personId: person.personId,
              personName: person.personName,
              amountOwedCents: person.grossTotalCents,
            })),
            payments: bill.payments,
          })
        : [],
    [bill, review],
  );
  const transfers = useMemo(
    () => calculateSettlementTransfers(balances, { currency: bill?.currency }),
    [balances, bill?.currency],
  );
  if (loading) return <p role="status">Opening the review…</p>;
  if (!bill || !review)
    return (
      <section className="page">
        <h1>Review unavailable</h1>
        <p className="form-error" role="alert">
          {error || result?.error}
        </p>
        <Link
          className="button"
          to={bill ? "/bills/" + bill.id + "/workspace" : "/history"}
        >
          Back to {bill ? "bill" : "history"}
        </Link>
      </section>
    );
  const paymentStatus = calculatePaymentTotalStatus({
    billTotalCents: review.grandTotalCents,
    payments: bill.payments,
  });
  const shareInput = {
    billTitle: bill.title || "Shared bill",
    currency: bill.currency,
    billTotals: {
      grandTotal: review.grandTotalCents / 100,
      paidTotal: paymentStatus.paidTotalCents / 100,
      difference: paymentStatus.differenceCents / 100,
      status: paymentStatus.status,
    },
    people: balances.map((row) => ({
      personId: row.personId,
      name: row.personName,
      totalOwed: row.amountOwedCents / 100,
      paidAmount: row.amountPaidCents / 100,
      netBalance: row.netBalanceCents / 100,
    })),
    settlements: transfers.map((row) => ({
      fromName: row.fromPersonName,
      toName: row.toPersonName,
      amount: row.amountCents / 100,
    })),
  };
  return (
    <section className="page review-page">
      <PageHeader
        eyebrow={bill.title}
        title="Review & settle"
        action={
          <div className="workspace-actions">
            <Link className="button" to={"/bills/" + bill.id + "/workspace"}>
              Edit bill
            </Link>
            <button disabled={saving} onClick={() => void save()}>
              Save review
            </button>
            {bill.status !== "settled" ? (
              <button
                className="button-primary"
                disabled={saving}
                onClick={() => {
                  if (
                    window.confirm(
                      "Mark this bill settled? Payment amounts will stay as entered.",
                    )
                  )
                    void save("settled");
                }}
              >
                Mark settled
              </button>
            ) : (
              <span className="status-pill status-settled">Settled</span>
            )}
          </div>
        }
      />
      <p className="save-status" role="status">
        {saving
          ? "Saving…"
          : dirty
            ? "Unsaved payment changes"
            : "Saved on this device"}
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="review-total-strip">
        <div>
          <span>Bill total</span>
          <strong className="money">
            {formatMoneyFromCents(review.grandTotalCents, bill.currency)}
          </strong>
        </div>
        <details>
          <summary>How it adds up</summary>
          <dl className="summary-stack">
            {[
              ["Items", review.billSubtotalCents],
              ["Extras", review.extrasTotalCents],
              ["Discounts", review.discountTotalCents],
              ["Rounding", review.roundingTotalCents],
            ].map(([label, amount]) => (
              <div className="summary-row" key={label}>
                <dt>{label}</dt>
                <dd>{formatMoneyFromCents(Number(amount), bill.currency)}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
      <ReviewPeople review={review} balances={balances} />
      <fieldset disabled={saving}>
        <PaymentsAndSettlementPanel
          currency={bill.currency}
          payments={bill.payments}
          balances={balances}
          transfers={transfers}
          paymentStatus={paymentStatus}
          onChangePayment={(personId, amountCents) =>
            change({
              payments: upsertPaymentForPerson({
                payments: bill.payments,
                personId,
                amountCents,
                createId: () => createId("payment"),
              }),
            })
          }
        />
      </fieldset>
      <details className="workspace-disclosure">
        <summary>Share this split</summary>
        <ShareSummaryPanel input={shareInput} />
      </details>
    </section>
  );
}
