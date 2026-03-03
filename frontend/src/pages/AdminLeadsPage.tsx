import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { AdminAuth, Lead, LeadStatus } from "../types";

const AUTH_STORAGE_KEY = "andamanbazaar-admin-auth";

const readStoredAuth = (): AdminAuth => {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as AdminAuth;
  } catch {
    return {};
  }
};

export const AdminLeadsPage = () => {
  const [auth, setAuth] = useState<AdminAuth>(() => readStoredAuth());
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth.apiKey || auth.username));

  const saveAuth = (next: AdminAuth) => {
    setAuth(next);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  };

  const loadLeads = useCallback(async () => {
    if (!auth.apiKey && !(auth.username && auth.password)) {
      setIsAuthenticated(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await api.getAdminLeads(auth, statusFilter || undefined);
      setLeads(response.data);
      setIsAuthenticated(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load leads");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [auth, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadLeads();
    }
  }, [isAuthenticated, loadLeads]);

  const summary = useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter((lead) => lead.status === "new").length,
      contacted: leads.filter((lead) => lead.status === "contacted").length,
      confirmed: leads.filter((lead) => lead.status === "confirmed").length,
    };
  }, [leads]);

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    try {
      await api.updateLeadStatus(leadId, status, auth);
      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update lead");
    }
  };

  const logout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth({});
    setLeads([]);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Admin Leads Access</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use API key or basic auth credentials to view lead submissions.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveAuth(auth);
            setIsAuthenticated(true);
          }}
        >
          <div>
            <label htmlFor="apiKey" className="mb-1 block text-sm font-medium">
              Admin API Key (optional)
            </label>
            <input
              id="apiKey"
              value={auth.apiKey ?? ""}
              onChange={(event) => setAuth((prev) => ({ ...prev, apiKey: event.target.value }))}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium">
                Basic Auth Username
              </label>
              <input
                id="username"
                value={auth.username ?? ""}
                onChange={(event) => setAuth((prev) => ({ ...prev, username: event.target.value }))}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Basic Auth Password
              </label>
              <input
                id="password"
                type="password"
                value={auth.password ?? ""}
                onChange={(event) => setAuth((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white">
            Enter Admin Dashboard
          </button>
        </form>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lead Dashboard</h1>
          <p className="text-sm text-slate-600">
            Total: {summary.total} | New: {summary.new} | Contacted: {summary.contacted} |
            Confirmed: {summary.confirmed}
          </p>
        </div>
        <button type="button" onClick={logout} className="rounded-md border bg-white px-3 py-2 text-sm">
          Logout
        </button>
      </header>

      <div className="flex items-center gap-3">
        <label htmlFor="status-filter" className="text-sm font-medium">
          Filter by status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as LeadStatus | "")}
          className="rounded-md border px-3 py-2"
        >
          <option value="">All</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="confirmed">Confirmed</option>
        </select>
        <button
          type="button"
          onClick={() => void loadLeads()}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Refresh
        </button>
      </div>

      {loading && <p>Loading leads...</p>}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Created</th>
              <th className="px-3 py-2 text-left font-semibold">Name</th>
              <th className="px-3 py-2 text-left font-semibold">Phone</th>
              <th className="px-3 py-2 text-left font-semibold">Location</th>
              <th className="px-3 py-2 text-left font-semibold">Activities</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="px-3 py-2">{new Date(lead.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{lead.name}</td>
                <td className="px-3 py-2">{lead.phone}</td>
                <td className="px-3 py-2">{lead.location}</td>
                <td className="px-3 py-2">{lead.activities.join(", ")}</td>
                <td className="px-3 py-2">
                  <select
                    value={lead.status}
                    onChange={(event) => void updateStatus(lead.id, event.target.value as LeadStatus)}
                    className="rounded-md border px-2 py-1"
                    aria-label={`Set status for ${lead.name}`}
                  >
                    <option value="new">new</option>
                    <option value="contacted">contacted</option>
                    <option value="confirmed">confirmed</option>
                  </select>
                </td>
              </tr>
            ))}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
