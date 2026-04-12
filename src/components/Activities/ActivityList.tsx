import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ActivityCard } from "./ActivityCard";
import { Activity } from "../../types";
import { SearchX, ArrowUpDown } from "lucide-react";

type SortOption = "match" | "price_asc" | "rating_desc" | "duration_asc";

interface ActivityListProps {
  activities: (Activity & { matchScore: number })[];
  isLoading: boolean;
}

const SkeletonCard = () => (
  <div className="bg-white border border-warm-200 rounded-[32px] overflow-hidden h-full flex flex-col animate-pulse">
    <div className="h-40 w-full bg-warm-100"></div>
    <div className="p-6 flex flex-col flex-grow space-y-4">
      <div className="h-4 w-24 bg-warm-100 rounded-lg"></div>
      <div className="h-6 w-3/4 bg-warm-200 rounded-xl"></div>
      <div className="mt-auto pt-4 border-t border-warm-100 flex justify-between">
        <div className="h-8 w-20 bg-warm-100 rounded-xl"></div>
        <div className="h-8 w-24 bg-warm-100 rounded-xl"></div>
      </div>
    </div>
  </div>
);

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  isLoading,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>("match");

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.price - b.price;
        case "rating_desc":
          return b.rating - a.rating;
        case "duration_asc":
          return a.durationMinutes - b.durationMinutes;
        case "match":
        default:
          return b.matchScore - a.matchScore;
      }
    });
  }, [activities, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="h-8 w-48 bg-warm-100 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in bg-white rounded-3xl border border-warm-100 h-96">
        <div className="w-24 h-24 bg-warm-50 rounded-[32px] flex items-center justify-center mb-6">
          <SearchX size={40} className="text-warm-300" />
        </div>
        <h3 className="text-2xl font-black text-midnight-900 mb-2">
          No activities match your filters
        </h3>
        <p className="text-warm-500 font-bold max-w-xs">
          Try adjusting your budget, duration, or interests to discover more
          amazing experiences.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Sort Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-black text-midnight-900 tracking-wide">
          {activities.length}{" "}
          {activities.length === 1 ? "Activity" : "Activities"} Found
        </h3>

        <div className="relative group">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-warm-200 cursor-pointer shadow-sm hover:border-teal-500 transition-colors">
            <ArrowUpDown
              size={16}
              className="text-warm-500 group-hover:text-teal-600"
            />
            <select
              value={sortBy}
              title="Sort activities"
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-transparent text-sm font-bold text-midnight-900 focus:outline-none cursor-pointer pr-4 w-full"
            >
              <option value="match">Match Score (🔥)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="rating_desc">Top Rated</option>
              <option value="duration_asc">Duration: Shortest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedActivities.map((activity) => (
          <Link
            key={activity.id}
            to={`/activities/${activity.id}`}
            className="animate-fade-in transition-all block"
          >
            <ActivityCard
              activity={activity}
              matchScore={activity.matchScore}
            />
          </Link>
        ))}
      </div>
    </div>
  );
};
