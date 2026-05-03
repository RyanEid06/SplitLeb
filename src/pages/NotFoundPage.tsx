import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="not-found-page">
      <div className="panel not-found-card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>
          This route does not exist in SplitLeb. Don’t invent pages before the
          MVP needs them.
        </p>

        <Link className="button button-primary" to="/">
          Go home
        </Link>
      </div>
    </section>
  );
}