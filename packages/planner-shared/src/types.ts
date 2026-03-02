/**
 * Andaman Planner Pro — shared types (portable across Next and Vite)
 */

export interface UserIdentity {
  userId: string;
  email: string | null;
}

export type BudgetLevel = 'budget' | 'midrange' | 'premium';
export type Pace = 'relaxed' | 'balanced' | 'packed';

export interface TripPreferences {
  startDate: string; // ISO date
  endDate: string;
  travelersCount: number;
  budgetLevel: BudgetLevel;
  pace: Pace;
  interests: string[];
  preferredIslands: string[];
  notes: string | null;
}

export interface ActivityEntry {
  time?: string; // "09:00", "14:30"
  title: string;
  description: string;
  location?: string;
  island?: string;
  estimatedDuration?: string;
  estimatedCost?: string;
}

export interface ItineraryDay {
  date: string; // ISO date
  island: string;
  theme?: string;
  activities: ActivityEntry[];
  accommodation?: string;
  travelNotes?: string;
}

export interface Itinerary {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  preferences: TripPreferences;
  days: ItineraryDay[];
  islandsCovered: string[];
  estimatedBudgetRange: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItinerarySummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  islandsCovered: string[];
  estimatedBudgetRange: string;
  createdAt: string;
}
