# DEPRECATED — Pre-migration scaffold

This directory is a **stale scaffold** created during the Supabase → Firebase migration planning phase.

**Do not develop in this directory.** The active production frontend lives at the repository root under `src/`.

| Attribute | This directory | Active production |
|---|---|---|
| Framework | React 19 + Vite 7 | React 18 + Vite 5 |
| CSS | Tailwind v4 (plugin) | Tailwind v3 (postcss) |
| Firebase | ❌ None | ✅ Full SDK |
| Auth | ❌ None | ✅ Firebase Auth |
| Content paths | `./src/**/*` (stub) | `./src/**/*` (full) |

**Safe to delete** after confirming no one is actively working against it.
