-- ============================================================
-- Migration 015: Andaman Planner Pro — planner schema
-- Dedicated schema to avoid name collisions with marketplace tables.
-- NO Firebase; Supabase only.
-- ============================================================

-- Create planner schema
CREATE SCHEMA IF NOT EXISTS planner;

-- 1) planner.profiles — planner-specific user preferences
CREATE TABLE IF NOT EXISTS planner.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  home_city TEXT,
  typical_budget_range TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2) planner.itineraries
CREATE TABLE IF NOT EXISTS planner.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  preferences JSONB NOT NULL,
  days JSONB NOT NULL,
  estimated_budget_range TEXT,
  islands_covered TEXT[],
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_planner_itineraries_user ON planner.itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_itineraries_created ON planner.itineraries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_planner_profiles_id ON planner.profiles(id);

-- Enable RLS on both tables
ALTER TABLE planner.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner.itineraries ENABLE ROW LEVEL SECURITY;

-- RLS: planner.profiles — user can only manage their own row (id = auth.uid())
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

-- RLS: planner.itineraries — user can only access rows where user_id = auth.uid()
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

-- Grant usage on schema
GRANT USAGE ON SCHEMA planner TO authenticated;
GRANT USAGE ON SCHEMA planner TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON planner.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON planner.itineraries TO authenticated;
