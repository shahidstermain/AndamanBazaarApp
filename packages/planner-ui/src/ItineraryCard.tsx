import React from 'react';
import type { ItinerarySummary } from '@andaman/planner-shared';
import { cn } from './utils';

export interface ItineraryCardProps {
  itinerary: ItinerarySummary;
  onClick?: () => void;
  basePath?: string;
  className?: string;
}

export function ItineraryCard({
  itinerary,
  onClick,
  basePath = '',
  className,
}: ItineraryCardProps) {
  const dateRange = `${itinerary.startDate} – ${itinerary.endDate}`;
  const islands = itinerary.islandsCovered.length > 0
    ? itinerary.islandsCovered.join(', ')
    : 'Not specified';

  return (
    <article
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'rounded-2xl border border-teal-200 bg-white p-5 shadow-card hover:shadow-card-hover transition-shadow text-left',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <h3 className="text-lg font-semibold text-teal-800 mb-2">{itinerary.name}</h3>
      <p className="text-sm text-teal-600 mb-1">{dateRange}</p>
      <p className="text-sm text-teal-600 mb-1">Islands: {islands}</p>
      {itinerary.estimatedBudgetRange && (
        <p className="text-sm text-teal-600">Budget: {itinerary.estimatedBudgetRange}</p>
      )}
    </article>
  );
}
