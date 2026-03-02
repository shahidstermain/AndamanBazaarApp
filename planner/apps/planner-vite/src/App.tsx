/**
 * Vite Demo Harness for Andaman Planner Pro
 *
 * This app proves that @andaman-planner/ui components embed cleanly
 * into a Vite + React + TypeScript + Tailwind environment — mirroring
 * the AndamanBazaar.in production setup.
 *
 * For production AndamanBazaar embed, see INTEGRATION.md.
 */
import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import {
  PlannerForm,
  ItineraryView,
  ItineraryCard,
  LoadingSpinner,
} from "@andaman-planner/ui";
import type { TripPreferences, Itinerary, ItinerarySummary } from "@andaman-planner/shared";

// Supabase client (reads VITE_ env vars or falls back to demo mode)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder"
);

// API base URL — point this to your planner-next server
const API_BASE = import.meta.env.VITE_PLANNER_API_URL ?? "http://localhost:3001";

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-teal-700 text-lg flex items-center gap-2">
            🏝️ Andaman Planner Pro
            <span className="text-xs bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full font-normal">
              Vite Demo
            </span>
          </Link>
          <Link to="/trips" className="text-sm text-gray-600 hover:text-teal-700 transition-colors">
            My Trips
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<PlannerRoute />} />
          <Route path="/trips" element={<TripsRoute />} />
          <Route path="/itinerary/:id" element={<ItineraryRoute />} />
        </Routes>
      </main>

      <DemoBanner />
    </div>
  );
}

// ─── Planner route ────────────────────────────────────────────────────────────
function PlannerRoute() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedItinerary, setGeneratedItinerary] = useState<Itinerary | null>(null);

  async function handleSubmit(preferences: TripPreferences) {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${API_BASE}/api/planner/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ preferences }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setGeneratedItinerary(data.itinerary);
      navigate(`/itinerary/${data.itinerary.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Plan Your Andaman Trip ✨</h1>
        <p className="text-gray-500 mt-2">
          AI-powered personalised itinerary for the Andaman &amp; Nicobar Islands
        </p>
      </div>
      <PlannerForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
    </div>
  );
}

// ─── Trips list route ────────────────────────────────────────────────────────
function TripsRoute() {
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<ItinerarySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_BASE}/api/planner/itineraries`, {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        });
        if (res.ok) {
          const data = await res.json();
          setItineraries(data.itineraries ?? []);
        }
      } catch {
        // demo mode: no-op
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Trips</h2>
        <Link to="/" className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">
          + New Trip
        </Link>
      </div>
      {itineraries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <div className="text-5xl mb-3">🏝️</div>
          <p className="text-gray-600">No trips yet — generate one!</p>
          <Link to="/" className="inline-block mt-3 px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold">
            Plan My Trip
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {itineraries.map((it) => (
            <ItineraryCard
              key={it.id}
              itinerary={it}
              onClick={(id) => navigate(`/itinerary/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single itinerary route ──────────────────────────────────────────────────
function ItineraryRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_BASE}/api/planner/itineraries/${id}`, {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItinerary(data.itinerary);
      } catch (err) {
        setError("Could not load itinerary.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading itinerary…" />;
  if (error || !itinerary) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">{error ?? "Itinerary not found."}</p>
        <button onClick={() => navigate("/")} className="mt-3 text-teal-600 underline text-sm">
          ← Back to planner
        </button>
      </div>
    );
  }

  return (
    <ItineraryView
      itinerary={itinerary}
      onBack={() => navigate("/trips")}
    />
  );
}

// ─── Demo banner ────────────────────────────────────────────────────────────
function DemoBanner() {
  const hasCreds =
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_PLANNER_API_URL;

  if (hasCreds) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-amber-50 border-t border-amber-200 px-4 py-2.5 text-center text-xs text-amber-700 z-50">
      ⚙️ Demo mode — set <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code>,{" "}
      <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>, and{" "}
      <code className="bg-amber-100 px-1 rounded">VITE_PLANNER_API_URL</code> in{" "}
      <code className="bg-amber-100 px-1 rounded">.env</code> to enable full functionality.
      See <code>INTEGRATION.md</code>.
    </div>
  );
}
