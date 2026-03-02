# Andaman Planner Pro — Monorepo Structure

Integration-ready structure for embedding into AndamanBazaar.in.

```
/workspace (AndamanBazaar root)
├── apps/
│   └── (existing: main Vite app is at repo root)
├── packages/
│   ├── planner-shared/          # Types, Zod schemas, helpers
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── schemas.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── planner-ui/              # Portable React components (no Next.js)
│   │   ├── src/
│   │   │   ├── PlannerForm.tsx
│   │   │   ├── ItineraryView.tsx
│   │   │   ├── ItineraryCard.tsx
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── planner-supabase/       # Typed DB client + repositories
│       ├── src/
│       │   ├── client.ts
│       │   ├── database.types.ts
│       │   ├── itineraryRepo.ts
│       │   ├── profileRepo.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── backend/                     # Express API (add /api/planner/*)
│   └── src/
│       └── routes/
│           └── plannerRoutes.ts
├── supabase/
│   └── migrations/
│       └── 015_planner_schema.sql
└── src/                         # Main Vite app
    └── pages/
        └── Planner.tsx          # Planner page at /planner
```

## Deployment options

**A) Embedded (preferred):** Planner page at `/planner`, API at backend `/api/planner/*`. Same auth session (Supabase).

**B) Next.js shell:** Optional `apps/planner-next` mounted under `/planner` via reverse proxy; shares Supabase project and auth.

## Integration compatibility

- No conflicting global CSS resets
- All routes support basePath (e.g. `/planner` for embedded)
- No Next-only imports in `planner-ui`
- Single Supabase project for marketplace + planner
