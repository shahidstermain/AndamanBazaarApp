# Known Issues

## Release Status

**Current release status: not safe to deploy**

This document lists the issues verified during the release-readiness review.

## Blockers

### 1. Payment Success Can Be Shown Without Verified Payment

- **Severity**: blocker
- **Area**: payment confirmation
- **Files**:
  - `src/pages/BoostSuccess.tsx`
  - `tests/BoostSuccess.test.tsx`

**What happens**

- The success page queries `listing_boosts` directly from the client.
- If the first check is not `paid`, it retries once after 3 seconds.
- If the retry is still not `paid`, it still sets UI state to success.

**Why this matters**

- This violates payment integrity expectations.
- A user can see a successful boost confirmation before backend confirmation exists.
- It creates support, trust, and financial reconciliation risk.

**Evidence**

- `src/pages/BoostSuccess.tsx` sets `setStatus('success')` even when retry status is still not `paid`.
- `tests/BoostSuccess.test.tsx` explicitly tests and expects this behavior.

**Required fix**

- Replace client-assumed success with backend-trusted verification only.
- Show pending state until server says `paid`, or show non-final state with refresh/polling that never assumes success.

### 2. Broken Homepage Create Listing Links

- **Severity**: blocker
- **Area**: homepage navigation
- **Files**:
  - `src/pages/Home.tsx`
  - `src/App.tsx`

**What happens**

- Homepage empty-state CTAs link to `/create`.
- The actual create listing route is `/post`.
- Clicking these CTAs lands users on 404.

**Why this matters**

- This breaks a primary conversion path from homepage to listing creation.
- It is a visible production regression.

**Required fix**

- Replace `/create` with `/post` everywhere.

### 3. Sitemap Uses the Wrong Production Domain

- **Severity**: blocker
- **Area**: SEO and crawlability
- **Files**:
  - `public/robots.txt`
  - `public/sitemap.xml`

**What happens**

- `robots.txt` references `https://andamanbazaar.in/sitemap.xml`.
- `sitemap.xml` still contains `https://andamanbazaar.com/...` URLs.

**Why this matters**

- Search engines receive contradictory crawl signals.
- Production indexing can target the wrong domain.
- This is especially risky during migration or cutover.

**Required fix**

- Regenerate or manually fix sitemap URLs to use the live production domain.

### 4. Missing Static Assets Referenced by `index.html`

- **Severity**: blocker
- **Area**: broken assets / browser UX
- **Files**:
  - `index.html`
  - `public/`

**Missing referenced assets**

- `/apple-touch-icon.png`
- `/favicon-32x32.png`
- `/favicon-16x16.png`
- `/safari-pinned-tab.svg`

**Why this matters**

- Production will generate avoidable 404s.
- Browser tab, install, and bookmark experiences degrade.
- Broken assets are noisy in logs and monitoring.

**Required fix**

- Add the missing files or remove the tags that reference them.

## High-Risk Caveats

### 5. No Dynamic Page-Level SEO Metadata

- **Severity**: high
- **Area**: SEO
- **Files**:
  - `index.html`
  - `src/` search showed no route-level metadata handling

**What happens**

- Base metadata exists in `index.html`.
- No page-level metadata system was found for listing detail, category, or seller pages.

**Impact**

- Shared links and indexed pages will have generic metadata.
- Listing SEO quality is below release-grade for a marketplace.

**Suggested fix**

- Add route-aware metadata handling for high-value pages.

### 6. Error Logging Is Console-Only

- **Severity**: high
- **Area**: observability
- **Files**:
  - `src/components/ErrorBoundary.tsx`
  - various page files using `console.error`

**What happens**

- The error boundary logs to console.
- It explicitly notes external reporting as future work.
- No browser error aggregation tool was found.

**Impact**

- Production issues will be harder to detect and triage.
- Silent client-side failures may be missed unless manually reproduced.

**Suggested fix**

- Add centralized client error reporting before release or as immediate follow-up.

### 7. Production Callback and Redirect URLs Depend on Runtime Origin Configuration

- **Severity**: high
- **Area**: auth and payment domain config
- **Files**:
  - `src/pages/AuthView.tsx`
  - `supabase/functions/*`

