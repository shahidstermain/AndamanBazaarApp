/**
 * Generated-style types for planner schema.
 * Aligns with supabase/migrations/015_planner_schema.sql.
 * Run: npx supabase gen types typescript --schema planner > database.types.ts
 * to regenerate from live DB when available.
 */

import type { TripPreferences, ItineraryDay } from '@andaman/planner-shared';

export interface PlannerProfileRow {
  id: string;
  home_city: string | null;
  typical_budget_range: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlannerItineraryRow {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  preferences: TripPreferences;
  days: ItineraryDay[];
  estimated_budget_range: string | null;
  islands_covered: string[] | null;
  model_version: string;
  created_at: string;
  updated_at: string;
}

export interface PlannerInsertItinerary {
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  preferences: TripPreferences;
  days: ItineraryDay[];
  estimated_budget_range?: string | null;
  islands_covered?: string[] | null;
  model_version: string;
}

export interface PlannerUpdateItinerary {
  name?: string;
  start_date?: string;
  end_date?: string;
  preferences?: TripPreferences;
  days?: ItineraryDay[];
  estimated_budget_range?: string | null;
  islands_covered?: string[] | null;
  model_version?: string;
  updated_at?: string;
}

export type Database = {
  planner: {
    profiles: {
      Row: PlannerProfileRow;
      Insert: Omit<PlannerProfileRow, 'created_at' | 'updated_at'> & {
        created_at?: string;
        updated_at?: string;
      };
      Update: Partial<PlannerProfileRow>;
    };
    itineraries: {
      Row: PlannerItineraryRow;
      Insert: PlannerInsertItinerary & {
        id?: string;
        created_at?: string;
        updated_at?: string;
      };
      Update: PlannerUpdateItinerary & { updated_at?: string };
    };
  };
};
