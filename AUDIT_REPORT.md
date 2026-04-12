# AndamanBazaarApp — Comprehensive Audit Report

**Date**: March 2026  
**Scope**: Supabase Edge Functions, Database Schema & Migrations, Frontend Security  
**Priority Order**: Security > Data Integrity > Correctness > Performance > DX

---

## Executive Summary

The application has a solid foundation with good security practices in many areas — RLS is enabled on all tables, Edge Functions properly authenticate users and verify ownership, payment webhooks verify signatures, and audit logging is comprehensive. However, the audit identified **4 critical**, **6 high**, and **9 medium** severity findings that should be addressed before or shortly after production launch.

---

## 1. CRITICAL Findings

### C1: Google Gemini API Key Exposed Client-Side

- **File**: `src/pages/CreateListing.tsx:251`
- **Issue**: `VITE_API_KEY` (Google Generative AI key) is read via `import.meta.env.VITE_API_KEY` and used directly in the browser. Any `VITE_` prefixed variable is bundled into the frontend JavaScript and visible to all users.
- **Risk**: Key theft, quota abuse, billing attacks against the Google Cloud account.
- **Fix**: Create a Supabase Edge Function (e.g., `ai-suggest`) that proxies the Gemini call server-side. The frontend should call this Edge Function instead of the Gemini API directly. Remove `VITE_API_KEY` from the frontend env.

### C2: Listings DELETE RLS Policy Re-Added — Soft-Delete Bypass

- **Files**: Migration `008_production_readiness_fixes.sql:56` explicitly drops the DELETE policy:
  ```sql
  DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;
  ```
  But migration `015_rls_policy_initplan.sql:130-132` re-creates it:
  ```sql
  CREATE POLICY "Users can delete own listings" ON public.listings
    FOR DELETE USING ((select auth.uid()) = user_id);
  ```
- **Risk**: Users can physically DELETE listing rows via the Supabase client, bypassing the soft-delete mechanism (`status = 'deleted'`). This destroys data permanently and breaks referential integrity with `chats`, `listing_boosts`, `invoices`, etc.
- **Fix**: Remove the DELETE policy from migration 015. The app's soft-delete design (set `status = 'deleted'`) is correct — physical DELETE should only be done by the `clean_stale_listing_data()` cron function via service role.

### C3: Chat Creation Policy Regression

- **File**: Migration `008` correctly tightens chat creation to validate `seller_id` matches the listing owner:
  ```sql
  CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id AND
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = seller_id)
  );
  ```
  But migration `015_rls_policy_initplan.sql:37-39` replaces it with a weaker version:
  ```sql
  CREATE POLICY "Users can create chats" ON public.chats
    FOR INSERT WITH CHECK ((select auth.uid()) = buyer_id);
  ```
- **Risk**: Any authenticated user can create a chat with an arbitrary `seller_id`, impersonating a seller or associating chats with wrong users.
- **Fix**: Restore the seller validation in the INSERT policy. The `(select auth.uid())` initplan optimization is fine, but the `EXISTS` clause must be preserved.

### C4: `audit_logs` Client-Side INSERT Policy Enables Log Spoofing

- **File**: Migration `008_production_readiness_fixes.sql:18-22`
  ```sql
  CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  ```
- **Risk**: Any authenticated user can insert arbitrary audit log entries (e.g., fake `listing_created`, `boost_purchased` events) as long as `user_id` matches their own ID. This undermines audit log integrity — a key requirement for security forensics and compliance.
- **Fix**: Remove the INSERT policy. Client-side audit logging (`src/lib/security.ts:logAuditEvent`) should be routed through a lightweight Edge Function that validates and inserts logs server-side. Alternatively, restrict the policy to specific safe action types, or accept the trade-off if log integrity is deemed non-critical.

---

## 2. HIGH Findings

### H1: `listing-images` Storage Upload Not Path-Restricted

