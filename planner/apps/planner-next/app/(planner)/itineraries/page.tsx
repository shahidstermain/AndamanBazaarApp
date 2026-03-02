import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { listItineraries } from "@andaman-planner/supabase";
import { ItineraryCard } from "@andaman-planner/ui";
import { formatDateRange } from "@andaman-planner/shared";

export const dynamic = "force-dynamic";

export default async function ItinerariesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Please sign in to view your trips.</p>
      </div>
    );
  }

  const itineraries = await listItineraries(supabase, user.id).catch(() => []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
        >
          + New Trip
        </Link>
      </div>

      {itineraries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-4">🏝️</div>
          <h3 className="text-lg font-bold text-gray-800">No trips yet</h3>
          <p className="text-gray-500 text-sm mt-1 mb-4">
            Generate your first Andaman itinerary!
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
          >
            Plan My Trip
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {itineraries.map((it) => (
            <Link key={it.id} href={`/itinerary/${it.id}`} className="block">
              <ItineraryCard itinerary={it} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
