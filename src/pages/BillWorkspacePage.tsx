import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  calculateItemAllocations,
  validateItem,
} from "../domain/bill/itemSplits";
import { validateExtra } from "../domain/bill/extras";
import { ItemsPanel } from "../features/items/ItemsPanel";
import { ExtrasPanel } from "../features/extras/ExtrasPanel";
import { useBillEditor } from "../features/bills/useBillEditor";
import { Avatar } from "../components/ui/Avatar";
import { Icon } from "../components/ui/Icon";

export function BillWorkspacePage() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const { bill, loading, error, dirty, saving, change, save } =
    useBillEditor(billId);
  const [validationError, setValidationError] = useState("");
  const subtotals = useMemo(() => {
    const totals: Record<string, number> = Object.fromEntries(
      (bill?.people ?? []).map((person) => [person.id, 0]),
    );
    for (const item of bill?.items ?? [])
      for (const allocation of calculateItemAllocations(item, bill!.people))
        totals[allocation.personId] =
          (totals[allocation.personId] ?? 0) + allocation.amountCents;
    return totals;
  }, [bill]);
  async function review() {
    if (!bill) return;
    const issue =
      bill.items.flatMap((item) =>
        validateItem(item, bill.people).map(
          (message) => item.name + ": " + message,
        ),
      )[0] ||
      bill.extras.flatMap((extra) =>
        validateExtra(extra, bill.people).map(
          (message) => extra.name + ": " + message,
        ),
      )[0];
    if (issue) {
      setValidationError(issue);
      return;
    }
    setValidationError("");
    const saved = await save();
    if (saved) navigate("/bills/" + saved.id + "/review");
  }
  if (loading) return <p role="status">Opening your bill…</p>;
  if (!bill)
    return (
      <section className="page">
        <h1>Bill unavailable</h1>
        <p role="alert" className="form-error">
          {error}
        </p>
        <Link to="/history">Back to history</Link>
      </section>
    );
  return (
    <section className="bill-workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">
            {bill.status === "settled" ? "Settled" : "Split the bill"}
          </p>
          <h1>{bill.title}</h1>
          <p>
            {bill.currency} · {bill.people.length} people
          </p>
        </div>
        <div className="workspace-actions">
          <span className="save-status" role="status">
            {saving
              ? "Saving…"
              : dirty
                ? "Unsaved changes"
                : "Saved on this device"}
          </span>
          <button
            disabled={saving}
            onClick={() =>
              void save(bill.status === "draft" ? "active" : bill.status)
            }
          >
            Save bill
          </button>
          <button
            className="button-primary desktop-review-action"
            disabled={saving}
            onClick={() => void review()}
          >
            Review bill <Icon name="arrow" />
          </button>
        </div>
      </header>
      {error || validationError ? (
        <p className="form-error" role="alert">
          {error || validationError}
        </p>
      ) : null}
      <div className="workspace-people" aria-label="People sharing this bill">
        {bill.people.map((person) => (
          <span className="person-chip" key={person.id}>
            <Avatar
              name={person.name}
              emoji={person.emoji}
              color={person.color}
            />
            {person.name}
          </span>
        ))}
      </div>
      <fieldset disabled={saving} className="workspace-grid">
        <ItemsPanel
          people={bill.people}
          items={bill.items}
          currency={bill.currency}
          onItemsChange={(items) => {
            setValidationError("");
            change({ items });
          }}
        />
        <details
          className="workspace-disclosure"
          open={bill.extras.length > 0 || undefined}
        >
          <summary>
            Extras & discounts
            {bill.extras.length ? " (" + bill.extras.length + ")" : ""}
          </summary>
          <ExtrasPanel
            people={bill.people}
            extras={bill.extras}
            currency={bill.currency}
            itemSubtotalByPersonId={subtotals}
            onExtrasChange={(extras) => {
              setValidationError("");
              change({ extras });
            }}
          />
        </details>
        <details className="workspace-disclosure">
          <summary>Note & bill options</summary>
          <div className="field">
            <label htmlFor="bill-note">Bill note</label>
            <textarea
              id="bill-note"
              value={bill.note ?? ""}
              rows={2}
              placeholder="Add a reminder"
              onChange={(event) =>
                change({ note: event.target.value || undefined })
              }
            />
          </div>
          <div className="button-row">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save("draft")}
            >
              Save as draft
            </button>
            {bill.status === "settled" ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void save("active")}
              >
                Reopen bill
              </button>
            ) : null}
            <Link className="button" to="/history">
              History
            </Link>
          </div>
        </details>
      </fieldset>
      <div className="mobile-review-action">
        <span className="save-status">
          {dirty ? "Unsaved changes" : "Saved"}
        </span>
        <button
          type="button"
          className="button-primary"
          disabled={saving}
          onClick={() => void review()}
        >
          Review bill <Icon name="arrow" />
        </button>
      </div>
    </section>
  );
}
