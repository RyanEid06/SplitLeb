// Structural validation only: unfinished draft splits remain importable.
// Financial validation belongs to the unchanged domain engine at review time.
type RecordValue = Record<string, unknown>;
function record(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function id(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function text(value: unknown) {
  return typeof value === "string";
}
function optionalText(value: unknown) {
  return value === undefined || text(value);
}
function cents(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value);
}
function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}
function identified(value: unknown): value is RecordValue {
  return record(value) && id(value.id);
}
function rows(value: unknown, check: (row: unknown) => boolean): boolean {
  return Array.isArray(value) && value.every(check);
}
function split(value: unknown): boolean {
  if (!record(value)) return false;
  if (value.method === "equal") return rows(value.personIds, id);
  if (value.method === "shares")
    return rows(
      value.shares,
      (row) => record(row) && id(row.personId) && finite(row.shares),
    );
  if (value.method === "custom")
    return rows(
      value.amounts,
      (row) => record(row) && id(row.personId) && cents(row.amountCents),
    );
  return false;
}
export function hasBillRecordStructure(value: RecordValue): boolean {
  return (
    optionalText(value.title) &&
    optionalText(value.note) &&
    rows(
      value.people,
      (person) =>
        identified(person) &&
        text(person.name) &&
        optionalText(person.emoji) &&
        optionalText(person.color) &&
        optionalText(person.groupMemberId),
    ) &&
    rows(
      value.items,
      (item) =>
        identified(item) &&
        text(item.name) &&
        finite(item.quantity) &&
        cents(item.unitPriceCents) &&
        split(item.split) &&
        optionalText(item.notes) &&
        optionalText(item.category),
    ) &&
    rows(
      value.payments,
      (payment) =>
        identified(payment) &&
        id(payment.personId) &&
        cents(payment.amountCents) &&
        optionalText(payment.note),
    ) &&
    rows(
      value.extras,
      (extra) =>
        identified(extra) &&
        text(extra.name) &&
        cents(extra.amountCents) &&
        ["service", "tip", "delivery", "discount", "custom"].includes(
          String(extra.kind),
        ) &&
        ["equal", "proportional", "selectedPeople", "customAmounts"].includes(
          String(extra.allocationMethod),
        ) &&
        (extra.selectedPersonIds === undefined ||
          rows(extra.selectedPersonIds, id)) &&
        (extra.customAmountsByPersonId === undefined ||
          (record(extra.customAmountsByPersonId) &&
            Object.values(extra.customAmountsByPersonId).every(cents))),
    )
  );
}
