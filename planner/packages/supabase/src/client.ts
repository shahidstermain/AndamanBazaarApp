import { createClient as _createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// ─── Environment variable readers ────────────────────────────────────────────
// Support both NEXT_PUBLIC_ prefix (Next.js) and VITE_ prefix (Vite) so that
// this module works in both environments.

function getEnv(key: string, viteKey?: string): string {
  // Server-side or Node environment
  if (typeof process !== "undefined" && process.env[key]) {
    return process.env[key]!;
  }
  // Next.js public env (available client-side via next.config)
  // @ts-ignore — dynamically resolved at build time
  if (typeof process !== "undefined" && process.env[`NEXT_PUBLIC_${key}`]) {
    return process.env[`NEXT_PUBLIC_${key}`]!;
  }
  // Vite
  if (viteKey && typeof import.meta !== "undefined") {
    // @ts-ignore
    const viteEnv = import.meta?.env;
    if (viteEnv?.[viteKey]) return viteEnv[viteKey];
  }
  return "";
}

// ─── Browser / client-side client ────────────────────────────────────────────
let _browserClient: SupabaseClient<Database> | null = null;

export function createBrowserClient(): SupabaseClient<Database> {
  if (_browserClient) return _browserClient;

  const url =
    getEnv("SUPABASE_URL", "VITE_SUPABASE_URL") ||
    getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    getEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY") ||
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  _browserClient = _createClient<Database>(
    url || "https://placeholder.supabase.co",
    key || "placeholder"
  );
  return _browserClient;
}

// ─── Server / service-role client (Node only, never sent to browser) ─────────
export function createServiceClient(): SupabaseClient<Database> {
  const url =
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ||
    process.env["SUPABASE_URL"] ||
    "";
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return _createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ─── Re-export Database type for consumers ────────────────────────────────────
export type { Database };
