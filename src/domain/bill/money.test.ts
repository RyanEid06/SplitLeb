import { describe, expect, it } from "vitest";
import {
  formatMoneyInputValue,
  parseMoneyInputToCents,
} from "./money";
import { formatMoneyFromCents } from "../../utils/formatting";

describe("money input helpers", () => {
  it("keeps USD parsing unchanged", () => {
    expect(parseMoneyInputToCents("5.99", "USD")).toBe(599);
    expect(parseMoneyInputToCents("5.6", "USD")).toBe(560);
    expect(parseMoneyInputToCents("1,234.56", "USD")).toBe(123456);
  });

  it("keeps USD input display unchanged", () => {
    expect(formatMoneyInputValue(599, "USD")).toBe("5.99");
    expect(formatMoneyInputValue(560, "USD")).toBe("5.6");
    expect(formatMoneyInputValue(500, "USD")).toBe("5");
  });

  it("parses LBP input as thousands", () => {
    expect(parseMoneyInputToCents("630", "LBP")).toBe(63_000_000);
    expect(parseMoneyInputToCents("1500", "LBP")).toBe(150_000_000);
  });

  it("displays LBP input values in thousands", () => {
    expect(formatMoneyInputValue(63_000_000, "LBP")).toBe("630");
    expect(formatMoneyInputValue(150_000_000, "LBP")).toBe("1500");
  });

  it("keeps LBP output formatting as the full amount", () => {
    expect(formatMoneyFromCents(63_000_000, "LBP")).toBe("LBP 630,000");
    expect(formatMoneyFromCents(150_000_000, "LBP")).toBe("LBP 1,500,000");
  });

  it("handles LBP thousand-decimal rounding edge cases", () => {
    expect(parseMoneyInputToCents("630.5", "LBP")).toBe(63_050_000);
    expect(formatMoneyInputValue(63_050_000, "LBP")).toBe("630.5");

    expect(parseMoneyInputToCents("0.001", "LBP")).toBe(100);
    expect(formatMoneyFromCents(100, "LBP")).toBe("LBP 1");
  });

  it("returns zero for empty, invalid, or negative input", () => {
    expect(parseMoneyInputToCents("", "USD")).toBe(0);
    expect(parseMoneyInputToCents("abc", "USD")).toBe(0);
    expect(parseMoneyInputToCents("-5", "USD")).toBe(0);

    expect(parseMoneyInputToCents("", "LBP")).toBe(0);
    expect(parseMoneyInputToCents("abc", "LBP")).toBe(0);
    expect(parseMoneyInputToCents("-630", "LBP")).toBe(0);
  });
});