# Firebase Migration Audit - Phase 1

**Project**: AndamanBazaarApp (andamanbazaar.in)  
**Migration**: Supabase + Firebase → Firebase Only  
**Date**: March 2026  
**Engineer**: Senior Backend Engineer

---

## Executive Summary

The application currently uses a dual backend setup with significant overlap between Supabase and Firebase. Most critical operations (auth, database, storage) are Supabase-based, with Firebase used primarily for hosting and some legacy features. The migration will require replacing ~85 Supabase integration points with Firebase equivalents.

---

## Audit Methodology

1. **Code Scanning**: Searched for all `supabase.*` and `@supabase` imports
2. **Database Schema Review**: Analyzed `supabase/schema.sql` and 17 migration files
3. **Edge Functions Review**: Reviewed 5 Supabase Edge Functions
4. **Environment Variables**: Checked all `VITE_SUPABASE_*` and Firebase config
5. **Authentication Flow**: Tracked auth flows in AuthView.tsx and related components

---

## Feature Inventory

| Feature | Current Backend | Supabase Method | Firebase Equivalent | Complexity | Risk | Dependent Features |
|---|---|---|---|---|---|---|
| **Authentication** | Supabase Auth | `supabase.auth.*` | Firebase Auth (`signInWithEmailAndPassword`) | Medium | High | All protected routes, user sessions |
| **User Profiles** | Supabase | `profiles` table | Firestore `users` collection | Medium | High | Listings, chats, payments |
| **Listings CRUD** | Supabase | `listings` table | Firestore `listings` collection | High | High | Search, favorites, messages |
| **Listing Images** | Supabase Storage | `listings` bucket | Firebase Storage | Medium | Medium | Listing creation, display |
| **Profile Photos** | Supabase Storage | `avatars` bucket | Firebase Storage | Low | Medium | User profiles |
| **Chat System** | Supabase | `chats`, `messages` tables | Firestore `chats`, `messages` collections | High | High | Realtime messaging |
| **Realtime Updates** | Supabase Realtime | `supabase.channel` | Firestore onSnapshot | High | High | Chat, notifications |
| **Favorites** | Supabase | `favorites` table | Firestore `favorites` collection | Low | Low | User profiles |
| **Reports** | Supabase | `reports` table | Firestore `reports` collection | Low | Low | Admin moderation |
| **Payment Processing** | Supabase Edge Functions | `create-boost-order`, `cashfree-webhook` | Cloud Functions | High | High | Revenue, featured listings |
| **Invoice Generation** | Supabase Edge Functions | `generate-invoice`, `send-invoice-email` | Cloud Functions | Medium | Medium | Payment receipts |
| **Location Verification** | Supabase Edge Functions | `verify-location` | Cloud Functions | Medium | Medium | User verification |
| **Rate Limiting** | Supabase | `rate_limits` table | Firestore + Cloud Functions | Medium | Medium | API protection |
| **Audit Logging** | Supabase | `audit_logs` table | Firestore `audit_logs` collection | Medium | Low | Security monitoring |
| **Security Events** | Supabase | `security_events` table | Firestore `security_events` collection | Low | Low | Threat detection |
| **User Roles** | Supabase | `user_roles` table | Firestore `users.role` field | Low | Medium | Admin features |
| **Listing Views** | Supabase | `listing_views` table | Firestore `listing_views` collection | Low | Low | Analytics |
| **Recommendations** | Supabase | `recommendations_cache` table | Firestore `recommendations` collection | Low | Low | Discovery |
| **Trending Listings** | Supabase | `trending_listings` table | Firestore `trending` collection | Low | Low | Discovery |

---

## Detailed Component Analysis

### Frontend Components Using Supabase

| Component | Supabase Usage | Lines | Criticality |
|---|---|---|---|
| `src/lib/supabase.ts` | Client initialization | 22 | Critical |
| `src/pages/AuthView.tsx` | Auth flows, session management | 373 | Critical |
| `src/pages/Profile.tsx` | Profile CRUD, listings management | 593 | Critical |
| `src/pages/CreateListing.tsx` | Listing creation, image uploads | 966 | Critical |
| `src/pages/ListingDetail.tsx` | Listing fetch, favorites, bump | ~300 | Critical |
| `src/pages/ChatRoom.tsx` | Realtime messaging | ~200 | Critical |
| `src/lib/security.ts` | Rate limiting, audit logging | 342 | High |
| `src/hooks/useAuth.ts` | Auth state management | ~50 | Critical |
| `src/hooks/useSupabase.ts` | Database queries | ~100 | Critical |

### Database Schema Overview

**Tables to Migrate (20 total)**:

1. **Core Tables** (7):
   - `profiles` - User profiles with location verification
   - `listings` - Marketplace listings with soft-delete
   - `listing_images` - Image metadata
   - `favorites` - User favorites
   - `chats` - Chat rooms
   - `messages` - Chat messages
   - `reports` - User reports

2. **Payment Tables** (4):
   - `listing_boosts` - Featured listing purchases
   - `invoices` - Payment invoices
   - `payment_audit_log` - Payment events
   - `rate_limits` - API rate limiting

