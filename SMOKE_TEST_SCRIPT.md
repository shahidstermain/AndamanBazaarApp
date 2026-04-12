# Smoke Test Script

## Purpose

Use this script immediately before release and again immediately after deployment.

## Expected Result

- All **critical** tests pass.
- Any **warning** result must be logged and triaged.
- Any **fail** on payment, routing, auth, listing creation, or broken assets is a release blocker.

## Test Environment

- **Production URL**: `https://andamanbazaar.in`
- **Staging URL**: `https://staging.andamanbazaar.in`
- **Primary browser**: Chrome latest
- **Secondary browser**: Safari iOS or Chrome Android
- **Test accounts**:
  - Seller account
  - Buyer account
  - Admin account

## Fast CLI Checks

### Health and Static Assets

```bash
curl -I https://andamanbazaar.in/
curl -I https://andamanbazaar.in/health.json
curl -I https://andamanbazaar.in/robots.txt
curl -I https://andamanbazaar.in/sitemap.xml
curl -I https://andamanbazaar.in/favicon.ico
curl -I https://andamanbazaar.in/apple-touch-icon.png
curl -I https://andamanbazaar.in/favicon-32x32.png
curl -I https://andamanbazaar.in/favicon-16x16.png
curl -I https://andamanbazaar.in/safari-pinned-tab.svg
```

### Domain and Redirect Checks

```bash
curl -I http://andamanbazaar.in
curl -I https://www.andamanbazaar.in
curl -I https://andamanbazaar.in/nonexistent-page
```

### Search Engine Files

```bash
curl -s https://andamanbazaar.in/robots.txt
curl -s https://andamanbazaar.in/sitemap.xml | head -40
```

## Manual Smoke Test Flow

### 1. Homepage

- Open `/`
- Verify hero loads without layout break
- Verify search input is usable
- Verify featured/trending/recent sections load
- Click all visible homepage CTAs
- Confirm category chips route correctly

**Pass Conditions**

- No blank sections caused by runtime error
- No CTA lands on 404 unintentionally
- No console errors

**Known Watch Item**

- Current code contains `/create` links; these should be checked explicitly

### 2. Category Pages and Listings Feed

- Open `/listings`
- Select 2 to 3 category chips
- Apply area filter
- Apply verified-only filter
- Apply min/max price filter
- Sort by newest, low-high, high-low, and most viewed
- Test search query submit
- Scroll to trigger infinite loading

**Pass Conditions**

- Filters update results
- Infinite scroll loads more rows without duplication or crash
- Empty state renders gracefully when no results exist

### 3. Listing Detail Page

- Open a real active listing
- Verify title, price, description, images, seller summary
- Click image thumbnails
- Test WhatsApp share
- Test generic share / clipboard fallback
- Test favorite toggle
- Verify similar listings render if available

**Pass Conditions**

- Listing renders fully
- Share actions work
- No console errors
- Back navigation works

### 4. Seller Login and Signup

- Visit `/auth`
- Test existing user login
- Test invalid login credentials
- Test signup flow with email verification message
- Test resend verification link flow
- Test Google OAuth initiation

**Pass Conditions**

- Login succeeds and redirects home
- Error messaging is clear
- Signup sends verification flow correctly
- OAuth returns to `/auth` and completes session correctly

### 5. Listing Creation

- Log in as seller
- Open `/post`
- Add images
- Complete required fields
- Test one invalid validation path
- Save listing
- Confirm post-success share and navigation actions

**Pass Conditions**

- Form loads
- Validation works
- Listing persists
- Uploaded images are visible on saved listing

### 6. Listing Edit

- From seller-owned listing, click Edit
- Change title or price
- Save changes
- Refresh detail page

**Pass Conditions**

- Updated fields persist
- Existing images remain unless explicitly removed

### 7. Image Upload

- Upload valid JPG/PNG/WEBP images
- Upload max-count scenario
- Try invalid file type
- Try oversized file
- Try suspicious name like `shell.php.jpg`

