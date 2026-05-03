import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section className="page home-page">
      <div className="home-ambient" aria-hidden="true">
        <span className="home-glow home-glow-one" />
        <span className="home-glow home-glow-two" />
        <span className="home-grid" />
      </div>

      <main className="home-hero">
        <p className="home-eyebrow">Private local bill splitter</p>

        <h1>Split bills fast. Settle cleanly.</h1>

        <p className="home-description">
          A local-first workspace for restaurant, delivery, supermarket, and
          shared bills in Lebanon.
        </p>

        <div className="home-actions">
          <Link className="button button-primary home-primary-action" to="/bills/new">
            Create bill
          </Link>
        </div>
      </main>
    </section>
  );
}