- **File**: Migration `013_phase2_phase4_fixes.sql:131-132`
  ```sql
  CREATE POLICY "Allow authenticated uploads to listing-images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'listing-images' AND auth.role() = 'authenticated');
  ```
- **Issue**: Any authenticated user can upload to any path in the `listing-images` bucket. Compare with the `avatars` and `listings` buckets, which enforce `(storage.foldername(name))[1] = auth.uid()::text`.
- **Risk**: Users can overwrite other users' listing images or pollute the bucket with arbitrary files.
- **Fix**: Add the path ownership check: `AND (storage.foldername(name))[1] = auth.uid()::text`.

### H2: Two Migration Directories — No Clear Ordering Strategy

- **Directories**: `migrations/` (files 001–011) and `supabase/migrations/` (files 012–017)
- **Issue**: The two directories have no formalized execution order. Migration 012 (`upgrade_schema.sql`) re-creates tables (`chats`, `messages`, `reports`, `favorites`) that already exist from `schema.sql`, which could cause conflicts or silent errors depending on execution context.
- **Risk**: Applying migrations out of order or from the wrong directory could corrupt schema or lose data. The `IF NOT EXISTS` guards prevent outright crashes but may silently skip intended changes.
- **Fix**: Consolidate into a single directory (`supabase/migrations/`) with clear sequential numbering. Add a `README.md` documenting the migration order and strategy.

### H3: `handle_new_user()` Function Redefined 3 Times

- **Files**: `schema.sql:146`, `012_upgrade_schema.sql:152`, `013_phase2_phase4_fixes.sql:41`
- **Issue**: Each version has slightly different behavior:
  - `schema.sql`: Sets phone from `new.phone`, default name `'Island User'`
  - `012`: Sets phone from nowhere (not included), default name from `new.email`, also creates `user_roles` entry
  - `013`: Includes phone, default name `'Island User'`, creates `user_roles` entry, has `SET search_path`
- **Risk**: Depending on which migration was last applied, new user creation behaves differently. Only version 013 is complete and secure (has `search_path`).
- **Fix**: Ensure migration 013's version is the canonical one. Add a migration test that verifies the function signature and behavior.

### H4: `increment_listing_views()` Redefined 4 Times with Different Logic

- **Files**: `schema.sql:166` (simple increment), `008:120` (deduplicated via `listing_views` table), `012:186` (simple increment, wrong column `view_count`), `013:74` (simple increment, correct column `views_count`)
- **Risk**: The last-applied version wins. Version `008` has the best logic (deduplication), but `013` overwrites it with a simple increment. This means views are no longer deduplicated and the `listing_views` table is orphaned.
- **Fix**: Determine the desired behavior. If deduplication is wanted, the `008` version should be restored as the final version, and subsequent migrations should not overwrite it.

### H5: Profile Audit Trigger NULL Comparison Bug

- **File**: `migrations/003_security_enhancements.sql:204`
  ```sql
  IF (OLD.name != NEW.name OR OLD.phone_number != NEW.phone_number OR OLD.email != NEW.email) THEN
  ```
- **Issue**: In PostgreSQL, `NULL != 'value'` evaluates to `NULL` (not `TRUE`), so if any of these fields is NULL, the comparison silently fails and the audit event is never logged.
- **Fix**: Use `IS DISTINCT FROM`:
  ```sql
  IF (OLD.name IS DISTINCT FROM NEW.name OR OLD.phone_number IS DISTINCT FROM NEW.phone_number OR OLD.email IS DISTINCT FROM NEW.email) THEN
  ```

### H6: `has_role()` Function Has Unreachable Code

- **File**: `012_upgrade_schema.sql:231-255`
  ```sql
  RETURN user_role = role_required OR user_role = 'admin';
  -- Code below is unreachable:
  IF role_required = 'admin' THEN ...
  ```
