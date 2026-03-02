import { z } from "zod";

export const budgetLevelSchema = z.enum(["budget", "midrange", "premium"]);
export const paceSchema = z.enum(["relaxed", "balanced", "packed"]);

export const tripPreferencesSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date"),
  travelersCount: z.number().int().min(1).max(20),
  budgetLevel: budgetLevelSchema,
  pace: paceSchema,
  interests: z.array(z.string()).default([]),
  preferredIslands: z.array(z.string()).default([]),
  notes: z.string().nullable().default(null),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: "endDate must be on or after startDate", path: ["endDate"] }
);

export type TripPreferences = z.infer<typeof tripPreferencesSchema>;

export const activityEntrySchema = z.object({
  time: z.string().optional(),
  title: z.string().min(1),
  description: z.string(),
  location: z.string().optional(),
  island: z.string().optional(),
  estimatedDuration: z.string().optional(),
  estimatedCost: z.string().optional(),
});

export const itineraryDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  island: z.string().min(1),
  theme: z.string().optional(),
  activities: z.array(activityEntrySchema).min(1),
  accommodation: z.string().optional(),
  travelNotes: z.string().optional(),
});

export type ItineraryDay = z.infer<typeof itineraryDaySchema>;

export const generateRequestSchema = z.object({
  preferences: tripPreferencesSchema,
});
