# AndamanBazaarApp – Production Architecture & Security Rules

> **For AI Assistants**: This file contains mandatory constraints for code generation.
> Supported by: Cursor, GitHub Copilot, Windsurf, Cody, and other AI-powered IDEs.

This project is a live production system migrating from Supabase to Firebase. All changes must comply with the following constraints.

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
  - In Firebase Cloud Functions
  - Or in secure server environments (Firebase Admin SDK)
- Never expose:
  - Firebase service account keys
  - Payment secret keys
  - AI provider private keys
- **CRITICAL**: Google Gemini API key must NOT be exposed as `VITE_API_KEY` in frontend. Create a Cloud Function proxy instead.
- If a key must be used in frontend, it must be explicitly confirmed safe for public exposure

---

## 3. Firebase Security Rules Are Mandatory

- All Firestore collections must have security rules
- All Firebase Storage buckets must have security rules
- No collection may rely on "trusting frontend user_id"
- Rules must:
  - Use `request.auth.uid`
  - Enforce ownership
  - Enforce role-based access where applicable
- Never disable security rules for convenience
- Any new collection requires:
  - Explicit read/write rules
  - At least one explicit read rule for owners
  - Explicit write rules with validation
- **CRITICAL**: Listings collection must NOT have a delete rule for users — use soft-delete (`status = 'deleted'`)
- **CRITICAL**: Chat creation must validate `sellerId` matches listing owner
- **CRITICAL**: Storage rules for `listing-images` bucket must enforce path ownership

If a change requires bypassing security rules, it must be done via:

- Firebase Cloud Function
- Using Firebase Admin SDK
- With strict validation

---

## 4. No Breaking Schema Changes Without Migration

- Never alter or delete fields directly in production
- All schema changes must:
  - Use versioned migration scripts
  - Be backward compatible
- Renaming fields requires:
  - Add new field
  - Migrate data
  - Deprecate old field
  - Remove only after confirmation
- Never change enum values without checking existing documents
- Provide rollback scripts when suggesting schema changes
- **CRITICAL**: Use a single migration directory with clear sequential numbering
- **CRITICAL**: When comparing null values in Cloud Functions, use proper null checks
- **CRITICAL**: Document all Firestore index requirements in `firestore.indexes.json`

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

**Additional Rules:**

- Never expose secret keys in frontend environment variables
- Always use `request.auth.uid` in Firebase Security Rules
- Use Firebase Admin SDK for server-side operations
- Use proper null checks in Cloud Functions
- Consolidate migrations to single directory with sequential numbering
- Document all Firestore indexes in `firestore.indexes.json`

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
- Never disable security rules
- Never suggest raw client-trusted flags
- Always consider migration + rollback
- Use `request.auth.uid` in Firebase Security Rules
- Use Firebase Admin SDK for server-side operations
- Use proper null checks in Cloud Functions
- Consolidate migrations to single directory
- Never expose Gemini API key as VITE_API_KEY
- Document all Firestore indexes in `firestore.indexes.json`