**Pass Conditions**

- Valid images upload
- Invalid files are blocked with UI feedback
- Suspicious filename is rejected

### 8. Search and Filtering

- Search for known keyword from seeded or real listing
- Apply category + city + price together
- Clear filters

**Pass Conditions**

- Search params reflect filters
- Results update correctly
- Clear filter returns expected feed state

### 9. Profile and Account

- Open `/profile`
- Verify stats load
- Edit profile name/city/phone
- Upload avatar
- Switch tabs between active, sold, saved
- Test logout

**Pass Conditions**

- Profile saves successfully
- Avatar loads after save
- Tabs render correct data
- Logout returns to `/auth`

### 10. Payment Initiation

- Open seller-owned active listing
- Click `Boost My Listing`
- Choose tier
- Initiate payment
- Confirm request to `create-boost-order` succeeds
- Confirm redirect to Cashfree starts correctly

**Pass Conditions**

- Payment session is created once
- Redirect happens correctly
- No client crash

### 11. Payment Confirmation

- Complete one successful payment in safe test mode
- Return through payment success path
- Verify listing is actually boosted in backend
- Confirm UI only shows success when backend status is `paid`
- Run a delayed-webhook or pending-order scenario if possible

**Pass Conditions**

- Success page only appears after trusted backend confirmation
- Failed or pending states do not display success

**Current Risk**

- Current implementation is known to falsely show success after retry even if still pending

### 12. SEO Metadata

- Open page source on `/`
- Open page source on `/listings`
- Open page source on `/listings/:id`
- Check title, description, OG tags, Twitter tags

**Pass Conditions**

- Source contains correct production domain
- Page metadata is relevant to page type

### 13. Robots and Sitemap

- Open `/robots.txt`
- Open `/sitemap.xml`
- Confirm sitemap domain is `.in`, not `.com`
- Confirm URLs in sitemap exist and match live routes

**Pass Conditions**

- Robots is accessible
- Sitemap uses production domain and valid URLs

### 14. Mobile Responsiveness

Test on narrow viewport or actual device:

- Homepage
- Listings feed
- Listing detail
- Auth page
- Create listing
- Profile
- Boost modal

**Pass Conditions**

- No overlapping text
- No clipped CTA buttons
- No unusable modals
- Images render correctly

### 15. Error Handling

- Force a 404 route
- Disable network temporarily and refresh page
- Trigger one API failure path if feasible

**Pass Conditions**

- 404 page renders
- Offline state is understandable
- App does not white-screen silently

### 16. Broken Links

Check manually:

- Homepage section links
- Header navigation
- Footer/legal links
- Seller profile links
- Post-success links after listing create

**Pass Conditions**

- No dead internal links
- No missing icon asset 404s

## Browser Console Watch List

Fail the release if you see:

- Uncaught exceptions
- Chunk load errors
- Repeated Supabase auth errors
- Storage upload policy errors
- Cashfree payment redirect failures
- 404s for required icons or manifest assets

## Network Tab Watch List

Investigate if present:

- Repeated failed calls to Supabase
- 401 or 403 on routes that should work for logged-in users
- 404 for static assets
- 500 on edge functions
- Duplicate `create-boost-order` requests

## Sign-Off Template

```text
Environment: [staging|production]
Date/Time:
Tester:

Homepage: PASS/FAIL
Listings Feed: PASS/FAIL
Listing Detail: PASS/FAIL
Auth: PASS/FAIL
Create/Edit Listing: PASS/FAIL
Image Upload: PASS/FAIL
Profile: PASS/FAIL
Payment Initiation: PASS/FAIL
Payment Confirmation: PASS/FAIL
SEO/Robots/Sitemap: PASS/FAIL
Mobile: PASS/FAIL
404/Error Handling: PASS/FAIL
Broken Links: PASS/FAIL

Blocking Issues:
-

Warnings:
-

Final Go/No-Go:
- GO
- GO WITH CAVEATS
- NO-GO
```
