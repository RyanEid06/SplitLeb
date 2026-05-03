export type CurrencyCode = "USD" | "LBP";

export const CURRENCIES: Array<{
  code: CurrencyCode;
  label: string;
  symbol: string;
  note: string;
}> = [
  {
    code: "USD",
    label: "US Dollar",
    symbol: "$",
    note: "Common for restaurants and delivery in Lebanon.",
  },
  {
    code: "LBP",
    label: "Lebanese Pound",
    symbol: "ل.ل",
    note: "Inputs use thousands. Settlement transfers round to the nearest LBP 1,000.",
  },
];