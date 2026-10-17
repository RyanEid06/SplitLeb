import { MoneyInput } from "../../components/ui/MoneyInput";
import { DecimalInput } from "../../components/ui/DecimalInput";
import { useRef, useState, type FormEvent } from "react";
import type { BillItem, CurrencyCode, Person } from "../../domain/bill/types";
import {
  createEqualSplit,
  getItemSubtotalCents,
  validateItem,
} from "../../domain/bill/itemSplits";
import {
  getMoneyInputLabel,
  parseMoneyInputToCents,
} from "../../domain/bill/money";
import { formatMoneyFromCents } from "../../utils/formatting";
import { createId } from "../../utils/ids";
import { AssignmentPanel } from "./AssignmentPanel";
import { Dialog } from "../../components/ui/Dialog";

type Props = {
  people: Person[];
  items: BillItem[];
  currency: CurrencyCode;
  onItemsChange: (items: BillItem[]) => void;
};
export function ItemsPanel({ people, items, currency, onItemsChange }: Props) {
  const [draft, setDraft] = useState({ name: "", quantity: "1", price: "" });
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const selected = items.find((item) => item.id === selectedId);
  function update(id: string, patch: Partial<BillItem>) {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
  function add(event: FormEvent) {
    event.preventDefault();
    const quantity = Number(draft.quantity);
    const price = parseMoneyInputToCents(draft.price, currency);
    if (!draft.name.trim()) {
      setError("Give this item a name.");
      nameRef.current?.focus();
      return;
    }
    if (!people.length) {
      setError("Add people before adding items.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (
      !draft.price.trim() ||
      !Number.isFinite(Number(draft.price.replaceAll(",", ""))) ||
      Number(draft.price) < 0
    ) {
      setError("Enter a valid price, including zero for a free item.");
      return;
    }
    onItemsChange([
      ...items,
      {
        id: createId("item"),
        name: draft.name.trim(),
        quantity,
        unitPriceCents: price,
        split: createEqualSplit(people.map((person) => person.id)),
      },
    ]);
    setDraft({ name: "", quantity: "1", price: "" });
    setError("");
    nameRef.current?.focus();
  }
  return (
    <section className="items-panel">
      <div className="section-heading">
        <div>
          <h2>Receipt items</h2>
          <p>
            Shared equally to start. Choose Split to change who shares an item.
          </p>
        </div>
        <span className="count-pill">{items.length}</span>
      </div>
      {currency === "LBP" ? (
        <p className="field-help">Prices in thousands: 630 = LBP 630,000.</p>
      ) : null}
      <form className="quick-item-form" onSubmit={add}>
        <label>
          Item
          <input
            ref={nameRef}
            value={draft.name}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
            placeholder="Hummus"
          />
        </label>
        <label>
          Qty
          <input
            inputMode="decimal"
            value={draft.quantity}
            onChange={(event) =>
              setDraft({ ...draft, quantity: event.target.value })
            }
          />
        </label>
        <label>
          {getMoneyInputLabel("Unit price", currency)}
          <input
            inputMode="decimal"
            value={draft.price}
            onChange={(event) =>
              setDraft({ ...draft, price: event.target.value })
            }
            placeholder={currency === "LBP" ? "630" : "8.50"}
          />
        </label>
        <button type="submit" className="button-primary">
          Add item
        </button>
      </form>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <div className="empty-state">
          <h3>What's on the receipt?</h3>
          <p>Add the first item above.</p>
        </div>
      ) : (
        <div className="items-table-card">
          <table className="items-table">
            <caption className="sr-only">Receipt items and allocations</caption>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>{getMoneyInputLabel("Unit price", currency)}</th>
                <th>Total</th>
                <th>Sharing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td data-label="Item">
                    <input
                      aria-label={"Item " + (index + 1) + " name"}
                      value={item.name}
                      onChange={(event) =>
                        update(item.id, { name: event.target.value })
                      }
                    />
                    {validateItem(item, people).map((issue) => (
                      <p className="row-error" key={issue}>
                        {issue}
                      </p>
                    ))}
                  </td>
                  <td data-label="Qty">
                    <DecimalInput
                      ariaLabel={"Quantity for " + item.name}
                      displayValue={String(item.quantity)}
                      onValueChange={(value) =>
                        update(item.id, { quantity: Number(value) || 0 })
                      }
                    />
                  </td>
                  <td data-label={getMoneyInputLabel("Unit price", currency)}>
                    <MoneyInput
                      amountCents={item.unitPriceCents}
                      currency={currency}
                      ariaLabel={getMoneyInputLabel(
                        "Unit price for " + item.name,
                        currency,
                      )}
                      onChange={(amount) =>
                        update(item.id, { unitPriceCents: amount })
                      }
                    />
                  </td>
                  <td data-label="Total" className="money">
                    {formatMoneyFromCents(getItemSubtotalCents(item), currency)}
                  </td>
                  <td data-label="Sharing">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setSelectedId(item.id)}
                      aria-label={"Split " + item.name}
                    >
                      Split ·{" "}
                      {item.split.method === "equal" &&
                      item.split.personIds.length === people.length
                        ? "Everyone"
                        : item.split.method === "shares"
                          ? "Shares"
                          : item.split.method === "custom"
                            ? "Custom"
                            : "Selected"}
                    </button>
                  </td>
                  <td data-label="Actions">
                    <div className="table-actions">
                      <button
                        type="button"
                        aria-label={"Duplicate " + item.name}
                        onClick={() => {
                          const copy = {
                            ...structuredClone(item),
                            id: createId("item"),
                          };
                          onItemsChange([
                            ...items.slice(0, index + 1),
                            copy,
                            ...items.slice(index + 1),
                          ]);
                        }}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        aria-label={"Delete " + item.name}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Delete " + item.name + " from this bill?",
                            )
                          )
                            onItemsChange(
                              items.filter((row) => row.id !== item.id),
                            );
                        }}
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
      )}
      {selected ? (
        <Dialog
          title={"Split " + selected.name}
          onClose={() => setSelectedId(null)}
        >
          <AssignmentPanel
            item={selected}
            people={people}
            currency={currency}
            onChange={(next) => update(next.id, next)}
          />
        </Dialog>
      ) : null}
    </section>
  );
}
