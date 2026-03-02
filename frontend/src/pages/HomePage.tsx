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

export const HomePage = () => {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadPrefill, setLeadPrefill] = useState<{ activity?: string; location?: string }>({});

  const { activities, loading, error } = useActivities({
    location: filters.location || undefined,
    type: filters.type || undefined,
    priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
    priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
    page: 1,
    pageSize: 6,
    featured: true,
  });

  const activityNames = useMemo(() => {
    return Array.from(new Set([...KNOWN_ACTIVITY_NAMES, ...activities.map((item) => item.title)]));
  }, [activities]);

  const openLeadModal = (activity?: Activity) => {
    setLeadPrefill(
      activity
        ? {
            activity: activity.title,
            location: activity.location,
          }
        : {},
    );
    setLeadOpen(true);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-600 p-8 text-white">
        <h1 className="text-3xl font-bold">Discover Water Adventures in Port Blair & Andamans</h1>
        <p className="mt-2 max-w-3xl text-blue-50">
          Browse curated experiences, compare prices, and request custom itineraries with local
          operators.
        </p>
        <button
          type="button"
          onClick={() => openLeadModal()}
          className="mt-5 rounded-md bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
        >
          Plan My Adventure
        </button>
      </section>

      <ActivityFilters
        values={filters}
        onChange={setFilters}
        locations={KNOWN_LOCATIONS}
        types={KNOWN_TYPES}
      />

      <section aria-labelledby="featured-activities" className="space-y-3">
        <h2 id="featured-activities" className="text-2xl font-bold">
          Featured Activities
        </h2>
        {loading && <p>Loading activities...</p>}
        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}
        {!loading && !error && activities.length === 0 && (
          <p className="rounded-md border bg-white p-4">No activities found for selected filters.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} onRequestBooking={openLeadModal} />
          ))}
        </div>
      </section>

      <LeadFormModal
        isOpen={leadOpen}
        onClose={() => setLeadOpen(false)}
        availableActivities={activityNames}
        prefill={leadPrefill}
      />
    </div>
  );
};
