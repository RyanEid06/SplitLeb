import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/bills/new", label: "New bill" },
  { to: "/groups", label: "Saved groups" },
  { to: "/history", label: "History" },
];

function shouldStartCollapsed() {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(max-width: 760px)").matches;
}

export function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(shouldStartCollapsed);

  function closeSidebarOnSmallScreen() {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 760px)").matches
    ) {
      setIsSidebarCollapsed(true);
    }
  }

  return (
    <div
      className={
        isSidebarCollapsed
          ? "app-shell app-shell-sidebar-collapsed"
          : "app-shell"
      }
    >
      <button
        type="button"
        className="sidebar-toggle-button"
        onClick={() => setIsSidebarCollapsed((current) => !current)}
        aria-label={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        aria-expanded={!isSidebarCollapsed}
        aria-controls="primary-sidebar"
        title={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
      >
        ☰
      </button>

      <aside id="primary-sidebar" className="sidebar">
        <div className="brand">
          <div className="brand-mark">SL</div>
          <div>
            <strong>SplitLeb</strong>
            <span>Local bill splitter</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeSidebarOnSmallScreen}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {!isSidebarCollapsed ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      ) : null}

      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}