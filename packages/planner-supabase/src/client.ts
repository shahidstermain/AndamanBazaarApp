import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type PlannerSupabaseClient = SupabaseClient<Database>;

export interface CreatePlannerClientOptions {
  url: string;
  anonKey: string;
  accessToken?: string;
}

/**
 * Create a typed Supabase client for planner schema.
 * Use anonKey for browser/client; for server with auth pass accessToken via global options.
 */
export function createPlannerClient(options: CreatePlannerClientOptions): PlannerSupabaseClient {
  const { url, anonKey, accessToken } = options;
  return createClient<Database>(url, anonKey, {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}
