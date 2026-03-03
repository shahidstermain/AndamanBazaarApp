# AndamanBazaarApp – Production Architecture & Security Rules

> **For AI Assistants**: This file contains mandatory constraints for code generation.
> Supported by: Cursor, GitHub Copilot, Windsurf, Cody, and other AI-powered IDEs.

This project is a live production system. All changes must comply with the following constraints.

---

## 1. Zero Client-Trusted Validation

- Never trust client-side validation for security decisions
- All critical validation (auth, payments, geo-verification, role checks, moderation) must be enforced server-side
- Frontend validation is UX-only
- Do not rely on navigator, browser state, or client-calculated values for security decisions
- All sensitive flags (e.g., "verified local", "admin", "premium") must be validated against the database

---

## 2. All Secrets Server-Side Only

- No secret keys in frontend environment variables
- No private API keys in `VITE_` variables
- Gemini / payment / admin / service-role keys must only exist:
  - In Supabase Edge Functions
  - Or in secure server environments
- Never expose:
  - Supabase service role key
  - Payment secret keys
  - AI provider private keys
- If a key must be used in frontend, it must be explicitly confirmed safe for public exposure

---

## 3. Supabase Row Level Security (RLS) Is Mandatory

- All tables must have RLS enabled
- No table may rely on "trusting frontend user_id"
- Policies must:
  - Use `auth.uid()`
  - Enforce ownership
  - Enforce role-based access where applicable
- Never disable RLS for convenience
- Any new table requires:
  - RLS enabled
  - At least one explicit SELECT policy
  - Explicit INSERT/UPDATE/DELETE policies

If a change requires bypassing RLS, it must be done via:
- Supabase Edge Function
- Using service role key
- With strict validation

---

## 4. No Breaking Schema Changes Without Migration

- Never alter or drop columns directly in production
- All schema changes must:
  - Use versioned SQL migrations
  - Be backward compatible
- Renaming fields requires:
  - Add new column
  - Migrate data
  - Deprecate old column
  - Remove only after confirmation
- Never change enum values without checking existing rows
- Provide rollback SQL when suggesting schema changes

---

## 5. Payment Integrity (Cashfree / Future Providers)

- Payment verification must occur server-side
- Webhooks must verify signature
- Client must never mark payment as successful
- Payment status must be validated against provider response

---

## 6. Geo-Verification Rules

- GPS-based verification must not rely solely on frontend distance calculation
- Server must revalidate coordinates
- Consider IP + anomaly detection
- Verification flags must:
  - Expire
  - Be revocable
  - Be audit logged

---

## 7. AI Moderation Safety

- AI moderation must be:
  - Server-triggered
  - Logged
  - Non-blocking to core system
- AI responses must not be blindly trusted
- Store moderation status explicitly

---

## 8. Code Change Discipline

**Before any modification:**
- Identify impacted modules
- Check environment variable dependencies
- Validate TypeScript types
- Check database schema alignment
- Ensure no breaking API contract

**After any change:**
- List possible runtime failures
- Provide integration test scenarios
- Provide rollback strategy

---

## 9. Production Mindset

**Assume:**
- Adversarial users
- Malicious actors
- Traffic spikes
- Partial outages

**Prioritize:**
Security > Data integrity > Correctness > Performance > DX convenience

No shortcuts.

---

## Summary

This document ensures AI assistants:
- Never suggest insecure shortcuts
- Never expose secrets
- Never disable RLS
- Never suggest raw client-trusted flags
- Always consider migration + rollback
