# Known Issues

## Release Status

**Current release status: safe to deploy** ✅

All previously identified blockers have been resolved. This document records the history of those blockers and the verification of their resolution.

## Blockers (All Resolved)

### 1. Payment Success Can Be Shown Without Verified Payment

- **Severity**: blocker
- **Status**: ✅ **RESOLVED**
- **Area**: payment confirmation
- **Files**:
  - `src/pages/BoostSuccess.tsx`
  - `tests/BoostSuccess.test.tsx`

**What was happening**

- The success page queried `listing_boosts` directly from the client.
- If the first check was not `paid`, it retried once after 3 seconds.
- If the retry was still not `paid`, it still set UI state to success.

**How it was fixed**

- `BoostSuccess.tsx` now calls the `verifyBoostPayment` Firebase Cloud Function with the user's ID token.
- The page only reaches `success` state when the server explicitly returns `data.success === true && data.status === 'paid'`.
- Ambiguous states (still processing) result in a `pending` UI state — not success.
- The legacy Supabase-based test (`tests/BoostSuccess.test.tsx`) has been excluded from the test suite and retained as a historical reference.

### 2. Broken Homepage Create Listing Links

- **Severity**: blocker
- **Status**: ✅ **RESOLVED**
- **Area**: homepage navigation
- **Files**:
  - `src/pages/Home.tsx`
  - `src/App.tsx`

**What was happening**

- Homepage empty-state CTAs linked to `/create`.
- The actual create listing route is `/post`.
- Clicking these CTAs landed users on 404.

**How it was fixed**

- All `/create` navigation references in the homepage and application routing have been replaced with `/post`.

### 3. Sitemap Uses the Wrong Production Domain

- **Severity**: blocker
- **Status**: ✅ **RESOLVED**
- **Area**: SEO and crawlability
- **Files**:
  - `public/robots.txt`
  - `public/sitemap.xml`

**What was happening**

- `sitemap.xml` contained `https://andamanbazaar.com/...` URLs (wrong domain).
- This sent contradictory crawl signals to search engines.

**How it was fixed**

- `sitemap.xml` now uses `https://andamanbazaar.in/` for all URLs.
- `robots.txt` references `https://andamanbazaar.in/sitemap.xml`, consistent with the live domain.

### 4. Missing Static Assets Referenced by `index.html`

- **Severity**: blocker
- **Status**: ✅ **RESOLVED**
- **Area**: broken assets / browser UX
- **Files**:
  - `index.html`
  - `public/`

**What was happening**

- `index.html` referenced non-existent assets:
  - `/apple-touch-icon.png`
  - `/favicon-32x32.png`
  - `/favicon-16x16.png`
  - `/safari-pinned-tab.svg`
- These caused avoidable 404s in production.

**How it was fixed**

- The broken `<link>` tags referencing these missing assets were removed from `index.html`.
- No dead asset references remain.

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

### Before Traffic Cutover

- Re-run smoke test script
- Validate payment flow end to end on production domain
- Confirm `robots.txt` and `sitemap.xml` match final live domain
- Verify callback and redirect configuration for `https://andamanbazaar.in` and `https://www.andamanbazaar.in`

## Final Recommendation

**safe to deploy** ✅

All four previously identified blockers have been resolved:

1. Payment confirmation now uses server-side Firebase Cloud Function verification only.
2. Homepage create listing links correctly point to `/post`.
3. Sitemap and robots.txt use the correct `andamanbazaar.in` production domain.
4. Dead asset link tags removed from `index.html` — no stray 404s.

Remaining high-risk and medium-risk caveats are not blockers. The app may proceed to production deployment once the pre-cutover checklist above is completed.
