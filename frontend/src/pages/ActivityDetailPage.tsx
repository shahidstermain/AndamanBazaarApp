import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LeadFormModal } from "../components/LeadFormModal";
import { api } from "../lib/api";
import { KNOWN_ACTIVITY_NAMES } from "../lib/constants";
import type { Activity } from "../types";

export const ActivityDetailPage = () => {
  const { slug = "" } = useParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const item = await api.getActivityBySlug(slug);
        if (!cancelled) setActivity(item);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load activity");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const availableActivities = useMemo(() => {
    if (!activity) return KNOWN_ACTIVITY_NAMES;
    return Array.from(new Set([...KNOWN_ACTIVITY_NAMES, activity.title]));
  }, [activity]);

  if (loading) return <p>Loading activity details...</p>;
  if (error) return <p className="rounded-md bg-red-50 p-3 text-red-700">{error}</p>;
  if (!activity) return <p>Activity not found.</p>;

  return (
    <div className="space-y-6">
      <Link to="/activities" className="text-sm font-medium text-blue-700">
        ← Back to all activities
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{activity.title}</h1>
        <p className="text-slate-600">{activity.description}</p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        {(activity.images.length > 0 ? activity.images : ["/images/placeholder.jpg"]).map(
          (image) => (
            <img
              key={image}
              src={image}
              alt={`${activity.title} experience`}
              className="h-64 w-full rounded-xl object-cover"
            />
          ),
        )}
      </section>

      <section className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Activity Info</h2>
          <dl className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Location</dt>
              <dd>{activity.location}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Duration</dt>
              <dd>{activity.duration_minutes} minutes</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Price Range</dt>
              <dd>
                ₹{activity.price_min.toLocaleString()} - ₹{activity.price_max.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Minimum Age</dt>
              <dd>{activity.age_min ?? "No strict limit"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Fitness Notes</dt>
              <dd>{activity.safety_notes}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Operator</h2>
          {activity.operator ? (
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Name</dt>
                <dd>{activity.operator.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Phone</dt>
                <dd>{activity.operator.phone ?? "N/A"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Email</dt>
                <dd>{activity.operator.email ?? "N/A"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Location</dt>
                <dd>{activity.operator.location}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Operator info not available yet.</p>
          )}

          <button
            type="button"
            onClick={() => setLeadOpen(true)}
            className="mt-5 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Request Booking
          </button>
        </div>
      </section>

      <LeadFormModal
        isOpen={leadOpen}
        onClose={() => setLeadOpen(false)}
        availableActivities={availableActivities}
        prefill={{
          activity: activity.title,
          location: activity.location,
        }}
      />
    </div>
  );
};
