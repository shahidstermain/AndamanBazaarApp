# Release Caveats and Recommendations

This document outlines the remaining release-readiness caveats after the primary blockers were fixed. Dynamic SEO metadata and centralized frontend error logging are now implemented. The remaining go-live work is primarily manual configuration verification for production URLs, auth redirects, payment callbacks, and monitoring credentials.

## 1. URL and Redirect Configuration (High Priority)

**Status**: Pending manual verification

**Area**: Auth & Payments
**Files**:

- `src/pages/AuthView.tsx`
- `supabase/functions/`

**Issue**: The application uses `window.location.origin` for auth redirects, and Supabase Edge Functions have a fallback origin. This can lead to failures if the production environment configuration is incomplete.

**Required Action Before Go-Live**:

- **Supabase Auth Settings**: In your Supabase project dashboard, navigate to **Authentication -> URL Configuration**. Ensure the **Site URL** is set to `https://andamanbazaar.in` and that the following are added to the **Redirect URLs** allowlist:
  - `https://andamanbazaar.in/auth`
  - `https://www.andamanbazaar.in/auth`
  - `https://staging.andamanbazaar.in/auth` (if you have a staging Supabase project)

- **Supabase Edge Function Environment Variables**: For each Edge Function (`verify-location`, `generate-invoice`, `cashfree-webhook`, etc.), ensure the `FRONTEND_ORIGIN` environment variable is explicitly set to `https://andamanbazaar.in`.

- **Cashfree Dashboard**: In your Cashfree production dashboard, verify that all webhook endpoints and return URLs (for post-payment redirection) are configured to use `https://andamanbazaar.in`.

## 2. Dynamic SEO Metadata (Medium Priority)

**Status**: Implemented

**Area**: SEO
**Files**: `src/App.tsx`, `src/components/Seo.tsx`, `src/pages/Home.tsx`, `src/pages/Listings.tsx`, `src/pages/ListingDetail.tsx`, `src/pages/SellerProfile.tsx`

**What changed**:

- `react-helmet-async` is now wired through `HelmetProvider` in `src/App.tsx`.
- Page-level metadata is now set through `src/components/Seo.tsx`.
- Dynamic titles and descriptions are now applied to the homepage, listings page, listing detail page, and seller profile page.

**Follow-up**:

- After deployment, validate page titles and Open Graph tags on the live domain using browser devtools and a social share debugger.

## 3. Centralized Error Logging (Medium Priority)

**Status**: Implemented, requires production DSN configuration

**Area**: Observability
**Files**: `src/index.tsx`, `src/components/ErrorBoundary.tsx`, `src/lib/monitoring.ts`

**What changed**:

- `@sentry/react` is installed and initialized from `src/index.tsx`.
- `src/lib/monitoring.ts` centralizes frontend error reporting and forwards production `console.error` calls to Sentry.
- `src/components/ErrorBoundary.tsx` now reports React render crashes through the monitoring helper.

**Required Action Before Go-Live**:

- Set `VITE_SENTRY_DSN` in the frontend environment to your Sentry browser DSN.
- Optionally set `VITE_SENTRY_ENVIRONMENT` and `VITE_APP_VERSION` so events are tagged by environment and release.
- Do not place Sentry auth tokens or any server-side secrets in frontend env files. Only the public browser DSN belongs in `VITE_` variables.

**Verification**:

- After deployment, trigger a controlled frontend error in staging and confirm the event appears in Sentry with stack trace and route metadata.
