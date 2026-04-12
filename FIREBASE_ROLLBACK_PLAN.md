# Firebase Migration Rollback Plan

**Project**: AndamanBazaarApp (andamanbazaar.in)  
**Migration**: Supabase → Firebase  
**Date**: March 2026  
**Engineer**: Senior Backend Engineer

---

## Overview

This document provides comprehensive rollback procedures for the Firebase migration. Each migration phase has specific rollback steps to ensure we can quickly revert to Supabase if issues arise.

---

## Phase-by-Phase Rollback Procedures

### Phase 1: Audit Rollback

**Trigger**: Audit incomplete or incorrect

**Rollback Steps**:

1. Delete audit documents

```bash
rm MIGRATION_AUDIT.md
```

**Time**: 1 minute  
**Risk**: None

---

### Phase 2: Schema Design Rollback

**Trigger**: Schema design issues, missing collections

**Rollback Steps**:

1. Delete schema documents

```bash
rm FIRESTORE_SCHEMA.md
rm SECURITY_RULES.md
rm ENV_MAPPING.md
```

**Time**: 1 minute  
**Risk**: None

---

### Phase 3: Auth Migration Rollback

**Trigger**: Authentication failures, user session loss

**Rollback Steps**:

1. **Keep Supabase Auth Active**
   - Do NOT disable Supabase Auth providers
   - Keep Supabase auth URLs configured

2. **Revert Frontend Auth Code**

```bash
# Restore Supabase auth
git checkout HEAD~1 -- src/lib/supabase.ts
git checkout HEAD~1 -- src/pages/AuthView.tsx
git checkout HEAD~1 -- src/hooks/useAuth.ts
```

3. **Update Environment**

```bash
# Restore Supabase env vars
echo "VITE_SUPABASE_URL=your-supabase-url" >> .env
echo "VITE_SUPABASE_ANON_KEY=your-supabase-key" >> .env
```

4. **Verify Rollback**

```bash
npm run dev
# Test login with Supabase
```

**Time**: 5-10 minutes  
**Risk**: Medium (user sessions may be affected)

---

### Phase 4: Firestore Data Layer Rollback

**Trigger**: Data corruption, query failures, performance issues

**Rollback Steps**:

1. **Stop All Firestore Writes**
   - Disable Cloud Functions
   - Update security rules to deny all writes

2. **Restore Supabase Data Access**

```bash
# Restore Supabase client usage
git checkout HEAD~1 -- src/lib/supabase.ts
git checkout HEAD~1 -- src/pages/*.tsx
```

3. **Update Environment Variables**

```bash
# Remove Firebase env vars
sed -i '/VITE_FIREBASE_/d' .env
# Restore Supabase env vars
echo "VITE_SUPABASE_URL=..." >> .env
echo "VITE_SUPABASE_ANON_KEY=..." >> .env
```

4. **Data Validation**
   - Verify Supabase data integrity
   - Check for any data loss during migration

**Time**: 15-30 minutes  
**Risk**: High (potential data inconsistency)

---

### Phase 5: Storage Migration Rollback

**Trigger**: Image loss, storage failures, URL breaks

**Rollback Steps**:

1. **Keep Supabase Storage Active**
   - Do NOT delete Supabase buckets
   - Maintain Supabase Storage URLs

2. **Update Image URLs in Database**

```sql
-- In Supabase SQL
UPDATE listings
SET images =
  jsonb_set(
    images,
    '{0,url}',
    'https://[supabase-project].supabase.co/storage/v1/object/public/listings/' || (images->0->>'id')
  )
WHERE status != 'deleted';
```

3. **Restore Frontend Storage Code**

```bash
git checkout HEAD~1 -- src/lib/storage.ts
git checkout HEAD~1 -- src/pages/CreateListing.tsx
```

4. **Verify Image Access**
   - Check listing images display correctly
   - Test new image uploads

**Time**: 20-40 minutes  
**Risk**: High (image URLs may break)

---

### Phase 6: Cloud Functions Rollback

**Trigger**: Payment failures, webhook issues, function errors

**Rollback Steps**:

1. **Disable Firebase Cloud Functions**

```bash
firebase functions:disable --all
```

2. **Re-enable Supabase Edge Functions**

```bash
cd supabase
supabase functions deploy
```

3. **Update Payment Callbacks**
   - Restore Supabase webhook URLs in Cashfree
   - Update payment success callbacks