- **Issue**: The `RETURN` on line ~240 exits the function before the role hierarchy logic below it ever executes. This was fixed in `013` which rewrites the function in SQL style, but if `012` is applied after `013`, the broken version wins.
- **Fix**: Ensure the `013` version (the correct one) is applied last, or remove the duplicate from `012`.

---

## 3. MEDIUM Findings

### M1: `check_rate_limit()` Inserts Security Event Without `user_id`

- **File**: `003_security_enhancements.sql:135-145`
- **Issue**: When rate limit is exceeded, the security event is inserted without a `user_id`, even though the key often contains one.
- **Fix**: Parse `user_id` from the key if it matches the `uuid:action` format.

### M2: `bump_listing()` Missing `SET search_path`

- **File**: `017_listing_bump.sql:16-54`
- **Issue**: The function is `SECURITY DEFINER` but lacks `SET search_path = public`, unlike all functions fixed in migration `010`.
- **Fix**: Add `SET search_path = public` to the function definition.

### M3: `security_events` Table Has No SELECT Policy

- **File**: `003_security_enhancements.sql:80-83`
- **Issue**: RLS is enabled but no SELECT policy exists for anyone. This means even admins cannot query security events through the client — only via service role. This may be intentional, but it limits incident response tooling.
- **Fix**: Add an admin-only SELECT policy (using `has_role('admin')`), or document that security events are only accessible via service role.

### M4: Invoice Sequence Not Month-Scoped

- **File**: `014_financial_system.sql:60-70`
- **Issue**: `invoice_seq` is a global sequence that never resets. The format `AB-INV-202603-00001` looks monthly-scoped, but the sequence number will continue incrementing across months (e.g., March might start at `00150` not `00001`).
- **Impact**: Cosmetic — invoices still have unique numbers, but the numbering won't restart per month.
- **Fix**: If monthly reset is desired, use a separate sequence per month or compute the number from a month-filtered count.

### M5: `listing_boosts` RLS — Users Can INSERT But Policy in 011 vs 014 Differs

- **File**: Migration `011` has a user INSERT policy with listing ownership check. Migration `014` does not have a user INSERT policy (only service role full access + user SELECT).
- **Risk**: If `014` is applied after `011`, users may lose the ability to insert boosts, forcing the Edge Function to handle all inserts (which it does). However, the Edge Function in `create-boost-order` uses `service_role` to insert, so this may be a non-issue in practice. Verify that user-direct inserts are not expected.

### M6: Supabase Client Fallback to Placeholder Credentials

- **File**: `src/lib/supabase.ts:18-21`
  ```ts
  export const supabase = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder-anon-key",
  );
  ```
- **Issue**: If env vars are missing, the client silently initializes with placeholder values instead of failing hard. This could mask configuration errors in deployment.
- **Fix**: Throw an error or disable Supabase features entirely when env vars are missing, rather than creating a client that will fail silently on every request.

### M7: `env.d.ts` Declares Stale/Unused Variables

- **File**: `src/env.d.ts:6-13`
- **Issue**: Declares `VITE_API_KEY`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc. but the app primarily uses Supabase. Firebase variables may be legacy or only used for hosting.
- **Fix**: Clean up `env.d.ts` to match actually-used variables. Add `VITE_E2E_BYPASS_AUTH` which is used in `auth.ts` but not declared.

### M8: No Rollback SQL in Any Migration

- **Issue**: None of the 17+ migrations include rollback/down SQL. If a migration introduces a bug, there's no documented way to reverse it.
- **Fix**: For each migration, add a commented-out `-- ROLLBACK:` section with the inverse SQL. For critical production changes, prepare and test rollback scripts before applying.

### M9: `clean_stale_listing_data()` Permanently Deletes Without Archiving

