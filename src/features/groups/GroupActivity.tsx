import { Link } from "react-router-dom";
import type { StoredBill } from "../../storage/db";
import { calculateBillReview } from "../../domain/bill/review";
import { formatMoneyFromCents } from "../../utils/formatting";
export function GroupActivity({ bills }: { bills: StoredBill[] }) {
  if (!bills.length)
    return (
      <div className="empty-state">
        <h3>No bills together yet.</h3>
        <p>Start a bill with this group to keep your shared history here.</p>
      </div>
    );
  return (
    <section>
      <h3>Activity</h3>
      <div className="group-activity">
        {bills.map((bill) => {
          let total = "Check split";
          try {
            total = formatMoneyFromCents(
              calculateBillReview(bill).grandTotalCents,
              bill.currency,
            );
          } catch {
            /* The bill remains available for repair. */
          }
          return (
            <Link
              className="recent-bill"
              to={"/bills/" + bill.id + "/workspace"}
              key={bill.id}
            >
              <span>
                <strong>{bill.title}</strong>
                <small>
                  {bill.status} · {bill.people.length} people ·{" "}
                  {bill.items.length} items ·{" "}
                  {new Date(bill.updatedAt).toLocaleDateString()}
                </small>
              </span>
              <strong className="money">{total}</strong>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
