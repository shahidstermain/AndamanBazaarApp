# DEPRECATED — Supabase-era Express backend

This directory is the **legacy Express + Prisma + PostgreSQL backend** from before the Firebase migration.

**All backend logic has been migrated to Firebase Cloud Functions** under `functions/src/`.

| Capability | This directory | Replaced by |
|---|---|---|
| Auth | Express JWT | Firebase Auth |
| Database | PostgreSQL + Prisma | Firestore |
| Payments | Cashfree via Express routes | `functions/src/payments/` |
| Moderation | Custom middleware | `functions/src/moderation.ts` |
| Location | Express route | `functions/src/location.ts` |
| Schema | `prisma/schema.prisma` | `FIRESTORE_SCHEMA.md` |

**Safe to delete** after final data migration is confirmed complete.
Migration status tracked in `DATA_MIGRATION_CHECKLIST.md`.
