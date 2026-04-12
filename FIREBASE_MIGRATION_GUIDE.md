# Firebase Migration Guide

## Overview

This document outlines the complete migration of AndamanBazaar from Supabase to Firebase. The migration is designed to be zero-downtime with dual-provider support during the transition.

## Migration Phases

### Phase 1: Firebase Authentication ✅

- **Status**: Complete
- **Files Modified**: `src/lib/auth.ts`
- **Key Changes**:
  - Dual-auth system supporting both Firebase and Supabase
  - Environment-based provider selection
  - Automatic fallback between providers
- **Environment Variables**: `VITE_AUTH_PROVIDER` (firebase/supabase/dual)

### Phase 2: Firebase Firestore Setup ✅

- **Status**: Complete
- **Files Modified**: `src/lib/firebase.ts`
- **Key Changes**:
  - Firebase client initialization
  - Firestore database setup
  - Authentication helpers
- **Configuration**: Firebase project configuration

### Phase 3: Firebase Security Rules ✅

- **Status**: Complete
- **Files Modified**: `firestore.rules`, `storage.rules`
- **Key Changes**:
  - Firestore security rules for data access
  - Firebase Storage security rules
  - Role-based access control
- **Security**: All rules enforce `request.auth.uid` validation

### Phase 4: Firestore Data Layer Migration ✅

- **Status**: Complete
- **Files Modified**: `src/lib/database.ts`
- **Key Changes**:
  - Dual-database abstraction layer
  - Complete CRUD operations for listings and chats
  - Real-time subscriptions with both providers
  - Data format conversion between SQL and NoSQL
- **Environment Variables**: `VITE_DATABASE_PROVIDER` (firebase/supabase/dual)

### Phase 5: Firebase Storage Migration ✅

- **Status**: Complete
- **Files Modified**: `src/lib/storage.ts`
- **Key Changes**:
  - Dual-storage system
  - File upload/download operations
  - Listing images and user avatar management
  - Migration utilities for URL conversion
- **Environment Variables**: `VITE_STORAGE_PROVIDER` (firebase/supabase/dual)

### Phase 6: Edge Functions Migration ✅

- **Status**: Complete
- **Files Modified**: `src/lib/functions.ts`, `functions/src/*.ts`
- **Key Changes**:
  - Dual-function system
  - Firebase Cloud Functions for payment, location, moderation
  - Webhook handling and batch operations
  - Health checks and monitoring
- **Environment Variables**: `VITE_FUNCTION_PROVIDER` (firebase/supabase/dual)

### Phase 7: Frontend Integration & Testing 🔄

- **Status**: In Progress
- **Files Modified**: Various components
- **Key Changes**:
  - Component updates to use new dual systems
  - Comprehensive testing suite
  - Performance optimization
  - Migration monitoring dashboard

## Environment Configuration

### Required Environment Variables

```bash
# Authentication Provider
VITE_AUTH_PROVIDER=dual

# Database Provider
VITE_DATABASE_PROVIDER=dual

# Storage Provider
VITE_STORAGE_PROVIDER=dual

# Function Provider
VITE_FUNCTION_PROVIDER=dual

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Supabase Configuration (for dual mode)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase Functions URLs
VITE_FIREBASE_CREATE_PAYMENT_FUNCTION=https://your-region-your-project.cloudfunctions.net/createPayment
VITE_FIREBASE_VERIFY_PAYMENT_FUNCTION=https://your-region-your-project.cloudfunctions.net/verifyPayment
VITE_FIREBASE_VERIFY_LOCATION_FUNCTION=https://your-region-your-project.cloudfunctions.net/verifyLocation
VITE_FIREBASE_MODERATE_CONTENT_FUNCTION=https://your-region-your-project.cloudfunctions.net/moderateContent
VITE_FIREBASE_CREATE_INVOICE_FUNCTION=https://your-region-your-project.cloudfunctions.net/createInvoice
VITE_FIREBASE_WEBHOOK_FUNCTION=https://your-region-your-project.cloudfunctions.net/handleWebhook
VITE_FIREBASE_HEALTH_FUNCTION=https://your-region-your-project.cloudfunctions.net/healthCheck
```

## Migration Strategy

### Dual-Provider Mode

During migration, all systems operate in dual mode:

1. **Primary Provider**: Firebase (new system)
2. **Fallback Provider**: Supabase (existing system)
3. **Automatic Failover**: If Firebase fails, system falls back to Supabase
4. **Gradual Migration**: Features can be migrated individually