4. **Test Payment Flow**
   - Test listing boost purchase
   - Verify invoice generation
   - Check email delivery

**Time**: 10-20 minutes  
**Risk**: High (payment processing affected)

---

### Phase 7: Supabase Removal Rollback

**Trigger**: Critical errors after Supabase removal

**Rollback Steps**:

1. **Restore Supabase Integration**

```bash
# Restore all Supabase files
git checkout HEAD~1 -- supabase/
git checkout HEAD~1 -- src/lib/supabase.ts
git checkout HEAD~1 -- package.json  # Restore @supabase/supabase-js
```

2. **Reinstall Dependencies**

```bash
npm install @supabase/supabase-js
npm install
```

3. **Restore Environment**

```bash
# Add back all Supabase env vars
cat >> .env << EOF
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
EOF
```

4. **Re-deploy Supabase Edge Functions**

```bash
cd supabase
supabase functions deploy
```

**Time**: 30-60 minutes  
**Risk**: Very High (complete system rollback)

---

## Emergency Rollback Procedures

### Complete System Rollback

**Use when**: Critical system failure, data corruption, security breach

**Steps**:

1. **Activate Maintenance Mode**

```bash
# Deploy maintenance page
firebase deploy --only hosting --message "EMERGENCY ROLLBACK"
```

2. **Roll Back Git to Pre-Migration**

```bash
# Find pre-migration commit
git log --oneline | grep "pre-firebase"

# Rollback
git checkout <pre-migration-sha>
npm ci
npm run build
firebase deploy --only hosting
```

3. **Restore Supabase**

```bash
# Ensure Supabase is active
supabase status
supabase functions deploy
```

4. **Verify Critical Functions**
   - User authentication
   - Payment processing
   - Data access

**Time**: 60-90 minutes  
**Risk**: Complete downtime during rollback

---

## Data Safety Procedures

### Before Each Phase

1. **Create Supabase Backup**

```bash
# Export all data
supabase db dump --data-only > backup-phase-$(date +%Y%m%d).sql
```

2. **Export Firebase Data** (if applicable)

```bash
# Export Firestore collections
firebase firestore:export --backup-path gs://[bucket]/backups/phase-$(date +%Y%m%d)
```

3. **Document Current State**
   - User count
   - Active listings
   - Payment status
   - System health metrics

### During Migration

1. **Dual-Write Period** (Phase 4-5)
   - Write to both Supabase and Firestore
   - Validate data consistency
   - Keep detailed logs

2. **Read-Only Supabase** (Phase 6)
   - Set Supabase to read-only mode
   - All writes go to Firestore
   - Monitor for data drift

### After Migration

1. **Keep Supabase Read-Only** (30 days)
   - Allow rollback window
   - Daily consistency checks
   - Performance monitoring

2. **Archive Supabase Data**
   - Export final backup
   - Store in secure location
   - Document for compliance

---

## Rollback Decision Matrix

| Issue Type        | Severity | Rollback Method   | Time   | Impact            |
| ----------------- | -------- | ----------------- | ------ | ----------------- |
| Auth failure      | Critical | Phase 3 rollback  | 5-10m  | Users can't login |
| Data corruption   | Critical | Phase 4 rollback  | 15-30m | Data loss risk    |
| Image loss        | High     | Phase 5 rollback  | 20-40m | Visual issues     |
| Payment failure   | Critical | Phase 6 rollback  | 10-20m | Revenue loss      |
| System crash      | Critical | Complete rollback | 60-90m | Full downtime     |
| Performance issue | Medium   | Phase-specific    | 5-15m  | Slow experience   |
| Minor bug         | Low      | Fix in place      | N/A    | Limited impact    |

---

## Rollback Automation

### GitHub Actions Workflow

