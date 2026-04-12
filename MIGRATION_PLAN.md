# AndamanBazaar — Comprehensive Migration Plan

> **Version**: 1.0  
> **Status**: DRAFT — Awaiting review  
> **Last Updated**: 2026-03-12  
> **Scope**: Consolidate Firebase → Firebase Hosting (proper project) + harden Supabase backend + CI/CD

---

## Executive Summary

AndamanBazaar is **~95% on Supabase** already. The migration is primarily about:

1. **Fixing Firebase project misconfiguration** (currently points to wrong project `gen-lang-client-0408960446`)
2. **Cleaning up dead Firebase env vars/types** from the frontend
3. **Hardening the Cashfree payment flow** (critical security fixes)
4. **Activating the CI/CD pipeline** (deploy.yml exists but needs correct secrets)
5. **DNS cutover** to Firebase Hosting under the correct project (`andamanbazaarfirebase`)

**No data migration is required** — all user, marketplace, payment, and storage data lives in Supabase.

---

## Current State Analysis

### What's Already on Supabase ✅

| Service        | Status                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Authentication | ✅ Supabase Auth (email/password, social)                                                                   |
| Database       | ✅ PostgreSQL via Supabase                                                                                  |
| File Storage   | ✅ Supabase Storage buckets                                                                                 |
| Edge Functions | ✅ 5 deployed (create-boost-order, cashfree-webhook, generate-invoice, send-invoice-email, verify-location) |
| Real-time      | ✅ Supabase Realtime (chat)                                                                                 |
| RLS Policies   | ✅ Implemented (migrations 012–017)                                                                         |

### What's on Firebase (to fix/retire)

| Service                         | Status                                     | Action                        |
| ------------------------------- | ------------------------------------------ | ----------------------------- |
| Static Hosting                  | ⚠️ Misconfigured project ID                | Fix → `andamanbazaarfirebase` |
| Firebase env vars in `env.d.ts` | ⚠️ 7 dead type declarations                | Remove                        |
| `.firebaserc`                   | ⚠️ `prod` points to wrong project          | Fix or remove `prod` alias    |
| `apphosting.yaml`               | ⚠️ Placeholder config                      | Configure or remove           |
| CSP header in `firebase.json`   | ⚠️ References `gen-lang-client-0408960446` | Update to correct domain      |
| Firebase Analytics              | ❌ Not actively used                       | No action needed              |

### Critical Security Issues (from Payment Risk Audit)

| Issue                                                      | Severity    | Status                           |
| ---------------------------------------------------------- | ----------- | -------------------------------- |
| Frontend trusts payment status without server verification | 🔴 CRITICAL | Needs fix                        |
| `VITE_GOOGLE_GENERATIVE_AI_API_KEY` exposed client-side    | 🟡 MEDIUM   | Needs migration to Edge Function |
| Webhook replay window (5 min) could be tighter             | 🟡 MEDIUM   | Already at 300s — acceptable     |
| Missing database-level idempotency lock                    | 🟡 MEDIUM   | Needs `SELECT ... FOR UPDATE`    |

---

## Migration Phases

### Phase 0: Pre-Flight (No Code Changes)

**Goal**: Verify prerequisites before touching any code.

