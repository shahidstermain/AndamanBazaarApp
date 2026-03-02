import React, { useState } from 'react';
import type { TripPreferences } from '@andaman/planner-shared';
import { cn } from './utils';

const BUDGET_OPTIONS = [
  { value: 'budget' as const, label: 'Budget-friendly' },
  { value: 'midrange' as const, label: 'Mid-range' },
  { value: 'premium' as const, label: 'Premium' },
];

const PACE_OPTIONS = [
  { value: 'relaxed' as const, label: 'Relaxed' },
  { value: 'balanced' as const, label: 'Balanced' },
  { value: 'packed' as const, label: 'Action-packed' },
];

const ANDAMAN_ISLANDS = [
  'Port Blair',
  'Havelock',
  'Neil Island',
  'Baratang',
  'Ross Island',
  'North Bay',
  'Jolly Buoy',
  'Red Skin',
  'Long Island',
  'Diglipur',
  'Rangat',
  'Mayabunder',
];

const INTERESTS = [
  'Beaches & snorkeling',
  'Scuba diving',
  'Trekking & nature',
  'History & culture',
  'Wildlife',
  'Water sports',
  'Island hopping',
  'Relaxation',
  'Photography',
  'Local cuisine',
];

export interface PlannerFormProps {
  onSubmit: (preferences: TripPreferences) => void | Promise<void>;
  isLoading?: boolean;
  basePath?: string;
  className?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function PlannerForm({
  onSubmit,
  isLoading = false,
  basePath = '',
  className,
}: PlannerFormProps) {
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [travelersCount, setTravelersCount] = useState(2);
  const [budgetLevel, setBudgetLevel] = useState<TripPreferences['budgetLevel']>('midrange');
  const [pace, setPace] = useState<TripPreferences['pace']>('balanced');
  const [interests, setInterests] = useState<string[]>([]);
  const [preferredIslands, setPreferredIslands] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleInterest = (v: string) => {
    setInterests((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const toggleIsland = (v: string) => {
    setPreferredIslands((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prefs: TripPreferences = {
      startDate,
      endDate,
      travelersCount,
      budgetLevel,
      pace,
      interests,
      preferredIslands,
      notes: notes.trim() || null,
    };
    if (new Date(endDate) < new Date(startDate)) {
      setErrors({ endDate: 'End date must be on or after start date' });
      return;
    }
    setErrors({});
    void onSubmit(prefs);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-6 text-left', className)}
      aria-label="Trip preferences form"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-teal-700 mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-teal-200 px-4 py-2.5 text-teal-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-teal-700 mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-teal-200 px-4 py-2.5 text-teal-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            required
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-coral-600">{errors.endDate}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-700 mb-1">Number of travelers</label>
        <input
          type="number"
          min={1}
          max={20}
          value={travelersCount}
          onChange={(e) => setTravelersCount(Number(e.target.value))}
          className="w-full rounded-lg border border-teal-200 px-4 py-2.5 text-teal-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-700 mb-2">Budget level</label>
        <div className="flex flex-wrap gap-2">
          {BUDGET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBudgetLevel(opt.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                budgetLevel === opt.value
                  ? 'bg-teal-600 text-white shadow-teal-glow'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-700 mb-2">Pace</label>
        <div className="flex flex-wrap gap-2">
          {PACE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPace(opt.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                pace === opt.value
                  ? 'bg-teal-600 text-white shadow-teal-glow'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-700 mb-2">Interests</label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleInterest(opt)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                interests.includes(opt)
                  ? 'bg-coral-500 text-white'
                  : 'bg-warm-200 text-teal-800 hover:bg-warm-300'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-700 mb-2">Preferred islands</label>
        <div className="flex flex-wrap gap-2">
          {ANDAMAN_ISLANDS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleIsland(opt)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                preferredIslands.includes(opt)
                  ? 'bg-teal-600 text-white'
                  : 'bg-warm-200 text-teal-800 hover:bg-warm-300'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-700 mb-1">Additional notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Dietary requirements, accessibility needs, special requests..."
          rows={3}
          className="w-full rounded-lg border border-teal-200 px-4 py-2.5 text-teal-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full sm:w-auto px-8 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-teal-glow"
      >
        {isLoading ? 'Generating your itinerary…' : 'Generate itinerary'}
      </button>
    </form>
  );
}
