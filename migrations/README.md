# Database Migrations Guide

## Overview

This guide explains how to run the database migrations for AndamanBazaar's new features.

## Prerequisites

- Access to your Supabase project dashboard
- SQL Editor access in Supabase

## Migrations Order

Run these migrations in the following order:

### 1. Recommendations Schema

**File**: `migrations/001_recommendations_schema.sql`

**Purpose**: Adds user interaction tracking and recommendations caching

**Tables Created**:

- `user_interactions` - Tracks views, favorites, chats, clicks
- `recommendations_cache` - Pre-computed personalized recommendations
- `trending_listings` - Trending listings by city/category

**How to Run**:

1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy contents of `001_recommendations_schema.sql`
4. Click "Run"
5. Verify: Check Tables tab for new tables

---

### 2. Chat Enhancements

**File**: `migrations/002_chat_enhancements.sql`

**Purpose**: Adds message status tracking, reactions, and chat metadata

**Changes**:

- Extends `messages` table with delivered_at, read_at, reactions, edited_at
- Extends `chats` table with is_archived, last_active_at
- Creates `chat_typing_events` table (fallback for Firebase)
- Adds helper functions for read receipts, archiving

**How to Run**:

1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy contents of `002_chat_enhancements.sql`
4. Click "Run"
5. Verify: Check schema changes in Table Editor

---

### 3. Security Enhancements

**File**: `migrations/003_security_enhancements.sql`

**Purpose**: Adds rate limiting, audit logs, and security event tracking

**Tables Created**:

- `rate_limits` - Rate limiting storage with automatic cleanup
- `audit_logs` - Audit trail for all user actions
- `security_events` - Security incidents tracking

**Functions Created**:

- `check_rate_limit()` - Check if request exceeds rate limit
- `log_audit_event()` - Log user actions
- `is_user_in_good_standing()` - Check user security status

**How to Run**:

1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy contents of `003_security_enhancements.sql`
4. Click "Run"
5. Verify: Tables created, triggers active

---

## Post-Migration Checks

### Verify Tables Created

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_interactions',
    'recommendations_cache',
    'trending_listings',
    'rate_limits',
    'audit_logs',
    'security_events',
    'chat_typing_events'
  );
```

### Verify Functions Created

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'check_rate_limit',
    'log_audit_event',
    'get_similar_users_listings',
    'update_trending_listings',
    'mark_messages_as_read',
    'archive_chat'
  );
```

### Test Rate Limiting

```sql
-- Should return TRUE (allowed)
SELECT check_rate_limit('test_user:action', 20, 60);

-- Call 20+ times, should return FALSE (blocked)
```

## Rollback Instructions

If you need to rollback, run in REVERSE order:

### Rollback Security (3)

```sql
DROP TABLE IF EXISTS public.security_events CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit;
DROP FUNCTION IF EXISTS log_audit_event;
DROP FUNCTION IF EXISTS is_user_in_good_standing;
DROP FUNCTION IF EXISTS get_rate_limit_info;

-- Remove triggers
DROP TRIGGER IF EXISTS audit_listings ON public.listings;
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
DROP FUNCTION IF EXISTS audit_listing_changes;
DROP FUNCTION IF EXISTS audit_profile_changes;
```

### Rollback Chat (2)

```sql
-- Remove new columns
ALTER TABLE public.messages
  DROP COLUMN IF EXISTS delivered_at,
  DROP COLUMN IF EXISTS read_at,
  DROP COLUMN IF EXISTS reactions,
  DROP COLUMN IF EXISTS edited_at,
  DROP COLUMN IF EXISTS deleted_at;

ALTER TABLE public.chats
  DROP COLUMN IF EXISTS last_active_at,
  DROP COLUMN IF EXISTS is_archived,
  DROP COLUMN IF EXISTS archived_by,
  DROP COLUMN IF EXISTS archived_at;

DROP TABLE IF EXISTS public.chat_typing_events CASCADE;
DROP FUNCTION IF EXISTS mark_messages_as_read;
DROP FUNCTION IF EXISTS archive_chat;
DROP FUNCTION IF EXISTS delete_message;
DROP FUNCTION IF EXISTS get_total_unread_count;
DROP FUNCTION IF EXISTS cleanup_old_typing_events;

-- Remove triggers
DROP TRIGGER IF EXISTS message_delivered ON public.messages;
DROP TRIGGER IF EXISTS update_chat_activity_on_message ON public.messages;
DROP FUNCTION IF EXISTS set_message_delivered;
DROP FUNCTION IF EXISTS update_chat_activity;
```

### Rollback Recommendations (1)

```sql
DROP TABLE IF EXISTS public.trending_listings CASCADE;
DROP TABLE IF EXISTS public.recommendations_cache CASCADE;
DROP TABLE IF EXISTS public.user_interactions CASCADE;
DROP FUNCTION IF EXISTS clean_expired_recommendations;
DROP FUNCTION IF EXISTS get_similar_users_listings;
DROP FUNCTION IF EXISTS update_trending_listings;
```

## Maintenance

### Schedule Trending Updates (Cron Job)

Set up a Supabase Edge Function or external cron to run daily:

```sql
SELECT update_trending_listings();
```

### Clean Expired Recommendations

Run periodically (e.g., hourly):

```sql
SELECT clean_expired_recommendations();
```

### Clean Old Typing Events

Run daily:

```sql
SELECT cleanup_old_typing_events();
```

## Troubleshooting

### Error: relation already exists

- Skip that migration or run rollback first

### Error: permission denied

- Ensure you're using service role key in SQL Editor

### Performance issues after migration

- All necessary indexes are created automatically
- If still slow, run `ANALYZE` on new tables

### RLS policies blocking queries

- Policies are configured for auth.uid()
- Ensure frontend uses authenticated Supabase client

## Support

If you encounter issues, check:

1. Supabase logs in Dashboard → Logs
2. Browser console for client errors
3. Network tab for failed API calls