- **File**: `005_chat_constraints_soft_delete.sql:50-58`
- **Issue**: Hard-deletes listings after 30 days of soft-deletion. No archiving step — data is gone forever, including any linked images, chats, and boosts (due to `ON DELETE CASCADE`).
- **Fix**: Consider archiving to a separate table or at minimum logging the deletion in `audit_logs` before permanent removal.

---

## 4. Edge Functions Assessment

### Summary: Generally Well-Implemented

| Function             | Auth                     | Input Validation | Idempotency      | Audit Log | Rating |
| -------------------- | ------------------------ | ---------------- | ---------------- | --------- | ------ |
| `create-boost-order` | ✅ JWT + ownership       | ✅               | ✅ pending check | ✅        | 9/10   |
| `cashfree-webhook`   | ✅ Signature + timestamp | ✅               | ✅               | ✅        | 9/10   |
| `verify-location`    | ✅ JWT                   | ✅ bounds + IP   | ✅ rate limit    | ✅        | 9/10   |
| `generate-invoice`   | ✅ Service role          | ✅               | ✅               | ✅        | 8/10   |
| `send-invoice-email` | ✅ Service role          | ✅               | ✅               | ✅        | 8/10   |

### Minor Edge Function Notes:

- **`generate-invoice`**: Uses `SUPABASE_SERVICE_ROLE_KEY` correctly. Consider adding a timeout for the Supabase Storage upload.
- **`send-invoice-email`**: Has a good fallback when `RESEND_API_KEY` is not set (logs instead of crashing). Consider adding retry logic for transient email failures.
- **`verify-location`**: Good IP cross-check, but the external IP geolocation service could be a single point of failure. Consider caching or graceful degradation.
- **All functions**: Use `CORS` headers appropriately. Consider adding `X-Request-ID` for cross-function tracing.

---

## 5. Database Schema Assessment

### Tables Identified (Public Schema)

| Table                   | RLS | SELECT         | INSERT         | UPDATE         | DELETE    | Notes                                      |
| ----------------------- | --- | -------------- | -------------- | -------------- | --------- | ------------------------------------------ |
| `profiles`              | ✅  | ✅ public      | — trigger      | ✅ owner       | —         | No self-insert policy (trigger handles it) |
| `listings`              | ✅  | ✅ filtered    | ✅ owner       | ✅ owner       | ⚠️ see C2 | DELETE policy re-added in 015              |
| `listing_images`        | ✅  | ✅ public      | ✅ owner       | —              | ✅ owner  | Good ownership check via JOIN              |
| `favorites`             | ✅  | ✅ owner       | ✅ owner       | —              | ✅ owner  | Clean                                      |
| `chats`                 | ✅  | ✅ participant | ⚠️ see C3      | ✅ participant | —         | INSERT policy weakened in 015              |
| `messages`              | ✅  | ✅ participant | ✅ participant | —              | —         | Soft-delete via function only              |
| `reports`               | ✅  | ✅ admin/mod   | ✅ reporter    | ✅ admin/mod   | —         | Clean                                      |
| `user_roles`            | ✅  | ✅ own+admin   | — trigger      | —              | —         | Clean                                      |
| `listing_boosts`        | ✅  | ✅ owner       | — svc role     | — svc role     | —         | Service role handles writes                |
| `invoices`              | ✅  | ✅ owner       | — svc role     | — svc role     | —         | Clean                                      |
| `payment_audit_log`     | ✅  | — svc only     | — svc only     | —              | —         | Clean, append-only                         |
| `audit_logs`            | ✅  | ✅ owner       | ⚠️ see C4      | —              | —         | INSERT too permissive                      |
| `security_events`       | ✅  | ❌ no policy   | — svc only     | —              | —         | See M3                                     |
| `rate_limits`           | ✅  | ✅ own prefix  | — svc only     | —              | —         | Pattern-based match                        |
| `user_interactions`     | ✅  | ✅ owner       | ✅ owner       | —              | —         | Clean                                      |
| `recommendations_cache` | ✅  | ✅ owner       | — svc only     | —              | —         | Clean                                      |
| `trending_listings`     | ✅  | ✅ public      | — svc only     | —              | —         | Clean                                      |
| `listing_views`         | ✅  | ✅ public      | ✅ authed      | —              | —         | Clean                                      |
| `chat_typing_events`    | ✅  | ✅ participant | ✅ owner       | —              | —         | Clean                                      |