**What happens**

- Auth redirect and email verification redirect use `window.location.origin`.
- Edge functions rely on `FRONTEND_ORIGIN` defaults or environment configuration.

**Impact**

- If Supabase allowed URLs or function origin env values are incomplete, auth or callback flows can fail on apex, `www`, or staging domains.

**Suggested fix**

- Verify allowlists and `FRONTEND_ORIGIN` settings for:
  - `https://andamanbazaar.in`
  - `https://www.andamanbazaar.in`
  - staging domain

## Medium-Risk Issues

### 8. Payment Initiation Still Has a Client-Side URL Construction Fallback

- **Severity**: medium
- **Area**: payment initiation
- **File**: `src/components/BoostListingModal.tsx`

**What happens**

- If `payment_link` is absent, the client constructs a Cashfree URL using `VITE_CASHFREE_ENV` and `payment_session_id`.

**Impact**

- This is less robust than a fully server-returned payment URL.
- It is not the primary blocker, but it is a release hardening gap.

**Suggested fix**

- Prefer a server-generated redirect URL consistently.

### 9. Privacy Contact Uses `.com` Email

- **Severity**: medium
- **Area**: content/domain consistency
- **File**: `src/pages/PrivacyPolicy.tsx`

**What happens**

- Privacy page references `privacy@andamanbazaar.com`.

**Impact**

- Brand/domain inconsistency after `.in` cutover.
- Potential support confusion.

**Suggested fix**

- Align contact addresses to the production domain strategy.

### 10. Mobile Quality Is Not Fully Verified by This Review Alone

- **Severity**: medium
- **Area**: responsive UX

**What happens**

- Responsive classes are used heavily and look structurally sound.
- This review did not execute device-level manual checks.

**Impact**

- There may still be modal, form, or spacing issues on narrow devices.

**Suggested fix**

- Run the manual mobile smoke pass in `SMOKE_TEST_SCRIPT.md`.

## Lower-Risk Observations

### 11. 404 Handling Exists, but 500 Handling Is Generic

- **Severity**: low
- **Area**: resilience UX
- **Files**:
  - `src/pages/NotFound.tsx`
  - `src/components/ErrorBoundary.tsx`

**What happens**

- 404 handling exists and is user-friendly.
- Runtime error handling is generic and client-side only.

**Impact**

- Acceptable for many SPAs, but not ideal for a polished launch.

### 12. Image Upload Failure Is Partially Tolerant but Not Fully Transactional

- **Severity**: low to medium
- **Area**: uploads
- **Files**:
  - `src/pages/CreateListing.tsx`
  - `src/lib/validation.ts`

**What happens**

- Listing creation can continue even if some image uploads fail.
- This avoids total failure, but can leave a listing created with partial media.

**Impact**

- Potential user confusion if a listing saves with fewer images than expected.

**Suggested fix**

- Decide whether partial success is acceptable, and improve user feedback if keeping current behavior.

## Issues Verified as Good Enough for Release Once Blockers Are Fixed

### Search and Filtering

- Search, category filter, area filter, verified filter, price filter, sorting, and infinite scroll are implemented.

### Seller Profile Route

- Public seller route exists at `/seller/:sellerId` and is implemented in `src/pages/SellerProfile.tsx`.

### File Name Security Check for Uploads

- `src/lib/validation.ts` rejects suspicious double-extension names like `shell.php.jpg`.

### 404 Page

- `src/pages/NotFound.tsx` exists and is wired in `src/App.tsx`.

## Recommended Release Order

### Before Any Production Deploy

- Fix payment confirmation flow
- Fix broken `/create` links
- Fix sitemap domain
- Fix missing icon asset references
- Verify callback and redirect configuration

### Before Traffic Cutover

- Re-run smoke test script
- Validate payment flow end to end on production domain
- Confirm no broken static asset requests remain
- Confirm `robots.txt` and `sitemap.xml` match final live domain

## Final Recommendation

**not safe to deploy**

The app has strong foundations and many core marketplace flows are present, but the verified payment confirmation defect and broken release-critical links are enough to block a responsible go-live.