3. **Analytics Tables** (4):
   - `audit_logs` - User action audit trail
   - `security_events` - Security incidents
   - `user_interactions` - User behavior tracking
   - `listing_views` - View tracking

4. **Feature Tables** (5):
   - `user_roles` - Admin/moderator roles
   - `recommendations_cache` - AI recommendations
   - `trending_listings` - Trending items
   - `chat_typing_events` - Typing indicators
   - `user_interactions` - Engagement metrics

### Edge Functions to Migrate (5 total)

| Function | Purpose | Firebase Equivalent | Priority |
|---|---|---|---|
| `create-boost-order` | Create Cashfree payment order | Cloud Function | Critical |
| `cashfree-webhook` | Process payment webhooks | Cloud Function | Critical |
| `verify-location` | GPS location verification | Cloud Function | High |
| `generate-invoice` | Create PDF invoices | Cloud Function | Medium |
| `send-invoice-email` | Email invoices via Resend | Cloud Function | Medium |

---

## Migration Complexity Assessment

### High Complexity Features (5)

1. **Realtime Chat System**
   - Supabase Realtime → Firestore onSnapshot
   - Complex: Unread counts, typing indicators, message status
   - Risk: Message delivery, performance impact

2. **Payment Processing**
   - Edge Functions → Cloud Functions
   - Complex: Cashfree integration, webhook verification, idempotency
   - Risk: Revenue loss, payment failures

3. **Location Verification**
   - Edge Function with IP geolocation
   - Complex: GPS validation, rate limiting, fraud detection
   - Risk: Security vulnerabilities

4. **Search and Filtering**
   - PostgreSQL queries → Firestore queries
   - Complex: Full-text search, pagination, sorting
   - Risk: Performance degradation

5. **Image Storage with Processing**
   - Supabase Storage → Firebase Storage
   - Complex: Upload URLs, compression, CDN
   - Risk: Broken images, storage costs

### Medium Complexity Features (7)

- User authentication flow migration
- Profile management with verification status
- Listing CRUD with image associations
- Favorites and saved items
- Admin role-based access
- Audit logging system
- Recommendation engine

### Low Complexity Features (9)

- Simple CRUD operations (reports, roles)
- Analytics tracking (views, interactions)
- Trending calculations
- Rate limiting implementation
- Security event logging
- Invoice generation (template-based)
- Email notifications
- Data cleanup functions
- Configuration tables

---

## Risk Assessment

### High Risk Items

1. **User Session Migration**
   - Risk: Breaking existing user sessions
   - Mitigation: Preserve Supabase auth until Firebase auth is fully implemented

2. **Data Loss During Migration**
   - Risk: Losing listings, messages, payment records
   - Mitigation: Create data export scripts, test migration on staging

3. **Payment Flow Interruption**
   - Risk: Failed payments, lost revenue
   - Mitigation: Implement dual-write during transition period

4. **Performance Degradation**
   - Risk: Slow queries, poor user experience
   - Mitigation: Optimize Firestore queries, add indexes

### Medium Risk Items

- Realtime feature delays during migration
- Storage URL changes breaking existing images
- Rate limiting gaps exposing APIs
- Admin tooling incompatibility

### Low Risk Items

- Analytics data gaps
- Recommendation algorithm changes
- Minor UI inconsistencies

---

## Dependencies and Blockers

### Critical Dependencies

1. **Cashfree Payment Integration**
   - Must maintain webhook endpoints
   - Payment state machine must be preserved
   - Invoice generation must continue working

2. **Email Service (Resend)**
   - Invoice emails must continue
   - User notifications
   - Password reset flows

3. **Image CDN**
   - Existing listing images must remain accessible
   - New uploads must work immediately

### External Services

- **Cashfree API** - Payment processing
- **Resend API** - Email delivery
- **Google Gemini API** - AI suggestions (already needs Cloud Function proxy)
- **IP Geolocation Service** - Location verification

---

## Migration Strategy Recommendations

### Incremental Migration Approach

1. **Phase 1-2**: Design and implement Firebase schema in parallel
2. **Phase 3**: Migrate auth with dual-auth support
3. **Phase 4**: Migrate read operations first (display existing data)
4. **Phase 5**: Migrate write operations with dual-write
5. **Phase 6**: Cut over to Firebase, keep Supabase for read-only
6. **Phase 7**: Remove Supabase completely

### Data Migration Strategy

- Use ETL scripts for bulk data migration
- Implement change data capture for real-time sync
- Create data validation scripts
- Plan for rollback procedures

### Testing Strategy

- Unit tests for each Firebase service module
- Integration tests for critical flows (auth, payment, chat)
- Load testing for Firestore queries
- Security testing for new rules

---

## Next Steps

**Immediate Actions**:
1. Create Firebase project and configure services
2. Set up development environment with Firebase SDK
3. Begin Phase 2: Firestore schema design
4. Create migration scripts for existing data

**Documentation to Create**:
- FIRESTORE_SCHEMA.md
- SECURITY_RULES.md
- ROLLBACK_PLAN.md
- ENV_MAPPING.md
- CASHFREE_FIRESTORE_FLOW.md

---

**Audit Complete** ✅  
**Ready for Phase 2: Firestore Schema Design**
