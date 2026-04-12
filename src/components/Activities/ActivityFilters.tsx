import React, { useMemo } from "react";
import {
  Activity,
  ActivityFilterParams,
  Island,
  ActivityType,
} from "../../types";
import {
  SlidersHorizontal,
  MapPin,
  Tag,
  Banknote,
  Clock,
  Star,
  Users,
  Waves,
  X,
} from "lucide-react";

interface ActivityFiltersProps {
  filters: ActivityFilterParams;
  setFilters: React.Dispatch<React.SetStateAction<ActivityFilterParams>>;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const ISLAND_OPTIONS: Island[] = [
  "Port Blair",
  "Havelock",
  "Neil Island",
  "Baratang",
  "Diglipur",
  "Long Island",
];
const TYPE_OPTIONS: ActivityType[] = [
  "Scuba Diving",
  "Snorkeling",
  "Trekking",
  "History",
  "Leisure",
  "Water Sports",
  "Beaches",
];

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  filters,
  setFilters,
  isOpen,
  setIsOpen,
}) => {
  const toggleIsland = (island: Island) => {
    setFilters((prev) => ({
      ...prev,
      islands: prev.islands?.includes(island)
        ? prev.islands.filter((i) => i !== island)
        : [...(prev.islands || []), island],
    }));
  };

  const toggleType = (type: ActivityType) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types?.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...(prev.types || []), type],
    }));
  };

  const filterContent = useMemo(
    () => (
      <div className="space-y-8">
        {/* Islands */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-midnight-900 font-black tracking-wide text-sm">
            <MapPin size={16} className="text-teal-500" />
            <span>LOCATION</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ISLAND_OPTIONS.map((island) => (
              <button
                key={island}
                type="button"
                title={`Toggle ${island}`}
                onClick={() => toggleIsland(island)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  filters.islands?.includes(island)
                    ? "bg-midnight-900 text-white shadow-md"
                    : "bg-warm-50 text-warm-600 hover:bg-warm-100 hover:text-midnight-900 border border-warm-100"
                }`}
              >
                {island}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Types */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-midnight-900 font-black tracking-wide text-sm">
            <Tag size={16} className="text-teal-500" />
            <span>EXPERIENCE TYPE</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((type) => (
              <button
                key={type}
                type="button"
                title={`Toggle ${type}`}
                onClick={() => toggleType(type)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  filters.types?.includes(type)
                    ? "bg-teal-500 text-white shadow-md"
                    : "bg-warm-50 text-warm-600 hover:bg-warm-100 hover:text-midnight-900 border border-warm-100"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Budget Range */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-midnight-900 font-black tracking-wide text-sm">
              <Banknote size={16} className="text-teal-500" />
              <span>BUDGET</span>
            </div>
            <span className="text-sm font-bold text-teal-600">
              Up to ₹{filters.budgetRange[1]}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="10000"
            step="500"
            value={filters.budgetRange[1]}
            title="Budget Range"
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                budgetRange: [0, parseInt(e.target.value, 10)],
              }))
            }
            className="w-full h-2 bg-warm-100 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>

        {/* Duration Range */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-midnight-900 font-black tracking-wide text-sm">
              <Clock size={16} className="text-teal-500" />
              <span>DURATION</span>
            </div>
            <span className="text-sm font-bold text-teal-600">
              Up to {filters.durationRange[1]} min
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="480"
            step="30"
            value={filters.durationRange[1]}
            title="Duration Range"
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                durationRange: [0, parseInt(e.target.value, 10)],
              }))
            }
            className="w-full h-2 bg-warm-100 rounded-lg appearance-none cursor-pointer accent-midnight-900"
          />
        </div>

        {/* Quick Toggles */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            title="Toggle Family Friendly"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                familyFriendly: !prev.familyFriendly,
              }))
            }
            className={`w-full flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
              filters.familyFriendly
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white border-warm-100 text-warm-500 hover:border-warm-200"
            }`}
          >
            <Users
              size={24}
              className={
                filters.familyFriendly ? "text-blue-500" : "text-warm-400"
              }
            />
            <span className="text-xs font-black uppercase tracking-wider">
              Family Friendly
            </span>
          </button>

          <button
            type="button"
            title="Toggle Swimming Requirement"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                requiresSwimming:
                  prev.requiresSwimming === false ? undefined : false,
              }))
            }
            className={`w-full flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
              filters.requiresSwimming === false
                ? "bg-teal-50 border-teal-200 text-teal-700"
                : "bg-white border-warm-100 text-warm-500 hover:border-warm-200"
            }`}
          >
            <Waves
              size={24}
              className={
                filters.requiresSwimming === false
                  ? "text-teal-500"
                  : "text-warm-400"
              }
            />
            <span className="text-xs font-black uppercase tracking-wider">
              No Swim Req.
            </span>
          </button>
        </div>

        {/* Minimum Rating */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-midnight-900 font-black tracking-wide text-sm">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <span>MIN RATING</span>
            </div>
            <span className="text-sm font-bold text-amber-600">
              {filters.minRating}+ Stars
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={filters.minRating}
            title="Minimum Rating"
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                minRating: parseFloat(e.target.value),
              }))
            }
            className="w-full h-2 bg-warm-100 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      </div>
    ),
    [filters, setFilters],
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        type="button"
        title="Toggle Filters"
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden w-full flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-warm-100 shadow-sm mb-4 transition-transform active:scale-95"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={20} className="text-teal-600" />
          <span className="font-black text-midnight-900 text-sm">
            Filter & Sort
          </span>
        </div>
        {Object.keys(filters).length > 0 && (
          <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
            !
          </div>
        )}
      </button>

      {/* Filter Sidebar overlay (Mobile) / Sidebar (Desktop) */}
      <div
        className={`
        fixed inset-0 z-50 lg:static lg:z-auto lg:block
        ${isOpen ? "block" : "hidden"}
      `}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-midnight-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        {/* Content Panel */}
        <div
          className={`
          fixed bottom-0 left-0 w-full bg-white rounded-t-3xl overflow-hidden shadow-2xl transition-transform lg:static lg:w-full lg:rounded-[32px] lg:border lg:border-warm-100 lg:shadow-xl lg:translate-y-0
          ${isOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"}
        `}
        >
          <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-midnight-900 flex items-center gap-2">
                <SlidersHorizontal size={20} className="text-teal-500" />
                Refine Search
              </h2>
              <button
                type="button"
                title="Close Filters"
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-2 bg-warm-50 rounded-full text-warm-500 hover:text-midnight-900"
              >
                <X size={20} />
              </button>
            </div>

            {filterContent}
          </div>
        </div>
      </div>
    </>
  );
};
