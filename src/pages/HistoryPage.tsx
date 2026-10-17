import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteBill,
  duplicateBill,
  listRecentBills,
  type BillSummary,
} from "../storage/billStorage";
import { formatMoneyFromCents } from "../utils/formatting";
import { PageHeader } from "../components/layout/PageHeader";
import { BackupPanel } from "../features/backup/BackupPanel";
export function HistoryPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<BillSummary[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    listRecentBills(Number.MAX_SAFE_INTEGER)
      .then((records) => {
        if (active) setBills(records);
      })
      .catch(() => {
        if (active) setError("Could not load your bills. Try reloading.");
      });
    return () => {
      active = false;
    };
  }, []);
  async function reload() {
    setBills(await listRecentBills(Number.MAX_SAFE_INTEGER));
  }
  async function remove(bill: BillSummary) {
    if (
      busy ||
      !window.confirm("Delete " + bill.title + "? This cannot be undone.")
    )
      return;
    setBusy(true);
    setError("");
    try {
      await deleteBill(bill.id);
      await reload();
    } catch {
      setError("Could not delete this bill. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function duplicate(id: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const copy = await duplicateBill(id);
      if (!copy) throw new Error();
      navigate("/bills/" + copy.id + "/workspace");
    } catch {
      setError("Could not duplicate this bill. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page history-page">
      <PageHeader
        title="Bill history"
        action={
          <Link className="button button-primary" to="/bills/new">
            New bill
          </Link>
        }
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {bills === null ? (
        !error && <p role="status">Loading your bills…</p>
      ) : bills.length ? (
        <div className="history-list">
          {bills.map((bill) => (
            <article className="history-bill" key={bill.id}>
              <Link
                className="history-bill-link"
                to={"/bills/" + bill.id + "/workspace"}
              >
                <div>
                  <strong className="history-bill-title">{bill.title}</strong>
                  <span className="history-bill-meta">
                    {bill.peopleCount} people · {bill.itemsCount} items ·{" "}
                    {new Date(bill.updatedAt).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </span>
                </div>
                <div className="history-bill-amount">
                  <strong className="money">
                    {bill.hasCalculationIssue
                      ? "Check split"
                      : formatMoneyFromCents(
                          bill.billTotalCents,
                          bill.currency,
                        )}
                  </strong>
                  <span className={"status-pill status-" + bill.status}>
                    {bill.status === "draft"
                      ? "Draft"
                      : bill.status === "settled"
                        ? "Settled"
                        : "Active"}
                  </span>
                </div>
              </Link>
              <div className="history-bill-footer">
                <span className="muted-text">
                  {bill.hasCalculationIssue
                    ? "Fix the split to see balances."
                    : "Paid " +
                      formatMoneyFromCents(bill.paidTotalCents, bill.currency) +
                      " · " +
                      (bill.paymentStatus === "paid"
                        ? "Fully paid"
                        : bill.paymentStatus === "partial"
                          ? "Partly paid"
                          : bill.paymentStatus === "overpaid"
                            ? "Overpaid"
                            : "Unpaid") +
                      " · " +
                      bill.settlementTransferCount +
                      " transfers"}
                </span>
                <details className="history-actions">
                  <summary aria-label={"Actions for " + bill.title}>
                    Actions
                  </summary>
                  <div className="button-row">
                    <button
                      disabled={busy}
                      onClick={() => void duplicate(bill.id)}
                    >
                      Duplicate
                    </button>
                    <button
                      disabled={busy}
                      className="danger-button"
                      onClick={() => void remove(bill)}
                    >
                      Delete
                    </button>
                  </div>
                </details>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No bills yet.</h2>
          <p>Start a bill or import a backup to see your history here.</p>
          <Link className="button" to="/bills/new">
            Create your first bill
          </Link>
        </div>
      )}
      <BackupPanel onImported={reload} />
    </section>
  );
}