```yaml
name: Rollback Firebase Migration

on:
  workflow_dispatch:
    inputs:
      phase:
        description: "Migration phase to rollback"
        required: true
        type: choice
        options:
          - phase3-auth
          - phase4-data
          - phase5-storage
          - phase6-functions
          - phase7-complete
      reason:
        description: "Reason for rollback"
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Rollback Phase 3 (Auth)
        if: github.event.inputs.phase == 'phase3-auth'
        run: |
          echo "Rolling back authentication..."
          # Restore Supabase auth files
          git checkout HEAD~1 -- src/lib/supabase.ts src/pages/AuthView.tsx

      - name: Rollback Phase 4 (Data)
        if: github.event.inputs.phase == 'phase4-data'
        run: |
          echo "Rolling back data layer..."
          # Restore Supabase data access
          git checkout HEAD~1 -- src/lib/supabase.ts src/pages/*.tsx

      - name: Rollback Phase 5 (Storage)
        if: github.event.inputs.phase == 'phase5-storage'
        run: |
          echo "Rolling back storage..."
          # Restore Supabase storage
          git checkout HEAD~1 -- src/lib/storage.ts

      - name: Rollback Phase 6 (Functions)
        if: github.event.inputs.phase == 'phase6-functions'
        run: |
          echo "Rolling back cloud functions..."
          firebase functions:disable --all

      - name: Complete Rollback
        if: github.event.inputs.phase == 'phase7-complete'
        run: |
          echo "Complete system rollback..."
          git checkout <pre-migration-tag>
          npm ci && npm run build

      - name: Deploy Rollback
        run: |
          firebase deploy --only hosting --message "Rollback: ${{ github.event.inputs.reason }}"

      - name: Notify Team
        run: |
          echo "🔄 Rollback completed: ${{ github.event.inputs.phase }}"
          echo "Reason: ${{ github.event.inputs.reason }}"
```

---

## Rollback Testing

### Test Scenarios

1. **Auth Rollback Test**
   - Create test user in Firebase
   - Rollback to Supabase
   - Verify user can still login

2. **Data Rollback Test**
   - Create test listing in Firestore
   - Rollback to Supabase
   - Verify listing accessible

3. **Storage Rollback Test**
   - Upload image to Firebase Storage
   - Rollback to Supabase
   - Verify image displays

4. **Payment Rollback Test**
   - Process test payment via Cloud Functions
   - Rollback to Edge Functions
   - Verify payment flow works

### Rollback Drills

**Schedule**: Monthly rollback drills  
**Participants**: Engineering team, DevOps  
**Scenarios**: Each phase rollback tested quarterly

---

## Monitoring During Rollback

### Key Metrics

1. **Authentication Success Rate**
   - Target: >95%
   - Alert if: <90% for 5 minutes

2. **Database Response Time**
   - Target: <200ms
   - Alert if: >500ms for 5 minutes

3. **Error Rate**
   - Target: <1%
   - Alert if: >5% for 3 minutes

4. **Payment Success Rate**
   - Target: >98%
   - Alert if: <95% for 5 minutes

### Monitoring Tools

- Firebase Console (Firestore, Functions, Storage)
- Supabase Dashboard (remaining services)
- Sentry (error tracking)
- Custom health endpoints

---

## Communication Plan

### Internal Communication

**Slack Channels**:

- `#engineering`: Technical updates
- `#incidents`: Rollback notifications
- `#deployments`: Deployment status

**Alert Templates**:

```
🔄 **ROLLBACK INITIATED**
Phase: [Phase number]
Reason: [Brief reason]
Initiated by: [@username]
Time: [Timestamp]
Expected downtime: [X minutes]
```

### External Communication

**User Notifications**:

- In-app banner for critical issues
- Email for extended downtime
- Social media for major outages

---

## Post-Rollback Actions

### Immediate (0-1 hour)

1. **Verify System Health**
   - All critical functions working
   - Error rates normal
   - User feedback monitored

2. **Document Incident**
   - Root cause analysis
   - Rollback effectiveness
   - Lessons learned

### Short-term (1-24 hours)

1. **Fix Identified Issues**
   - Address root cause
   - Add tests
   - Update procedures

2. **Plan Re-migration**
   - Schedule new attempt
   - Update migration plan
   - Additional safeguards

### Long-term (1-7 days)

1. **Post-Mortem**
   - Full incident report
   - Improvement actions
   - Timeline verification

2. **Process Updates**
   - Update migration checklist
   - Improve rollback procedures
   - Team training

---

## Emergency Contacts

| Role             | Contact                             | Availability   |
| ---------------- | ----------------------------------- | -------------- |
| Engineering Lead | [Phone/Slack]                       | 24/7           |
| DevOps Engineer  | [Phone/Slack]                       | 24/7           |
| Product Manager  | [Phone/Slack]                       | Business hours |
| Firebase Support | https://firebase.google.com/support | Business hours |
| Supabase Support | https://supabase.com/support        | Business hours |

---

## Document History

- **Created**: March 12, 2026
- **Last Updated**: March 12, 2026
- **Version**: 1.0
- **Next Review**: After Phase 3 completion

---

**Rollback Plan Complete** ✅
