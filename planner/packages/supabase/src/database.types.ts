// ─── Supabase database type definitions ─────────────────────────────────────
// Manually authored to match migrations in /supabase/migrations/
// Replace with `supabase gen types typescript` output once connected.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  // supabase-js RPC calls default to the public schema.
  // We expose the rate-limit helper in public (it internally writes to planner schema).
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      planner_increment_rate_limit: {
        Args: {
          p_user_id: string;
          p_window_key: string;
          p_max_count: number;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
  planner: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          home_city: string | null;
          typical_budget_range: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          home_city?: string | null;
          typical_budget_range?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          home_city?: string | null;
          typical_budget_range?: string | null;
          updated_at?: string;
        };
      };
      itineraries: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          preferences: Json;
          days: Json;
          islands_covered: string[] | null;
          estimated_budget_range: string | null;
          model_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          preferences: Json;
          days: Json;
          islands_covered?: string[] | null;
          estimated_budget_range?: string | null;
          model_version: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          start_date?: string;
          end_date?: string;
          preferences?: Json;
          days?: Json;
          islands_covered?: string[] | null;
          estimated_budget_range?: string | null;
          updated_at?: string;
        };
      };
      rate_limits: {
        Row: {
          user_id: string;
          window_key: string;
          count: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          window_key: string;
          count?: number;
          created_at?: string;
        };
        Update: {
          count?: number;
        };
      };
    };
    Functions: Record<string, never>;
  };
}

// Convenience type aliases
export type PlannerItineraryRow =
  Database["planner"]["Tables"]["itineraries"]["Row"];
export type PlannerItineraryInsert =
  Database["planner"]["Tables"]["itineraries"]["Insert"];
export type PlannerProfileRow =
  Database["planner"]["Tables"]["profiles"]["Row"];
export type PlannerProfileInsert =
  Database["planner"]["Tables"]["profiles"]["Insert"];
