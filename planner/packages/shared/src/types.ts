// ─── Core domain types shared across Next.js shell and Vite embed ──────────
// These types are portable: no Next.js primitives, no Vite-specific imports.

export type BudgetLevel = "budget" | "midrange" | "premium";
export type TripPace = "relaxed" | "balanced" | "packed";
export type ActivityCategory =
  | "beach"
  | "diving"
  | "sightseeing"
  | "adventure"
  | "cultural"
  | "food"
  | "relaxation"
  | "nature";
export type AccommodationType =
  | "budget_hostel"
  | "guesthouse"
  | "mid_range_hotel"
  | "resort"
  | "luxury_resort";
export type TransportType =
  | "ferry"
  | "speedboat"
  | "bus"
  | "auto_rickshaw"
  | "taxi"
  | "flight"
  | "walk";

// ─── User identity (thin wrapper over Supabase auth.users) ─────────────────
export interface UserIdentity {
  userId: string; // uuid from auth.users.id
  email: string | null;
}

// ─── Trip preferences (form input) ─────────────────────────────────────────
export interface TripPreferences {
  startDate: string; // ISO date "YYYY-MM-DD"
  endDate: string;
  travelersCount: number;
  budgetLevel: BudgetLevel;
  pace: TripPace;
  interests: string[];
  preferredIslands: string[];
  notes: string | null;
}

// ─── Itinerary day building blocks ─────────────────────────────────────────
export interface Activity {
  time: string; // "HH:MM"
  name: string;
  description: string;
  duration: string; // e.g. "2 hours"
  cost: number; // INR per person
  bookingRequired: boolean;
  category: ActivityCategory;
}

export interface Accommodation {
  name: string;
  type: AccommodationType;
  estimatedCostPerNight: number; // INR per room
  area: string;
}

export interface TransportDetail {
  type: TransportType;
  from: string;
  to: string;
  duration: string;
  estimatedCost: number; // INR per person
  notes: string;
}

export interface ItineraryDay {
  day: number;
  date: string; // "YYYY-MM-DD"
  island: string;
  title: string;
  description: string;
  activities: Activity[];
  accommodation: Accommodation;
  meals: string[];
  transport: TransportDetail[];
  estimatedCost: number; // total for the day per person, INR
  tips: string[];
}

// ─── Full itinerary (DB row + computed fields) ──────────────────────────────
export interface Itinerary {
  id: string; // uuid
  userId: string; // uuid
  name: string;
  startDate: string;
  endDate: string;
  preferences: TripPreferences;
  days: ItineraryDay[];
  islandsCovered: string[];
  estimatedBudgetRange: string; // e.g. "₹25,000 – ₹35,000 per person"
  modelVersion: string; // e.g. "gemini-1.5-pro"
  createdAt: string;
  updatedAt: string;
}

// Lightweight version for list views
export interface ItinerarySummary {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  islandsCovered: string[];
  estimatedBudgetRange: string;
  createdAt: string;
}

// ─── API response envelope ──────────────────────────────────────────────────
export const API_VERSION = "v1" as const;

export interface ApiResponse<T> {
  apiVersion: typeof API_VERSION;
  data: T;
}

export interface ApiError {
  apiVersion: typeof API_VERSION;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ─── Specific endpoint response shapes ─────────────────────────────────────
export interface GenerateResponse {
  apiVersion: typeof API_VERSION;
  itinerary: Itinerary;
}

export interface ListItinerariesResponse {
  apiVersion: typeof API_VERSION;
  itineraries: ItinerarySummary[];
}

export interface GetItineraryResponse {
  apiVersion: typeof API_VERSION;
  itinerary: Itinerary;
}

// ─── Andaman-specific constants ─────────────────────────────────────────────
export const ANDAMAN_ISLANDS = [
  "Port Blair",
  "Havelock Island (Swaraj Dweep)",
  "Neil Island (Shaheed Dweep)",
  "Baratang Island",
  "Diglipur",
  "Little Andaman",
  "Jolly Buoy Island",
  "Ross Island",
  "North Bay Island",
] as const;

export const ANDAMAN_INTERESTS = [
  "Snorkeling & Diving",
  "Beach & Swimming",
  "Historical Sites",
  "Wildlife & Nature",
  "Adventure Sports",
  "Photography",
  "Local Food & Culture",
  "Trekking & Hiking",
  "Kayaking",
  "Surfing",
] as const;

export type AndamanIsland = (typeof ANDAMAN_ISLANDS)[number];
export type AndamanInterest = (typeof ANDAMAN_INTERESTS)[number];
