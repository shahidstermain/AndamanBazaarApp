import type { PlannerSupabaseClient } from './client';
import type { PlannerProfileRow } from './database.types';

export interface PlannerProfile {
  id: string;
  homeCity: string | null;
  typicalBudgetRange: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToProfile(row: PlannerProfileRow): PlannerProfile {
  return {
    id: row.id,
    homeCity: row.home_city,
    typicalBudgetRange: row.typical_budget_range,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProfile(
  client: PlannerSupabaseClient,
  userId: string
): Promise<PlannerProfile | null> {
  const { data, error } = await client
    .schema('planner')
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProfile(data) : null;
}

export async function upsertProfile(
  client: PlannerSupabaseClient,
  userId: string,
  updates: { homeCity?: string | null; typicalBudgetRange?: string | null }
): Promise<PlannerProfile> {
  const { data, error } = await client
    .schema('planner')
    .from('profiles')
    .upsert(
      {
        id: userId,
        home_city: updates.homeCity ?? null,
        typical_budget_range: updates.typicalBudgetRange ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) throw error;
  return rowToProfile(data);
}
