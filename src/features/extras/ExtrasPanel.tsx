import { useMemo } from "react";
import type {
  BillExtra,
  BillExtraAllocationMethod,
  BillExtraKind,
  CurrencyCode,
  Person,
} from "../../domain/bill/types";
import {
  calculateExtraTotalsByPerson,
  createDefaultExtra,
  validateExtra,
} from "../../domain/bill/extras";
import {
  formatMoneyInputValue,
  getMoneyInputLabel,
  getMoneyInputPlaceholder,
  parseMoneyInputToCents,
} from "../../domain/bill/money";
import { formatMoneyFromCents } from "../../utils/formatting";

type ExtrasPanelProps = {
  people: Person[];
  extras: BillExtra[];
  itemSubtotalByPersonId: Record<string, number>;
  currency: CurrencyCode;
  onExtrasChange: (extras: BillExtra[]) => void;
};

const extraKinds: BillExtraKind[] = [
  "service",
  "tip",
  "delivery",
  "discount",
  "custom",
];

const allocationMethods: BillExtraAllocationMethod[] = [
  "equal",
  "proportional",
  "selectedPeople",
  "customAmounts",
];

export function ExtrasPanel({
  people,
  extras,
  itemSubtotalByPersonId,
  currency,
  onExtrasChange,
}: ExtrasPanelProps) {
  const previewTotals = useMemo(() => {
    try {
      return calculateExtraTotalsByPerson({
        extras,
        people,
        itemSubtotalByPersonId,
      });
    } catch {
      return Object.fromEntries(people.map((person) => [person.id, 0]));
    }
  }, [extras, people, itemSubtotalByPersonId]);

  function addExtra(kind: BillExtraKind) {
    onExtrasChange([...extras, createDefaultExtra(kind, createId())]);
  }

  function updateExtra(extraId: string, patch: Partial<BillExtra>) {
    onExtrasChange(
      extras.map((extra) =>
        extra.id === extraId
          ? {
              ...extra,
              ...patch,
            }
          : extra,
      ),
    );
  }

  function deleteExtra(extraId: string) {
    onExtrasChange(extras.filter((extra) => extra.id !== extraId));
  }

  return (
    <section className="extras-panel">
      <div className="section-header">
        <div>
          <h2>Extras</h2>
          <p>
            Add service, tip, delivery, discounts, or custom charges. Menu prices
            stay tax-included by default, so VAT is not added here.
          </p>
          {currency === "LBP" ? (
            <p className="currency-input-note">
              LBP extra inputs use thousands. Type 210 for LBP 210,000.
            </p>
          ) : null}
        </div>
      </div>

      <div className="quick-extra-actions">
        {extraKinds.map((kind) => (
          <button key={kind} type="button" onClick={() => addExtra(kind)}>
            + {labelKind(kind)}
          </button>
        ))}
      </div>

      {extras.length === 0 ? (
        <div className="empty-card">
          No extras yet. Add only what actually exists on the bill.
        </div>
      ) : (
        <div className="extras-list">
          {extras.map((extra) => {
            const errors = validateExtra(extra, people);

            return (
              <article key={extra.id} className="extra-card">
                <div className="extra-main-grid">
                  <label>
                    <span>Name</span>
                    <input
                      value={extra.name}
                      onChange={(event) =>
                        updateExtra(extra.id, { name: event.target.value })
                      }
                    />
                  </label>

                  <label>
                    <span>Type</span>
                    <select
                      value={extra.kind}
                      onChange={(event) =>
                        updateExtra(extra.id, {
                          kind: event.target.value as BillExtraKind,
                        })
                      }
                    >
                      {extraKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {labelKind(kind)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>{getMoneyInputLabel("Amount", currency)}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formatMoneyInputValue(extra.amountCents, currency)}
                      placeholder={getMoneyInputPlaceholder(currency)}
                      onChange={(event) =>
                        updateExtra(extra.id, {
                          amountCents: parseMoneyInputToCents(
                            event.target.value,
                            currency,
                          ),
                        })
                      }
                      inputMode="decimal"
                    />
                  </label>

                  <label>
                    <span>Allocation</span>
                    <select
                      value={extra.allocationMethod}
                      onChange={(event) =>
                        updateExtra(extra.id, {
                          allocationMethod: event.target
                            .value as BillExtraAllocationMethod,
                        })
                      }
                    >
                      {allocationMethods.map((method) => (
                        <option key={method} value={method}>
                          {labelAllocationMethod(method)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {extra.allocationMethod === "selectedPeople" && (
                  <div className="person-picker">
                    <strong>People included</strong>

                    <div className="person-chip-grid">
                      {people.map((person) => {
                        const selected = (
                          extra.selectedPersonIds ?? []
                        ).includes(person.id);

                        return (
                          <label key={person.id} className="person-chip">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {
                                const current = extra.selectedPersonIds ?? [];
                                const next = selected
                                  ? current.filter((id) => id !== person.id)
                                  : [...current, person.id];

                                updateExtra(extra.id, {
                                  selectedPersonIds: next,
                                });
                              }}
                            />
                            {person.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {extra.allocationMethod === "customAmounts" && (
                  <div className="custom-amount-grid">
                    <strong>
                      {getMoneyInputLabel("Custom amounts", currency)}
                    </strong>

                    {people.map((person) => (
                      <label key={person.id}>
                        <span>{person.name}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          aria-label={`${getMoneyInputLabel(
                            "Custom amount",
                            currency,
                          )} for ${person.name}`}
                          placeholder={currency === "LBP" ? "0" : "0.00"}
                          value={formatMoneyInputValue(
                            extra.customAmountsByPersonId?.[person.id] ?? 0,
                            currency,
                          )}
                          onChange={(event) =>
                            updateExtra(extra.id, {
                              customAmountsByPersonId: {
                                ...(extra.customAmountsByPersonId ?? {}),
                                [person.id]: parseMoneyInputToCents(
                                  event.target.value,
                                  currency,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}

                {errors.length > 0 && (
                  <ul className="error-list">
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}

                <div className="extra-card-footer">
                  <span>
                    {extra.kind === "discount"
                      ? "Subtracts from the bill"
                      : "Adds to the bill"}
                  </span>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => deleteExtra(extra.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {people.length > 0 && (
        <div className="extras-preview">
          <h3>Extras preview</h3>

          <div className="extras-preview-grid">
            {people.map((person) => (
              <div key={person.id} className="preview-row">
                <span>{person.name}</span>
                <strong>
                  {formatMoneyFromCents(previewTotals[person.id] ?? 0, currency)}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function labelKind(kind: BillExtraKind): string {
  switch (kind) {
    case "service":
      return "Service";
    case "tip":
      return "Tip";
    case "delivery":
      return "Delivery";
    case "discount":
      return "Discount";
    case "custom":
      return "Custom";
  }
}

function labelAllocationMethod(method: BillExtraAllocationMethod): string {
  switch (method) {
    case "equal":
      return "Equal";
    case "proportional":
      return "Proportional";
    case "selectedPeople":
      return "Selected people";
    case "customAmounts":
      return "Custom amounts";
  }
}

function createId(): string {
  return crypto.randomUUID();
}