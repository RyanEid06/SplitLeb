import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteBill,
  duplicateBill,
  exportAllBills,
  importBillsFromBackup,
  listRecentBills,
  type BillSummary,
} from "../storage/billStorage";
import { formatMoneyFromCents } from "../utils/formatting";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: BillSummary["status"]) {
  if (status === "draft") return "Draft";
  if (status === "active") return "Active";
  return "Settled";
}

function paymentStatusLabel(status: BillSummary["paymentStatus"]) {
  if (status === "unpaid") return "Unpaid";
  if (status === "partial") return "Partially paid";
  if (status === "paid") return "Fully paid";
  return "Overpaid";
}

function settlementHint(bill: BillSummary) {
  if (bill.hasCalculationIssue) {
    return "Needs split fix";
  }

  if (bill.settlementTransferCount === 0) {
    return "No transfers";
  }

  return `${bill.settlementTransferCount} transfer${
    bill.settlementTransferCount === 1 ? "" : "s"
  } needed`;
}

function peopleLabel(count: number) {
  return `${count} ${count === 1 ? "person" : "people"}`;
}

function itemsLabel(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

function createBackupFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return `splitleb-backup-${date}.json`;
}

function importSuccessMessage(result: {
  importedBillCount: number;
  skippedBillCount: number;
  importedGroupCount: number;
  skippedGroupCount: number;
}) {
  return [
    `Imported ${result.importedBillCount} bill(s).`,
    `Skipped ${result.skippedBillCount} duplicate bill(s).`,
    `Imported ${result.importedGroupCount} group(s).`,
    `Skipped ${result.skippedGroupCount} duplicate group(s).`,
    "Export a fresh backup after confirming everything looks right.",
  ].join(" ");
}

