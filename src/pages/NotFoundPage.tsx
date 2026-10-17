import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="not-found-page">
      <div className="panel not-found-card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>
          This page is unavailable. Your saved bills are still on this device.
        </p>

        <Link className="button button-primary" to="/">
          Go home
        </Link>
      </div>
    </section>
  );
}
