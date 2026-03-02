# Andaman Planner Pro — Integration Guide

This document describes how to embed Andaman Planner Pro into **AndamanBazaar.in** (Vite + React + TypeScript + Tailwind) or deploy it as a standalone Next.js app under the `/planner` subpath.

---

## Table of Contents
1. [Repository Structure](#1-repository-structure)
2. [Environment Variables](#2-environment-variables)
3. [Database Migration](#3-database-migration)
4. [Option A: Embed in AndamanBazaar (Vite)](#4-option-a-embed-in-andamanbazaar-vite)
5. [Option B: Standalone Next.js under /planner](#5-option-b-standalone-nextjs-under-planner)
6. [API Contract Reference](#6-api-contract-reference)
7. [Auth — Shared Session](#7-auth--shared-session)
8. [Rate Limiting](#8-rate-limiting)
9. [Rollout Checklist](#9-rollout-checklist)

---

## 1. Repository Structure

```
planner/
├── apps/
│   ├── planner-next/          # Next.js 14 App Router — API + SSR shell
│   └── planner-vite/          # Vite demo proving embed-ability
├── packages/
│   ├── shared/                # Portable types + Zod schemas + helpers
│   │   └── src/
│   │       ├── types.ts       # TripPreferences, Itinerary, ItineraryDay, etc.
│   │       ├── schemas.ts     # Zod validators
│   │       └── helpers.ts     # Utility functions
│   ├── ui/                    # Portable React UI components (NO Next imports)
│   │   └── src/
│   │       ├── PlannerForm.tsx
│   │       ├── ItineraryView.tsx
│   │       ├── ItineraryCard.tsx
│   │       └── LoadingSpinner.tsx
│   └── supabase/              # Typed Supabase client + repository layer
│       └── src/
│           ├── database.types.ts  # Manually authored DB types (replace with supabase gen types)
│           ├── client.ts          # createBrowserClient / createServiceClient
│           └── repos/
│               ├── itineraryRepo.ts
│               ├── profileRepo.ts
│               └── rateLimiter.ts
└── supabase/
    └── migrations/
        └── 001_planner_schema.sql  # planner schema + RLS + stored procedures
```

---

## 2. Environment Variables

### Next.js shell (`apps/planner-next/.env.local`)
```env
# Supabase — same project as AndamanBazaar
NEXT_PUBLIC_SUPABASE_URL=https://msxeqzceqjatoaluempo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Google Gemini — server-side only, never sent to client
GOOGLE_AI_API_KEY=<your-gemini-api-key>

# Subpath deployment (set to /planner in production)
NEXT_BASE_PATH=/planner

# Rate limiting
PLANNER_MAX_GENERATIONS_PER_HOUR=5
```

### Vite demo (`apps/planner-vite/.env`)
```env
VITE_SUPABASE_URL=https://msxeqzceqjatoaluempo.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_PLANNER_API_URL=http://localhost:3001  # URL of planner-next
```

### AndamanBazaar embed (existing `.env`)
```env
# Already present
VITE_SUPABASE_URL=https://msxeqzceqjatoaluempo.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Add this if making direct API calls to planner-next
VITE_PLANNER_API_URL=https://andamanbazaar.in/planner
```

---

## 3. Database Migration

Apply the migration to your existing Supabase project. This creates the `planner` schema **without touching** any existing `public` schema tables.

**Method 1: Supabase CLI**
```bash
cd planner
supabase db push --db-url "postgresql://postgres:<password>@db.msxeqzceqjatoaluempo.supabase.co:5432/postgres"
# or using supabase link:
supabase link --project-ref msxeqzceqjatoaluempo
supabase db push
```

**Method 2: Supabase Dashboard SQL Editor**
Copy-paste the contents of `supabase/migrations/001_planner_schema.sql` into the SQL editor and run it.

**What the migration creates:**
- `planner.profiles` — planner-specific user settings (separate from `public.profiles`)
- `planner.itineraries` — AI-generated trip itineraries (RLS: user sees only their own)
- `planner.rate_limits` — hourly generation usage tracker
- `planner.increment_rate_limit()` — atomic stored procedure for rate limiting
- `planner.handle_new_user()` — auto-creates planner profile on signup

**Safety:** The migration is idempotent. All `CREATE TABLE` and `CREATE POLICY` statements use `IF NOT EXISTS` / `DROP IF EXISTS`. Safe to re-run.

---

## 4. Option A: Embed in AndamanBazaar (Vite)

The cleanest integration path. The `@andaman-planner/ui` components are portable React components that require only React, Tailwind, and the `@andaman-planner/shared` types.

### Step 1: Copy packages into AndamanBazaar

```bash
# From repo root
cp -r planner/packages/shared src/planner/shared
cp -r planner/packages/ui src/planner/ui
```

Or add as local npm packages by pointing `package.json` at the workspace:
```json
{
  "dependencies": {
    "@andaman-planner/shared": "file:./planner/packages/shared",
    "@andaman-planner/ui": "file:./planner/packages/ui"
  }
}
```

### Step 2: Add Tailwind content path

In `tailwind.config.js`:
```js
content: [
  "./src/**/*.{ts,tsx}",
  "./planner/packages/ui/src/**/*.{ts,tsx}",  // add this
]
```

### Step 3: Add the route in `App.tsx`

```tsx
import { PlannerPage } from './planner/PlannerPage';

// In your <Routes>:
<Route path="/planner" element={<PlannerPage />} />
<Route path="/planner/itinerary/:id" element={<ItineraryPage />} />
```

### Step 4: Create a thin wrapper page

```tsx
// src/pages/PlannerPage.tsx
import { useState } from 'react';
import { PlannerForm, ItineraryView, LoadingSpinner } from '../planner/ui';
import type { TripPreferences, Itinerary } from '../planner/shared';
import { supabase } from '../lib/supabase'; // existing AndamanBazaar client

export function PlannerPage() {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(prefs: TripPreferences) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_PLANNER_API_URL}/api/planner/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ preferences: prefs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      setItinerary(data.itinerary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (itinerary) return <ItineraryView itinerary={itinerary} onBack={() => setItinerary(null)} />;
  return <PlannerForm onSubmit={generate} error={error} />;
}
```

### Auth
The planner API calls use the existing AndamanBazaar Supabase session. No second login needed. The access token from `supabase.auth.getSession()` is forwarded in the `Authorization` header.

---

## 5. Option B: Standalone Next.js under /planner

Deploy `apps/planner-next` as a separate service and proxy `/planner` to it.

### 5.1 Build and start

```bash
cd planner/apps/planner-next
npm install
npm run build
npm start  # Starts on port 3001
```

### 5.2 Nginx / Caddy reverse proxy

**Nginx:**
```nginx
location /planner {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Caddy:**
```caddy
andamanbazaar.in {
    handle /planner* {
        reverse_proxy localhost:3001
    }
    # ... rest of your AndamanBazaar config
}
```

### 5.3 Set environment variable

```env
NEXT_BASE_PATH=/planner
```

The `next.config.ts` reads this and sets `basePath` and `assetPrefix` accordingly.

### 5.4 Auth sharing (cookie-based)

Since both apps are on the same domain (`andamanbazaar.in`), Supabase's `sb-*` cookies are automatically shared. Users who are logged in to AndamanBazaar are automatically logged in to the planner.

No configuration needed — Supabase SSR handles this via `@supabase/ssr` cookie management.

---

## 6. API Contract Reference

All endpoints return `{ apiVersion: "v1", ... }`. All errors return `{ apiVersion: "v1", error: { code, message } }`.

### POST /api/planner/generate

Generates a new AI itinerary and saves it to Supabase.

**Request headers:**
- `Authorization: Bearer <supabase-access-token>` — required

**Request body:**
```json
{
  "preferences": {
    "startDate": "2024-11-15",
    "endDate": "2024-11-22",
    "travelersCount": 2,
    "budgetLevel": "midrange",
    "pace": "balanced",
    "interests": ["Snorkeling & Diving", "Beach & Swimming"],
    "preferredIslands": ["Havelock Island (Swaraj Dweep)"],
    "notes": null
  }
}
```

**Success response (200):**
```json
{
  "apiVersion": "v1",
  "itinerary": {
    "id": "uuid",
    "userId": "uuid",
    "name": "Havelock & Neil Explorer — 7 Nights",
    "startDate": "2024-11-15",
    "endDate": "2024-11-22",
    "islandsCovered": ["Port Blair", "Havelock Island", "Neil Island"],
    "estimatedBudgetRange": "₹28,000 – ₹38,000 per person",
    "days": [ /* array of ItineraryDay */ ],
    "preferences": { /* TripPreferences snapshot */ },
    "modelVersion": "gemini-1.5-pro",
    "createdAt": "2024-11-01T10:00:00Z",
    "updatedAt": "2024-11-01T10:00:00Z"
  }
}
```

**Error responses:**
- `400 VALIDATION_ERROR` — invalid preferences
- `401 UNAUTHENTICATED` — missing/invalid session
- `429 RATE_LIMITED` — exceeded 5 generations/hour
- `503 AI_NOT_CONFIGURED` — GOOGLE_AI_API_KEY not set
- `500 AI_GENERATION_FAILED` — Gemini error after 3 retries

---

### GET /api/planner/itineraries

Lists the authenticated user's itineraries (most recent first).

**Success response (200):**
```json
{
  "apiVersion": "v1",
  "itineraries": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "...",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "islandsCovered": ["..."],
      "estimatedBudgetRange": "...",
      "createdAt": "..."
    }
  ]
}
```

---

### GET /api/planner/itineraries/:id

Gets a single itinerary by ID (user can only access their own).

**Success response (200):** Full `Itinerary` object (same shape as generate response).
**Error:** `404 NOT_FOUND` if itinerary doesn't exist or belongs to another user.

---

### DELETE /api/planner/itineraries/:id

Deletes an itinerary.

**Success response (200):** `{ "apiVersion": "v1", "deleted": true }`

---

## 7. Auth — Shared Session

The planner uses **Supabase Auth exclusively**. No Firebase. No second login.

**Cookie-based sharing (Option B):**
- Both apps on `andamanbazaar.in` domain → Supabase `sb-*` cookies are shared automatically.

**Token-based (Option A embed):**
- AndamanBazaar client calls `supabase.auth.getSession()` and forwards `access_token` in `Authorization: Bearer <token>` header.
- The planner server verifies the token using `supabase.auth.getUser()`.

**Server auth verification pattern (used in all routes):**
```typescript
const supabase = await createClient(); // uses @supabase/ssr cookies
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) return 401;
```

---

## 8. Rate Limiting

- **Limit:** 5 AI generations per user per hour (configurable via `PLANNER_MAX_GENERATIONS_PER_HOUR`)
- **Implementation:** `planner.rate_limits` table + atomic stored procedure (no Redis needed)
- **Window:** Hourly buckets keyed by `YYYY-MM-DDTHH` (UTC)
- **On limit exceeded:** `429 RATE_LIMITED` with `{ count, limit, windowKey }` details
- **Bypass (dev):** Set `PLANNER_MAX_GENERATIONS_PER_HOUR=999`

---

## 9. Rollout Checklist

- [ ] **Database:** Apply `supabase/migrations/001_planner_schema.sql` to production Supabase
- [ ] **Env vars:** Set `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_AI_API_KEY` in server environment
- [ ] **Type generation:** Run `supabase gen types typescript --project-id msxeqzceqjatoaluempo > packages/supabase/src/database.types.ts` to replace manually authored types with generated types
- [ ] **Test auth:** Confirm Supabase session is shared between AndamanBazaar and planner
- [ ] **Test rate limit:** Hit `/api/planner/generate` 6 times — confirm 6th returns 429
- [ ] **Test RLS:** Log in as user A, create itinerary. Log in as user B. Confirm user B cannot access user A's itinerary via `GET /api/planner/itineraries/:id`.
- [ ] **Monitoring:** Add logging/alerting for `AI_GENERATION_FAILED` errors
- [ ] **GOOGLE_AI_API_KEY:** Obtain from [Google AI Studio](https://aistudio.google.com/app/apikey) — gemini-1.5-pro access required
