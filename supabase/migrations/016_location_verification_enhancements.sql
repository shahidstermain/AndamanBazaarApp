-- Migration 016: Location Verification Security Enhancements
-- Adds columns to track verification metadata for fraud prevention

-- Add new columns to profiles table for enhanced location verification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_verification_lat NUMERIC(10,7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_verification_lng NUMERIC(10,7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_ip TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_blocked_until TIMESTAMPTZ;

-- Create index for efficient verification status queries
CREATE INDEX IF NOT EXISTS idx_profiles_location_verified_at ON public.profiles(location_verified_at);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_blocked ON public.profiles(verification_blocked_until) WHERE verification_blocked_until IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.location_verified_at IS 'Timestamp of last successful location verification';
COMMENT ON COLUMN public.profiles.last_verification_lat IS 'Latitude from last verification attempt';
COMMENT ON COLUMN public.profiles.last_verification_lng IS 'Longitude from last verification attempt';
COMMENT ON COLUMN public.profiles.verification_ip IS 'IP address from last verification attempt';
COMMENT ON COLUMN public.profiles.verification_attempts IS 'Number of verification attempts in current window';
COMMENT ON COLUMN public.profiles.verification_blocked_until IS 'If set, user is blocked from verification until this time';

-- Function to check and update verification rate limit
CREATE OR REPLACE FUNCTION public.check_location_verification_rate_limit(
    p_user_id UUID,
    p_max_attempts INTEGER DEFAULT 5,
    p_block_duration_hours INTEGER DEFAULT 24,
    p_max_total_failures INTEGER DEFAULT 10
)
RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INTEGER, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_one_hour_ago TIMESTAMPTZ := v_now - INTERVAL '1 hour';
BEGIN
    -- Get current profile state
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if currently blocked
    IF v_profile.verification_blocked_until IS NOT NULL AND v_profile.verification_blocked_until > v_now THEN
        RETURN QUERY SELECT 
            FALSE, 
            EXTRACT(EPOCH FROM (v_profile.verification_blocked_until - v_now))::INTEGER,
            'Too many failed attempts. Please try again later.'::TEXT;
        RETURN;
    END IF;
    
    -- Reset block if expired
    IF v_profile.verification_blocked_until IS NOT NULL AND v_profile.verification_blocked_until <= v_now THEN
        UPDATE profiles SET 
            verification_blocked_until = NULL,
            verification_attempts = 0
        WHERE id = p_user_id;
        v_profile.verification_attempts := 0;
    END IF;
    
    -- Reset hourly attempts if last update was more than 1 hour ago
    IF v_profile.updated_at IS NOT NULL AND v_profile.updated_at < v_one_hour_ago THEN
        UPDATE profiles SET 
            verification_attempts = 0
        WHERE id = p_user_id;
        v_profile.verification_attempts := 0;
    END IF;
    
    -- Check hourly rate limit
    IF v_profile.verification_attempts >= p_max_attempts THEN
        -- Block if too many total failures
        IF v_profile.verification_attempts >= p_max_total_failures THEN
            UPDATE profiles SET 
                verification_blocked_until = v_now + (p_block_duration_hours || ' hours')::INTERVAL
            WHERE id = p_user_id;
        
            RETURN QUERY SELECT 
                FALSE, 
                (p_block_duration_hours * 3600),
                'Account temporarily blocked due to excessive verification attempts.'::TEXT;
            RETURN;
        END IF;
    
        -- Temporarily block for one hour when hourly limit is hit
        UPDATE profiles
        SET verification_blocked_until = v_now + INTERVAL '1 hour'
        WHERE id = p_user_id;
    
        RETURN QUERY SELECT 
            FALSE, 
            3600, -- 1 hour
            'Rate limit exceeded. Please try again in an hour.'::TEXT;
        RETURN;
    END IF;
    
    -- Increment attempt counter
    UPDATE profiles SET 
        verification_attempts = COALESCE(verification_attempts, 0) + 1,
        updated_at = v_now
    WHERE id = p_user_id;
    
    RETURN QUERY SELECT TRUE, 0, NULL::TEXT;
END;
$$;

-- Function to record successful verification
CREATE OR REPLACE FUNCTION public.record_location_verification(
    p_user_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_ip_address TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles SET
        is_location_verified = TRUE,
        location_verified_at = NOW(),
        last_verification_lat = p_latitude,
        last_verification_lng = p_longitude,
        verification_ip = p_ip_address,
        verification_attempts = 0,
        verification_blocked_until = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- Function to check if re-verification is needed (90 days expiration)
CREATE OR REPLACE FUNCTION public.needs_location_reverification(
    p_user_id UUID,
    p_expiration_days INTEGER DEFAULT 90
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_verified_at TIMESTAMPTZ;
BEGIN
    SELECT location_verified_at INTO v_verified_at 
    FROM profiles 
    WHERE id = p_user_id;
    
    IF v_verified_at IS NULL THEN
        RETURN TRUE;
    END IF;
    
    RETURN v_verified_at < (NOW() - (p_expiration_days || ' days')::INTERVAL);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_location_verification_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_location_verification TO service_role;
GRANT EXECUTE ON FUNCTION public.needs_location_reverification TO authenticated;

-- Add audit log event type for location verification
DO $$
BEGIN
    -- Update check constraint if it exists
    ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check 
        CHECK (action IN (
            'login', 'logout', 'signup', 'password_reset', 'email_change',
            'listing_created', 'listing_updated', 'listing_deleted', 'listing_sold',
            'listing_creation_blocked', 'chat_started', 'message_sent', 'message_rate_limited',
            'report_submitted', 'favorite_added', 'favorite_removed',
            'profile_updated', 'profile_photo_updated',
            'boost_purchased', 'boost_activated', 'boost_expired',
            'location_verification_success', 'location_verification_failed',
            'location_verification_blocked', 'location_verification_rate_limited'
        ));
EXCEPTION
    WHEN others THEN
        -- Constraint might not exist or have different structure, skip
        NULL;
END $$;
