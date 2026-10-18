import { hasUnsavedChanges } from "../../features/bills/unsavedChanges";
import { useEffect, useRef } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useBlocker,
} from "react-router-dom";
import { Icon } from "../ui/Icon";
import { PwaStatus } from "./PwaStatus";
const destinations = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/bills/new", label: "New bill", icon: "plus" },
  { to: "/groups", label: "Groups", icon: "groups" },
  { to: "/history", label: "History", icon: "history" },
] as const;
export function AppLayout() {
  const location = useLocation();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges() && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Leave without saving your changes?"))
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    const title = document.querySelector("h1")?.textContent;
    document.title = title ? title + " · SplitLeb" : "SplitLeb";
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="SplitLeb home">
          <img
            className="brand-mark"
            src="/splitleb-logo.png"
            alt=""
            width="40"
            height="42"
          />
          <span>
            <strong>SplitLeb</strong>
            <small>A fair share.</small>
          </span>
        </Link>
        <nav className="nav-list" aria-label="Main navigation">
          {destinations.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-note">
          On your device.
          <br />
          No account needed.
        </p>
      </aside>
      <header className="mobile-brand">
        <Link to="/">
          <img
            className="brand-mark"
            src="/splitleb-logo.png"
            alt=""
            width="24"
            height="24"
          />
          <span>
            SplitLeb<span className="brand-period">.</span>
          </span>
        </Link>
        <span>Every share, fair.</span>
      </header>
      <main id="main-content" className="main-area" tabIndex={-1} ref={mainRef}>
        <PwaStatus />
        <Outlet />
      </main>
    </div>
  );
}
