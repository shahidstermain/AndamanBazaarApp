import { currentRateLimitWindow } from "@andaman-planner/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  windowKey: string;
}

/**
 * Atomically increments the generation count for a user in the current hourly
 * window and returns whether the request is allowed.
 *
 * Uses the planner.increment_rate_limit stored procedure which does an atomic
 * INSERT ... ON CONFLICT DO UPDATE, so there are no race conditions.
 *
 * Requires service-role client to bypass RLS.
 */
export async function checkAndIncrementRateLimit(
  serviceClient: Client,
  userId: string,
  maxPerHour = 5
): Promise<RateLimitResult> {
  const windowKey = currentRateLimitWindow();

  // Function lives in public schema so supabase-js rpc() can find it without schema override.
  // It internally writes to planner.rate_limits.
  const { data, error } = await serviceClient.rpc("planner_increment_rate_limit", {
    p_user_id: userId,
    p_window_key: windowKey,
    p_max_count: maxPerHour,
  });

  if (error) {
    // If the RPC doesn't exist yet (migration not applied), fail open with a
    // warning rather than blocking all generation.
    console.warn("[RateLimit] RPC error, failing open:", error.message);
    return { allowed: true, count: 0, limit: maxPerHour, windowKey };
  }

  const count = data as number;
  return {
    allowed: count <= maxPerHour,
    count,
    limit: maxPerHour,
    windowKey,
  };
}
