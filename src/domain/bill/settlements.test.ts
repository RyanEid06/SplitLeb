import { describe, expect, it } from "vitest";
import {
  calculatePaymentTotalStatus,
  calculatePersonSettlementBalances,
  calculateSettlementTransfers,
  upsertPaymentForPerson,
} from "./settlements";
import type { Payment } from "./types";

describe("settlements", () => {
  it("calculates person settlement balances from owed and paid amounts", () => {
    const personTotals = [
      { personId: "p1", personName: "Ali", amountOwedCents: 2000 },
      { personId: "p2", personName: "Maya", amountOwedCents: 3000 },
      { personId: "p3", personName: "Jad", amountOwedCents: 1000 },
    ];

    const payments: Payment[] = [
      { id: "pay1", personId: "p1", amountCents: 6000 },
    ];

    const balances = calculatePersonSettlementBalances({
      personTotals,
      payments,
    });

    expect(balances).toEqual([
      {
        personId: "p1",
        personName: "Ali",
        amountOwedCents: 2000,
        amountPaidCents: 6000,
        netBalanceCents: 4000,
      },
      {
        personId: "p2",
        personName: "Maya",
        amountOwedCents: 3000,
        amountPaidCents: 0,
        netBalanceCents: -3000,
      },
      {
        personId: "p3",
        personName: "Jad",
        amountOwedCents: 1000,
        amountPaidCents: 0,
        netBalanceCents: -1000,
      },
    ]);
  });

  it("creates settlement transfers from debtors to creditors", () => {
    const balances = [
      {
        personId: "p1",
        personName: "Ali",
        amountOwedCents: 2000,
        amountPaidCents: 6000,
        netBalanceCents: 4000,
      },
      {
        personId: "p2",
        personName: "Maya",
        amountOwedCents: 3000,
        amountPaidCents: 0,
        netBalanceCents: -3000,
      },
      {
        personId: "p3",
        personName: "Jad",
        amountOwedCents: 1000,
        amountPaidCents: 0,
        netBalanceCents: -1000,
      },
    ];

    const transfers = calculateSettlementTransfers(balances);

    expect(transfers).toEqual([
      {
        fromPersonId: "p2",
        fromPersonName: "Maya",
        toPersonId: "p1",
        toPersonName: "Ali",
        amountCents: 3000,
      },
      {
        fromPersonId: "p3",
        fromPersonName: "Jad",
        toPersonId: "p1",
        toPersonName: "Ali",
        amountCents: 1000,
      },
    ]);
  });

  it("rounds LBP settlement transfers to the nearest LBP 1,000", () => {
    const balances = [
      {
        personId: "p1",
        personName: "Ali",
        amountOwedCents: 0,
        amountPaidCents: 3333300,
        netBalanceCents: 3333300,
      },
      {
        personId: "p2",
        personName: "Maya",
        amountOwedCents: 3333300,
        amountPaidCents: 0,
        netBalanceCents: -3333300,
      },
    ];

    const transfers = calculateSettlementTransfers(balances, {
      currency: "LBP",
    });

    expect(transfers).toEqual([
      {
        fromPersonId: "p2",
        fromPersonName: "Maya",
        toPersonId: "p1",
        toPersonName: "Ali",
        amountCents: 3300000,
      },
    ]);
  });

  it("removes LBP settlement transfers that round down to zero", () => {
    const balances = [
      {
        personId: "p1",
        personName: "Ali",
        amountOwedCents: 0,
        amountPaidCents: 40000,
        netBalanceCents: 40000,
      },
      {
        personId: "p2",
        personName: "Maya",
        amountOwedCents: 40000,
        amountPaidCents: 0,
        netBalanceCents: -40000,
      },
    ];

    const transfers = calculateSettlementTransfers(balances, {
      currency: "LBP",
    });

    expect(transfers).toEqual([]);
  });

  it("does not round USD settlement transfers", () => {
    const balances = [
      {
        personId: "p1",
        personName: "Ali",
        amountOwedCents: 0,
        amountPaidCents: 3333,
        netBalanceCents: 3333,
      },
      {
        personId: "p2",
        personName: "Maya",
        amountOwedCents: 3333,
        amountPaidCents: 0,
        netBalanceCents: -3333,
      },
    ];

    const transfers = calculateSettlementTransfers(balances, {
      currency: "USD",
    });

    expect(transfers).toEqual([
      {
        fromPersonId: "p2",
        fromPersonName: "Maya",
        toPersonId: "p1",
        toPersonName: "Ali",
        amountCents: 3333,
      },
    ]);
  });

  it("detects when paid total matches bill total", () => {
    const status = calculatePaymentTotalStatus({
      billTotalCents: 6000,
      payments: [
        { id: "pay1", personId: "p1", amountCents: 4000 },
        { id: "pay2", personId: "p2", amountCents: 2000 },
      ],
    });

    expect(status).toEqual({
      status: "balanced",
      billTotalCents: 6000,
      paidTotalCents: 6000,
      differenceCents: 0,
    });
  });

  it("detects when paid total is less than bill total", () => {
    const status = calculatePaymentTotalStatus({
      billTotalCents: 6000,
      payments: [{ id: "pay1", personId: "p1", amountCents: 5000 }],
    });

    expect(status).toEqual({
      status: "underpaid",
      billTotalCents: 6000,
      paidTotalCents: 5000,
      differenceCents: 1000,
    });
  });

  it("detects when paid total is greater than bill total", () => {
    const status = calculatePaymentTotalStatus({
      billTotalCents: 6000,
      payments: [{ id: "pay1", personId: "p1", amountCents: 6500 }],
    });

    expect(status).toEqual({
      status: "overpaid",
      billTotalCents: 6000,
      paidTotalCents: 6500,
      differenceCents: 500,
    });
  });

  it("upserts a payment for one person", () => {
    const payments: Payment[] = [];

    const created = upsertPaymentForPerson({
      payments,
      personId: "p1",
      amountCents: 2500,
      createId: () => "pay1",
    });

    expect(created).toEqual([
      {
        id: "pay1",
        personId: "p1",
        amountCents: 2500,
      },
    ]);

    const updated = upsertPaymentForPerson({
      payments: created,
      personId: "p1",
      amountCents: 4000,
      createId: () => "should-not-be-used",
    });

    expect(updated).toEqual([
      {
        id: "pay1",
        personId: "p1",
        amountCents: 4000,
      },
    ]);
  });

  it("removes a payment when amount is zero", () => {
    const payments: Payment[] = [
      {
        id: "pay1",
        personId: "p1",
        amountCents: 2500,
      },
    ];

    const updated = upsertPaymentForPerson({
      payments,
      personId: "p1",
      amountCents: 0,
      createId: () => "unused",
    });

    expect(updated).toEqual([]);
  });
});