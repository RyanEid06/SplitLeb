import { describe, expect, it } from "vitest";
import {
  buildCompactShareSummary,
  buildDetailedShareSummary,
  formatShareBalance,
  formatShareMoney,
  formatSharePaymentStatus,
} from "./shareSummary";

describe("share summary", () => {
  it("formats USD amounts", () => {
    expect(formatShareMoney(12.5, "USD")).toBe("$12.50");
  });

  it("formats LBP amounts without decimals", () => {
    expect(formatShareMoney(150000, "LBP")).toBe("150,000 LBP");
  });

  it("formats share balances as user-facing labels", () => {
    expect(formatShareBalance(4.68, "USD")).toBe("Receives $4.68");
    expect(formatShareBalance(-4.35, "USD")).toBe("Owes $4.35");
    expect(formatShareBalance(0, "USD")).toBe("Settled");
  });

  it("formats bill payment status", () => {
    expect(
      formatSharePaymentStatus(
        {
          grandTotal: 42.9,
          paidTotal: 42,
          difference: 0.9,
          status: "underpaid",
        },
        "USD",
      ),
    ).toBe("Remaining $0.90");

    expect(
      formatSharePaymentStatus(
        {
          grandTotal: 42.9,
          paidTotal: 42.9,
          difference: 0,
          status: "balanced",
        },
        "USD",
      ),
    ).toBe("Fully paid");

    expect(
      formatSharePaymentStatus(
        {
          grandTotal: 42.9,
          paidTotal: 50,
          difference: 7.1,
          status: "overpaid",
        },
        "USD",
      ),
    ).toBe("Overpaid $7.10");
  });

  it("builds compact summary with settlement transfers and bill status", () => {
    const summary = buildCompactShareSummary({
      billTitle: "Barbar",
      currency: "USD",
      billTotals: {
        grandTotal: 20,
        paidTotal: 20,
        difference: 0,
        status: "balanced",
      },
      people: [
        {
          personId: "p1",
          name: "Ali",
          totalOwed: 12,
          paidAmount: 20,
          netBalance: 8,
        },
        {
          personId: "p2",
          name: "Maya",
          totalOwed: 8,
          paidAmount: 0,
          netBalance: -8,
        },
      ],
      settlements: [
        {
          fromName: "Maya",
          toName: "Ali",
          amount: 8,
        },
      ],
    });

    expect(summary).toContain("SplitLeb - Barbar");
    expect(summary).toContain("Bill: $20.00 total, Fully paid");
    expect(summary).toContain("- Ali: $12.00");
    expect(summary).toContain("- Maya pays Ali: $8.00");
  });

  it("builds detailed summary with bill totals, paid lines, and balance lines", () => {
    const summary = buildDetailedShareSummary({
      billTitle: "Supermarket",
      currency: "LBP",
      billTotals: {
        grandTotal: 250000,
        paidTotal: 300000,
        difference: 50000,
        status: "overpaid",
      },
      people: [
        {
          personId: "p1",
          name: "Rami",
          totalOwed: 250000,
          paidAmount: 300000,
          netBalance: 50000,
        },
      ],
      settlements: [],
    });

    expect(summary).toContain("Menu prices are treated as tax-included.");
    expect(summary).toContain("Grand total: 250,000 LBP");
    expect(summary).toContain("Paid total: 300,000 LBP");
    expect(summary).toContain("Payment status: Overpaid 50,000 LBP");
    expect(summary).toContain("Total owed: 250,000 LBP");
    expect(summary).toContain("Paid: 300,000 LBP");
    expect(summary).toContain("Balance: Receives 50,000 LBP");
    expect(summary).toContain("- No transfers needed.");
  });
});