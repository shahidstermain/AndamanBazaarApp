"use client";
import React from "react";
import { MapPin, Calendar, Wallet, ChevronRight } from "lucide-react";
import type { ItinerarySummary } from "@andaman-planner/shared";
import { formatDateRange, tripDurationDays } from "@andaman-planner/shared";
import { cn } from "./utils";

export interface ItineraryCardProps {
  itinerary: ItinerarySummary;
  onClick?: (id: string) => void;
  className?: string;
  selected?: boolean;
}

export function ItineraryCard({ itinerary, onClick, className, selected }: ItineraryCardProps) {
  const nights = tripDurationDays(itinerary.startDate, itinerary.endDate);
  const islandPreview = itinerary.islandsCovered.slice(0, 3).join(", ");
  const extraIslands = itinerary.islandsCovered.length - 3;

  return (
    <article
      onClick={() => onClick?.(itinerary.id)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(itinerary.id)}
      className={cn(
        "group bg-white rounded-2xl border-2 p-4 transition-all",
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.99]",
        selected ? "border-teal-500 shadow-md" : "border-gray-100 hover:border-teal-200",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-snug truncate group-hover:text-teal-700 transition-colors">
            {itinerary.name}
          </h3>

          <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{formatDateRange(itinerary.startDate, itinerary.endDate)}</span>
            <span className="text-gray-300">·</span>
            <span className="font-medium text-gray-700">{nights}N</span>
          </div>

          {itinerary.islandsCovered.length > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {islandPreview}
                {extraIslands > 0 && <span className="text-teal-600"> +{extraIslands} more</span>}
              </span>
            </div>
          )}

          {itinerary.estimatedBudgetRange && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <Wallet className="w-3 h-3 flex-shrink-0" />
              <span className="text-green-700 font-medium">{itinerary.estimatedBudgetRange}</span>
            </div>
          )}
        </div>

        {onClick && (
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 flex-shrink-0 mt-0.5 transition-colors" />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {itinerary.islandsCovered.map((island) => (
          <span
            key={island}
            className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full font-medium"
          >
            {island}
          </span>
        ))}
      </div>
    </article>
  );
}
