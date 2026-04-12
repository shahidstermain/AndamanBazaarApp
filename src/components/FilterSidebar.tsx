import React, { useState } from "react";
import {
  SlidersHorizontal,
  MapPin,
  Clock,
  Tag,
  IndianRupee,
} from "lucide-react";

export type DurationOption = "< 2 hours" | "Half Day" | "Full Day";

export interface FilterState {
  location: string;
  category: string;
  minPrice: number | "";
  maxPrice: number | "";
  durations: DurationOption[];
}

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  className?: string;
}

const LOCATIONS = [
  "Port Blair",
  "Havelock",
  "Neil Island",
  "Baratang",
  "Diglipur",
  "All Locations",
];
const CATEGORIES = [
  "All Categories",
  "Water Sports",
  "History",
  "Trekking",
  "Leisure",
  "Experiences",
];
const DURATIONS: DurationOption[] = ["< 2 hours", "Half Day", "Full Day"];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onChange,
  className = "",
}) => {
  const [localPriceParams, setLocalPriceParams] = useState({
    min: filters.minPrice,
    max: filters.maxPrice,
  });

  const handleLocationChange = (loc: string) => {
    onChange({ ...filters, location: loc === "All Locations" ? "" : loc });
  };

  const handleCategoryChange = (cat: string) => {
    onChange({ ...filters, category: cat === "All Categories" ? "" : cat });
  };

  const handleDurationToggle = (dur: DurationOption) => {
    const newDurations = filters.durations.includes(dur)
      ? filters.durations.filter((d) => d !== dur)
      : [...filters.durations, dur];
    onChange({ ...filters, durations: newDurations });
  };

  const applyPrice = () => {
    onChange({
      ...filters,
      minPrice: localPriceParams.min,
      maxPrice: localPriceParams.max,
    });
  };

  const clearAll = () => {
    onChange({
      location: "",
      category: "",
      minPrice: "",
      maxPrice: "",
      durations: [],
    });
    setLocalPriceParams({ min: "", max: "" });
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-warm-200 shadow-sm p-5 space-y-8 ${className}`}
    >
      <div className="flex items-center justify-between pb-4 border-b border-warm-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-teal-600" />
          <h2 className="font-heading font-black text-midnight-800 text-lg">
            Filters
          </h2>
        </div>
        <button
          onClick={clearAll}
          className="text-xs font-bold text-teal-600 hover:text-teal-700 transition"
        >
          CLEAR ALL
        </button>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-midnight-800 font-bold mb-3">
          <MapPin size={16} className="text-warm-400" />
          <h3>Location</h3>
        </div>
        <div className="space-y-2">
          {LOCATIONS.map((loc) => {
            const isChecked =
              filters.location === loc ||
              (loc === "All Locations" && !filters.location);
            return (
              <label
                key={loc}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? "border-teal-500 bg-teal-500" : "border-warm-300 group-hover:border-teal-400"}`}
                >
                  {isChecked && (
                    <div className="w-2.5 h-2.5 bg-white rounded-sm" />
                  )}
                </div>
                <span
                  className={`text-sm ${isChecked ? "font-bold text-midnight-800" : "text-warm-500"}`}
                >
                  {loc}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-warm-100" />

      {/* Category */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-midnight-800 font-bold mb-3">
          <Tag size={16} className="text-warm-400" />
          <h3>Category</h3>
        </div>
        <div className="space-y-2">
          {CATEGORIES.map((cat) => {
            const isChecked =
              filters.category === cat ||
              (cat === "All Categories" && !filters.category);
            return (
              <label
                key={cat}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isChecked ? "border-teal-500 border-4" : "border-warm-300 group-hover:border-teal-400"}`}
                />
                <span
                  className={`text-sm ${isChecked ? "font-bold text-midnight-800" : "text-warm-500"}`}
                >
                  {cat}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-warm-100" />

      {/* Price */}
      <div className="space-y-4">
        <div className="flex items-center justify-between font-bold mb-3">
          <div className="flex items-center gap-2 text-midnight-800">
            <IndianRupee size={16} className="text-warm-400" />
            <h3>Price Range</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 text-xs font-bold">
              ₹
            </span>
            <input
              type="number"
              placeholder="Min"
              value={localPriceParams.min}
              onChange={(e) =>
                setLocalPriceParams((p) => ({
                  ...p,
                  min: e.target.value ? Number(e.target.value) : "",
                }))
              }
              onBlur={applyPrice}
              className="w-full bg-warm-50 border border-warm-200 rounded-lg py-2 pl-7 pr-3 text-sm font-medium focus:outline-none focus:border-teal-400 transition"
            />
          </div>
          <span className="text-warm-300 font-bold">-</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 text-xs font-bold">
              ₹
            </span>
            <input
              type="number"
              placeholder="Max"
              value={localPriceParams.max}
              onChange={(e) =>
                setLocalPriceParams((p) => ({
                  ...p,
                  max: e.target.value ? Number(e.target.value) : "",
                }))
              }
              onBlur={applyPrice}
              className="w-full bg-warm-50 border border-warm-200 rounded-lg py-2 pl-7 pr-3 text-sm font-medium focus:outline-none focus:border-teal-400 transition"
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-warm-100" />

      {/* Duration */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-midnight-800 font-bold mb-3">
          <Clock size={16} className="text-warm-400" />
          <h3>Duration</h3>
        </div>
        <div className="space-y-2">
          {DURATIONS.map((dur) => {
            const isChecked = filters.durations.includes(dur);
            return (
              <label
                key={dur}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? "border-teal-500 bg-teal-500" : "border-warm-300 group-hover:border-teal-400"}`}
                >
                  {isChecked && (
                    <div className="w-2.5 h-2.5 bg-white rounded-sm" />
                  )}
                </div>
                <span
                  className={`text-sm ${isChecked ? "font-bold text-midnight-800" : "text-warm-500"}`}
                >
                  {dur}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
