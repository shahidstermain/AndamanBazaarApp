"use client";
import React, { useState } from "react";
import {
  MapPin, Calendar, Wallet, Clock, ChevronDown, ChevronUp,
  Navigation, Utensils, Bed, Lightbulb, Users, Download
} from "lucide-react";
import type { Itinerary, ItineraryDay, Activity, TransportDetail } from "@andaman-planner/shared";
import { formatDate, formatDateRange, formatInr, tripDurationDays, budgetLevelLabel } from "@andaman-planner/shared";
import { cn } from "./utils";

export interface ItineraryViewProps {
  itinerary: Itinerary;
  onBack?: () => void;
  onSave?: (itinerary: Itinerary) => Promise<void>;
  className?: string;
}

export function ItineraryView({ itinerary, onBack, onSave, className }: ItineraryViewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [saving, setSaving] = useState(false);
  const nights = tripDurationDays(itinerary.startDate, itinerary.endDate);

  function toggleDay(day: number) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(itinerary);
    } finally {
      setSaving(false);
    }
  }

  const totalEstimate = itinerary.days.reduce((sum, d) => sum + d.estimatedCost, 0);

  return (
    <div className={cn("max-w-3xl mx-auto", className)}>
      {/* Hero header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 rounded-2xl p-6 text-white mb-6 shadow-lg">
        {onBack && (
          <button
            onClick={onBack}
            className="text-teal-200 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors"
          >
            ← Back
          </button>
        )}
        <h1 className="text-2xl font-bold leading-tight">{itinerary.name}</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Stat icon={<Calendar className="w-4 h-4" />} label="Duration" value={`${nights} nights`} />
          <Stat icon={<MapPin className="w-4 h-4" />} label="Islands" value={`${itinerary.islandsCovered.length} islands`} />
          <Stat icon={<Wallet className="w-4 h-4" />} label="Budget" value={itinerary.estimatedBudgetRange} compact />
          <Stat icon={<Calendar className="w-4 h-4" />} label="Dates" value={formatDateRange(itinerary.startDate, itinerary.endDate)} compact />
        </div>

        {/* Island pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {itinerary.islandsCovered.map((island) => (
            <span key={island} className="px-2.5 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-medium">
              📍 {island}
            </span>
          ))}
        </div>

        <div className="flex gap-2 mt-5">
          {onSave && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-white text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-all disabled:opacity-60"
            >
              {saving ? "Saving…" : "💾 Save Itinerary"}
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white/20 text-white rounded-xl text-sm font-medium hover:bg-white/30 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Print / Export
          </button>
        </div>
      </div>

      {/* Day-by-day */}
      <div className="space-y-4">
        {itinerary.days.map((day) => (
          <DayCard
            key={day.day}
            day={day}
            expanded={expandedDays.has(day.day)}
            onToggle={() => toggleDay(day.day)}
          />
        ))}
      </div>

      {/* Budget summary */}
      <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
        <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
          <Wallet className="w-5 h-5" /> Budget Estimate
        </h3>
        <div className="space-y-1.5">
          {itinerary.days.map((day) => (
            <div key={day.day} className="flex justify-between text-sm">
              <span className="text-gray-600">
                Day {day.day} — {day.island}
              </span>
              <span className="font-medium text-gray-800">{formatInr(day.estimatedCost)}</span>
            </div>
          ))}
          <div className="border-t border-green-300 pt-2 mt-2 flex justify-between font-bold">
            <span className="text-green-800">Total (per person)</span>
            <span className="text-green-700">{formatInr(totalEstimate)}</span>
          </div>
        </div>
        <p className="text-xs text-green-600 mt-2">
          ✱ Estimates are approximate and exclude international/domestic flights to Port Blair.
        </p>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Generated by {itinerary.modelVersion} · {new Date(itinerary.createdAt).toLocaleDateString("en-IN")}
      </p>
    </div>
  );
}

