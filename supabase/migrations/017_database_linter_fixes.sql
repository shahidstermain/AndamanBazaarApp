-- Migration 017: Supabase Database Linter Fixes
-- Addresses unindexed FK and unused indexes per Supabase linter.
-- Keeps indexes that support RLS (user_id, auth.uid), common WHERE/JOIN (chat_id, listing_id), and ORDER BY patterns.

-- 1. UNINDEXED FOREIGN KEY
CREATE INDEX IF NOT EXISTS idx_recommendations_cache_listing_id
  ON public.recommendations_cache(listing_id);

-- 2. UNUSED INDEXES – drop only low-impact ones
-- KEPT (RLS / frequent queries): idx_listings_user_id, idx_listings_category_id, idx_listings_subcategory_id,
-- idx_listings_status, idx_listings_created_at, idx_listings_city, idx_listings_area, idx_messages_chat_id,
-- idx_messages_sender_id, idx_chats_listing_id, idx_chats_buyer_unread, idx_chats_seller_unread,
-- idx_favorites_user_id, idx_favorites_listing_id, idx_listing_images_listing_id, idx_listing_boosts_user_id,
-- idx_reports_listing_id, idx_reports_reporter_id, idx_user_interactions_user_id, idx_user_interactions_listing_id,
-- idx_audit_logs_user, idx_security_events_user, idx_invoices_user
DROP INDEX IF EXISTS public.idx_listing_boosts_status;
DROP INDEX IF EXISTS public.idx_audit_boost;
DROP INDEX IF EXISTS public.idx_audit_event;
DROP INDEX IF EXISTS public.idx_audit_order;
DROP INDEX IF EXISTS public.idx_invoices_boost;
DROP INDEX IF EXISTS public.idx_invoices_number;
DROP INDEX IF EXISTS public.idx_user_interactions_user_type;
DROP INDEX IF EXISTS public.idx_user_interactions_created;
DROP INDEX IF EXISTS public.idx_recommendations_user_score;
DROP INDEX IF EXISTS public.idx_recommendations_expires;
DROP INDEX IF EXISTS public.idx_listings_idempotency;
DROP INDEX IF EXISTS public.idx_listings_moderation;
DROP INDEX IF EXISTS public.idx_listings_drafts;
DROP INDEX IF EXISTS public.idx_trending_city_score;
DROP INDEX IF EXISTS public.idx_trending_category_score;
DROP INDEX IF EXISTS public.idx_messages_unread;
DROP INDEX IF EXISTS public.idx_chats_active;
DROP INDEX IF EXISTS public.idx_typing_events_chat;
DROP INDEX IF EXISTS public.idx_audit_logs_action;
DROP INDEX IF EXISTS public.idx_audit_logs_status;
DROP INDEX IF EXISTS public.idx_audit_logs_created;
DROP INDEX IF EXISTS public.idx_security_events_type;
DROP INDEX IF EXISTS public.idx_security_events_unresolved;
DROP INDEX IF EXISTS public.idx_listings_moderation_status;
DROP INDEX IF EXISTS public.idx_listings_deleted_at;
DROP INDEX IF EXISTS public.idx_listings_active_category_created;
DROP INDEX IF EXISTS public.idx_listings_views_count;
DROP INDEX IF EXISTS public.idx_listings_fts;
DROP INDEX IF EXISTS public.idx_messages_deleted_at;
DROP INDEX IF EXISTS public.idx_listings_featured;
DROP INDEX IF EXISTS public.idx_listings_browse;
DROP INDEX IF EXISTS public.idx_listings_user_status;
DROP INDEX IF EXISTS public.idx_listing_boosts_active;
DROP INDEX IF EXISTS public.idx_listing_boosts_cashfree_order;
DROP INDEX IF EXISTS public.idx_profiles_email;
DROP INDEX IF EXISTS public.idx_profiles_phone;
DROP INDEX IF EXISTS public.idx_profiles_city;
DROP INDEX IF EXISTS public.idx_profiles_trust_level;
DROP INDEX IF EXISTS public.idx_reports_status;
DROP INDEX IF EXISTS public.idx_trending_category;
DROP INDEX IF EXISTS public.idx_trending_period_rank;
DROP INDEX IF EXISTS public.idx_user_interactions_type;
DROP INDEX IF EXISTS public.idx_chat_typing_events_user_id;
DROP INDEX IF EXISTS public.idx_chats_archived_by;

-- Auth DB connections: Switch Auth to percentage-based allocation in
-- Project Settings > Database. See Supabase going-into-production guide.

-- Optional: Run pg_stat_user_indexes weekly and re-run advisor after schema changes.
