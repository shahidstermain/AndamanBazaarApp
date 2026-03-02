import { useMemo, useState } from "react";
import { ActivityCard } from "../components/ActivityCard";
import { ActivityFilters, type FilterValues } from "../components/ActivityFilters";
import { LeadFormModal } from "../components/LeadFormModal";
import { useActivities } from "../hooks/useActivities";
import { KNOWN_ACTIVITY_NAMES, KNOWN_LOCATIONS, KNOWN_TYPES } from "../lib/constants";
import type { Activity } from "../types";

const defaultFilters: FilterValues = {
  location: "",
  type: "",
  priceMin: "",
  priceMax: "",
};

export const ActivitiesPage = () => {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [page, setPage] = useState(1);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadPrefill, setLeadPrefill] = useState<{ activity?: string; location?: string }>({});

  const { activities, loading, error, meta } = useActivities({
    location: filters.location || undefined,
    type: filters.type || undefined,
    priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
    priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
    page,
    pageSize: 9,
  });

  const activityNames = useMemo(() => {
    return Array.from(new Set([...KNOWN_ACTIVITY_NAMES, ...activities.map((activity) => activity.title)]));
  }, [activities]);

  const openLeadModal = (activity: Activity) => {
    setLeadPrefill({ activity: activity.title, location: activity.location });
    setLeadOpen(true);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">All Activities</h1>
        <p className="mt-1 text-slate-600">Browse and compare water adventures across the islands.</p>
      </header>

      <ActivityFilters
        values={filters}
        onChange={(next) => {
          setPage(1);
          setFilters(next);
        }}
        locations={KNOWN_LOCATIONS}
        types={KNOWN_TYPES}
      />

      {loading && <p>Loading activities...</p>}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} onRequestBooking={openLeadModal} />
            ))}
          </div>

          {activities.length === 0 && (
            <p className="rounded-md border bg-white p-4">No activities found for selected filters.</p>
          )}

          {meta && meta.totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-md border bg-white px-3 py-2 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
                disabled={page >= meta.totalPages}
                className="rounded-md border bg-white px-3 py-2 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}

      <LeadFormModal
        isOpen={leadOpen}
        onClose={() => setLeadOpen(false)}
        availableActivities={activityNames}
        prefill={leadPrefill}
      />
    </div>
  );
};
