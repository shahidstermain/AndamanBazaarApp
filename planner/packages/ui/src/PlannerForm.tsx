"use client";
import React, { useState } from "react";
import { MapPin, Users, Wallet, Zap, Heart, Calendar, FileText, Loader2 } from "lucide-react";
import {
  ANDAMAN_ISLANDS,
  ANDAMAN_INTERESTS,
  type TripPreferences,
  type BudgetLevel,
  type TripPace,
} from "@andaman-planner/shared";
import { cn } from "./utils";

export interface PlannerFormProps {
  onSubmit: (preferences: TripPreferences) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  /** Tailwind class overrides for the container */
  className?: string;
}

const BUDGET_OPTIONS: { value: BudgetLevel; label: string; desc: string }[] = [
  { value: "budget", label: "Budget", desc: "₹1,500–2,500/day · Hostels, local dhabas, govt ferries" },
  { value: "midrange", label: "Mid-range", desc: "₹3,000–6,000/day · Hotels, restaurants, speedboats" },
  { value: "premium", label: "Premium", desc: "₹7,000–15,000/day · Resorts, fine dining, private boats" },
];

const PACE_OPTIONS: { value: TripPace; label: string; icon: string }[] = [
  { value: "relaxed", label: "Relaxed 🌴", icon: "🌴" },
  { value: "balanced", label: "Balanced 🏝️", icon: "🏝️" },
  { value: "packed", label: "Packed 🏃", icon: "🏃" },
];

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function PlannerForm({ onSubmit, isLoading, error, className }: PlannerFormProps) {
  const defaultStart = addDays(today(), 7);
  const defaultEnd = addDays(defaultStart, 6);

  const [form, setForm] = useState<TripPreferences>({
    startDate: defaultStart,
    endDate: defaultEnd,
    travelersCount: 2,
    budgetLevel: "midrange",
    pace: "balanced",
    interests: [],
    preferredIslands: [],
    notes: null,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TripPreferences, string>>>({});

  function setField<K extends keyof TripPreferences>(key: K, value: TripPreferences[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleArrayItem<T extends string>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!form.startDate) errs.startDate = "Required";
    if (!form.endDate) errs.endDate = "Required";
    if (form.endDate <= form.startDate) errs.endDate = "End date must be after start date";
    const days = Math.round(
      (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86_400_000
    );
    if (days < 2 || days > 21) errs.endDate = "Trip must be 2–21 days";
    if (form.travelersCount < 1 || form.travelersCount > 20) errs.travelersCount = "1–20 travelers";
    if (form.interests.length === 0) errs.interests = "Select at least one interest";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  }

  const tripDays =
    form.startDate && form.endDate
      ? Math.max(
          0,
          Math.round(
            (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86_400_000
          )
        )
      : 0;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5" /> Plan Your Andaman Adventure
        </h2>
        <p className="text-teal-100 text-sm mt-1">
          Tell us about your dream trip — our AI creates a personalised day-by-day itinerary.
        </p>
      </div>

      <div className="p-6 space-y-7">
        {/* Dates */}
        <Section icon={<Calendar className="w-4 h-4" />} title="Travel Dates">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Arrival</label>
              <input
                type="date"
                value={form.startDate}
                min={today()}
                onChange={(e) => setField("startDate", e.target.value)}
                className={cn(inputCls, fieldErrors.startDate && errorBorderCls)}
                required
              />
              {fieldErrors.startDate && <FieldError msg={fieldErrors.startDate} />}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Departure</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || today()}
                onChange={(e) => setField("endDate", e.target.value)}
                className={cn(inputCls, fieldErrors.endDate && errorBorderCls)}
                required
              />
              {fieldErrors.endDate && <FieldError msg={fieldErrors.endDate} />}
            </div>
          </div>
          {tripDays > 0 && (
            <p className="text-teal-700 text-xs font-medium mt-1">
              📅 {tripDays} night{tripDays !== 1 ? "s" : ""} in Andamans
            </p>
          )}
        </Section>

        {/* Travelers */}
        <Section icon={<Users className="w-4 h-4" />} title="Travelers">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setField("travelersCount", Math.max(1, form.travelersCount - 1))}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg"
            >
              −
            </button>
            <span className="text-2xl font-bold text-gray-800 w-8 text-center">
              {form.travelersCount}
            </span>
            <button
              type="button"
              onClick={() => setField("travelersCount", Math.min(20, form.travelersCount + 1))}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg"
            >
              +
            </button>
            <span className="text-gray-500 text-sm">
              {form.travelersCount === 1 ? "person" : "people"}
            </span>
          </div>
          {fieldErrors.travelersCount && <FieldError msg={fieldErrors.travelersCount} />}
        </Section>

        {/* Budget */}
        <Section icon={<Wallet className="w-4 h-4" />} title="Budget Level">
          <div className="space-y-2">
            {BUDGET_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                  form.budgetLevel === opt.value
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300"
                )}
              >
                <input
                  type="radio"
                  name="budgetLevel"
                  value={opt.value}
                  checked={form.budgetLevel === opt.value}
                  onChange={() => setField("budgetLevel", opt.value)}
                  className="mt-1 accent-teal-600"
                />
                <div>
                  <span className="font-semibold text-gray-800 text-sm">{opt.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </Section>

        {/* Pace */}
        <Section icon={<Zap className="w-4 h-4" />} title="Trip Pace">
          <div className="grid grid-cols-3 gap-2">
            {PACE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField("pace", opt.value)}
                className={cn(
                  "py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all",
                  form.pace === opt.value
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-200 text-gray-600 hover:border-teal-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Interests */}
        <Section icon={<Heart className="w-4 h-4" />} title="Interests">
          <div className="flex flex-wrap gap-2">
            {ANDAMAN_INTERESTS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => setField("interests", toggleArrayItem(form.interests, interest))}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  form.interests.includes(interest)
                    ? "bg-teal-600 text-white border-teal-600"
                    : "border-gray-300 text-gray-600 hover:border-teal-400 hover:text-teal-600"
                )}
              >
                {interest}
              </button>
            ))}
          </div>
          {fieldErrors.interests && <FieldError msg={fieldErrors.interests} />}
        </Section>

        {/* Preferred Islands */}
        <Section icon={<MapPin className="w-4 h-4" />} title="Preferred Islands (optional)">
          <p className="text-xs text-gray-500 mb-2">
            Leave blank and the AI will choose based on your preferences
          </p>
          <div className="flex flex-wrap gap-2">
            {ANDAMAN_ISLANDS.map((island) => (
              <button
                key={island}
                type="button"
                onClick={() => setField("preferredIslands", toggleArrayItem(form.preferredIslands, island))}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  form.preferredIslands.includes(island)
                    ? "bg-coral-500 text-white border-coral-500"
                    : "border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600"
                )}
              >
                {island}
              </button>
            ))}
          </div>
        </Section>

        {/* Notes */}
        <Section icon={<FileText className="w-4 h-4" />} title="Special Notes (optional)">
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => setField("notes", e.target.value || null)}
            placeholder="e.g. celebrating anniversary, mobility limitations, specific accommodation preferences..."
            rows={3}
            maxLength={500}
            className={cn(inputCls, "resize-none")}
          />
          <p className="text-xs text-gray-400 text-right mt-1">
            {(form.notes?.length ?? 0)}/500
          </p>
        </Section>

        {/* Global error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full py-3.5 rounded-xl font-semibold text-white transition-all",
            isLoading
              ? "bg-teal-400 cursor-not-allowed"
              : "bg-teal-600 hover:bg-teal-700 active:scale-95 shadow-md hover:shadow-lg"
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating your itinerary…
            </span>
          ) : (
            "✨ Generate My Itinerary"
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          Powered by Gemini AI · Andaman-specific knowledge built-in
        </p>
      </div>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-3">
        <span className="text-teal-600">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

const inputCls =
  "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition";
const errorBorderCls = "border-red-400";
