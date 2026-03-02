import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@andaman-planner/supabase";

/**
 * Creates a Supabase client for Server Components and Route Handlers.
 * Uses the @supabase/ssr cookie-based session strategy so the
 * user's auth state is shared with AndamanBazaar (same Supabase project).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll may throw in Server Components; safe to ignore
          }
        },
      },
    }
  );
}

/**
 * Service-role client for admin operations (rate limiting, etc.).
 * Never pass this to the client. Server-side only.
 */
export function createAdminClient() {
  const { createClient: _createClient } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");

  return _createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
