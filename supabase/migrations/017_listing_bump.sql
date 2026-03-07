-- ============================================================
-- Migration 017: Listing Bump (7-day cooldown)
-- Adds last_bumped_at column and atomic bump function
-- ============================================================

-- 1. Add column
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS last_bumped_at TIMESTAMPTZ;

-- 2. Index for sorting by bump recency
CREATE INDEX IF NOT EXISTS idx_listings_bumped
  ON public.listings(last_bumped_at DESC NULLS LAST)
  WHERE last_bumped_at IS NOT NULL;

-- 3. Atomic bump function with 7-day cooldown (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.bump_listing(p_listing_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_last_bumped TIMESTAMPTZ;
  v_status TEXT;
  v_cooldown INTERVAL := INTERVAL '7 days';
BEGIN
  -- Fetch current state
  SELECT last_bumped_at, status INTO v_last_bumped, v_status
  FROM public.listings
  WHERE id = p_listing_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_active');
  END IF;

  IF v_last_bumped IS NOT NULL AND v_last_bumped > NOW() - v_cooldown THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'cooldown_active',
      'next_eligible', (v_last_bumped + v_cooldown)::TEXT
    );
  END IF;

  -- Perform bump: update created_at so listing rises to top of "newest" sort
  UPDATE public.listings
  SET created_at = NOW(),
      last_bumped_at = NOW(),
      updated_at = NOW()
  WHERE id = p_listing_id AND user_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.bump_listing IS 'Bumps an active listing to the top of feed. 7-day cooldown enforced server-side.';
COMMENT ON COLUMN public.listings.last_bumped_at IS 'Timestamp of the last free bump. Used to enforce 7-day cooldown.';
