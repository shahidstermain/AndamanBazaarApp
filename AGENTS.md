# AGENTS.md

## Cursor Cloud specific instructions

### Overview

AndamanBazaar is a React 18 + TypeScript + Vite marketplace SPA backed by Supabase (cloud-hosted PostgreSQL, Auth, Storage, Edge Functions). The frontend is the only locally-runnable service; all backend functionality lives in Supabase.

### Dev commands (see `package.json` scripts)

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (Vite, port 5173) |
| Type-check | `npx tsc --noEmit` |
| Unit tests | `npm run test:unit` (vitest, 130+ tests) |
| All vitest tests | `npx vitest run` (169 tests across `tests/unit/` + root `tests/*.test.*`) |
| Build | `npm run build` (tsc + vite build) |
| E2E tests | `npm run test:e2e` (Playwright — uses mock env vars and auth bypass via `VITE_E2E_BYPASS_AUTH=true`) |

### Gotchas

- **No ESLint config file**: ESLint is listed in devDependencies but no `.eslintrc.*` or `eslint.config.*` exists. Running `npx eslint` will fail. Use `npx tsc --noEmit` for static analysis.
- **Vitest excludes some test dirs**: `vitest.config.ts` explicitly excludes `tests/integration/`, `tests/security/`, `tests/accessibility/`, and `tests/e2e/` from its file matching. The `npm run test:all` script references those dirs but they contain no vitest-compatible test files. The main test suites are `tests/unit/` and root-level `tests/*.test.*`.
- **Supabase credentials**: The app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. Without valid credentials, the frontend renders fully but API calls (auth, listings CRUD, chat) return errors. Copy `.env.example` to `.env` and fill in real Supabase project values for full functionality.
- **Playwright E2E**: The `playwright.config.ts` starts its own Vite dev server with mock env vars and `VITE_E2E_BYPASS_AUTH=true`, so E2E tests can run without a real Supabase backend. Run `npx playwright install` before first use.
