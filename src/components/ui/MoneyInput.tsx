import type { CurrencyCode } from "../../domain/bill/types";
import {
  formatMoneyInputValue,
  parseMoneyInputToCents,
} from "../../domain/bill/money";
import { DecimalInput } from "./DecimalInput";
export function MoneyInput({
  amountCents,
  currency,
  onChange,
  ariaLabel,
  blankZero = false,
}: {
  amountCents: number;
  currency: CurrencyCode;
  onChange: (amount: number) => void;
  ariaLabel?: string;
  blankZero?: boolean;
}) {
  return (
    <DecimalInput
      displayValue={formatMoneyInputValue(amountCents, currency, { blankZero })}
      placeholder={currency === "LBP" ? "0" : "0.00"}
      ariaLabel={ariaLabel}
      onValueChange={(value) =>
        onChange(parseMoneyInputToCents(value, currency))
      }
    />
  );
}
