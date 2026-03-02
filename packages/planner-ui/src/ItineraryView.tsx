import React from 'react';
import type { Itinerary } from '@andaman/planner-shared';
import { formatBudgetLabel, formatPaceLabel } from '@andaman/planner-shared';
import { cn } from './utils';

export interface ItineraryViewProps {
  itinerary: Itinerary;
  basePath?: string;
  className?: string;
}

export function ItineraryView({
  itinerary,
  basePath = '',
  className,
}: ItineraryViewProps) {
  const { preferences, days } = itinerary;
  const dateRange = `${itinerary.startDate} – ${itinerary.endDate}`;

  return (
    <div className={cn('space-y-6 text-left', className)}>
      <header>
        <h1 className="text-2xl font-bold text-teal-800">{itinerary.name}</h1>
        <p className="text-teal-600 mt-1">{dateRange}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="px-2 py-1 rounded-md bg-teal-100 text-teal-700 text-sm">
            {formatBudgetLabel(preferences.budgetLevel)}
          </span>
          <span className="px-2 py-1 rounded-md bg-teal-100 text-teal-700 text-sm">
            {formatPaceLabel(preferences.pace)}
          </span>
          <span className="px-2 py-1 rounded-md bg-teal-100 text-teal-700 text-sm">
            {preferences.travelersCount} traveler{preferences.travelersCount > 1 ? 's' : ''}
          </span>
        </div>
        {itinerary.estimatedBudgetRange && (
          <p className="mt-2 text-teal-700 font-medium">
            Estimated budget: {itinerary.estimatedBudgetRange}
          </p>
        )}
        {itinerary.islandsCovered.length > 0 && (
          <p className="mt-1 text-sm text-teal-600">
            Islands: {itinerary.islandsCovered.join(', ')}
          </p>
        )}
      </header>

      <section>
        <h2 className="text-xl font-semibold text-teal-800 mb-4">Day-by-day plan</h2>
        <div className="space-y-6">
          {days.map((day, idx) => (
            <div
              key={day.date}
              className="rounded-xl border border-teal-200 bg-white p-5 shadow-card"
            >
              <h3 className="text-lg font-semibold text-teal-800 mb-1">
                Day {idx + 1} — {day.island}
              </h3>
              <p className="text-sm text-teal-600 mb-4">{day.date}</p>
              {day.theme && (
                <p className="text-sm text-teal-700 mb-3 italic">Theme: {day.theme}</p>
              )}
              <ul className="space-y-3">
                {day.activities.map((act, aIdx) => (
                  <li key={aIdx} className="flex gap-3">
                    {act.time && (
                      <span className="text-teal-600 font-mono text-sm shrink-0">{act.time}</span>
                    )}
                    <div>
                      <strong className="text-teal-800">{act.title}</strong>
                      <p className="text-sm text-teal-600">{act.description}</p>
                      {(act.location || act.estimatedDuration || act.estimatedCost) && (
                        <p className="text-xs text-teal-500 mt-1">
                          {[act.location, act.estimatedDuration, act.estimatedCost]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {day.accommodation && (
                <p className="mt-3 text-sm text-teal-600">
                  <strong>Stay:</strong> {day.accommodation}
                </p>
              )}
              {day.travelNotes && (
                <p className="mt-2 text-sm text-teal-500 italic">{day.travelNotes}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
