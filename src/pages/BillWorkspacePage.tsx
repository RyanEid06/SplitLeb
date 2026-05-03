import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  calculateItemAllocations,
  validateItem,
} from "../domain/bill/itemSplits";
import type { Bill, BillExtra, BillItem } from "../domain/bill/types";
import { ExtrasPanel } from "../features/extras/ExtrasPanel";
import { ItemsPanel } from "../features/items/ItemsPanel";
import {
  openBill,
  saveBill,
  updateBillStatus,
} from "../storage/billStorage";
import type { StoredBill } from "../storage/db";

export function BillWorkspacePage() {
  const navigate = useNavigate();
  const { billId } = useParams();

  const [bill, setBill] = useState<StoredBill | null>(null);
  const [isLoadingBill, setIsLoadingBill] = useState(Boolean(billId));
  const [loadError, setLoadError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!billId) {
      setIsLoadingBill(false);
      return;
    }

    const currentBillId = billId;

    async function loadBill() {
      setIsLoadingBill(true);
      setLoadError("");

      const savedBill = await openBill(currentBillId);

      if (!savedBill) {
        setLoadError("Saved bill not found.");
        setBill(null);
        setIsLoadingBill(false);
        return;
      }

      setBill(savedBill);
      setIsLoadingBill(false);
    }

    void loadBill();
  }, [billId]);

  async function handleSaveDraft() {
    if (!bill) return;

    const savedBill = await saveBill(bill, "draft");
    setBill(savedBill);
    setSaveMessage("Saved as draft.");
  }

  async function handleSaveActive() {
    if (!bill) return;

    const nextStatus = bill.status === "draft" ? "active" : bill.status;

    const savedBill = await saveBill(bill, nextStatus);
    setBill(savedBill);
    setSaveMessage("Saved.");
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

  async function handleGoToReview() {
    if (!bill) return;

    const invalidItems = bill.items
      .map((item) => ({
        item,
        errors: validateItem(item, bill.people),
      }))
      .filter((result) => result.errors.length > 0);

    if (invalidItems.length > 0) {
      const firstInvalidItem = invalidItems[0];

      setSaveMessage("");
      setLoadError(
        `Fix item "${firstInvalidItem.item.name}" before review: ${firstInvalidItem.errors[0]}`,
      );
      return;
    }

    const savedBill = await saveBill(bill, bill.status);
    setBill(savedBill);
    navigate(`/bills/${savedBill.id}/review`);
  }

  function updateBillNote(note: string) {
    setSaveMessage("");
    setLoadError("");

    setBill((currentBill) => {
      if (!currentBill) {
        return currentBill;
      }

      return {
        ...currentBill,
        note: note.trim().length > 0 ? note : undefined,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function updateItems(items: BillItem[]) {
    setSaveMessage("");
    setLoadError("");

    setBill((currentBill) => {
      if (!currentBill) {
        return currentBill;
      }

      return {
        ...currentBill,
        items,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function updateExtras(extras: BillExtra[]) {
    setSaveMessage("");
    setLoadError("");

    setBill((currentBill) => {
      if (!currentBill) {
        return currentBill;
      }

      return {
        ...currentBill,
        extras,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  if (isLoadingBill) {
    return (
      <main className="bill-workspace-page">
        <section className="card">
          <p>Loading bill...</p>
        </section>
      </main>
    );
  }

  if (!bill) {
    return (
      <main className="bill-workspace-page">
        <section className="card">
          <h1>Bill workspace</h1>
          <p>
            No saved bill was found for <strong>{billId}</strong>.
          </p>
          {loadError ? <p className="form-error">{loadError}</p> : null}
          <Link className="button button-primary" to="/bills/new">
            Create a new bill
          </Link>
        </section>
      </main>
    );
  }

  const itemSubtotalByPersonId = calculateItemSubtotalByPersonId(bill);

  return (
    <main className="bill-workspace-page">
      <header className="workspace-header">
        <div>
          <p>{bill.status === "settled" ? "Settled bill" : "Saved bill"}</p>
          <h1>{bill.title}</h1>
          <p>
            Currency: <strong>{bill.currency}</strong> · People:{" "}
            <strong>{bill.people.length}</strong> · Items:{" "}
            <strong>{bill.items.length}</strong> · Extras:{" "}
            <strong>{bill.extras.length}</strong> · Status:{" "}
            <strong>{bill.status}</strong>
          </p>
        </div>

        <div className="workspace-actions">
          <button type="button" onClick={() => void handleSaveDraft()}>
            Save draft
          </button>

          <button type="button" onClick={() => void handleSaveActive()}>
            Save bill
          </button>

          <button type="button" onClick={() => void handleMarkSettled()}>
            Mark settled
          </button>

          <button type="button" onClick={() => void handleGoToReview()}>
            Review
          </button>

          <button type="button" onClick={() => navigate("/history")}>
            History
          </button>

          <Link className="button" to="/bills/new">
            Create another bill
          </Link>
        </div>
      </header>

      {saveMessage ? <p className="success-message">{saveMessage}</p> : null}
      {loadError ? <p className="form-error">{loadError}</p> : null}

      <section className="bill-note-card">
        <label>
          Bill note
          <textarea
            value={bill.note ?? ""}
            onChange={(event) => updateBillNote(event.target.value)}
            placeholder="Optional reminder, context, or payment note."
            rows={3}
          />
        </label>
      </section>

      <div className="workspace-grid">
        <section className="people-summary-card">
          <h2>People</h2>

          <ul>
            {bill.people.map((person) => (
              <li key={person.id}>
                {person.emoji ?? "🙂"} {person.name}
              </li>
            ))}
          </ul>
        </section>

        <ItemsPanel
          people={bill.people}
          items={bill.items}
          currency={bill.currency}
          onItemsChange={updateItems}
        />

        <ExtrasPanel
          people={bill.people}
          extras={bill.extras}
          itemSubtotalByPersonId={itemSubtotalByPersonId}
          currency={bill.currency}
          onExtrasChange={updateExtras}
        />
      </div>
    </main>
  );
}

function calculateItemSubtotalByPersonId(bill: Bill): Record<string, number> {
  const subtotalByPersonId: Record<string, number> = Object.fromEntries(
    bill.people.map((person) => [person.id, 0]),
  );

  for (const item of bill.items) {
    const allocations = calculateItemAllocations(item, bill.people);

    for (const allocation of allocations) {
      subtotalByPersonId[allocation.personId] =
        (subtotalByPersonId[allocation.personId] ?? 0) + allocation.amountCents;
    }
  }

  return subtotalByPersonId;
}