import { Link, NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

export const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-bold text-blue-700">
            AndamanBazaar
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-2">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/activities" className={navLinkClass}>
              Activities
            </NavLink>
            <NavLink to="/admin/leads" className={navLinkClass}>
              Admin Leads
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
};
