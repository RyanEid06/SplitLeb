import {
  roundSettlementAmountCents,
} from "./money";
import type {
  CurrencyCode,
  Payment,
  PaymentTotalStatus,
  PersonSettlementBalance,
  SettlementTransfer,
} from "./types";

export type SettlementPersonTotal = {
  personId: string;
  personName: string;
  amountOwedCents: number;
};

function normalizeCents(amountCents: number): number {
  return Math.round(amountCents);
}

export function getPaymentAmountForPersonCents(
  payments: Payment[],
  personId: string,
): number {
  return normalizeCents(
    payments
      .filter((payment) => payment.personId === personId)
      .reduce((sum, payment) => sum + payment.amountCents, 0),
  );
}

export function calculatePaidTotalCents(payments: Payment[]): number {
  return normalizeCents(
    payments.reduce((sum, payment) => sum + payment.amountCents, 0),
  );
}

export function calculatePaymentTotalStatus(params: {
  billTotalCents: number;
  payments: Payment[];
}): PaymentTotalStatus {
  const billTotalCents = normalizeCents(params.billTotalCents);
  const paidTotalCents = calculatePaidTotalCents(params.payments);
  const differenceCents = normalizeCents(paidTotalCents - billTotalCents);

  if (differenceCents === 0) {
    return {
      status: "balanced",
      billTotalCents,
      paidTotalCents,
      differenceCents: 0,
    };
  }

  if (differenceCents < 0) {
    return {
      status: "underpaid",
      billTotalCents,
      paidTotalCents,
      differenceCents: Math.abs(differenceCents),
    };
  }

  return {
    status: "overpaid",
    billTotalCents,
    paidTotalCents,
    differenceCents,
  };
}

export function calculatePersonSettlementBalances(params: {
  personTotals: SettlementPersonTotal[];
  payments: Payment[];
}): PersonSettlementBalance[] {
  return params.personTotals.map((personTotal) => {
    const amountOwedCents = normalizeCents(personTotal.amountOwedCents);
    const amountPaidCents = getPaymentAmountForPersonCents(
      params.payments,
      personTotal.personId,
    );

    return {
      personId: personTotal.personId,
      personName: personTotal.personName,
      amountOwedCents,
      amountPaidCents,
      netBalanceCents: normalizeCents(amountPaidCents - amountOwedCents),
    };
  });
}

export function calculateSettlementTransfers(
  balances: PersonSettlementBalance[],
  options: { currency?: CurrencyCode } = {},
): SettlementTransfer[] {
  const debtors = balances
    .filter((balance) => balance.netBalanceCents < 0)
    .map((balance) => ({
      personId: balance.personId,
      personName: balance.personName,
      amountCents: Math.abs(balance.netBalanceCents),
    }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const creditors = balances
    .filter((balance) => balance.netBalanceCents > 0)
    .map((balance) => ({
      personId: balance.personId,
      personName: balance.personName,
      amountCents: balance.netBalanceCents,
    }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const transfers: SettlementTransfer[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const transferAmountCents = Math.min(
      debtor.amountCents,
      creditor.amountCents,
    );

    if (transferAmountCents > 0) {
      transfers.push({
        fromPersonId: debtor.personId,
        fromPersonName: debtor.personName,
        toPersonId: creditor.personId,
        toPersonName: creditor.personName,
        amountCents: transferAmountCents,
      });
    }

    debtor.amountCents -= transferAmountCents;
    creditor.amountCents -= transferAmountCents;

    if (debtor.amountCents === 0) debtorIndex += 1;
    if (creditor.amountCents === 0) creditorIndex += 1;
  }

  return roundSettlementTransfersForCurrency(
    transfers,
    options.currency ?? "USD",
  );
}

function roundSettlementTransfersForCurrency(
  transfers: SettlementTransfer[],
  currency: CurrencyCode,
): SettlementTransfer[] {
  return transfers
    .map((transfer) => ({
      ...transfer,
      amountCents: roundSettlementAmountCents(
        transfer.amountCents,
        currency,
      ),
    }))
    .filter((transfer) => transfer.amountCents > 0);
}

export function upsertPaymentForPerson(params: {
  payments: Payment[];
  personId: string;
  amountCents: number;
  createId: () => string;
}): Payment[] {
  const cleanAmountCents = Math.max(0, normalizeCents(params.amountCents));

  const existingPayment = params.payments.find(
    (payment) => payment.personId === params.personId,
  );

  if (cleanAmountCents === 0) {
    return params.payments.filter(
      (payment) => payment.personId !== params.personId,
    );
  }

  if (!existingPayment) {
    return [
      ...params.payments,
      {
        id: params.createId(),
        personId: params.personId,
        amountCents: cleanAmountCents,
      },
    ];
  }

  return params.payments.filter((payment, index) =>
    payment.personId !== params.personId || index === params.payments.indexOf(existingPayment),
  ).map((payment) =>
    payment.personId === params.personId
      ? {
          ...payment,
          amountCents: cleanAmountCents,
        }
      : payment,
  );
}
