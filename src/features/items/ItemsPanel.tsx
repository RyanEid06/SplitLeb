import { useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, RefObject } from "react";
import type {
  BillItem,
  CurrencyCode,
  ItemCategory,
  ItemSplit,
  Person,
} from "../../domain/bill/types";
import {
  calculateItemAllocations,
  createCustomAmountSplit,
  createEqualSplit,
  createShareSplit,
  getAssignedPersonIds,
  getItemSubtotalCents,
  validateItem,
} from "../../domain/bill/itemSplits";
import {
  formatMoneyInputValue,
  getMoneyInputHelpText,
  getMoneyInputLabel,
  getMoneyInputPlaceholder,
  parseMoneyInputToCents,
} from "../../domain/bill/money";
import { formatMoneyFromCents } from "../../utils/formatting";

type ItemsPanelProps = {
  people: Person[];
  items: BillItem[];
  currency: CurrencyCode;
  onItemsChange: (items: BillItem[]) => void;
};

type DraftItem = {
  name: string;
  quantity: string;
  unitPrice: string;
};

const emptyDraft: DraftItem = {
  name: "",
  quantity: "1",
  unitPrice: "",
};

const itemCategoryLabels: Record<ItemCategory, string> = {
  food: "Food",
  drinks: "Drinks",
  delivery: "Delivery",
  dessert: "Dessert",
  other: "Other",
};

const itemCategoryOptions: { value: ItemCategory; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "drinks", label: "Drinks" },
  { value: "delivery", label: "Delivery" },
  { value: "dessert", label: "Dessert" },
  { value: "other", label: "Other" },
];

