import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { TripPreferences, ItineraryDay } from "../schemas/plannerSchema";
import { logger } from "../config/logger";

export interface PlannerDbConfig {
  url: string;
  anonKey: string;
}

export function createPlannerSupabaseClient(config: PlannerDbConfig, accessToken?: string): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

export async function createItinerary(
  client: SupabaseClient,
  userId: string,
  data: {
    name: string;
    start_date: string;
    end_date: string;
    preferences: TripPreferences;
    days: ItineraryDay[];
    islands_covered: string[];
    estimated_budget_range: string;
    model_version: string;
  }
) {
  const { data: row, error } = await client
    .schema("planner")
    .from("itineraries")
    .insert({
      user_id: userId,
      ...data,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    preferences: row.preferences,
    days: row.days,
    islandsCovered: row.islands_covered ?? [],
    estimatedBudgetRange: row.estimated_budget_range ?? "",
    modelVersion: row.model_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listItineraries(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .schema("planner")
    .from("itineraries")
    .select("id, name, start_date, end_date, islands_covered, estimated_budget_range, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    islandsCovered: r.islands_covered ?? [],
    estimatedBudgetRange: r.estimated_budget_range ?? "",
    createdAt: r.created_at,
  }));
}

export async function getItineraryById(client: SupabaseClient, id: string, userId: string) {
  const { data, error } = await client
    .schema("planner")
    .from("itineraries")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    startDate: data.start_date,
    endDate: data.end_date,
    preferences: data.preferences,
    days: data.days,
    islandsCovered: data.islands_covered ?? [],
    estimatedBudgetRange: data.estimated_budget_range ?? "",
    modelVersion: data.model_version,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
