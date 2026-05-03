export type ShareSummaryCurrency = "USD" | "LBP";

export type SharePaymentStatus = "balanced" | "underpaid" | "overpaid";

export type SharePersonLine = {
  personId: string;
  name: string;
  totalOwed: number;
  paidAmount: number;
  netBalance: number;
};

export type ShareSettlementLine = {
  fromName: string;
  toName: string;
  amount: number;
};

export type ShareBillTotals = {
  grandTotal: number;
  paidTotal: number;
  difference: number;
  status: SharePaymentStatus;
};

export type ShareSummaryInput = {
  billTitle: string;
  currency: ShareSummaryCurrency;
  billTotals: ShareBillTotals;
  people: SharePersonLine[];
  settlements: ShareSettlementLine[];
};

export function formatShareMoney(amount: number, currency: ShareSummaryCurrency): string {
  if (currency === "LBP") {
    return `${Math.round(amount).toLocaleString("en-US")} LBP`;
  }

  return `$${amount.toFixed(2)}`;
}

export function formatShareBalance(
  netBalance: number,
  currency: ShareSummaryCurrency,
): string {
  if (netBalance > 0) {
    return `Receives ${formatShareMoney(netBalance, currency)}`;
  }

  if (netBalance < 0) {
    return `Owes ${formatShareMoney(Math.abs(netBalance), currency)}`;
  }

  return "Settled";
}

export function formatSharePaymentStatus(
  billTotals: ShareBillTotals,
  currency: ShareSummaryCurrency,
): string {
  if (billTotals.status === "balanced") {
    return "Fully paid";
  }

  if (billTotals.status === "underpaid") {
    return `Remaining ${formatShareMoney(billTotals.difference, currency)}`;
  }

  return `Overpaid ${formatShareMoney(billTotals.difference, currency)}`;
}

export function buildCompactShareSummary(input: ShareSummaryInput): string {
  const lines: string[] = [];

  lines.push(`SplitLeb - ${input.billTitle}`);
  lines.push(`Currency: ${input.currency}`);
  lines.push(
    `Bill: ${formatShareMoney(input.billTotals.grandTotal, input.currency)} total, ${formatSharePaymentStatus(
      input.billTotals,
      input.currency,
    )}`,
  );
  lines.push("");
  lines.push("Totals:");

  for (const person of input.people) {
    lines.push(`- ${person.name}: ${formatShareMoney(person.totalOwed, input.currency)}`);
  }

  lines.push("");
  lines.push("Settlement:");

  if (input.settlements.length === 0) {
    lines.push("- No transfers needed.");
  } else {
    for (const transfer of input.settlements) {
      lines.push(
        `- ${transfer.fromName} pays ${transfer.toName}: ${formatShareMoney(
          transfer.amount,
          input.currency,
        )}`,
      );
    }
  }

  return lines.join("\n");
}

export function buildDetailedShareSummary(input: ShareSummaryInput): string {
  const lines: string[] = [];

  lines.push(`SplitLeb - ${input.billTitle}`);
  lines.push(`Currency: ${input.currency}`);
  lines.push("Menu prices are treated as tax-included.");
  lines.push("");
  lines.push("Bill:");
  lines.push(`Grand total: ${formatShareMoney(input.billTotals.grandTotal, input.currency)}`);
  lines.push(`Paid total: ${formatShareMoney(input.billTotals.paidTotal, input.currency)}`);
  lines.push(
    `Payment status: ${formatSharePaymentStatus(input.billTotals, input.currency)}`,
  );
  lines.push("");
  lines.push("People:");

  for (const person of input.people) {
    lines.push(`- ${person.name}`);
    lines.push(`  Total owed: ${formatShareMoney(person.totalOwed, input.currency)}`);
    lines.push(`  Paid: ${formatShareMoney(person.paidAmount, input.currency)}`);
    lines.push(`  Balance: ${formatShareBalance(person.netBalance, input.currency)}`);
  }

  lines.push("");
  lines.push("Settlement:");

  if (input.settlements.length === 0) {
    lines.push("- No transfers needed.");
  } else {
    for (const transfer of input.settlements) {
      lines.push(
        `- ${transfer.fromName} pays ${transfer.toName}: ${formatShareMoney(
          transfer.amount,
          input.currency,
        )}`,
      );
    }
  }

  return lines.join("\n");
}