### Functions with Missing `search_path`

| Function                  | Migration | Status                                                     |
| ------------------------- | --------- | ---------------------------------------------------------- |
| `bump_listing()`          | 017       | ❌ Missing                                                 |
| `set_message_delivered()` | 002       | ❌ Missing (not SECURITY DEFINER, but still best practice) |
| `update_chat_activity()`  | 002       | ❌ Missing                                                 |

---

## 6. Prioritized Action Items

### Immediate (Before Production Traffic)

| #   | Finding                                                 | Effort  | Impact                          |
| --- | ------------------------------------------------------- | ------- | ------------------------------- |
| 1   | **C1**: Move Gemini API key to Edge Function            | Medium  | Critical — key exposure         |
| 2   | **C2**: Remove listings DELETE policy from 015          | Trivial | Critical — data loss            |
| 3   | **C3**: Restore seller validation in chat INSERT policy | Trivial | Critical — impersonation        |
| 4   | **H1**: Add path restriction to `listing-images` upload | Trivial | High — file overwrites          |
| 5   | **H5**: Fix NULL comparison in profile audit trigger    | Trivial | High — silent audit gaps        |
| 6   | **M2**: Add `search_path` to `bump_listing()`           | Trivial | Medium — security best practice |

### Short-Term (Within 2 Weeks)

| #   | Finding                                                     | Effort  | Impact                   |
| --- | ----------------------------------------------------------- | ------- | ------------------------ |
| 7   | **C4**: Restrict or remove audit_logs INSERT policy         | Low     | Critical — log integrity |
| 8   | **H2**: Consolidate migration directories                   | Medium  | High — operational risk  |
| 9   | **H3/H4**: Verify canonical function versions in production | Low     | High — correctness       |
| 10  | **M6**: Fail hard on missing Supabase env vars              | Trivial | Medium — debuggability   |
| 11  | **M7**: Clean up `env.d.ts`                                 | Trivial | Low — DX                 |

### Medium-Term (Within 1 Month)

| #   | Finding                                             | Effort  | Impact                      |
| --- | --------------------------------------------------- | ------- | --------------------------- |
| 12  | **M8**: Add rollback SQL to all migrations          | Medium  | Medium — operational safety |
| 13  | **M9**: Add archiving before permanent deletion     | Low     | Medium — data recovery      |
| 14  | **M3**: Add admin SELECT policy for security_events | Trivial | Medium — incident response  |
| 15  | **M4**: Decide on invoice numbering strategy        | Low     | Low — cosmetic              |

---

## 7. Positive Findings

The following areas are well-implemented and should be preserved:

- **RLS on all tables** — no table is missing `ENABLE ROW LEVEL SECURITY`
- **Edge Function auth** — all functions properly verify JWT or webhook signatures
- **Payment integrity** — Cashfree webhook verifies signatures and enforces timestamp freshness
- **Idempotency** — payment processing, invoice generation, and email sending all have idempotency guards
- **Rate limiting** — both database-level and Edge Function-level rate limiting implemented
- **Audit logging** — comprehensive logging across critical operations
- **Soft-delete pattern** — listings use `status = 'deleted'` with 30-day grace period (though DELETE policy regression in C2 needs fixing)
- **Listing bump** — server-side cooldown enforcement prevents abuse
- **Location verification** — multi-layer approach (GPS + IP + rate limit + fraud detection)
- **initplan optimization** — migration 015 correctly wraps `auth.uid()` in `(select ...)` to avoid per-row evaluation

---

_End of Audit Report_
