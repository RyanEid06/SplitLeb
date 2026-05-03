import type {
  CurrencyCode,
  Payment,
  PaymentTotalStatus,
  PersonSettlementBalance,
  SettlementTransfer,
} from "../../domain/bill/types";
import {
  formatMoneyInputValue,
  getMoneyInputLabel,
  parseMoneyInputToCents,
} from "../../domain/bill/money";
import { formatMoneyFromCents } from "../../utils/formatting";

type PaymentsAndSettlementPanelProps = {
  currency: CurrencyCode;
  payments: Payment[];
  balances: PersonSettlementBalance[];
  transfers: SettlementTransfer[];
  paymentStatus: PaymentTotalStatus;
  onChangePayment: (personId: string, amountCents: number) => void;
};

function getPaymentForPersonCents(
  payments: Payment[],
  personId: string,
): number {
  return (
    payments.find((payment) => payment.personId === personId)?.amountCents ?? 0
  );
}

function noTransfersMessage(paymentStatus: PaymentTotalStatus): string {
  if (paymentStatus.paidTotalCents === 0) {
    return "Enter paid amounts to calculate settlement transfers.";
  }

  return "No transfers needed based on the paid amounts entered.";
}

export function PaymentsAndSettlementPanel({
  currency,
  payments,
  balances,
  transfers,
  paymentStatus,
  onChangePayment,
}: PaymentsAndSettlementPanelProps) {
  return (
    <section className="panel settlement-panel">
      <div className="panel-header">
        <div>
          <h2>Payments & settlement</h2>
          <p>Enter who paid, then SplitLeb calculates who owes who.</p>
          {currency === "LBP" ? (
            <p className="currency-input-note">
              LBP payment inputs use thousands. Type 300 for LBP 300,000.
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={`payment-status-card payment-status-${paymentStatus.status}`}
      >
        <div>
          <span className="muted-label">Bill total</span>
          <strong>
            {formatMoneyFromCents(paymentStatus.billTotalCents, currency)}
          </strong>
        </div>

        <div>
          <span className="muted-label">Paid total</span>
          <strong>
            {formatMoneyFromCents(paymentStatus.paidTotalCents, currency)}
          </strong>
        </div>

        {paymentStatus.status === "balanced" && (
          <p className="status-ok">Paid total matches the bill total.</p>
        )}

        {paymentStatus.status === "underpaid" && (
          <p className="status-warning">
            Paid total is short by{" "}
            <strong>
              {formatMoneyFromCents(paymentStatus.differenceCents, currency)}
            </strong>
            .
          </p>
        )}

        {paymentStatus.status === "overpaid" && (
          <p className="status-warning">
            Paid total is over by{" "}
            <strong>
              {formatMoneyFromCents(paymentStatus.differenceCents, currency)}
            </strong>
            .
          </p>
        )}
      </div>

      <div className="payment-table-wrap">
        <table className="payment-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Owes</th>
              <th>{getMoneyInputLabel("Paid", currency)}</th>
              <th>Balance</th>
            </tr>
          </thead>

          <tbody>
            {balances.map((balance) => {
              const paymentValueCents = getPaymentForPersonCents(
                payments,
                balance.personId,
              );

              return (
                <tr key={balance.personId}>
                  <td>{balance.personName}</td>

                  <td>
                    {formatMoneyFromCents(balance.amountOwedCents, currency)}
                  </td>

                  <td>
                    <input
                      className="money-input"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={formatMoneyInputValue(paymentValueCents, currency, {
                        blankZero: true,
                      })}
                      placeholder={currency === "LBP" ? "0" : "0.00"}
                      aria-label={`${getMoneyInputLabel(
                        "Paid amount",
                        currency,
                      )} for ${balance.personName}`}
                      onChange={(event) => {
                        onChangePayment(
                          balance.personId,
                          parseMoneyInputToCents(event.target.value, currency),
                        );
                      }}
                    />
                  </td>

                  <td>
                    {balance.netBalanceCents > 0 && (
                      <span className="balance-positive">
                        Receives{" "}
                        {formatMoneyFromCents(
                          balance.netBalanceCents,
                          currency,
                        )}
                      </span>
                    )}

                    {balance.netBalanceCents < 0 && (
                      <span className="balance-negative">
                        Owes{" "}
                        {formatMoneyFromCents(
                          Math.abs(balance.netBalanceCents),
                          currency,
                        )}
                      </span>
                    )}

                    {balance.netBalanceCents === 0 && (
                      <span className="balance-zero">Settled</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="settlement-list">
        <h3>Transfers</h3>

        {transfers.length === 0 ? (
          <p className="empty-note">{noTransfersMessage(paymentStatus)}</p>
        ) : (
          <ul className="settlement-transfer-list">
            {transfers.map((transfer) => (
              <li
                className="settlement-transfer-card"
                key={`${transfer.fromPersonId}-${transfer.toPersonId}-${transfer.amountCents}`}
              >
                <span className="settlement-transfer-sentence">
                  <strong>{transfer.fromPersonName}</strong>
                  <span> pays </span>
                  <strong>{transfer.toPersonName}</strong>
                </span>

                <strong className="settlement-transfer-amount">
                  {formatMoneyFromCents(transfer.amountCents, currency)}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}