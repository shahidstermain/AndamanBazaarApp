# Release Checklist

## Release Recommendation

**Recommendation: safe to deploy with caveats**

### Resolved Blockers

- ✅ **Payment confirmation logic fixed**: `BoostSuccess.tsx` no longer assumes success on pending payments.
- ✅ **Broken homepage links fixed**: All `/create` links now correctly point to `/post`.
- ✅ **Sitemap domain corrected**: `sitemap.xml` now uses the correct `andamanbazaar.in` domain.
- ✅ **Missing asset references removed**: `index.html` no longer references missing icon files, preventing 404s.

## Evidence Summary

- **Routes**: `src/App.tsx`
- **Broken CTA links**: `src/pages/Home.tsx`
- **Payment confirmation flow**: `src/pages/BoostSuccess.tsx`
- **Robots file**: `public/robots.txt`
- **Sitemap file**: `public/sitemap.xml`
- **Referenced but missing assets**: `index.html`
- **Error logging implementation**: `src/components/ErrorBoundary.tsx` and page-level `console.error` usage

## Go-Live Checklist

### Homepage

- [x] Homepage route exists at `/`
- [x] Hero search submits to `/listings`
- [x] Featured, trending, and recent listing fetches exist
- [ ] Empty-state CTA routes are valid
- [ ] All homepage links verified in production build

**Status**: Fail

**Notes**:

- `src/pages/Home.tsx` contains multiple links to `/create`.
- `src/App.tsx` does not define `/create`; the create/edit flow is on `/post`.

### Category Pages

- [x] Category browsing exists through `/listings?category=...`
- [x] Category chips and search params are wired
- [x] Empty states render
- [ ] Category slugs mapped to real backend `category_id` values verified against production data

**Status**: Caveat

**Notes**:

- UI exists and filtering logic is implemented in `src/pages/Listings.tsx`.
- Final release check should confirm category slugs match real stored values.

### Listing Detail Pages

- [x] Dynamic listing route exists at `/listings/:id`
- [x] Loading state exists
- [x] Not-found state exists
- [x] Similar listings section exists
- [x] Share and WhatsApp actions exist
- [x] Owner actions exist for edit, sold, and boost

**Status**: Pass with caveat

**Notes**:

- Listing detail structure is release-capable.
- Payment-related boost success handling remains a blocker.

### Seller Login and Signup

- [x] `/auth` route exists
- [x] Email/password login exists
- [x] Email/password signup exists
- [x] OAuth login exists
- [x] Email resend flow exists
- [x] Phone OTP flow exists
- [ ] Supabase allowed redirect URLs verified for all production domains
- [ ] OAuth callback behavior validated on `andamanbazaar.in` and `www.andamanbazaar.in`

**Status**: Caveat

**Notes**:

- `AuthView.tsx` uses `window.location.origin` for `redirectTo` and `emailRedirectTo`.
- Production is only safe after matching Supabase auth callback allowlist with deployed domains.

### Listing Creation and Edit

- [x] Auth-gated route exists at `/post`
- [x] Edit flow exists via `/post?edit=<id>`
- [x] Client-side validation exists
- [x] Draft save/resume exists
- [x] Idempotency key is included for create flow
- [x] Location verification flow exists
- [ ] End-to-end create/edit tested against production Supabase buckets and policies

**Status**: Pass with caveat

### Image Upload

- [x] File validation exists
- [x] Compression exists
- [x] Storage upload exists for listing images and avatars
- [x] Suspicious double-extension names are blocked in `src/lib/validation.ts`
- [ ] Production bucket policies verified for `listings` and `avatars`
- [ ] Partial upload failure behavior validated in production

**Status**: Pass with caveat

**Notes**:

- Upload loop currently skips failed image uploads and continues; that is survivable but should be tested against real storage policy behavior.

### Search and Filtering

- [x] Query search exists
- [x] Category filtering exists
- [x] Area filtering exists
- [x] Price filtering exists
- [x] Verified-only filtering exists
- [x] Sort options exist
- [x] Infinite scroll exists

**Status**: Pass

### Profile and Account Pages

- [x] `/profile` route exists and is auth-gated
- [x] Profile editing exists
- [x] Avatar upload exists
- [x] Active, sold, and saved listing views exist
- [x] Bump/share/delete flows exist
- [ ] Manual test of save/logout/profile update in production required

**Status**: Pass with caveat

