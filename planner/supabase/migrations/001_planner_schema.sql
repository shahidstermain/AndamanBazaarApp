-- ============================================================
-- Migration 001: Planner Schema
-- Creates the `planner` Postgres schema with all required
-- tables, RLS policies, and helper functions.
--
-- Apply to the SAME Supabase project as AndamanBazaar.
-- Run: supabase db push  (or copy-paste into Supabase SQL editor)
-- ============================================================

-- ─── Schema ──────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS planner;

-- Allow the authenticated & anon roles to use this schema
GRANT USAGE ON SCHEMA planner TO authenticated, anon, service_role;

-- ─── 1. planner.profiles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planner.profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  home_city            text,
  typical_budget_range text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE planner.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planner_profiles_select_own" ON planner.profiles;
CREATE POLICY "planner_profiles_select_own" ON planner.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "planner_profiles_insert_own" ON planner.profiles;
CREATE POLICY "planner_profiles_insert_own" ON planner.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "planner_profiles_update_own" ON planner.profiles;
CREATE POLICY "planner_profiles_update_own" ON planner.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "planner_profiles_delete_own" ON planner.profiles;
CREATE POLICY "planner_profiles_delete_own" ON planner.profiles
  FOR DELETE USING (auth.uid() = id);

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON planner.profiles TO authenticated;
GRANT ALL ON planner.profiles TO service_role;

-- ─── 2. planner.itineraries ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planner.itineraries (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                   text NOT NULL,
  start_date             date NOT NULL,
  end_date               date NOT NULL,
  preferences            jsonb NOT NULL,
  days                   jsonb NOT NULL,
  islands_covered        text[],
  estimated_budget_range text,
  model_version          text NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_itineraries_user_id
  ON planner.itineraries (user_id);

CREATE INDEX IF NOT EXISTS idx_planner_itineraries_created_at
  ON planner.itineraries (created_at DESC);

ALTER TABLE planner.itineraries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planner_itineraries_select_own" ON planner.itineraries;
CREATE POLICY "planner_itineraries_select_own" ON planner.itineraries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_itineraries_insert_own" ON planner.itineraries;
CREATE POLICY "planner_itineraries_insert_own" ON planner.itineraries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_itineraries_update_own" ON planner.itineraries;
CREATE POLICY "planner_itineraries_update_own" ON planner.itineraries
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_itineraries_delete_own" ON planner.itineraries;
CREATE POLICY "planner_itineraries_delete_own" ON planner.itineraries
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON planner.itineraries TO authenticated;
GRANT ALL ON planner.itineraries TO service_role;

-- ─── 3. planner.rate_limits ──────────────────────────────────────────────────
-- Tracks AI generation usage per user per hourly window.
-- Managed by service_role only; no direct user access.
CREATE TABLE IF NOT EXISTS planner.rate_limits (
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  window_key text NOT NULL, -- "YYYY-MM-DDTHH" e.g. "2024-06-15T10"
  count      integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, window_key)
);

ALTER TABLE planner.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rate limit (informational)
DROP POLICY IF EXISTS "planner_rate_limits_select_own" ON planner.rate_limits;
CREATE POLICY "planner_rate_limits_select_own" ON planner.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON planner.rate_limits TO authenticated;
GRANT ALL ON planner.rate_limits TO service_role;

-- ─── 4. Auto-update updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION planner.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planner_profiles_updated_at ON planner.profiles;
CREATE TRIGGER trg_planner_profiles_updated_at
  BEFORE UPDATE ON planner.profiles
  FOR EACH ROW EXECUTE FUNCTION planner.set_updated_at();

DROP TRIGGER IF EXISTS trg_planner_itineraries_updated_at ON planner.itineraries;
CREATE TRIGGER trg_planner_itineraries_updated_at
  BEFORE UPDATE ON planner.itineraries
  FOR EACH ROW EXECUTE FUNCTION planner.set_updated_at();

-- ─── 5. Atomic rate-limit increment ─────────────────────────────────────────
-- Lives in the PUBLIC schema so supabase-js .rpc() can find it without
-- schema override. Internally writes to planner.rate_limits.
-- Returns the new count after increment. Caller checks against max.
CREATE OR REPLACE FUNCTION public.planner_increment_rate_limit(
  p_user_id    uuid,
  p_window_key text,
  p_max_count  integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = planner, public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO planner.rate_limits (user_id, window_key, count)
  VALUES (p_user_id, p_window_key, 1)
  ON CONFLICT (user_id, window_key)
  DO UPDATE SET count = planner.rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.planner_increment_rate_limit(uuid, text, integer)
  TO service_role, authenticated;

-- ─── 6. Auto-create planner profile when user signs up ───────────────────────
-- Piggy-backs on the existing on_auth_user_created trigger concept.
CREATE OR REPLACE FUNCTION planner.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO planner.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Only create this trigger if it doesn't already exist for the planner schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created_planner'
  ) THEN
    CREATE TRIGGER on_auth_user_created_planner
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION planner.handle_new_user();
  END IF;
END;
$$;

-- ─── Comments ─────────────────────────────────────────────────────────────────
COMMENT ON SCHEMA planner IS 'Andaman Planner Pro — AI trip itinerary tables. Isolated from public schema.';
COMMENT ON TABLE planner.itineraries IS 'AI-generated Andaman trip itineraries, owned per user.';
COMMENT ON TABLE planner.profiles IS 'Planner-specific user preferences, separate from marketplace profiles.';
COMMENT ON TABLE planner.rate_limits IS 'Per-user hourly AI generation usage tracker.';
