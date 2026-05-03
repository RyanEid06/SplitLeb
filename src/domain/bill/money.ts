import type { CurrencyCode } from "./types";

const LBP_INPUT_UNIT_MULTIPLIER = 1000;
export const LBP_SETTLEMENT_ROUNDING_UNIT_CENTS = 1000 * 100;

export function parseMoneyInputToCents(
  value: string,
  currency: CurrencyCode,
): number {
  const normalized = value.replace(/,/g, "").trim();

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  const fullCurrencyAmount =
    currency === "LBP" ? parsed * LBP_INPUT_UNIT_MULTIPLIER : parsed;

  return Math.round(fullCurrencyAmount * 100);
}

export function formatMoneyInputValue(
  amountCents: number,
  currency: CurrencyCode,
  options: { blankZero?: boolean } = {},
): string {
  const roundedCents = Math.round(amountCents);

  if (options.blankZero && roundedCents === 0) {
    return "";
  }

  const fullCurrencyAmount = roundedCents / 100;
  const inputAmount =
    currency === "LBP"
      ? fullCurrencyAmount / LBP_INPUT_UNIT_MULTIPLIER
      : fullCurrencyAmount;

  return formatInputNumber(inputAmount);
}

export function getMoneyInputLabel(
  baseLabel: string,
  currency: CurrencyCode,
): string {
  return currency === "LBP" ? `${baseLabel} (k LBP)` : baseLabel;
}

export function getMoneyInputHelpText(currency: CurrencyCode): string {
  return currency === "LBP" ? "630 = LBP 630,000." : "";
}

export function getMoneyInputPlaceholder(currency: CurrencyCode): string {
  return currency === "LBP" ? "630" : "8.50";
}

export function roundMoneyToNearestUnitCents(
  amountCents: number,
  unitCents: number,
): number {
  const roundedAmountCents = Math.round(amountCents);

  if (!Number.isFinite(roundedAmountCents) || roundedAmountCents <= 0) {
    return 0;
  }

  if (!Number.isFinite(unitCents) || unitCents <= 0) {
    return roundedAmountCents;
  }

  return Math.round(roundedAmountCents / unitCents) * unitCents;
}

export function roundSettlementAmountCents(
  amountCents: number,
  currency: CurrencyCode,
): number {
  if (currency !== "LBP") {
    return Math.round(amountCents);
  }

  return roundMoneyToNearestUnitCents(
    amountCents,
    LBP_SETTLEMENT_ROUNDING_UNIT_CENTS,
  );
}

function formatInputNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  return value.toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}