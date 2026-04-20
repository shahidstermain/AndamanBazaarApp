# AGENTS.md

## Scope
These instructions apply to the entire repository.

## Project Summary
- `AndamanBazaar` is a Vite + React + TypeScript marketplace app.
- Routing uses `HashRouter` in `App.tsx`, so routes are hash-based rather than history API based.
- The web app is intended for Firebase Hosting and the mobile wrapper uses Capacitor for Android.
- Supabase is the primary backend for auth and data access.

## Stack
- React 18
- TypeScript
- Vite 4
- React Router 6
- Supabase JS
- Capacitor 5
- Firebase Hosting

## Important Paths
- `App.tsx`: top-level router and auth gating.
- `index.tsx`: app bootstrap.
- `views/`: route-level screens.
- `components/`: shared UI pieces.
- `lib/supabase.ts`: Supabase client initialization.
- `types.ts`: shared domain types.
- `schema.sql`: database schema reference.
- `vite.config.ts`: Vite dev server and alias config.
- `capacitor.config.json`: Capacitor app configuration.
- `firebase.json`: Firebase Hosting rewrite config.

## Commands
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build web app: `npm run build`
- Preview production build: `npm run preview`
- Firebase deploy: `npm run firebase-deploy`
- Sync Capacitor assets: `npm run cap-sync`
- Open Android project: `npm run android-open`

## Runtime Notes
- Vite dev server runs on port `3000` and binds to `0.0.0.0`.
- Firebase Hosting rewrites all routes to `index.html`.
- Because the app uses `HashRouter`, avoid introducing server-side route assumptions.
- Capacitor expects built web assets in `dist`.

## Configuration Notes
- `.env.example` documents `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Current code in `lib/supabase.ts` does not read those env vars; it contains hardcoded Supabase credentials instead.
- Treat changes to Supabase configuration carefully. If you switch to env-based config, update both the runtime code and any setup documentation together.
- `vite.config.ts` exposes `GEMINI_API_KEY` through `process.env.API_KEY` and `process.env.GEMINI_API_KEY`; preserve compatibility if touching Gemini-related setup.

## Working Conventions
- Prefer small, targeted changes over broad refactors.
- Preserve the existing routing structure unless the task explicitly requires route changes.
- Keep shared types in `types.ts` aligned with any data model changes.
- When changing Supabase queries or schema assumptions, verify the affected view components and types together.
- For mobile-impacting changes, consider whether Capacitor sync or native permission updates are required.
- For hosting changes, keep Firebase SPA rewrites intact unless there is a deliberate deployment change.

## Validation
- For UI or TypeScript changes, run `npm run build` when possible.
- If you touch Capacitor-related files, note whether the user should run `npm run cap-sync`.
- If you touch hosting config, note whether the user should redeploy Firebase.

## Known Gaps
- There is no dedicated test suite configured in `package.json`.
- The repository documentation mentions environment-based Supabase setup, but the code currently hardcodes credentials.
- Before adding new tooling, prefer solutions that fit the existing Vite/TypeScript setup.

## Agent Expectations
- Read nearby files before editing to preserve local patterns.
- Do not rotate or revoke credentials as part of unrelated work unless the user explicitly requests a security cleanup, but when you encounter hardcoded secrets, you may flag them and migrate them to safer configuration patterns without changing the secret values.
- Flag any mismatch between docs, config, and runtime behavior in your final response.
