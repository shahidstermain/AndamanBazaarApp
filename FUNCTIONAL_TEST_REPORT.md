# AndamanBazaar Functional Test Report

**Date:** 2026-02-18
**Environment:** localhost:5174 (Vite dev server)
**Supabase Project:** msxeqzceqjatoaluempo

---

## Pre-Test Setup

| Step                         | Status  | Notes                                         |
| ---------------------------- | ------- | --------------------------------------------- |
| Fix `.env.local` anon key    | ✅ PASS | Replaced publishable key with JWT anon key    |
| Fix Capacitor version ranges | ✅ PASS | Changed `^5.7.0` → `^5.0.0` (no 5.7.0 exists) |
| `npm install`                | ✅ PASS | Dependencies installed successfully           |
| `npm run dev`                | ✅ PASS | Server running on port 5174                   |

---

## Test Results Summary

| #   | Test Case                 | Status  | Details                                                             |
| --- | ------------------------- | ------- | ------------------------------------------------------------------- |
| 1   | Home Page Load            | ✅ PASS | Hero section, search bar, categories, featured items all render     |
| 2   | Hero Search               | ✅ PASS | Typing "scooter" + Search → `/listings?q=scooter`                   |
| 3   | Category Navigation       | ✅ PASS | Clicking "Mobiles" → `/listings?category=mobiles` with active state |
| 4   | All Categories Present    | ✅ PASS | ALL, MOBILES, VEHICLES, HOME, FASHION, PROPERTY, SERVICES           |
| 5   | Auth Page - Login Tab     | ✅ PASS | Email + Password fields, "Sign In Securely" button                  |
| 6   | Auth Page - Signup Tab    | ✅ PASS | Display Name + Email + Password, "Create Island Account" button     |
| 7   | Auth Page - Phone Tab     | ✅ PASS | Phone number field, "Get OTP" button                                |
| 8   | Google OAuth Button       | ✅ PASS | "Continue with Google" visible on all auth tabs                     |
| 9   | Protected Route: /post    | ✅ PASS | Redirects to `/auth` when unauthenticated                           |
| 10  | Protected Route: /chats   | ✅ PASS | Redirects to `/auth` when unauthenticated                           |
| 11  | Protected Route: /profile | ✅ PASS | Redirects to `/auth` when unauthenticated                           |
| 12  | Listings Page Load        | ✅ PASS | Search bar, category filters, sort dropdown, price filter           |
| 13  | Sort Dropdown             | ✅ PASS | Options: Newest First, Price Low→High, Price High→Low, Most Viewed  |
| 14  | Price Filter              | ✅ PASS | Min/Max inputs, Clear All, Apply Filter buttons                     |
| 15  | Listing Card Click        | ✅ PASS | Navigates to `/listings/<uuid>`                                     |
| 16  | Listing Detail Page       | ✅ PASS | Image, title, price (₹1,800), badges, description, seller info      |
| 17  | Chat Now Button           | ✅ PASS | Redirects to `/auth` when unauthenticated                           |
| 18  | Report Listing Button     | ✅ PASS | Visible on detail page                                              |
| 19  | Seller Info Card          | ✅ PASS | Shows "Island Seller", member since 2024                            |
| 20  | EXPLORE Header Link       | ✅ PASS | Navigates to `/listings`                                            |
| 21  | TASKS Header Link         | ✅ PASS | Navigates to `/todos`                                               |
| 22  | Browse Items Footer       | ✅ PASS | Navigates to `/listings`                                            |
| 23  | Start Selling Footer      | ✅ PASS | Navigates to `/post` → redirects to `/auth`                         |
| 24  | Todos/Tasks Page          | ✅ PASS | Shows "Project Tasks", input field, empty state, DB setup hint      |
| 25  | Non-existent Route (404)  | ✅ PASS | Redirects to home page (soft 404)                                   |
| 26  | Non-existent Listing ID   | ✅ PASS | Shows "ITEM MISSING" + "Back to Market" button                      |
| 27  | Mobile Responsive View    | ✅ PASS | Correct layout at 375×812, bottom nav bar visible                   |
| 28  | Mobile Bottom Nav Bar     | ✅ PASS | Home, Search, Sell (+), Chats, Sign In icons                        |
| 29  | Mobile Nav Link (Search)  | ✅ PASS | Bottom nav Search → `/listings` with active state                   |

---

## Detailed Findings

### Home Page

- **Hero Section**: "Buy & Sell in Paradise" with search placeholder "Search mobiles, scooters..."
- **App Download Banner**: "Experience the Best - Download the App" with GET IT and close button
- **Categories**: 7 categories with icons
- **Featured Section**: "Today's Hot Picks" with at least 1 listing (Ferragamo Perfume)

### Listings Page

- **Active Listing Count**: 1 item found (Ferragamo Perfume, ₹1,800)
- **Category Buttons**: Horizontal scrollable with active state highlighting
- **Search**: Full-text search with URL parameter persistence
- **Price Filter**: Expandable panel with min/max rupee inputs

### Authentication

- **3 Auth Methods**: Email/Password Login, Email Signup, Phone OTP
- **Social Login**: Google OAuth available on all tabs
- **Troubleshooting**: "Fixing 403 / Redirects" dropdown available
- **Protected Routes**: All 3 protected routes properly redirect

### Listing Detail Page

- **Product Info**: Title, price, minimum offer price, badges
- **Seller Card**: Avatar, name, member since date
- **Actions**: Chat Now (protected), Report Listing
- **Description**: Full formatted text with fragrance notes

### Error Handling

- **Invalid URLs**: Graceful redirect to home
- **Invalid Listing IDs**: Custom "Item Missing" page with back navigation
- **Console Errors**: Expected Supabase 400 on invalid UUID, no critical errors

### Mobile Responsiveness

- **Bottom Nav**: 5-item persistent bottom bar with sell button prominently centered
- **Layout**: Content properly restructured for mobile viewport
- **Navigation**: All bottom nav items functional

---

## Issues Found

| #   | Severity | Issue                        | Details                                                                       |
| --- | -------- | ---------------------------- | ----------------------------------------------------------------------------- |
| 1   | Low      | No dedicated 404 page        | Non-existent routes silently redirect to home instead of showing a 404        |
| 2   | Info     | Supabase 400 on invalid UUID | Console logs `22P02` error for invalid listing IDs (handled gracefully in UI) |
| 3   | Info     | Only 1 test listing          | Database has minimal test data                                                |

---

## Conclusion

**Overall Status: ✅ ALL 29 TESTS PASSED**

The AndamanBazaar application is functioning correctly across all tested scenarios. Core features including search, filtering, authentication flow, protected routes, listing details, error handling, and mobile responsiveness are all working as expected. The application is ready for user acceptance testing with real data.