export function ItemsPanel({
  people,
  items,
  currency,
  onItemsChange,
}: ItemsPanelProps) {
  const [draft, setDraft] = useState<DraftItem>(emptyDraft);
  const [draftError, setDraftError] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const itemNameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const unitPriceInputRef = useRef<HTMLInputElement>(null);

  const selectedItem =
    items.find((item) => item.id === selectedItemId) ?? items[0] ?? null;

  const itemErrorsById = useMemo(() => {
    return new Map(items.map((item) => [item.id, validateItem(item, people)]));
  }, [items, people]);

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = draft.name.trim();
    const quantity = parseQuantityInput(draft.quantity);
    const unitPriceCents = parseMoneyInputToCents(draft.unitPrice, currency);

    if (people.length === 0) {
      setDraftError("Add people before adding items.");
      focusInput(itemNameInputRef);
      return;
    }

    if (!name) {
      setDraftError("Item name is required.");
      focusInput(itemNameInputRef);
      return;
    }

    if (quantity <= 0) {
      setDraftError("Quantity must be greater than 0.");
      focusInput(quantityInputRef);
      return;
    }

    if (unitPriceCents <= 0) {
      setDraftError("Unit price must be greater than 0.");
      focusInput(unitPriceInputRef);
      return;
    }

    const newItem: BillItem = {
      id: createId(),
      name,
      quantity,
      unitPriceCents,
      split: createEqualSplit(people.map((person) => person.id)),
    };

    onItemsChange([...items, newItem]);
    setSelectedItemId(newItem.id);
    setDraft(emptyDraft);
    setDraftError("");

    setTimeout(() => {
      itemNameInputRef.current?.focus();
    }, 0);
  }

  function updateItem(itemId: string, patch: Partial<BillItem>) {
    onItemsChange(
      items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  }

  function duplicateItem(itemId: string) {
    const sourceIndex = items.findIndex((item) => item.id === itemId);

    if (sourceIndex === -1) {
      return;
    }

    const sourceItem = items[sourceIndex];

    const duplicatedItem: BillItem = {
      ...sourceItem,
      id: createId(),
      split: cloneItemSplit(sourceItem.split),
    };

    const nextItems = [
      ...items.slice(0, sourceIndex + 1),
      duplicatedItem,
      ...items.slice(sourceIndex + 1),
    ];

    onItemsChange(nextItems);
    setSelectedItemId(duplicatedItem.id);
    setDraftError("");
  }

  function deleteItem(itemId: string) {
    const nextItems = items.filter((item) => item.id !== itemId);
    onItemsChange(nextItems);

    if (selectedItemId === itemId) {
      setSelectedItemId(nextItems[0]?.id ?? null);
    }
  }

  return (
    <section className="items-panel">
      <div className="items-entry-area">
        <div className="section-heading">
          <div>
            <h2>Items</h2>
            <p>
              Add receipt lines, then assign each item to the right people.
              {currency === "LBP" ? (
                <>
                  {" "}
                  <strong>LBP inputs use thousands. Type 630 for LBP 630,000.</strong>
                </>
              ) : null}
            </p>
          </div>
        </div>

        {people.length === 0 ? (
          <div className="empty-state">
            Add people before adding items. Items without people are useless data.
          </div>
        ) : null}

        <form className="quick-item-form" onSubmit={addItem}>
          <label>
            Item
            <input
              ref={itemNameInputRef}
              value={draft.name}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }));
                setDraftError("");
              }}
              onKeyDown={(event) =>
                handleEnterToFocusNext(event, quantityInputRef)
              }
              placeholder="Chicken sandwich"
              autoComplete="off"
              autoFocus
            />
          </label>

          <label>
            Qty
            <input
              ref={quantityInputRef}
              value={draft.quantity}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  quantity: event.target.value,
                }));
                setDraftError("");
              }}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) =>
                handleEnterToFocusNext(event, unitPriceInputRef)
              }
              inputMode="decimal"
            />
          </label>

          <label>
            {getMoneyInputLabel("Unit price", currency)}
            <input
              ref={unitPriceInputRef}
              value={draft.unitPrice}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  unitPrice: event.target.value,
                }));
                setDraftError("");
              }}
              onFocus={(event) => event.target.select()}
              inputMode="decimal"
              placeholder={getMoneyInputPlaceholder(currency)}
            />
          </label>

          <button type="submit" disabled={people.length === 0}>
            Add item
          </button>
        </form>

        {draftError ? <div className="validation-box">{draftError}</div> : null}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          No items yet. Start with one receipt line, not the whole bill total.
        </div>
      ) : (
        <div className="items-workspace">
          <div className="items-table-card">
            <table className="items-table">
              <thead>
                <tr>
                  <th className="item-number-heading">#</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>{getMoneyInputLabel("Unit", currency)}</th>
                  <th>Total</th>
                  <th>Assigned to</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {items.map((item, itemIndex) => {
                  const errors = itemErrorsById.get(item.id) ?? [];
                  const visibleRowError = getVisibleRowError(errors);
                  const isSelected = selectedItem?.id === item.id;
                  const categoryLabel = item.category
                    ? itemCategoryLabels[item.category]
                    : "";
                  const itemNote = item.notes?.trim() ?? "";

                  return (
                    <tr
                      key={item.id}
                      className={isSelected ? "selected-row" : undefined}
                    >
                      <td className="item-number-cell">
                        <button
                          type="button"
                          className="item-number-button"
                          title={`Open item ${itemIndex + 1}: ${item.name}`}
                          aria-label={`Open item ${itemIndex + 1}: ${item.name}`}
                          onClick={() => setSelectedItemId(item.id)}
                        >
                          #{itemIndex + 1}
                        </button>
                      </td>

                      <td className="item-name-cell">
                        <input
                          value={item.name}
                          onChange={(event) =>
                            updateItem(item.id, { name: event.target.value })
                          }
                        />

                        {categoryLabel || itemNote ? (
                          <div className="item-row-meta">
                            {categoryLabel ? (
                              <span className="item-category-pill">
                                {categoryLabel}
                              </span>
                            ) : null}

                            {itemNote ? (
                              <span className="item-note-preview">
                                {itemNote}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {visibleRowError ? (
                          <div className="row-error">{visibleRowError}</div>
                        ) : null}
                      </td>

                      <td className="item-quantity-cell">
                        <input
                          value={String(item.quantity)}
                          onChange={(event) =>
                            updateItem(item.id, {
                              quantity: parseQuantityInput(event.target.value),
                            })
                          }
                          inputMode="decimal"
                        />
                      </td>

                      <td className="item-unit-cell">
                        <input
                          value={formatMoneyInputValue(
                            item.unitPriceCents,
                            currency,
                          )}
                          onChange={(event) =>
                            updateItem(item.id, {
                              unitPriceCents: parseMoneyInputToCents(
                                event.target.value,
                                currency,
                              ),
                            })
                          }
                          inputMode="decimal"
                          aria-label={getMoneyInputLabel(
                            "Unit price",
                            currency,
                          )}
                        />
                      </td>

                      <td className="item-total-cell">
                        {formatMoneyFromCents(
                          getItemSubtotalCents(item),
                          currency,
                        )}
                      </td>

                      <td className="item-assigned-cell">
                        <button
                          type="button"
                          className="link-button"
                          title={getAssignmentTitle(item.split, people)}
                          onClick={() => setSelectedItemId(item.id)}
                        >
                          {getAssignmentLabel(item.split, people)}
                        </button>
                      </td>

                      <td className="item-actions-cell">
                        <div className="table-actions">
                          <button
                            type="button"
                            onClick={() => duplicateItem(item.id)}
                          >
                            Duplicate
                          </button>

                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => deleteItem(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AssignmentPanel
            item={selectedItem}
            people={people}
            currency={currency}
            onChange={(nextItem) => updateItem(nextItem.id, nextItem)}
          />
        </div>
      )}
    </section>
  );
}

type AssignmentPanelProps = {
  item: BillItem | null;
  people: Person[];
  currency: CurrencyCode;
  onChange: (item: BillItem) => void;
};

function AssignmentPanel({
  item,
  people,
  currency,
  onChange,
}: AssignmentPanelProps) {
  if (!item) {
    return (
      <aside className="assignment-panel">
        <h3>Assignment</h3>
        <p>Select an item to assign it.</p>
      </aside>
    );
  }

  const currentItem = item;
  const subtotalCents = getItemSubtotalCents(currentItem);
  const errors = validateItem(currentItem, people);
  const allocations = calculateItemAllocations(currentItem, people);

  function changeMethod(method: ItemSplit["method"]) {
    const currentPersonIds = getAssignedPersonIds(currentItem.split);
    const fallbackPersonIds =
      currentPersonIds.length > 0
        ? currentPersonIds
        : people.map((person) => person.id);

    if (method === "equal") {
      onChange({
        ...currentItem,
        split: createEqualSplit(fallbackPersonIds),
      });
      return;
    }

    if (method === "shares") {
      onChange({
        ...currentItem,
        split: createShareSplit(
          fallbackPersonIds.map((personId) => ({
            personId,
            shares: 1,
          })),
        ),
      });
      return;
    }

    const currentAllocations = calculateItemAllocations(currentItem, people);

    onChange({
      ...currentItem,
      split: createCustomAmountSplit(
        currentAllocations.map((allocation) => ({
          personId: allocation.personId,
          amountCents: allocation.amountCents,
        })),
      ),
    });
  }

  function changeCategory(category: string) {
    onChange({
      ...currentItem,
      category: category === "" ? undefined : (category as ItemCategory),
    });
  }

  function changeNotes(notes: string) {
    onChange({
      ...currentItem,
      notes: notes.trim().length > 0 ? notes : undefined,
    });
  }

  return (
    <aside className="assignment-panel">
      <div className="assignment-heading">
        <div>
          <h3>Assign item</h3>
          <p>{currentItem.name}</p>
        </div>

        <strong>{formatMoneyFromCents(subtotalCents, currency)}</strong>
      </div>

      <div className="item-metadata-editor">
        <label>
          Category
          <select
            value={currentItem.category ?? ""}
            onChange={(event) => changeCategory(event.target.value)}
          >
            <option value="">No category</option>
            {itemCategoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Item note
          <textarea
            value={currentItem.notes ?? ""}
            onChange={(event) => changeNotes(event.target.value)}
            placeholder="Optional note for this item."
            rows={3}
          />
        </label>
      </div>

      <label>
        Split method
        <select
          value={currentItem.split.method}
          onChange={(event) =>
            changeMethod(event.target.value as ItemSplit["method"])
          }
        >
          <option value="equal">Equal split</option>
          <option value="shares">Share split</option>
          <option value="custom">Custom amounts</option>
        </select>
      </label>

      {currentItem.split.method === "equal" ? (
        <EqualAssignmentEditor
          item={currentItem}
          people={people}
          onChange={onChange}
        />
      ) : null}

      {currentItem.split.method === "shares" ? (
        <ShareAssignmentEditor
          item={currentItem}
          people={people}
          onChange={onChange}
        />
      ) : null}

      {currentItem.split.method === "custom" ? (
        <CustomAssignmentEditor
          item={currentItem}
          people={people}
          currency={currency}
          onChange={onChange}
        />
      ) : null}

      {errors.length > 0 ? (
        <div className="validation-box">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <div className="allocation-preview">
        <h4>Preview</h4>

        {allocations.length === 0 ? (
          <p>No one is assigned yet.</p>
        ) : (
          allocations.map((allocation) => {
            const person = people.find(
              (candidate) => candidate.id === allocation.personId,
            );

            return (
              <div className="allocation-row" key={allocation.personId}>
                <span>{person?.name ?? "Unknown person"}</span>
                <strong>
                  {formatMoneyFromCents(allocation.amountCents, currency)}
                </strong>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function EqualAssignmentEditor({
  item,
  people,
  onChange,
}: {
  item: BillItem;
  people: Person[];
  onChange: (item: BillItem) => void;
}) {
  const selectedIds =
    item.split.method === "equal" ? item.split.personIds : [];

  function togglePerson(personId: string, checked: boolean) {
    if (!checked && selectedIds.length <= 1) {
      return;
    }

    const nextPersonIds = checked
      ? [...selectedIds, personId]
      : selectedIds.filter((id) => id !== personId);

    onChange({
      ...item,
      split: createEqualSplit(nextPersonIds),
    });
  }

  return (
    <div className="assignment-list">
      {people.map((person) => (
        <label className="assignment-person-row" key={person.id}>
          <input
            type="checkbox"
            checked={selectedIds.includes(person.id)}
            onChange={(event) => togglePerson(person.id, event.target.checked)}
          />
          <span>{person.name}</span>
        </label>
      ))}
    </div>
  );
}

function ShareAssignmentEditor({
  item,
  people,
  onChange,
}: {
  item: BillItem;
  people: Person[];
  onChange: (item: BillItem) => void;
}) {
  const shares = item.split.method === "shares" ? item.split.shares : [];

  function setShares(personId: string, sharesValue: string) {
    const sharesCount = Number(sharesValue);
    const otherShares = shares.filter((row) => row.personId !== personId);

    if (!Number.isFinite(sharesCount) || sharesCount <= 0) {
      if (otherShares.length === 0) {
        return;
      }

      onChange({
        ...item,
        split: createShareSplit(otherShares),
      });
      return;
    }

    onChange({
      ...item,
      split: createShareSplit([
        ...otherShares,
        { personId, shares: sharesCount },
      ]),
    });
  }

  return (
    <div className="assignment-list">
      {people.map((person) => {
        const row = shares.find((candidate) => candidate.personId === person.id);

        return (
          <label className="assignment-person-row" key={person.id}>
            <span>{person.name}</span>
            <input
              value={row?.shares ?? ""}
              onChange={(event) => setShares(person.id, event.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
          </label>
        );
      })}
    </div>
  );
}

function CustomAssignmentEditor({
  item,
  people,
  currency,
  onChange,
}: {
  item: BillItem;
  people: Person[];
  currency: CurrencyCode;
  onChange: (item: BillItem) => void;
}) {
  const amounts = item.split.method === "custom" ? item.split.amounts : [];
  const assignedTotalCents = amounts.reduce(
    (sum, row) => sum + row.amountCents,
    0,
  );

  function setAmount(personId: string, amountInput: string) {
    const amountCents = parseMoneyInputToCents(amountInput, currency);
    const otherAmounts = amounts.filter((row) => row.personId !== personId);

    if (amountCents <= 0) {
      if (otherAmounts.length === 0) {
        return;
      }

      onChange({
        ...item,
        split: createCustomAmountSplit(otherAmounts),
      });
      return;
    }

    onChange({
      ...item,
      split: createCustomAmountSplit([
        ...otherAmounts,
        { personId, amountCents },
      ]),
    });
  }

  return (
    <div className="assignment-list">
      {currency === "LBP" ? (
        <p className="field-help">{getMoneyInputHelpText(currency)}</p>
      ) : null}

      {people.map((person) => {
        const row = amounts.find((candidate) => candidate.personId === person.id);

        return (
          <label className="assignment-person-row" key={person.id}>
            <span>{person.name}</span>
            <input
              value={row ? formatMoneyInputValue(row.amountCents, currency) : ""}
              onChange={(event) => setAmount(person.id, event.target.value)}
              inputMode="decimal"
              placeholder={currency === "LBP" ? "0" : "0.00"}
              aria-label={`${getMoneyInputLabel(
                "Custom amount",
                currency,
              )} for ${person.name}`}
            />
          </label>
        );
      })}

      <div className="custom-total-row">
        <span>Assigned</span>
        <strong>{formatMoneyFromCents(assignedTotalCents, currency)}</strong>
      </div>
    </div>
  );
}

function getVisibleRowError(errors: string[]): string {
  return (
    errors.find(
      (error) => error !== "Assign the item to at least one person.",
    ) ?? ""
  );
}

function getAssignmentLabel(split: ItemSplit, people: Person[]): string {
  const assignedIds = getAssignedPersonIds(split);

  if (assignedIds.length === 0) {
    return "Unassigned";
  }

  if (assignedIds.length === people.length) {
    return "Everyone";
  }

  const assignedNames = assignedIds
    .map((personId) => people.find((person) => person.id === personId)?.name)
    .filter(Boolean);

  if (assignedNames.length <= 2) {
    return assignedNames.join(", ");
  }

  return `${assignedNames.length} people`;
}

function getAssignmentTitle(split: ItemSplit, people: Person[]): string {
  const assignedIds = getAssignedPersonIds(split);

  if (assignedIds.length === 0) {
    return "No one assigned";
  }

  if (assignedIds.length === people.length) {
    return "Everyone";
  }

  return assignedIds
    .map((personId) => people.find((person) => person.id === personId)?.name)
    .filter(Boolean)
    .join(", ");
}

function cloneItemSplit(split: ItemSplit): ItemSplit {
  if (split.method === "equal") {
    return createEqualSplit([...split.personIds]);
  }

  if (split.method === "shares") {
    return createShareSplit(
      split.shares.map((row) => ({
        personId: row.personId,
        shares: row.shares,
      })),
    );
  }

  return createCustomAmountSplit(
    split.amounts.map((row) => ({
      personId: row.personId,
      amountCents: row.amountCents,
    })),
  );
}

function handleEnterToFocusNext(
  event: KeyboardEvent<HTMLInputElement>,
  nextInputRef: RefObject<HTMLInputElement | null>,
) {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  focusInput(nextInputRef);
}

function focusInput(inputRef: RefObject<HTMLInputElement | null>) {
  setTimeout(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, 0);
}

function parseQuantityInput(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function createId(): string {
  return crypto.randomUUID();
}