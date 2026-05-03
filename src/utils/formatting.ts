import type { CurrencyCode } from "../domain/bill/types";

export function formatMoneyFromCents(
  amountCents: number,
  currency: CurrencyCode,
): string {
  const sign = amountCents < 0 ? "-" : "";
  const absoluteCents = Math.abs(Math.round(amountCents));

  if (currency === "LBP") {
    return `${sign}LBP ${Math.round(absoluteCents / 100).toLocaleString("en-US")}`;
  }

  return `${sign}$${(absoluteCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNetBalanceLabel(amountCents: number): string {
  if (amountCents > 0) {
    return "owed";
  }

  if (amountCents < 0) {
    return "overpaid";
  }

  return "settled";
}