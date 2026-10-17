import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { Avatar } from "../components/ui/Avatar";
import { listRecentBills, type BillSummary } from "../storage/billStorage";
import { listSavedGroups } from "../storage/groupStorage";
import type { SavedGroup } from "../domain/groups/types";
import { formatMoneyFromCents } from "../utils/formatting";
export function HomePage() {
  const [data, setData] = useState<{
    bills: BillSummary[];
    groups: SavedGroup[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([listRecentBills(4), listSavedGroups()])
      .then(([bills, groups]) => {
        if (active) setData({ bills, groups: groups.slice(0, 4) });
      })
      .catch(() => {
        if (active)
          setError("Could not load your recent activity. Try reloading.");
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="page home-page">
      <header className="home-heading">
        <div>
          <p className="eyebrow">The table is yours</p>
          <h1>
            Good company.
            <br />
            <span>A fair split.</span>
          </h1>
          <p>Dinner, delivery, or the everyday things you share.</p>
        </div>
        <Link className="button button-primary" to="/bills/new">
          <Icon name="plus" />
          New bill
        </Link>
      </header>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      {!data && !error ? <p role="status">Loading your activity…</p> : null}
      <div className="home-columns">
        <section className="home-section">
          <div className="section-heading-row">
            <h2>Your groups</h2>
            <Link to="/groups">
              View all <span aria-hidden="true">↗</span>
            </Link>
          </div>
          {data?.groups.length ? (
            <div className="group-shortcuts">
              {data.groups.map((group) => (
                <Link
                  className="group-shortcut"
                  to={"/groups?group=" + encodeURIComponent(group.id)}
                  key={group.id}
                >
                  <Avatar name={group.name} />
                  <div>
                    <strong>{group.name}</strong>
                    <small>
                      {group.members
                        .filter((member) => !member.archivedAt)
                        .map((member) => member.displayName)
                        .join(", ") || "Add your people"}
                    </small>
                  </div>
                  <Icon name="arrow" />
                </Link>
              ))}
            </div>
          ) : data ? (
            <div className="empty-state">
              <h3>Your regulars, together.</h3>
              <p>Keep a group for the people you split with often.</p>
              <Link className="button" to="/groups">
                Create a group
              </Link>
            </div>
          ) : null}
        </section>
        <section className="home-section">
          <div className="section-heading-row">
            <h2>Recent bills</h2>
            <Link to="/history">
              View all <span aria-hidden="true">↗</span>
            </Link>
          </div>
          {data?.bills.length ? (
            <div className="recent-bills">
              {data.bills.map((bill) => (
                <Link
                  to={"/bills/" + bill.id + "/workspace"}
                  className="recent-bill"
                  key={bill.id}
                >
                  <span>
                    <strong>{bill.title}</strong>
                    <small>
                      {bill.peopleCount} people · {bill.status}
                    </small>
                  </span>
                  <strong className="money">
                    {bill.hasCalculationIssue
                      ? "Check split"
                      : formatMoneyFromCents(
                          bill.billTotalCents,
                          bill.currency,
                        )}
                  </strong>
                </Link>
              ))}
            </div>
          ) : data ? (
            <div className="empty-state">
              <h3>Nothing to settle yet.</h3>
              <p>Your bills will be here when you need them.</p>
              <Link to="/bills/new">
                Split your first bill <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : null}
        </section>
      </div>
      <footer className="home-footer">
        <span>USD & LBP</span>
        <span>Private by default</span>
        <span>Works offline after your first visit</span>
      </footer>
    </section>
  );
}
