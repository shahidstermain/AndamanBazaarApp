import React from "react";
import { Activity } from "../../types";
import { Star, Clock, MapPin, ShieldCheck, Waves } from "lucide-react";
import { MatchScoreBadge } from "../Trust/MatchScoreBadge";
import { TrustScoreBadge } from "../Trust/TrustScoreBadge";

interface ActivityCardProps {
  activity: Activity;
  matchScore: number;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  matchScore,
}) => {
  // Generate a distinct gradient based on activity type to avoid placeholders
  const getGradient = (type: string) => {
    switch (type) {
      case "Scuba Diving":
        return "from-blue-600 to-cyan-400";
      case "Trekking":
        return "from-emerald-600 to-teal-400";
      case "History":
        return "from-amber-700 to-orange-500";
      case "Beaches":
        return "from-sky-500 to-blue-300";
      case "Leisure":
        return "from-purple-500 to-pink-400";
      default:
        return "from-teal-600 to-emerald-400";
    }
  };

  return (
    <div className="group relative bg-white border border-warm-200 rounded-[32px] overflow-hidden shadow-glass hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
      {/* Visual Header Banner */}
      <div
        className={`h-40 w-full relative bg-gradient-to-tr ${getGradient(activity.type)} p-6 flex items-start justify-between`}
      >
        {/* Match Score Badge */}
        <MatchScoreBadge score={matchScore} />

        {/* Floating Icons */}
        <div className="flex gap-2">
          {activity.familyFriendly && (
            <div
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"
              title="Family Friendly"
            >
              <ShieldCheck size={16} />
            </div>
          )}
          {activity.requiresSwimming && (
            <div
              className="w-8 h-8 rounded-full bg-teal-900/40 backdrop-blur-md flex items-center justify-center text-teal-100 border border-teal-500/30"
              title="Swimming Required"
            >
              <Waves size={16} />
            </div>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-2 text-[10px] text-warm-500 font-black uppercase tracking-widest mb-2">
          <span className="bg-warm-50 px-2 py-1 rounded-lg">
            {activity.type}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {activity.island}
          </span>
        </div>

        <h3 className="text-xl font-black text-midnight-900 leading-tight mb-4 group-hover:text-teal-600 transition-colors">
          {activity.title}
        </h3>

        <div className="mt-auto pt-4 border-t border-warm-100 flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-warm-400 font-bold uppercase tracking-widest leading-none mb-2">
              Price per person
            </p>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black text-midnight-900 leading-none">
                ₹{activity.price}
              </span>
              {(activity.trustScore !== undefined || activity.trustBadge) && (
                <TrustScoreBadge
                  score={activity.trustScore}
                  badge={activity.trustBadge}
                  className="w-fit"
                />
              )}
            </div>
          </div>

          <div className="space-y-2 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span className="text-sm font-black text-midnight-900 leading-none">
                {activity.rating}
              </span>
              <span className="text-[10px] text-warm-400 font-bold">
                ({activity.reviewCount})
              </span>
            </div>
            <div className="flex items-center justify-end gap-1 text-[11px] text-warm-500 font-bold">
              <Clock size={12} />
              {activity.durationMinutes} mins
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
