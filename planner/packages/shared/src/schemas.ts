import { z } from "zod";

// ─── Primitive validators ────────────────────────────────────────────────────
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

// ─── Trip preferences ────────────────────────────────────────────────────────
export const TripPreferencesSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    travelersCount: z.number().int().min(1).max(20),
    budgetLevel: z.enum(["budget", "midrange", "premium"]),
    pace: z.enum(["relaxed", "balanced", "packed"]),
    interests: z.array(z.string().min(1)).min(1, "Select at least one interest"),
    preferredIslands: z.array(z.string().min(1)),
    notes: z.string().max(500).nullable(),
  })
  .refine(
    (d) => new Date(d.endDate) > new Date(d.startDate),
    { message: "End date must be after start date", path: ["endDate"] }
  )
  .refine(
    (d) => {
      const days =
        (new Date(d.endDate).getTime() - new Date(d.startDate).getTime()) /
        86_400_000;
      return days >= 2 && days <= 21;
    },
    { message: "Trip must be between 2 and 21 days", path: ["endDate"] }
  );

export type TripPreferencesInput = z.infer<typeof TripPreferencesSchema>;

// ─── Generate request ────────────────────────────────────────────────────────
export const GenerateRequestSchema = z.object({
  preferences: TripPreferencesSchema,
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// ─── AI output schema (what Gemini must return) ───────────────────────────────
export const ActivitySchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  name: z.string().min(1),
  description: z.string().min(1),
  duration: z.string().min(1),
  cost: z.number().min(0),
  bookingRequired: z.boolean(),
  category: z.enum([
    "beach",
    "diving",
    "sightseeing",
    "adventure",
    "cultural",
    "food",
    "relaxation",
    "nature",
  ]),
});

export const AccommodationSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "budget_hostel",
    "guesthouse",
    "mid_range_hotel",
    "resort",
    "luxury_resort",
  ]),
  estimatedCostPerNight: z.number().min(0),
  area: z.string().min(1),
});

export const TransportDetailSchema = z.object({
  type: z.enum([
    "ferry",
    "speedboat",
    "bus",
    "auto_rickshaw",
    "taxi",
    "flight",
    "walk",
  ]),
  from: z.string().min(1),
  to: z.string().min(1),
  duration: z.string().min(1),
  estimatedCost: z.number().min(0),
  notes: z.string(),
});

export const ItineraryDaySchema = z.object({
  day: z.number().int().min(1),
  date: isoDate,
  island: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  activities: z.array(ActivitySchema).min(1),
  accommodation: AccommodationSchema,
  meals: z.array(z.string()),
  transport: z.array(TransportDetailSchema),
  estimatedCost: z.number().min(0),
  tips: z.array(z.string()),
});

// Schema for the raw AI-generated JSON (no id/userId/timestamps)
export const AiItineraryOutputSchema = z.object({
  name: z.string().min(1),
  startDate: isoDate,
  endDate: isoDate,
  islandsCovered: z.array(z.string()).min(1),
  estimatedBudgetRange: z.string().min(1),
  days: z.array(ItineraryDaySchema).min(1),
});

export type AiItineraryOutput = z.infer<typeof AiItineraryOutputSchema>;

// Full itinerary (stored in DB, returned by API)
export const ItinerarySchema = AiItineraryOutputSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  modelVersion: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ItineraryData = z.infer<typeof ItinerarySchema>;

export const ItinerarySummarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  startDate: isoDate,
  endDate: isoDate,
  islandsCovered: z.array(z.string()),
  estimatedBudgetRange: z.string(),
  createdAt: z.string(),
});