### Payment Initiation and Confirmation

- [x] Boost modal exists
- [x] Payment initiation calls Supabase Edge Function
- [x] Webhook handling exists server-side
- [ ] Success confirmation is backend-trusted only
- [ ] Frontend does not assume success on delayed webhook
- [ ] Payment return journey verified against production Cashfree config

**Status**: Fail

**Blocking Notes**:

- `src/pages/BoostSuccess.tsx` reads `listing_boosts` directly from the client.
- If status is still pending after retry, it sets `success` anyway.
- Existing tests in `tests/BoostSuccess.test.tsx` explicitly validate this false-positive behavior.

### SEO Metadata

- [x] Base title and description exist in `index.html`
- [x] Base Open Graph tags exist in `index.html`
- [x] Base Twitter tags exist in `index.html`
- [ ] Route-specific metadata for listing detail pages exists
- [ ] Route-specific metadata for category/search pages exists
- [ ] Canonical tags verified

**Status**: Caveat

**Notes**:

- No dynamic metadata handling was found in `src/`.
- This is not a hard functional blocker, but it is a release-quality gap.

### Robots and Sitemap

- [x] `public/robots.txt` exists
- [x] `public/sitemap.xml` exists
- [ ] Sitemap domain matches production domain
- [ ] Sitemap URLs reflect current route structure

**Status**: Fail

**Blocking Notes**:

- `robots.txt` references `https://andamanbazaar.in/sitemap.xml`.
- `sitemap.xml` still uses `https://andamanbazaar.com/...` URLs.

### Mobile Responsiveness

- [x] Responsive Tailwind patterns are widely used
- [x] Listing grids and layout use mobile-first classes
- [ ] Manual checks on homepage, listings, listing detail, auth, create listing, and profile completed on narrow devices
- [ ] Payment initiation flow tested on mobile browser

**Status**: Caveat

### Performance Regressions

- [x] Lazy loading is used on many non-critical images
- [x] Vite build and PWA setup exist
- [x] Lighthouse CI exists in deployment workflow
- [ ] Current release compared against a known production baseline
- [ ] Core Web Vitals verified on staging/prod URLs

**Status**: Caveat

### Error Logging

- [x] Error boundary exists
- [x] Page-level error handling exists in many flows
- [ ] Centralized client-side error reporting exists
- [ ] Deploy-time verification of error aggregation exists

**Status**: Caveat

**Notes**:

- `ErrorBoundary.tsx` logs to console and explicitly says external reporting is future work.
- There is no evidence of Sentry, LogRocket, or equivalent browser error collection.

### Broken Links

- [ ] All CTA routes verified
- [ ] Static assets referenced in `index.html` exist
- [ ] Internal nav and footer links verified

**Status**: Fail

**Blocking Notes**:

- `/create` links are broken.
- `apple-touch-icon.png`, `favicon-32x32.png`, `favicon-16x16.png`, and `safari-pinned-tab.svg` were referenced but not found under `public/`.

### 404 and 500 Handling

- [x] 404 page exists via `src/pages/NotFound.tsx`
- [x] Global React error boundary exists
- [ ] Dedicated server-side 500 experience exists
- [ ] Production fallback behavior tested for chunk-load failures and API outages

**Status**: Caveat

### Domain, SSL, Redirects, and Callback URLs

- [x] Deployment documents target `andamanbazaar.in`
- [x] Auth flows use current origin dynamically
- [x] Robots target `andamanbazaar.in`
- [ ] Supabase auth callback allowlist verified for apex, `www`, and staging domains
- [ ] Cashfree return/callback URLs validated in production config

**Status**: Pass

## Remaining Caveats for Production

### High-Priority Caveats

- **URL/Redirect Configuration**: Supabase and Cashfree callback/redirect URLs must be verified in their respective dashboards before go-live.
- **Dynamic SEO Metadata**: The app lacks page-specific metadata, which is a high-priority item for a public-facing marketplace.
- **Error Logging**: Client-side errors are only logged to the console, making production monitoring difficult.

**Guidance for these items is available in `RELEASE_CAVEATS.md`.**

## Final Decision

**Recommendation: safe to deploy with caveats**

All identified release blockers have been fixed. The remaining caveats are high-priority for a robust production environment but do not block the initial deployment itself. Proceed with the go-live checklist, paying close attention to the URL/redirect verification steps.
