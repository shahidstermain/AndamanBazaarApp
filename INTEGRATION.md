# Andaman Planner Pro — Integration Guide

This document describes how to integrate the AI Trip Planner into AndamanBazaar.in.

## Overview

- **Supabase only** — No Firebase. Auth, DB, and RLS use the shared Supabase project.
- **Shared session** — Planner reuses AndamanBazaar’s Supabase auth; no second login.
- **Portable UI** — React components in `packages/planner-ui` can be embedded in Vite or Next.js.

## Directory Layout

```
/workspace
├── packages/
│   ├── planner-shared/    # Types, Zod schemas, helpers
│   ├── planner-ui/        # PlannerForm, ItineraryView, ItineraryCard
│   └── planner-supabase/  # Typed client + repos (for Next.js or standalone)
├── backend/
│   └── src/routes/plannerRoutes.ts   # API: /api/planner/*
├── supabase/migrations/
│   └── 015_planner_schema.sql
└── src/pages/Planner.tsx  # Embedded planner page at /planner
```

## Database Setup

1. Apply the migration:
   ```bash
   supabase db push
   # or: psql $DATABASE_URL -f supabase/migrations/015_planner_schema.sql
   ```

2. Tables created:
   - `planner.profiles` — planner-specific user preferences
   - `planner.itineraries` — user itineraries with RLS

## Environment Variables

### Frontend (Vite)

| Variable | Description |
|---------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:4000`) |

### Backend

| Variable | Description |
|---------|-------------|
| `SUPABASE_URL` | Same as `VITE_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | Same as `VITE_SUPABASE_ANON_KEY` |
| `GOOGLE_AI_API_KEY` | Google AI API key (Gemini) |

## API Endpoints

Base path: `/api/planner` (backend)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/generate` | Bearer JWT | Generate itinerary from `{ preferences: TripPreferences }` |
| GET | `/itineraries` | Bearer JWT | List user’s itineraries |
| GET | `/itineraries/:id` | Bearer JWT | Get single itinerary |

### Request/Response Format

- **POST /api/planner/generate**
  - Body: `{ preferences: TripPreferences }`
  - Response: `{ apiVersion: "v1", itinerary: Itinerary }`

- **GET /api/planner/itineraries**
  - Response: `{ apiVersion: "v1", itineraries: ItinerarySummary[] }`

- **GET /api/planner/itineraries/:id**
  - Response: `{ apiVersion: "v1", itinerary: Itinerary }`

## Mounting Under a Base Path

If the app is served under `/planner`:

1. **Vite**: Set `base: '/planner/'` in `vite.config.ts`.
2. **API calls**: Use `VITE_API_URL` or construct URLs with the correct base (e.g. `/api/planner` if the backend is proxied under the same origin).

## Embedding UI Components

```tsx
import { PlannerForm, ItineraryView, ItineraryCard } from '@andaman/planner-ui';
import type { TripPreferences, Itinerary } from '@andaman/planner-shared';

// In your page:
<PlannerForm
  onSubmit={async (prefs) => {
    const res = await fetch(`${API_URL}/api/planner/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ preferences: prefs }),
    });
    const data = await res.json();
    setItinerary(data.itinerary);
  }}
  isLoading={loading}
  basePath="/planner"
/>

{itinerary && <ItineraryView itinerary={itinerary} />}
```

## Auth Flow

1. User signs in via Supabase Auth (existing AndamanBazaar flow).
2. Frontend obtains `session.access_token`.
3. All planner API calls include `Authorization: Bearer <access_token>`.
4. Backend verifies JWT with `supabase.auth.getUser(token)` and uses the user ID for RLS.

## Rollout Checklist

- [ ] Run migration `015_planner_schema.sql`
- [ ] Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GOOGLE_AI_API_KEY` in backend env
- [ ] Set `VITE_API_URL` in frontend env (production backend URL)
- [ ] Add CORS origin for frontend in backend if needed
- [ ] Ensure backend `/api/planner/*` is reachable (no firewall/proxy blocks)
- [ ] Add link to `/planner` in navigation
- [ ] Test: sign in → open /planner → generate itinerary → view list

## Deployment Options

**A) Embedded (current):** Planner page at `/planner` in the main Vite app. Backend serves `/api/planner/*`.

**B) Next.js shell:** Create `apps/planner-next` with App Router, mount under `/planner` via reverse proxy. Share same Supabase project and auth. Use `packages/planner-ui` and `packages/planner-supabase` for components and data access.
