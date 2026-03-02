import type { PlannerSupabaseClient } from './client';
import type { PlannerItineraryRow, PlannerInsertItinerary } from './database.types';
import type { Itinerary, ItinerarySummary } from '@andaman/planner-shared';

function rowToItinerary(row: PlannerItineraryRow): Itinerary {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    preferences: row.preferences as Itinerary['preferences'],
    days: row.days as Itinerary['days'],
    islandsCovered: row.islands_covered ?? [],
    estimatedBudgetRange: row.estimated_budget_range ?? '',
    modelVersion: row.model_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSummary(row: PlannerItineraryRow): ItinerarySummary {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    islandsCovered: row.islands_covered ?? [],
    estimatedBudgetRange: row.estimated_budget_range ?? '',
    createdAt: row.created_at,
  };
}

export async function createItinerary(
  client: PlannerSupabaseClient,
  userId: string,
  data: Omit<PlannerInsertItinerary, 'user_id'>
): Promise<Itinerary> {
  const insert: PlannerInsertItinerary = { ...data, user_id: userId };
  const { data: row, error } = await client
    .schema('planner')
    .from('itineraries')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToItinerary(row);
}

export async function getItineraryById(
  client: PlannerSupabaseClient,
  id: string,
  userId: string
): Promise<Itinerary | null> {
  const { data, error } = await client
    .schema('planner')
    .from('itineraries')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToItinerary(data) : null;
}

export async function listItineraries(
  client: PlannerSupabaseClient,
  userId: string
): Promise<ItinerarySummary[]> {
  const { data, error } = await client
    .schema('planner')
    .from('itineraries')
    .select('id, name, start_date, end_date, islands_covered, estimated_budget_range, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) =>
    rowToSummary(r as PlannerItineraryRow)
  );
}

export async function updateItinerary(
  client: PlannerSupabaseClient,
  id: string,
  userId: string,
  updates: Partial<PlannerInsertItinerary>
): Promise<Itinerary | null> {
  const { data, error } = await client
    .schema('planner')
    .from('itineraries')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ? rowToItinerary(data) : null;
}

export async function deleteItinerary(
  client: PlannerSupabaseClient,
  id: string,
  userId: string
): Promise<boolean> {
  const { error } = await client
    .schema('planner')
    .from('itineraries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  return !error;
}