| #   | Task                                                                      | Owner    | Verification                                                         |
| --- | ------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| 0.1 | Confirm `andamanbazaarfirebase` Firebase project exists and is accessible | DevOps   | `firebase projects:list` shows project                               |
| 0.2 | Confirm Supabase production project is healthy                            | DevOps   | `supabase status` or dashboard check                                 |
| 0.3 | Back up current Supabase database                                         | DevOps   | `pg_dump` or Supabase dashboard backup                               |
| 0.4 | Document current DNS records for `andamanbazaar.in`                       | DevOps   | Screenshot of DNS provider                                           |
| 0.5 | Obtain Cashfree **production** credentials                                | Business | App ID + Secret Key from Cashfree dashboard                          |
| 0.6 | Obtain Firebase service account JSON for CI/CD                            | DevOps   | Download from Firebase Console → Project Settings → Service Accounts |
| 0.7 | Set up GitHub repository secrets                                          | DevOps   | See [Required Secrets](#required-github-secrets) below               |

---

### Phase 1: Environment & Config Cleanup

**Goal**: Remove dead Firebase references, fix project IDs, update CSP.  
**Risk**: LOW — No runtime behavior changes.  
**Rollback**: Git revert.

#### 1.1 Fix `.firebaserc`

```diff
 {
   "projects": {
-    "prod": "gen-lang-client-0408960446",
     "default": "andamanbazaarfirebase"
   },
   "targets": {},
   "etags": {}
 }
```

#### 1.2 Clean `src/env.d.ts` — Remove dead Firebase types

```diff
 interface ImportMetaEnv {
     readonly VITE_SUPABASE_URL: string;
     readonly VITE_SUPABASE_ANON_KEY: string;
-    readonly VITE_API_KEY: string;
-    readonly VITE_FIREBASE_API_KEY: string;
-    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
-    readonly VITE_FIREBASE_PROJECT_ID: string;
-    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
-    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
-    readonly VITE_FIREBASE_APP_ID: string;
-    readonly VITE_FIREBASE_MEASUREMENT_ID: string;
+    readonly VITE_SUPABASE_PROJECT_ID: string;
+    readonly VITE_CASHFREE_ENV: string;
     readonly VITE_RATE_LIMIT_WINDOW?: string;
     readonly VITE_RATE_LIMIT_MAX_REQUESTS?: string;
     readonly VITE_ENABLE_CSP?: string;
     readonly VITE_ENV?: string;
+    readonly VITE_SENTRY_DSN?: string;
+    readonly VITE_SENTRY_ENVIRONMENT?: string;
+    readonly VITE_APP_VERSION?: string;
 }
```

#### 1.3 Update CSP in `firebase.json`

Replace all references to `gen-lang-client-0408960446` in the Content-Security-Policy header:

```diff
- connect-src 'self' ... https://gen-lang-client-0408960446.web.app https://gen-lang-client-0408960446.firebaseapp.com;
+ connect-src 'self' ... https://andamanbazaarfirebase.web.app https://andamanbazaarfirebase.firebaseapp.com;
```

#### 1.4 Clean or configure `apphosting.yaml`

Decision needed:

- **If using Firebase App Hosting (Cloud Run)**: Configure environment variables properly
- **If using Firebase Hosting only (static)**: Remove `apphosting` section from `firebase.json` and delete `apphosting.yaml`

**Recommendation**: Use Firebase Hosting (static) since this is a Vite SPA. Remove `apphosting.yaml` and the `apphosting` key from `firebase.json`.

#### 1.5 Update `.env.example` with actual frontend env vars

```
# Supabase (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id

# Cashfree (frontend - environment only, no secrets)
VITE_CASHFREE_ENV=sandbox

# Monitoring
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=development
VITE_APP_VERSION=

# Security
VITE_RATE_LIMIT_WINDOW=60000
VITE_RATE_LIMIT_MAX_REQUESTS=100
VITE_ENABLE_CSP=true
VITE_ENV=development
```

#### 1.6 Remove `ftp-deploy` dependency and script

```diff
 // package.json
 "scripts": {
-    "ftp-deploy": "npm run build && ftp-deploy -c ftp-deploy.json"
 },
 "dependencies": {
-    "ftp-deploy": "^2.4.3",
 }
```

---

### Phase 2: Cashfree Payment Hardening

**Goal**: Fix critical payment security vulnerabilities.  
**Risk**: MEDIUM — Changes payment flow behavior.  
**Rollback**: Revert Edge Function deployments via Supabase dashboard.

#### 2.1 Add server-side payment verification Edge Function

Create `supabase/functions/verify-payment/index.ts`:

- Accepts `order_id` from authenticated user
- Queries `listing_boosts` table to check actual payment status
- Returns verified status (not trusting client)
- Enforces ownership check (`boost.user_id === user.id`)

#### 2.2 Add database-level idempotency to webhook

Update `cashfree-webhook/index.ts`:

```sql
-- Add before the UPDATE in webhook processing
SELECT * FROM listing_boosts
WHERE cashfree_order_id = $1
FOR UPDATE SKIP LOCKED;
```

This prevents double-processing from concurrent webhook deliveries.

#### 2.3 Move Gemini AI key to Edge Function

Currently `VITE_GOOGLE_GENERATIVE_AI_API_KEY` is in the build env (exposed client-side in deploy.yml line 122). This must be:

1. Removed from `VITE_*` env vars
2. Moved to a Supabase Edge Function that proxies AI moderation requests
3. Frontend calls the Edge Function instead of the Gemini API directly

**New Edge Function**: `supabase/functions/moderate-image/index.ts`

#### 2.4 Tighten webhook CORS

The `cashfree-webhook` currently has `Access-Control-Allow-Origin` set. Webhooks from Cashfree servers don't need CORS — they're server-to-server. Consider:

- Removing CORS headers from webhook endpoint (Cashfree calls don't send `Origin`)
- Or restricting to Cashfree's known IP ranges

#### 2.5 Add rate limiting to create-boost-order

Prevent abuse: max 5 order creation requests per user per hour.

---

### Phase 3: CI/CD Pipeline Activation

**Goal**: Get `deploy.yml` working with correct secrets and configuration.  
**Risk**: LOW — Pipeline changes don't affect running production.  
**Rollback**: Disable GitHub Actions workflow.

#### 3.1 Required GitHub Secrets {#required-github-secrets}

| Secret                        | Description             | Where to get it                                        |
| ----------------------------- | ----------------------- | ------------------------------------------------------ |
| `FIREBASE_PROJECT_ID`         | `andamanbazaarfirebase` | Firebase Console                                       |
| `FIREBASE_SERVICE_ACCOUNT`    | Service account JSON    | Firebase Console → Project Settings → Service Accounts |
| `PROD_SUPABASE_URL`           | Production Supabase URL | Supabase Dashboard → Settings → API                    |
| `PROD_SUPABASE_ANON_KEY`      | Production anon key     | Supabase Dashboard → Settings → API                    |
| `PROD_SUPABASE_PROJECT_ID`    | Production project ID   | Supabase Dashboard                                     |
| `PROD_GEMINI_API_KEY`         | Google Gemini API key   | Google AI Studio (⚠️ move to Edge Function in Phase 2) |
| `STAGING_SUPABASE_URL`        | Staging Supabase URL    | Staging Supabase project                               |
| `STAGING_SUPABASE_ANON_KEY`   | Staging anon key        | Staging Supabase project                               |
| `STAGING_SUPABASE_PROJECT_ID` | Staging project ID      | Staging Supabase project                               |
| `STAGING_GEMINI_API_KEY`      | Staging Gemini key      | Google AI Studio                                       |

#### 3.2 Fix deploy.yml issues

- Remove Docker job (not needed for static hosting)
- Ensure `PROD_GEMINI_API_KEY` is removed from build env after Phase 2.3 (moved to Edge Function)
- Add Supabase Edge Function deployment step
- Add Lighthouse budget file (`lighthouse-budget.json`)

#### 3.3 Add Edge Function deployment to CI

```yaml
- name: Deploy Edge Functions
  run: |
    npx supabase functions deploy create-boost-order --project-ref ${{ secrets.PROD_SUPABASE_PROJECT_ID }}
    npx supabase functions deploy cashfree-webhook --project-ref ${{ secrets.PROD_SUPABASE_PROJECT_ID }}
    npx supabase functions deploy verify-payment --project-ref ${{ secrets.PROD_SUPABASE_PROJECT_ID }}
    npx supabase functions deploy generate-invoice --project-ref ${{ secrets.PROD_SUPABASE_PROJECT_ID }}
    npx supabase functions deploy send-invoice-email --project-ref ${{ secrets.PROD_SUPABASE_PROJECT_ID }}
    npx supabase functions deploy verify-location --project-ref ${{ secrets.PROD_SUPABASE_PROJECT_ID }}
```

#### 3.4 Consolidate workflow files

Currently 4 workflow files exist:

- `ci.yml` — basic lint/test
- `deploy.yml` — full pipeline (the canonical one)
- `test-and-deploy.yml` — duplicate
- `test-pipeline.yml` — duplicate

**Action**: Keep only `deploy.yml`, remove the other 3 to avoid confusion.

---

### Phase 4: Database Hardening

**Goal**: Apply remaining schema migrations and verify RLS.  
**Risk**: MEDIUM — Schema changes on production database.  
**Rollback**: Reverse migration SQL.

#### 4.1 Verify existing RLS policies

Run advisory checks:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Ensure all tables have `rowsecurity = true`.

#### 4.2 Apply pending migrations from SUPABASE_MIGRATION_DESIGN.md

- Auth session tracking enhancements
- Analytics tables (page_views, events)
- Storage tracking tables
- Real-time event tracking
- Enhanced indexes for performance

#### 4.3 Add payment idempotency constraints

```sql
-- Prevent duplicate payments at database level
ALTER TABLE listing_boosts
ADD CONSTRAINT unique_pending_boost_per_listing
EXCLUDE USING btree (listing_id WITH =)
WHERE (status = 'pending');
```

#### 4.4 Add payment_audit_log indexes

```sql
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_order_id
ON payment_audit_log (cashfree_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_event_type
ON payment_audit_log (event_type, created_at);
```

---

### Phase 5: DNS Cutover & Go-Live

**Goal**: Point `andamanbazaar.in` to Firebase Hosting under correct project.  
**Risk**: HIGH — DNS propagation affects all users.  
**Rollback**: Revert DNS records to previous values.

#### 5.1 Pre-cutover (T-48 hours)

- Reduce DNS TTL to 300 seconds (5 min)
- Deploy production build to Firebase Hosting and verify at `andamanbazaarfirebase.web.app`
- Run health checks against Firebase preview URL
- Verify SSL certificate provisioning

#### 5.2 DNS Cutover (T-0)

```
# Apex domain
Name: @
Type: A
Value: 199.36.158.100

# www subdomain
Name: www
Type: CNAME
Value: andamanbazaarfirebase.web.app
```

#### 5.3 Post-cutover verification

- `curl -sf https://andamanbazaar.in/health.json`
- `curl -sf https://www.andamanbazaar.in/health.json`
- Test login flow
- Test listing creation
- Test payment flow (sandbox)
- Monitor error rates for 24 hours

#### 5.4 Restore TTL (T+48 hours)

After confirming stability, restore DNS TTL to 3600 seconds (1 hour).

---

## Implementation Order & Timeline

| Phase                       | Duration    | Dependencies                  | Can Parallelize?        |
| --------------------------- | ----------- | ----------------------------- | ----------------------- |
| Phase 0: Pre-Flight         | 1 day       | None                          | —                       |
| Phase 1: Env/Config Cleanup | 1 day       | Phase 0                       | Yes (with Phase 2 prep) |
| Phase 2: Cashfree Hardening | 2–3 days    | Phase 0                       | Yes (with Phase 1)      |
| Phase 3: CI/CD Activation   | 1 day       | Phase 1                       | Yes (with Phase 2)      |
| Phase 4: Database Hardening | 1 day       | Phase 0                       | Yes (with Phase 1–3)    |
| Phase 5: DNS Cutover        | 1 day       | Phase 1, 2, 3, 4 all complete | No                      |
| **Total**                   | **~7 days** |                               |                         |

---

## Rollback Strategy

### Per-Phase Rollback

| Phase   | Rollback Method                                                 | Time                 |
| ------- | --------------------------------------------------------------- | -------------------- |
| Phase 1 | `git revert` the config commits                                 | 2 min                |
| Phase 2 | Redeploy previous Edge Function versions via Supabase dashboard | 5 min                |
| Phase 3 | Disable GitHub Actions workflow                                 | 1 min                |
| Phase 4 | Run reverse migration SQL                                       | 5 min                |
| Phase 5 | Revert DNS records to old values + TTL already at 300s          | 5–10 min propagation |

### Emergency Rollback (Full)

```bash
# 1. Revert DNS to old hosting
# 2. Git revert to pre-migration tag
git checkout pre-migration-tag
npm ci && npm run build
firebase deploy --only hosting

# 3. Redeploy old Edge Functions
supabase functions deploy --all --project-ref <project-id>
```

**Pre-migration tag**: Create `git tag pre-migration` before starting Phase 1.

---

## Risk Register

| Risk                                  | Likelihood | Impact   | Mitigation                               |
| ------------------------------------- | ---------- | -------- | ---------------------------------------- |
| Firebase project access issues        | Medium     | High     | Verify access in Phase 0                 |
| Cashfree production credential delays | Medium     | High     | Start procurement in Phase 0             |
| DNS propagation delays                | Low        | Medium   | TTL reduction 48h before cutover         |
| Payment flow regression               | Low        | Critical | Sandbox testing + staged rollout         |
| CI/CD secret misconfiguration         | Medium     | Low      | Verify with staging deploy first         |
| Database migration failure            | Low        | High     | Test on staging first, have rollback SQL |

---

## Files Modified (Summary)

### Modified

| File                                           | Phase | Change                                               |
| ---------------------------------------------- | ----- | ---------------------------------------------------- |
| `.firebaserc`                                  | 1     | Remove wrong `prod` alias                            |
| `src/env.d.ts`                                 | 1     | Remove Firebase types, add Supabase/Cashfree types   |
| `firebase.json`                                | 1     | Fix CSP, remove `apphosting` section                 |
| `.env.example`                                 | 1     | Update with correct frontend env vars                |
| `package.json`                                 | 1     | Remove `ftp-deploy` dependency and script            |
| `supabase/functions/cashfree-webhook/index.ts` | 2     | Add `FOR UPDATE` lock, tighten CORS                  |
| `.github/workflows/deploy.yml`                 | 3     | Fix secrets, add Edge Function deploy, remove Docker |

### Created

| File                                         | Phase | Purpose                                    |
| -------------------------------------------- | ----- | ------------------------------------------ |
| `supabase/functions/verify-payment/index.ts` | 2     | Server-side payment status verification    |
| `supabase/functions/moderate-image/index.ts` | 2     | Proxy for Gemini AI (move key server-side) |

### Deleted

| File                                    | Phase | Reason                            |
| --------------------------------------- | ----- | --------------------------------- |
| `apphosting.yaml`                       | 1     | Not needed for static SPA hosting |
| `.github/workflows/ci.yml`              | 3     | Duplicate of deploy.yml           |
| `.github/workflows/test-and-deploy.yml` | 3     | Duplicate of deploy.yml           |
| `.github/workflows/test-pipeline.yml`   | 3     | Duplicate of deploy.yml           |

---

## Required GitHub Secrets Checklist

- [ ] `FIREBASE_PROJECT_ID` = `andamanbazaarfirebase`
- [ ] `FIREBASE_SERVICE_ACCOUNT` = Service account JSON
- [ ] `PROD_SUPABASE_URL`
- [ ] `PROD_SUPABASE_ANON_KEY`
- [ ] `PROD_SUPABASE_PROJECT_ID`
- [ ] `STAGING_SUPABASE_URL`
- [ ] `STAGING_SUPABASE_ANON_KEY`
- [ ] `STAGING_SUPABASE_PROJECT_ID`
- [ ] `PROD_GEMINI_API_KEY` (temporary — remove after Phase 2.3)
- [ ] `STAGING_GEMINI_API_KEY` (temporary — remove after Phase 2.3)

---

## Post-Migration Validation

### Smoke Tests

- [ ] Home page loads
- [ ] User can sign up / log in
- [ ] Listings page shows data
- [ ] Create listing flow works
- [ ] Image upload works
- [ ] Chat messaging works
- [ ] Boost payment flow works (sandbox)
- [ ] Admin panel accessible
- [ ] PWA manifest loads correctly
- [ ] Health check endpoint responds

### Performance

- [ ] Lighthouse score ≥ 85 (Performance, Accessibility, Best Practices, SEO)
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 4s

### Security

- [ ] All RLS policies active
- [ ] No secrets in client bundle (`grep -r "sk_" dist/` returns nothing)
- [ ] CSP headers correct
- [ ] Webhook signature verification working
- [ ] CORS headers restrictive

---

## Approval

| Role          | Name | Date | Status    |
| ------------- | ---- | ---- | --------- |
| Developer     |      |      | ☐ Pending |
| DevOps        |      |      | ☐ Pending |
| Product Owner |      |      | ☐ Pending |