// ─── DayCard ──────────────────────────────────────────────────────────────────
function DayCard({
  day,
  expanded,
  onToggle,
}: {
  day: ItineraryDay;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Day header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            D{day.day}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{day.title}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {day.island} · {formatDate(day.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            {formatInr(day.estimatedCost)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">{day.description}</p>

          {/* Transport */}
          {day.transport.length > 0 && (
            <SubSection icon={<Navigation className="w-4 h-4" />} title="Getting There" color="blue">
              <div className="space-y-2">
                {day.transport.map((t, i) => (
                  <TransportItem key={i} transport={t} />
                ))}
              </div>
            </SubSection>
          )}

          {/* Activities */}
          {day.activities.length > 0 && (
            <SubSection icon={<Clock className="w-4 h-4" />} title="Activities" color="teal">
              <div className="space-y-3">
                {day.activities.map((a, i) => (
                  <ActivityItem key={i} activity={a} />
                ))}
              </div>
            </SubSection>
          )}

          {/* Meals */}
          {day.meals.length > 0 && (
            <SubSection icon={<Utensils className="w-4 h-4" />} title="Meals" color="orange">
              <ul className="space-y-1">
                {day.meals.map((meal, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="text-orange-400 mt-0.5">•</span>
                    {meal}
                  </li>
                ))}
              </ul>
            </SubSection>
          )}

          {/* Accommodation */}
          <SubSection icon={<Bed className="w-4 h-4" />} title="Stay" color="purple">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-800 text-sm">{day.accommodation.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {day.accommodation.area} · {day.accommodation.type.replace(/_/g, " ")}
                </p>
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full flex-shrink-0">
                {formatInr(day.accommodation.estimatedCostPerNight)}/night
              </span>
            </div>
          </SubSection>

          {/* Tips */}
          {day.tips.length > 0 && (
            <SubSection icon={<Lightbulb className="w-4 h-4" />} title="Pro Tips" color="yellow">
              <ul className="space-y-1.5">
                {day.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="text-yellow-500 mt-0.5">💡</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </SubSection>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-12 text-right">
        <span className="text-xs font-mono text-teal-600 font-semibold">{activity.time}</span>
      </div>
      <div className="flex-1 border-l-2 border-teal-100 pl-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-800 text-sm">{activity.name}</p>
          <span className="text-xs text-green-700 font-medium flex-shrink-0">
            {activity.cost > 0 ? formatInr(activity.cost) : "Free"}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{activity.duration}</span>
          {activity.bookingRequired && (
            <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
              Book ahead
            </span>
          )}
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full capitalize">
            {activity.category}
          </span>
        </div>
      </div>
    </div>
  );
}

function TransportItem({ transport }: { transport: TransportDetail }) {
  const icons: Record<string, string> = {
    ferry: "⛴️",
    speedboat: "🚤",
    bus: "🚌",
    auto_rickshaw: "🛺",
    taxi: "🚕",
    flight: "✈️",
    walk: "🚶",
  };

  return (
    <div className="flex items-start gap-2">
      <span className="text-base">{icons[transport.type] ?? "🚗"}</span>
      <div className="flex-1">
        <p className="text-sm text-gray-800 font-medium">
          {transport.from} → {transport.to}
        </p>
        <p className="text-xs text-gray-500">
          {transport.duration} · {transport.estimatedCost > 0 ? formatInr(transport.estimatedCost) : "Free"}
        </p>
        {transport.notes && <p className="text-xs text-blue-600 mt-0.5">{transport.notes}</p>}
      </div>
    </div>
  );
}

function SubSection({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    teal: "text-teal-600",
    blue: "text-blue-600",
    orange: "text-orange-500",
    purple: "text-purple-600",
    yellow: "text-yellow-500",
  };

  return (
    <div>
      <h4 className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2", colorMap[color] ?? "text-gray-600")}>
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

function Stat({ icon, label, value, compact }: { icon: React.ReactNode; label: string; value: string; compact?: boolean }) {
  return (
    <div className="bg-white/10 rounded-xl p-2.5">
      <div className="flex items-center gap-1 text-teal-200 text-xs mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn("font-bold text-white", compact ? "text-xs leading-tight" : "text-sm")}>
        {value}
      </p>
    </div>
  );
}
