"use client";

import { createBrowserClient as _create } from "@supabase/ssr";
import type { Database } from "@andaman-planner/supabase";

let client: ReturnType<typeof _create<Database>> | null = null;

/**
 * Browser Supabase client for Client Components.
 * Singleton to avoid creating multiple GoTrueClient instances.
 */
export function createClient() {
  if (!client) {
    client = _create<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