### Provider Selection Logic

```typescript
// Example: Database provider selection
const provider = getDatabaseProvider();

if (provider === "firebase" && isFirebaseAvailable()) {
  // Use Firebase Firestore
} else if (provider === "supabase" && isSupabaseAvailable()) {
  // Use Supabase PostgreSQL
} else if (provider === "dual") {
  // Try Firebase first, fallback to Supabase
}
```

## Data Migration

### Database Schema Conversion

- **Supabase (PostgreSQL)**: Snake_case, relational tables
- **Firebase (Firestore)**: CamelCase, document collections
- **Conversion Layer**: Automatic field mapping and type conversion

### Storage Migration

- **Supabase Storage**: Bucket-based with public URLs
- **Firebase Storage**: Path-based with security rules
- **Migration Utilities**: URL conversion and bulk transfer tools

### Function Migration

- **Supabase Edge Functions**: Deno-based runtime
- **Firebase Cloud Functions**: Node.js runtime
- **API Compatibility**: Same interface, different implementations

## Security Considerations

### Authentication

- Firebase Auth tokens for Firebase services
- Supabase JWT tokens for Supabase services
- Dual token management during migration

### Data Access

- Firestore Security Rules enforce ownership
- Storage Security Rules enforce path-based access
- Function authentication validates user context

### API Security

- Webhook signature verification
- Rate limiting and abuse prevention
- Input validation and sanitization

## Testing Strategy

### Unit Tests

- Provider detection logic
- Data format conversion
- Error handling and fallbacks

### Integration Tests

- End-to-end user flows
- Cross-provider data consistency
- Performance benchmarks

### Load Testing

- Concurrent operations
- Provider failover scenarios
- Resource utilization

## Monitoring & Observability

### Migration Dashboard

- Provider health status
- Performance metrics
- Error rates and alerts
- Migration progress tracking

### Logging

- Structured logging for all operations
- Provider-specific log levels
- Error tracking and alerting

### Metrics

- Response times by provider
- Success/error rates
- Resource utilization
- User activity patterns

## Rollback Plan

### Immediate Rollback

1. Set all provider environment variables to `supabase`
2. Restart application services
3. Verify Supabase functionality

### Partial Rollback

1. Individual provider rollback by feature
2. Component-level provider selection
3. Gradual fallback to Supabase

### Data Consistency

- No data loss during migration
- Dual-write ensures data consistency
- Point-in-time recovery options

## Performance Optimization

### Caching Strategy

- Firebase offline persistence
- Supabase connection pooling
- Application-level caching

### Load Balancing

- Provider-based load distribution
- Geographic proximity routing
- Automatic failover handling

### Resource Optimization

- Connection pooling
- Batch operations
- Lazy loading strategies

## Deployment Strategy

### Blue-Green Deployment

- Parallel environments
- Traffic splitting
- Gradual cutover

### Canary Releases

- Feature flags for provider selection
- A/B testing of providers
- Gradual user migration

### Monitoring During Deployment

- Real-time health checks
- Performance metrics
- Error rate monitoring

## Post-Migration Tasks

### Cleanup

- Remove dual-provider code
- Optimize Firebase-specific implementations
- Update documentation

### Optimization

- Fine-tune Firebase security rules
- Optimize Cloud Functions
- Implement Firebase-specific features

### Training

- Team training on Firebase
- Updated operational procedures
- New monitoring practices

## Troubleshooting

### Common Issues

1. **Provider Availability**: Check provider health endpoints
2. **Data Consistency**: Verify dual-write synchronization
3. **Performance**: Monitor provider-specific latencies
4. **Authentication**: Validate token exchange

### Debug Tools

- Migration dashboard
- Provider-specific logs
- Performance monitoring
- Error tracking

## Support Contacts

### Firebase Support

- Firebase documentation
- Google Cloud support
- Community forums

### Internal Support

- Migration team
- DevOps team
- Application support

## Appendix

### Migration Checklist

- [ ] Environment variables configured
- [ ] Firebase project set up
- [ ] Security rules implemented
- [ ] Data migration completed
- [ ] Functions deployed
- [ ] Testing completed
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team trained
- [ ] Rollback plan tested

### References

- [Firebase Documentation](https://firebase.google.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Migration Best Practices](https://cloud.google.com/architecture/best-practices-for-migrating-to-firebase)

---

**Last Updated**: 2026-03-12
**Migration Status**: Phase 7 - In Progress
**Next Milestone**: Complete Frontend Integration