export function HistoryPage() {
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [bills, setBills] = useState<BillSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadBills() {
    setIsLoading(true);
    setError("");

    try {
      const recentBills = await listRecentBills();
      setBills(recentBills);
    } catch {
      setError("Could not load saved bills.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBills();
  }, []);

  async function handleExportAllBills() {
    setError("");
    setSuccessMessage("");

    try {
      const backup = await exportAllBills();
      const backupJson = JSON.stringify(backup, null, 2);
      const backupBlob = new Blob([backupJson], {
        type: "application/json",
      });

      const backupUrl = URL.createObjectURL(backupBlob);
      const downloadLink = document.createElement("a");
      const backupFilename = createBackupFilename();

      downloadLink.href = backupUrl;
      downloadLink.download = backupFilename;
      downloadLink.click();

      URL.revokeObjectURL(backupUrl);

      setSuccessMessage(
        `Exported ${backup.bills.length} saved bill(s) and ${backup.groups.length} saved group(s) to ${backupFilename}. Keep this file somewhere safe before clearing browser or site data.`,
      );
    } catch {
      setError("Could not export SplitLeb backup.");
    }
  }

  function handleImportButtonClick() {
    setError("");
    setSuccessMessage("");
    importInputRef.current?.click();
  }

  async function handleImportFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const confirmed = window.confirm(
      "Import this backup? SplitLeb will merge it with the bills and groups already saved in this browser. Export a fresh backup first if you are not sure. Duplicate bills and identical duplicate groups will be skipped. Conflicting groups will stop the import instead of being merged.",
    );

    if (!confirmed) {
      event.target.value = "";
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      const fileText = await file.text();
      const parsedBackup = JSON.parse(fileText) as unknown;
      const result = await importBillsFromBackup(parsedBackup);

      await loadBills();

      setSuccessMessage(importSuccessMessage(result));
    } catch (importError) {
      const message =
        importError instanceof Error
          ? importError.message
          : "Could not import backup.";

      setError(message);
    } finally {
      event.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this bill? This cannot be undone.",
    );

    if (!confirmed) return;

    await deleteBill(id);
    await loadBills();
  }

  async function handleDuplicate(id: string) {
    const duplicated = await duplicateBill(id);

    if (!duplicated) {
      setError("Could not duplicate bill.");
      return;
    }

    navigate(`/bills/${duplicated.id}/workspace`);
  }

  return (
    <main className="page-shell history-page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Local history</p>
          <h1>Saved bills</h1>
          <p className="muted">
            Bills and groups are saved only in this browser on this laptop.
          </p>
        </div>

        <div className="table-actions history-header-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => void handleExportAllBills()}
          >
            Export backup
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={handleImportButtonClick}
          >
            Import backup
          </button>

          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(event) => void handleImportFileChange(event)}
            hidden
          />

          <button
            type="button"
            className="button button-primary"
            onClick={() => navigate("/bills/new")}
          >
            New bill
          </button>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {successMessage ? (
        <p className="success-message">{successMessage}</p>
      ) : null}

      <section
        className="card history-safety-card"
        aria-labelledby="history-backup-safety-title"
      >
        <div className="history-safety-heading">
          <p className="eyebrow">Backup safety</p>
          <h2 id="history-backup-safety-title">Protect your local data</h2>
          <p className="muted">
            SplitLeb is local-first. That is good for privacy, but it means your
            backup file is your safety net.
          </p>
        </div>

        <div className="history-safety-grid">
          <div className="history-safety-item">
            <strong>Browser data can erase SplitLeb</strong>
            <p>
              Clearing browser or site data can delete locally saved bills and
              groups. Export a backup before cleaning, resetting, or switching
              browsers.
            </p>
          </div>

          <div className="history-safety-item">
            <strong>Offline support is not a backup</strong>
            <p>
              The app shell can open offline, but that cache does not protect
              your saved bills or groups from browser data deletion.
            </p>
          </div>

          <div className="history-safety-item">
            <strong>Use backup files to move data</strong>
            <p>
              Data is tied to where SplitLeb is opened from. If data looks
              missing after changing browser, app shortcut, or local address,
              import your latest backup.
            </p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="card">
          <p>Loading saved bills...</p>
        </section>
      ) : bills.length === 0 ? (
        <section className="empty-state history-empty-state">
          <h2>No saved bills yet</h2>
          <p>
            Create a bill, save it, then it will appear here. Until then, this
            page is supposed to be empty.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => navigate("/bills/new")}
          >
            Create your first bill
          </button>
        </section>
      ) : (
        <section className="card history-card">
          <div className="table-wrap history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Payment</th>
                  <th>Details</th>
                  <th>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td>
                      <div className="history-bill-cell">
                        <strong className="history-bill-title">
                          {bill.title}
                        </strong>
                        <span className={`status-pill status-${bill.status}`}>
                          {statusLabel(bill.status)}
                        </span>
                      </div>
                    </td>

                    <td className="history-money">
                      {bill.hasCalculationIssue
                        ? "—"
                        : formatMoneyFromCents(
                            bill.billTotalCents,
                            bill.currency,
                          )}
                    </td>

                    <td className="history-money">
                      {bill.hasCalculationIssue
                        ? "—"
                        : formatMoneyFromCents(
                            bill.paidTotalCents,
                            bill.currency,
                          )}
                    </td>

                    <td>
                      <span
                        className={`payment-pill payment-${bill.paymentStatus}`}
                      >
                        {paymentStatusLabel(bill.paymentStatus)}
                      </span>
                    </td>

                    <td>
                      <div className="history-detail-stack">
                        <span>{bill.currency}</span>
                        <span>
                          {peopleLabel(bill.peopleCount)} ·{" "}
                          {itemsLabel(bill.itemsCount)}
                        </span>
                        <span
                          className={
                            bill.hasCalculationIssue
                              ? "history-warning-text"
                              : undefined
                          }
                        >
                          {settlementHint(bill)}
                        </span>
                      </div>
                    </td>

                    <td>{formatDate(bill.updatedAt)}</td>

                    <td>
                      <div className="table-actions history-row-actions">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/bills/${bill.id}/workspace`)
                          }
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDuplicate(bill.id)}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => void handleDelete(bill.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}