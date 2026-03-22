import React from 'react';
import { X, SlidersHorizontal } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

export const ACTIVITY_LOCATIONS = [
  { label: 'Any Location', value: '' },
  { label: 'Port Blair',   value: 'port-blair' },
  { label: 'Havelock',     value: 'havelock' },
  { label: 'Neil Island',  value: 'neil-island' },
  { label: 'Baratang',     value: 'baratang' },
] as const;

export const ACTIVITY_CATEGORIES = [
  { label: 'All Categories', value: '' },
  { label: '🤿 Water Sports', value: 'water-sports' },
  { label: '🏛️ History',      value: 'history' },
  { label: '🥾 Trekking',     value: 'trekking' },
  { label: '🌴 Leisure',      value: 'leisure' },
] as const;

export const DURATION_OPTIONS = [
  { label: '< 2 Hours', value: '<2h' },
  { label: 'Half Day',  value: 'half-day' },
  { label: 'Full Day',  value: 'full-day' },
] as const;

export const PRICE_MIN = 500;
export const PRICE_MAX = 10000;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityFilters {
  location: string;
  category: string;
  priceMin: number;
  priceMax: number;
  durations: string[];
}

export const DEFAULT_FILTERS: ActivityFilters = {
  location: '',
  category: '',
  priceMin: PRICE_MIN,
  priceMax: PRICE_MAX,
  durations: [],
};

// ── Helper ────────────────────────────────────────────────────────────────────

const formatPrice = (v: number) =>
  v >= PRICE_MAX ? '₹10,000+' : `₹${v.toLocaleString('en-IN')}`;

// ── Component ─────────────────────────────────────────────────────────────────

interface FilterSidebarProps {
  filters: ActivityFilters;
  onChange: (filters: ActivityFilters) => void;
  /** Mobile: whether the sidebar overlay is open */
  isOpen?: boolean;
  onClose?: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onChange,
  isOpen = true,
  onClose,
}) => {
  const update = (partial: Partial<ActivityFilters>) =>
    onChange({ ...filters, ...partial });

  const toggleDuration = (val: string) => {
    const next = filters.durations.includes(val)
      ? filters.durations.filter((d) => d !== val)
      : [...filters.durations, val];
    update({ durations: next });
  };

  const hasActiveFilters =
    filters.location !== '' ||
    filters.category !== '' ||
    filters.priceMin !== PRICE_MIN ||
    filters.priceMax !== PRICE_MAX ||
    filters.durations.length > 0;

  const clearAll = () => onChange(DEFAULT_FILTERS);

  const inner = (
    <div className="bg-white rounded-3xl border border-warm-200 shadow-card p-6 space-y-7 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-teal-500" />
          <h2 className="font-heading font-black text-midnight-700 text-sm uppercase tracking-wider">
            Filters
          </h2>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-[10px] font-bold text-teal-600 hover:text-teal-800 transition-colors uppercase tracking-wider"
            >
              Clear All
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close filters"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-warm-400 hover:text-midnight-700 hover:bg-warm-100 transition-colors lg:hidden"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Location ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black text-warm-400 uppercase tracking-widest">
          Location
        </h3>
        <div className="space-y-2">
          {ACTIVITY_LOCATIONS.map(({ label, value }) => (
            <label
              key={value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="radio"
                name="activity-location"
                value={value}
                checked={filters.location === value}
                onChange={() => update({ location: value })}
                className="sr-only"
              />
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  filters.location === value
                    ? 'border-teal-500 bg-teal-500'
                    : 'border-warm-300 group-hover:border-teal-400'
                }`}
              >
                {filters.location === value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </span>
              <span
                className={`text-sm font-semibold transition-colors ${
                  filters.location === value
                    ? 'text-teal-700'
                    : 'text-midnight-700 group-hover:text-teal-600'
                }`}
              >
                {label}
              </span>
            </label>
          ))}
        </div>
      </section>

      <hr className="border-warm-100" />

      {/* ── Price Range ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-warm-400 uppercase tracking-widest">
          Price Range
        </h3>
        <div className="space-y-3">
          {/* Min slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-warm-400">
              <span>Min</span>
              <span className="text-teal-600">{formatPrice(filters.priceMin)}</span>
            </div>
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={500}
              value={filters.priceMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                update({ priceMin: Math.min(v, filters.priceMax - 500) });
              }}
              className="w-full accent-teal-500 cursor-pointer"
              aria-label="Minimum price"
            />
          </div>
          {/* Max slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-warm-400">
              <span>Max</span>
              <span className="text-teal-600">{formatPrice(filters.priceMax)}</span>
            </div>
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={500}
              value={filters.priceMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                update({ priceMax: Math.max(v, filters.priceMin + 500) });
              }}
              className="w-full accent-teal-500 cursor-pointer"
              aria-label="Maximum price"
            />
          </div>
          {/* Range visual */}
          <div className="flex justify-between text-xs font-bold text-midnight-700 bg-teal-50 rounded-xl px-3 py-2 border border-teal-100">
            <span>{formatPrice(filters.priceMin)}</span>
            <span className="text-warm-300">–</span>
            <span>{formatPrice(filters.priceMax)}</span>
          </div>
        </div>
      </section>

      <hr className="border-warm-100" />

      {/* ── Duration ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black text-warm-400 uppercase tracking-widest">
          Duration
        </h3>
        <div className="space-y-2">
          {DURATION_OPTIONS.map(({ label, value }) => {
            const checked = filters.durations.includes(value);
            return (
              <label
                key={value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDuration(value)}
                  className="sr-only"
                />
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                    checked
                      ? 'border-teal-500 bg-teal-500'
                      : 'border-warm-300 group-hover:border-teal-400'
                  }`}
                >
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4l3 3 5-6"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm font-semibold transition-colors ${
                    checked
                      ? 'text-teal-700'
                      : 'text-midnight-700 group-hover:text-teal-600'
                  }`}
                >
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <hr className="border-warm-100" />

      {/* ── Category ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black text-warm-400 uppercase tracking-widest">
          Activity Category
        </h3>
        <select
          value={filters.category}
          onChange={(e) => update({ category: e.target.value })}
          aria-label="Filter by activity category"
          className="w-full input-island text-sm"
        >
          {ACTIVITY_CATEGORIES.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </section>
    </div>
  );

  return (
    <>
      {/* ── Desktop: always-visible sidebar ─────────────────────────────── */}
      <aside className="hidden lg:block w-72 flex-shrink-0">{inner}</aside>

      {/* ── Mobile: slide-in overlay drawer ─────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
          />
          {/* Panel */}
          <div className="relative ml-auto w-[320px] max-w-full h-full bg-transparent overflow-y-auto p-4 animate-slide-up">
            {inner}
          </div>
        </div>
      )}
    </>
  );
};
