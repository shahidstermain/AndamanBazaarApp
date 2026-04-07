# 🏝️ AndamanBazaar

> **The hyper-local marketplace for the Andaman & Nicobar Islands** — buy, sell, and connect with your island community.

AndamanBazaar is a full-stack eCommerce marketplace purpose-built for the Andaman Islands. It features real-time chat, Cashfree payments, GPS-based trust verification, AI-powered content moderation, listing boosts, a trip planner, and a rich set of admin tools — all wrapped in a mobile-first PWA.

---

## 📑 Table of Contents

- [Tech Stack](#tech-stack)
- [Features Implemented](#features-implemented)
  - [Authentication & User Profiles](#1-authentication--user-profiles)
  - [Marketplace Listings](#2-marketplace-listings)
  - [Search, Filters & Discovery](#3-search-filters--discovery)
  - [Real-Time Chat](#4-real-time-chat)
  - [Payments & Listing Boosts](#5-payments--listing-boosts-cashfree-payment-gateway-is-implemented-on-the-backend)
  - [Trust & Verification System](#6-trust--verification-system)
  - [AI Content Moderation](#7-ai-content-moderation)
  - [Trip Planner](#trip-planner)
  - [Email & Notification System](#9-email--notification-system)
  - [Seller Profiles & Dashboard](#10-seller-profiles--dashboard)
  - [Admin Panel](#11-admin-panel)
  - [WhatsApp Sharing](#12-whatsapp-sharing)
  - [Referral System](#13-referral-system)
  - [Performance & PWA](#14-performance--pwa)
  - [Security](#15-security)
  - [Andaman-Local Branding](#16-andaman-local-branding)
  - [SEO & Static Pages](#17-seo--static-pages)
  - [Offline Support](#18-offline-support)
  - [Scheduled Cloud Functions](#19-scheduled-cloud-functions)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Backend Direction](#backend-direction)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, DaisyUI, Radix UI primitives |
| **State / Data** | React Context, Firestore real-time listeners |
| **Authentication** | Firebase Authentication (Google, Email/Password) |
| **Database** | Cloud Firestore |
| **File Storage** | Firebase Storage |
| **Server Logic** | Firebase Cloud Functions (Node.js) |
| **Payments** | Cashfree Payment Gateway |
| **AI / ML** | Google Generative AI (Gemini) for moderation & itinerary |
| **Hosting** | Firebase Hosting |
| **Testing** | Vitest, Testing Library, Playwright, axe-core |
| **Charts** | Recharts |
| **PWA** | vite-plugin-pwa, Service Worker |

---

## Features Implemented

### 1. Authentication & User Profiles

**Pages:** `AuthView.tsx` · `Profile.tsx`
**Libs:** `auth.ts` · `firebase.ts`
**Hook:** `useAuthSecurity.ts`

- Firebase Authentication with **Google Sign-In** and **Email/Password**.
- Auto-creation of Firestore user profile on first login (`ensureProfileExists`).
- Protected routes via `RequireAuth` wrapper — unauthenticated users are redirected to `/auth`.
- Profile editing: name, avatar, email notification preferences.
- Listings owned by the user displayed on their profile page.
- E2E bypass mode for automated testing (`VITE_E2E_BYPASS_AUTH`).

---

### 2. Marketplace Listings

**Pages:** `CreateListing.tsx` · `ListingDetail.tsx` · `Listings.tsx`
**Components:** `FeaturedSection.tsx` · `BoostBadge.tsx` · `FreshnessBadge.tsx` · `UrgentBadge.tsx` · `SafeImage.tsx` · `ImageUploadPreview.tsx` · `ImageUploadProgress.tsx`
**Libs:** `postAdUtils.ts` · `demoListings.ts` · `storage.ts` · `validation.ts`
**Hook:** `useImageUpload.ts`

- **Multi-step listing creation** with category selection, image upload, pricing, condition, and location.
- Multi-category support: Fresh Catch, Electronics, Vehicles, Real Estate, Services, and more.
- **Multi-image upload** with progress tracking and preview via Firebase Storage.
- Listing statuses: `active`, `sold`, `draft`.
- **"Mark as Sold"** with ownership verification and confirmation dialog.
- **Featured listings** section on the home page highlighting boosted/premium ads.
- **Freshness badge** showing how recently a listing was posted.
- **Similar listings** recommendation engine (same category, excluding current listing, sorted by recency).
- **Views counter** auto-incremented on listing detail page.
- **Listing detail page** with image gallery, seller info, trust badge, price, description, WhatsApp share, and report button.
- Zod-based input validation on all form fields.
- XSS prevention via DOMPurify sanitization.

---

### 3. Search, Filters & Discovery

**Pages:** `Listings.tsx` · `Home.tsx`
**Components:** `FilterSidebar.tsx` · `AreaFilter.tsx`

- **Full-text search** across listing titles and descriptions with debounced input.
- **Filter sidebar** with:
  - Category filter (multi-select)
  - Price range (min/max)
  - Location / area filter (Port Blair, Havelock, Neil Island, etc.)
  - Condition filter (New, Like New, Used, etc.)
  - Sort options: Newest, Price Low→High, Price High→Low, Most Viewed
- **Rotating search placeholders** with Andaman-themed suggestions.
- URL-based filter state for shareable filtered views.
- **Featured section** on homepage with curated/promoted listings.

---

### 4. Real-Time Chat

**Pages:** `ChatList.tsx` · `ChatRoom.tsx`
**Components:** `ChatFileUpload.tsx` · `QuickReplyTemplates.tsx`

- **Real-time messaging** between buyers and sellers via Firestore listeners.
- **File & image sharing** in chat with upload preview.
- **Quick reply templates** for common responses (e.g., "Is this still available?").
- Chat list showing all conversations with last-message preview and timestamps.
- Unread message indicators.
- Chat initiated directly from listing detail page.
- Messages stored in Firestore with `sender_id`, `content`, `message_type`, `read_at`.

---

### 5. Payments & Listing Boosts (Cashfree)

**Pages:** `Pricing.tsx` · `BoostSuccess.tsx`
**Components:** `BoostListingModal.tsx` · `BoostNudge.tsx` · `BoostBadge.tsx` · `PaymentHistory.tsx` · `InvoiceHistory.tsx`
**Libs:** `payment.ts` · `pricing.ts`
**Context:** `PaymentContext.tsx`
**Cloud Functions:** `createPayment` · `verifyPayment` · `cashfreeWebhook` · `refundPayment` · `getPaymentHistory` · `createOrder` · `createBoostOrder` · `verifyBoostPayment` · `expireBoosts` · `createSeamlessOrder` · `processSeamlessPayment`

- **Three boost tiers:**
  - ⚡ **Spark (₹49)** — 3-day visibility boost
  - 🚀 **Boost (₹99)** — 7-day visibility boost
  - 💎 **Power (₹199)** — 14-day boost with premium placement
- End-to-end **Cashfree payment flow**: order creation → payment → webhook verification → boost activation.
- **Server-side webhook** processing with signature verification for security.
- **Payment history** and **invoice history** views for users.
- **Boost nudge** component suggesting promotion to sellers.
- **Automatic boost expiry** via scheduled Cloud Function (`expireBoosts`).
- **Refund** capability via Cloud Function.
- Pricing page explaining all tiers with feature comparison.
- Boost success confirmation page.

---

### 6. Trust & Verification System

**Components:** `TrustBadge.tsx` · `TrustCard.tsx` · `VouchComponents.tsx`
**Cloud Functions:** `verifyLocation` · `getLocationHistory` · `getNearbyListings`

- **Trust badge levels:**
  - 🆕 **Newbie** — default for new users
  - ✅ **Verified** — GPS-verified with successful transactions
  - 🏆 **Legend** — established sellers with high ratings and volume
- **GPS verification** via browser Geolocation API, validated server-side against known Andaman Island coordinates.
- **IP-based location cross-checking** as additional verification.
- **Vouch system** allowing verified users to vouch for other sellers.
- **Trust card** showing a seller's verification status, response rate, and transaction history.
- Badges displayed on listing cards, seller profiles, and chat interfaces.
- Rate-limited verification attempts to prevent abuse.

---

### 7. AI Content Moderation

**Cloud Functions:** `moderateContent` · `batchModerateContent` · `getModerationHistory` · `getModerationStats`

- **Google Gemini AI**-powered moderation of listing content (text + images).
- Automated flagging of prohibited content, offensive language, and policy violations.
- **Batch moderation** for admin bulk processing.
- **Moderation history** and **stats dashboard** for administrators.
- Server-side enforcement — listings cannot bypass moderation checks.

---

### Trip Planner

**Page:** `TripPlanner.tsx`
**Cloud Function:** `generateItinerary`

- AI-powered trip planner using **Google Gemini** to generate personalized Andaman itineraries.
- Users input travel dates, interests, and preferences.
- Generates day-by-day itinerary with activity suggestions, travel tips, and local recommendations.
- Integrates with marketplace listings for relevant activities and services.

---

### 9. Email & Notification System

**Libs:** `emailService.ts` · `emailTemplates.ts` · `notifications.ts`
**Hook:** `useNotifications.ts`
**Cloud Functions:** `sendEmail` · `sendWeeklyTrendingEmails` · `sendListingExpiryReminders` · `sendAbandonedChatReminders`

- **Transactional emails:** welcome, listing created, payment confirmation, boost activated.
- **Listing expiry reminders** — daily scheduled notifications for listings expiring within 24 hours.
- **Abandoned chat reminders** — every 6 hours, nudge users who haven't replied to chats within 24 hours.
- **Weekly trending emails** with popular listings.
- Branded email templates with Andaman-themed styling.
- User-configurable notification preferences (opt-in/out per type).

---

### 10. Seller Profiles & Dashboard

**Pages:** `SellerProfile.tsx` · `Dashboard.tsx`
**Components:** `AnalyticsDashboard.tsx` · `PriceDiscoveryWidget.tsx` · `ItemHistoryTimeline.tsx`

- **Public seller profile** showing listings, trust badge, response rate, and member since date.
- **Seller dashboard** with:
  - Listing performance metrics (views, inquiries)
  - Active/sold/draft listing counts
  - Revenue tracking from boosts
  - Analytics dashboard with charts (Recharts)
- **Price discovery widget** helping sellers price competitively by showing market averages.
- **Item history timeline** showing the lifecycle of a listing (created → boosted → sold).

---

### 11. Admin Panel

**Page:** `Admin.tsx`
**Components:** `BulkAdminOperations.tsx` · `MigrationDashboard.tsx`

- **Full admin dashboard** with role-based access control.
- **User management:** view users, assign roles (admin, moderator, user).
- **Listing moderation:** approve, reject, or flag listings.
- **Report handling:** review user reports, take action (warn, suspend, ban).
- **Bulk operations:** batch approve, reject, or feature listings.
- **Platform statistics:** active users, total listings, revenue, transaction volume.
- **Migration dashboard** for database migration tracking.

---

### 12. WhatsApp Sharing

**Component:** `WhatsAppShare.tsx`

- One-tap WhatsApp sharing from listing detail page.
- Pre-formatted message with listing title, price, and deep link.
- UTM parameter tracking for referral analytics.
- Works on both mobile (native share) and desktop (web.whatsapp.com).

---

### 13. Referral System

**Component:** `ReferralSystem.tsx`

- User referral tracking with unique referral codes.
- Referral link generation and sharing.
- Referral reward tracking.

---

### 14. Performance & PWA

**Components:** `PerformanceMonitor.tsx` · `AdaptiveImage.tsx` · `LazyRoute.tsx` · `OfflineBanner.tsx`
**Libs:** `performance.ts` · `monitoring.ts`
**Hooks:** `usePerformanceMonitoring.ts` · `useAdaptiveImages.ts`

- **Code splitting** with `React.lazy()` for all non-critical routes.
- **Lazy image loading** with Intersection Observer via `AdaptiveImage.tsx`.
- **Adaptive images** — serves WebP/AVIF based on browser support and connection quality.
- **Performance monitoring** tracking Core Web Vitals (LCP, FID, CLS).
- **Service Worker** for offline caching of static assets.
- **PWA manifest** for "Add to Home Screen" installability.
- **Bundle optimization** with Vite tree-shaking, minification, and dynamic imports.

---

### 15. Security

**Libs:** `security.ts` · `security-client.ts` · `security-middleware.ts` · `validation.ts`
**Hooks:** `useSecurity.ts` · `useAuthSecurity.ts`
**Files:** `firestore.rules` · `storage.rules`

- **Firestore Security Rules:** comprehensive rules ensuring users can only read/write their own data, with admin overrides.
- **Storage Security Rules:** file upload restrictions by type, size, and authenticated user.
- **Input validation** via Zod schemas on all forms (titles, prices, descriptions, categories).
- **XSS prevention** via DOMPurify sanitization of all user-generated content.
- **CSRF protection** via Firebase Auth token verification on Cloud Functions.
- **Rate limiting** on critical endpoints: listing creation (10/hr), messaging (50/hr), auth attempts (5/hr), uploads (20/hr).
- **Content Security Policy** headers configured on the server.
- **Client-side security hooks** for session validation and anomaly detection.

---

### 16. Andaman-Local Branding

**Lib:** `localCopy.ts`
**Component:** `BargeScheduleWidget.tsx`

- **Hyper-local copy** with island-specific humor and references (barge schedules, BSNL connectivity, monsoon seasons).
- **Dynamic loading messages** with Andaman-themed copy ("Catching fresh data from the harbor…").
- **Barge schedule widget** showing inter-island ferry timings — a utility unique to island residents.
- Andaman-themed error and success messages.
- Local categories like "Fresh Catch" for the fishing community.

---

### 17. SEO & Static Pages

**Pages:** `About.tsx` · `PrivacyPolicy.tsx` · `TermsOfService.tsx` · `ContactUs.tsx` · `NotFound.tsx`
**Component:** `Seo.tsx`

- **SEO component** using `react-helmet-async` for dynamic `<title>` and `<meta>` tags per page.
- **About page** with platform mission and team information.
- **Privacy Policy** and **Terms of Service** pages for legal compliance.
- **Contact Us** page with support form.
- **Custom 404 page** with navigation back to active areas.

---

### 18. Offline Support

**Components:** `OfflineBanner.tsx` · `OfflineSyncBanner.tsx`
**Libs:** `offlineQueue.ts`
**Hook:** `useOfflineSync.ts`

- **Offline queue** that caches user actions (listing creation, messages) when connectivity drops.
- **Automatic sync** when the device comes back online.
- **Offline banner** notifying users of connectivity status.
- Critical data pre-cached via Service Worker for offline browsing of previously viewed listings.

---

### 19. Scheduled Cloud Functions

| Function | Schedule | Description |
| --- | --- | --- |
| `expireBoosts` | Periodic | Deactivates boosts that have passed their expiry date |
| `cleanupExpiredReservations` | Periodic | Removes stale payment reservations |
| `sendListingExpiryReminders` | Daily (IST) | Emails sellers whose listings expire within 24 hours |
| `sendAbandonedChatReminders` | Every 6 hours | Nudges users who haven't replied to chats in 24 hours |
| `updateListingFreshness` | Periodic | Recalculates freshness scores on all active listings |
| `markInactiveListings` | Periodic | Marks old listings with no activity as inactive |
| `calculateResponseRates` | Periodic | Computes seller response rates for trust scoring |
| `sendWeeklyTrendingEmails` | Weekly | Sends curated "trending this week" digest emails |
| `cleanupOldData` | Daily | General cleanup of expired/stale records |

---

## Project Structure

```text
andaman-bazaar/
├── src/
│   ├── App.tsx                 # Root app with routing & auth
│   ├── index.tsx               # Entry point
│   ├── index.css               # Global styles (Tailwind)
│   ├── pages/                  # 19 route-level page components
│   ├── components/             # 38+ reusable UI components
│   ├── hooks/                  # 7 custom React hooks
│   ├── contexts/               # PaymentContext
│   ├── lib/                    # 25 utility/service modules
│   └── types.ts                # Frontend type definitions
├── functions/
│   └── src/                    # Firebase Cloud Functions
│       ├── index.ts            # Function exports & scheduled tasks
│       ├── payment.ts          # Legacy payment functions
│       ├── payments/           # New payment module (orders, boosts, webhooks)
│       ├── location.ts         # GPS verification functions
│       ├── moderation.ts       # AI content moderation
│       ├── email.ts            # Email sending
│       ├── freshness.ts        # Listing freshness scoring
│       ├── itinerary.ts        # AI trip planner
│       └── notifications.ts    # Push notifications
├── firestore.rules             # Firestore security rules
├── storage.rules               # Storage security rules
├── firestore.indexes.json      # Composite Firestore indexes
├── firebase.json               # Firebase project config
├── tailwind.config.cjs         # Tailwind + DaisyUI config
├── vite.config.ts              # Vite build config with PWA plugin
├── tests/                      # Unit, integration, security, a11y tests
├── e2e/                        # Playwright end-to-end tests
└── docs/                       # Additional documentation
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create local env file
cp .env.example .env

# 3. Fill in Firebase config and Cloud Function URLs in .env

# 4. Start dev server
npm run dev

# 5. Open http://localhost:5173
```

---

## Environment Variables

```env
# Firebase Client Config
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Cloud Function URLs
VITE_FIREBASE_CREATE_PAYMENT_FUNCTION=
VITE_FIREBASE_VERIFY_PAYMENT_FUNCTION=
VITE_FIREBASE_VERIFY_LOCATION_FUNCTION=
VITE_FIREBASE_MODERATE_CONTENT_FUNCTION=
VITE_FIREBASE_CREATE_INVOICE_FUNCTION=
VITE_FIREBASE_WEBHOOK_FUNCTION=
VITE_FIREBASE_HEALTH_FUNCTION=
VITE_FIREBASE_SECURE_SYNC_FUNCTION=
VITE_FIREBASE_AI_SUGGEST_FUNCTION=
```

> ⚠️ **Never expose private credentials in frontend `VITE_` variables.** All secret keys live server-side in Cloud Functions config.

---

## Backend Direction

All new backend work uses **Firebase / GCP services only**:

- **Firebase Authentication** — identity and session management
- **Cloud Firestore** — primary database with Security Rules using `request.auth.uid`
- **Firebase Storage** — user-uploaded images and files
- **Firebase Cloud Functions** — payment processing, moderation, scheduled tasks
- **Firebase Hosting** — static asset delivery with CDN

Security constraints are documented in `AGENTS.md`.

---

## Testing

```bash
npm run test           # Run all Vitest tests
npm run test:unit      # Unit tests only
npm run test:security  # Security-focused tests
npm run test:e2e       # Playwright end-to-end tests
npm run test:coverage  # Coverage report
npm run test:all       # Unit + Integration + Security + A11y
```

---

## Deployment

```bash
# Build and deploy to Firebase
npm run firebase-deploy
```

See `DEPLOYMENT.md` and `DEPLOYMENT_CHECKLIST.md` for the full deployment runbook.

## Project Metadata

Last updated: March 23, 2026.
