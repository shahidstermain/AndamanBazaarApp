# Supabase Dependencies Analysis

## Current State Assessment

### Files with Supabase Dependencies

#### 1. Core Infrastructure Files

- `src/lib/supabase.ts` - Main Supabase client (REMOVE)
- `src/lib/auth.ts` - Dual auth system, uses Supabase as fallback (KEEP - remove Supabase parts)
- `src/lib/storage.ts` - Dual storage system, uses Supabase as fallback (KEEP - remove Supabase parts)
- `src/lib/database.ts` - Dual database system, uses Supabase as fallback (KEEP - remove Supabase parts)

#### 2. Component Files with Active Supabase Usage

- `src/components/Layout.tsx` - Uses Supabase for unread count (NEEDS UPDATE)
- `src/pages/CreateListing.tsx` - Uses Supabase.from for listing operations (NEEDS UPDATE)
- `src/pages/Profile.tsx` - Uses Supabase for profile operations (NEEDS UPDATE)
- `src/pages/Admin.tsx` - Uses Supabase for admin operations (NEEDS UPDATE)
- `src/pages/ChatList.tsx` - Uses Supabase for chat operations (NEEDS UPDATE)
- `src/pages/Listings.tsx` - Uses Supabase for listing queries (NEEDS UPDATE)
- `src/pages/AuthView.tsx` - Uses Supabase auth (NEEDS UPDATE)
- `src/pages/ListingDetail.tsx` - Uses Supabase for listing details (NEEDS UPDATE)
- `src/pages/ChatRoom.tsx` - Uses Supabase for chat operations (NEEDS UPDATE)
- `src/pages/Dashboard.tsx` - Uses Supabase for dashboard data (NEEDS UPDATE)
- `src/pages/Home.tsx` - Uses Supabase for home page data (NEEDS UPDATE)

#### 3. Utility Files

- `src/lib/security.ts` - Uses Supabase RPC calls (NEEDS UPDATE)
- `src/hooks/useNotifications.ts` - Uses Supabase auth (NEEDS UPDATE)
- `src/components/BoostListingModal.tsx` - Uses Supabase (NEEDS UPDATE)
- `src/components/ReportModal.tsx` - Uses Supabase (NEEDS UPDATE)

#### 4. Environment and Configuration

- `src/env.d.ts` - Contains VITE_SUPABASE variables (NEEDS UPDATE)
- `package.json` - @supabase/supabase-js dependency (REMOVE)

#### 5. Supabase Infrastructure

- `supabase/` directory - All Supabase files (REMOVE)
- `.env` and `.env.example` - Supabase environment variables (REMOVE)

## Firebase Replacement Status

### ✅ Available Replacements

1. **Authentication**: `src/lib/firebase.ts` + dual system in `src/lib/auth.ts`
2. **Storage**: `src/lib/firebase.ts` + dual system in `src/lib/storage.ts`
3. **Database**: `src/lib/firebase.ts` + dual system in `src/lib/database.ts`
4. **Functions**: Firebase Cloud Functions implemented

### ⚠️ Migration Required

1. **Component Updates**: All components need to use Firebase/dual systems
2. **Environment Variables**: Remove Supabase, keep Firebase
3. **Type Definitions**: Update to remove Supabase types

## Removal Strategy

### Phase 1: Update Components to Use Firebase

- Update all component imports to use dual systems
- Replace direct Supabase calls with dual provider calls
- Test functionality with Firebase provider

### Phase 2: Remove Supabase Dependencies

- Remove @supabase/supabase-js from package.json
- Remove src/lib/supabase.ts
- Clean up dual provider systems to remove Supabase fallbacks
- Update environment variables

### Phase 3: Remove Supabase Infrastructure

- Remove supabase/ directory
- Clean up any remaining references
- Update documentation

## Risk Assessment

### High Risk Items

- Components with direct Supabase calls that haven't been tested with Firebase
- Real-time subscriptions that may behave differently
- Complex queries that may need translation

### Medium Risk Items

- Environment variable updates
- Type definition changes
- Import updates

### Low Risk Items

- Package dependency removal
- File deletions
- Documentation updates

## Next Steps

1. **DO NOT DELETE** anything yet
2. Update each component systematically to use Firebase
3. Test each component thoroughly
4. Remove Supabase dependencies only after verification
5. Remove Supabase infrastructure last

## Files Requiring Updates (17 total)

### High Priority (Core Functionality)

1. `src/components/Layout.tsx` - Unread count logic
2. `src/pages/CreateListing.tsx` - Listing CRUD operations
3. `src/pages/AuthView.tsx` - Authentication flows
4. `src/pages/ListingDetail.tsx` - Listing display and interactions

### Medium Priority (User Features)

5. `src/pages/Profile.tsx` - User profile management
6. `src/pages/ChatList.tsx` - Chat list display
7. `src/pages/ChatRoom.tsx` - Chat functionality
8. `src/pages/Listings.tsx` - Listing browsing
9. `src/pages/Dashboard.tsx` - User dashboard
10. `src/pages/Home.tsx` - Home page content

### Lower Priority (Admin & Utilities)

11. `src/pages/Admin.tsx` - Admin functionality
12. `src/lib/security.ts` - Security utilities
13. `src/hooks/useNotifications.ts` - Notification system
14. `src/components/BoostListingModal.tsx` - Boost functionality
15. `src/components/ReportModal.tsx` - Report functionality
16. `src/env.d.ts` - Type definitions
17. `package.json` - Dependencies

## Testing Strategy

For each file update:

1. Replace Supabase imports with dual system imports
2. Update function calls to use provider-agnostic functions
3. Test with Firebase provider
4. Verify functionality matches original
5. Move to next file

## Rollback Plan

If issues arise:

1. Keep Supabase code in comments during initial migration
2. Use environment variables to switch back to Supabase
3. Gradual rollout with feature flags
4. Monitor for issues and rollback as needed
