import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PlannerForm, ItineraryView, ItineraryCard } from '@andaman/planner-ui';
import type { TripPreferences, Itinerary } from '@andaman/planner-shared';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export default function Planner() {
  const navigate = useNavigate();
  const [view, setView] = useState<'form' | 'result' | 'list'>('form');
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [itineraries, setItineraries] = useState<Array<{ id: string; name: string; startDate: string; endDate: string; islandsCovered: string[]; estimatedBudgetRange: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setAuthChecked(true);
    };
    void checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!authChecked) return;
    const loadItineraries = async () => {
      try {
        const session = await getSession();
        if (!session?.access_token) return;
        const res = await fetch(`${API_BASE}/api/planner/itineraries`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setItineraries(data.itineraries || []);
      } catch {
        // ignore
      }
    };
    void loadItineraries();
  }, [authChecked]);

  const handleGenerate = async (preferences: TripPreferences) => {
    setLoading(true);
    setError(null);
    try {
      const session = await getSession();
      if (!session?.access_token) {
        setError('Please sign in to generate itineraries.');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/planner/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ preferences }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate itinerary');
        setLoading(false);
        return;
      }
      setCurrentItinerary(data.itinerary);
      setView('result');
      setItineraries((prev) => [data.itinerary, ...prev]);
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleViewItinerary = async (id: string) => {
    try {
      const session = await getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${API_BASE}/api/planner/itineraries/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCurrentItinerary(data.itinerary);
      setView('result');
    } catch {
      // ignore
    }
  };

  if (!authChecked) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-teal-800 font-heading">
          Andaman Planner Pro
        </h1>
        <p className="text-teal-600 mt-2">
          AI-powered itinerary planning for the Andaman & Nicobar Islands
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setView('form')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'form' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}
        >
          New trip
        </button>
        <button
          type="button"
          onClick={() => { setView('list'); setCurrentItinerary(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'list' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}
        >
          My itineraries
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-coral-100 text-coral-800 text-sm">
          {error}
        </div>
      )}

      {view === 'form' && (
        <section className="rounded-2xl border border-teal-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold text-teal-800 mb-4">Plan your trip</h2>
          <PlannerForm onSubmit={handleGenerate} isLoading={loading} />
        </section>
      )}

      {view === 'result' && currentItinerary && (
        <section>
          <button
            type="button"
            onClick={() => setView('list')}
            className="text-sm text-teal-600 hover:text-teal-800 mb-4"
          >
            ← Back to list
          </button>
          <ItineraryView itinerary={currentItinerary} />
        </section>
      )}

      {view === 'list' && (
        <section>
          <h2 className="text-xl font-semibold text-teal-800 mb-4">Your itineraries</h2>
          {itineraries.length === 0 ? (
            <p className="text-teal-600">No itineraries yet. Create one to get started.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {itineraries.map((i) => (
                <ItineraryCard
                  key={i.id}
                  itinerary={i}
                  onClick={() => handleViewItinerary(i.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
