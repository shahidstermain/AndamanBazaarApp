import { z } from 'zod';

export const budgetLevelSchema = z.enum(['budget', 'midrange', 'premium']);
export const paceSchema = z.enum(['relaxed', 'balanced', 'packed']);

export const tripPreferencesSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date'),
  travelersCount: z.number().int().min(1).max(20),
  budgetLevel: budgetLevelSchema,
  pace: paceSchema,
  interests: z.array(z.string()).default([]),
  preferredIslands: z.array(z.string()).default([]),
  notes: z.string().nullable().default(null),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'endDate must be on or after startDate', path: ['endDate'] }
);

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

export const itinerarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  preferences: tripPreferencesSchema,
  days: z.array(itineraryDaySchema).min(1),
  islandsCovered: z.array(z.string()),
  estimatedBudgetRange: z.string(),
  modelVersion: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const generateRequestSchema = z.object({
  preferences: tripPreferencesSchema,
});

export const generateResponseSchema = z.object({
  apiVersion: z.literal('v1'),
  itinerary: itinerarySchema,
});

export const itinerariesListResponseSchema = z.object({
  apiVersion: z.literal('v1'),
  itineraries: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    islandsCovered: z.array(z.string()),
    estimatedBudgetRange: z.string(),
    createdAt: z.string(),
  })),
});

export const itineraryDetailResponseSchema = z.object({
  apiVersion: z.literal('v1'),
  itinerary: itinerarySchema,
});

export type TripPreferencesInput = z.infer<typeof tripPreferencesSchema>;
export type ItineraryOutput = z.infer<typeof itinerarySchema>;
export type ItinerarySummaryOutput = z.infer<typeof itinerariesListResponseSchema>['itineraries'][number];
