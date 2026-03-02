import type { Database } from "../database.types";
import type { Itinerary, ItinerarySummary, TripPreferences, ItineraryDay } from "@andaman-planner/shared";

type DB = Database;
// Use `any` so this works with SupabaseClient from both @supabase/supabase-js
// and @supabase/ssr, which have diverged generic signatures in v2.98+.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

function rowToItinerary(row: DB["planner"]["Tables"]["itineraries"]["Row"]): Itinerary {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    preferences: row.preferences as unknown as TripPreferences,
    days: row.days as unknown as ItineraryDay[],
    islandsCovered: row.islands_covered ?? [],
    estimatedBudgetRange: row.estimated_budget_range ?? "",
    modelVersion: row.model_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSummary(row: DB["planner"]["Tables"]["itineraries"]["Row"]): ItinerarySummary {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    islandsCovered: row.islands_covered ?? [],
    estimatedBudgetRange: row.estimated_budget_range ?? "",
    createdAt: row.created_at,
  };
}

export async function listItineraries(
  client: Client,
  userId: string
): Promise<ItinerarySummary[]> {
  const { data, error } = await client
    .schema("planner")
    .from("itineraries")
    .select(
      "id, user_id, name, start_date, end_date, islands_covered, estimated_budget_range, created_at, updated_at, model_version, preferences, days"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list itineraries: ${error.message}`);
  return (data ?? []).map(rowToSummary);
}

export async function getItinerary(
  client: Client,
  id: string,
  userId: string
): Promise<Itinerary | null> {
  const { data, error } = await client
    .schema("planner")
    .from("itineraries")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`Failed to get itinerary: ${error.message}`);
  }
  return data ? rowToItinerary(data) : null;
}

export async function saveItinerary(
  client: Client,
  payload: Omit<Itinerary, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<Itinerary> {
  const insert: DB["planner"]["Tables"]["itineraries"]["Insert"] = {
    ...(payload.id ? { id: payload.id } : {}),
    user_id: payload.userId,
    name: payload.name,
    start_date: payload.startDate,
    end_date: payload.endDate,
    preferences: payload.preferences as unknown as import("../database.types").Json,
    days: payload.days as unknown as import("../database.types").Json,
    islands_covered: payload.islandsCovered,
    estimated_budget_range: payload.estimatedBudgetRange,
    model_version: payload.modelVersion,
  };

  const { data, error } = await client
    .schema("planner")
    .from("itineraries")
    .insert(insert)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to save itinerary: ${error.message}`);
  return rowToItinerary(data);
}

export async function deleteItinerary(
  client: Client,
  id: string,
  userId: string
): Promise<void> {
  const { error } = await client
    .schema("planner")
    .from("itineraries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete itinerary: ${error.message}`);
}
