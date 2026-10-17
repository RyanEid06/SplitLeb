import { MoneyInput } from "../../components/ui/MoneyInput";
import { DecimalInput } from "../../components/ui/DecimalInput";
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
  getMoneyInputHelpText,
  getMoneyInputLabel,
} from "../../domain/bill/money";
import { formatMoneyFromCents } from "../../utils/formatting";
const itemCategoryOptions: { value: ItemCategory; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "drinks", label: "Drinks" },
  { value: "delivery", label: "Delivery" },
  { value: "dessert", label: "Dessert" },
  { value: "other", label: "Other" },
];
type AssignmentPanelProps = {
  item: BillItem | null;
  people: Person[];
  currency: CurrencyCode;
  onChange: (item: BillItem) => void;
};

export function AssignmentPanel({
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

      <details className="item-metadata-editor">
        <summary>Category & note</summary>
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
      </details>

      <div className="field">
        <label htmlFor="split-method">Split method</label>
        <select
          id="split-method"
          value={currentItem.split.method}
          onChange={(event) =>
            changeMethod(event.target.value as ItemSplit["method"])
          }
        >
          <option value="equal">Equal split</option>
          <option value="shares">Share split</option>
          <option value="custom">Custom amounts</option>
        </select>
      </div>

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
  const selectedIds = item.split.method === "equal" ? item.split.personIds : [];

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
        const row = shares.find(
          (candidate) => candidate.personId === person.id,
        );

        return (
          <label className="assignment-person-row" key={person.id}>
            <span>{person.name}</span>
            <DecimalInput
              displayValue={String(row?.shares ?? "")}
              placeholder="0"
              onValueChange={(value) => setShares(person.id, value)}
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

  function setAmount(personId: string, amountCents: number) {
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
        const row = amounts.find(
          (candidate) => candidate.personId === person.id,
        );

        return (
          <label className="assignment-person-row" key={person.id}>
            <span>{person.name}</span>
            <MoneyInput
              amountCents={row?.amountCents ?? 0}
              currency={currency}
              blankZero
              ariaLabel={
                getMoneyInputLabel("Custom amount", currency) +
                " for " +
                person.name
              }
              onChange={(amount) => setAmount(person.id, amount)}
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
