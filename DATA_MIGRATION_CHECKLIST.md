# Data Migration Checklist

## 🎯 Executive Summary

Based on the comprehensive audit, **NO DATA MIGRATION IS REQUIRED** for AndamanBazaar. All data is already stored in Supabase PostgreSQL with proper RLS policies and backup procedures. This checklist focuses on **data validation, backup verification, and consistency checks** to ensure data integrity during the Firebase retirement process.

### Data Migration Status: ✅ **NOT REQUIRED**
- **User Data**: Already in Supabase (profiles, auth.users)
- **Marketplace Data**: Already in Supabase (listings, categories, chats)
- **Payment Data**: Already in Supabase (boosts, invoices, audit logs)
- **File Storage**: Already in Supabase (images, documents)
- **Analytics Data**: Will be rebuilt in Supabase (no migration needed)

---

## 📋 Data Inventory

### **✅ ALREADY IN SUPABASE (No Migration Needed)**

#### **User Data**
```sql
-- Tables: Already in Supabase
auth.users              -- Firebase authentication replacement
profiles               -- User profiles and preferences
user_roles             -- Role-based access control
user_sessions          -- Session tracking (enhanced)
```

#### **Marketplace Data**
```sql
-- Tables: Already in Supabase
listings               -- Core marketplace listings
categories             -- Product categories
listing_images         -- Listing photos (references)
chats                  -- Chat conversations
messages               -- Chat messages
reports                -- User reports and moderation
```

#### **Payment Data**
```sql
-- Tables: Already in Supabase
listing_boosts         -- Payment boost tracking
invoices               -- Invoice records
payment_audit_log      -- Complete audit trail
```

#### **File Storage**
```sql
-- Buckets: Already in Supabase
listing-images         -- Listing photos
profile-photos         -- User avatars
invoice-pdfs           -- Generated invoices
file_uploads           -- File tracking (enhanced)
```

### **🔄 DATA TO BE REBUILT (No Migration, Fresh Start)**

#### **Analytics Data**
```sql
-- Tables: New in Supabase (replacing Firebase Analytics)
page_views             -- Page view tracking
user_events            -- User interaction events
performance_metrics    -- Performance monitoring
realtime_events        -- Real-time event tracking
```

---

## 🔍 Data Validation Checklist

### **Phase 1: Pre-Migration Data Validation**

#### **1.1 User Data Integrity**
```sql
-- Validation Queries
SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT id) as unique_users,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
  COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as users_with_phone,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
FROM profiles;

-- Expected Results
□ Total users > 100 (active marketplace)
□ All users have unique IDs
□ >90% users have email addresses
□ >50% users have phone numbers
□ New user registration trend positive
```

#### **1.2 Marketplace Data Integrity**
```sql
-- Validation Queries
SELECT 
  COUNT(*) as total_listings,
  COUNT(DISTINCT user_id) as unique_sellers,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_listings,
  COUNT(CASE WHEN is_featured = TRUE THEN 1 END) as featured_listings,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_listings_30d
FROM listings;

-- Category Distribution
SELECT 
  c.name as category,
  COUNT(l.id) as listing_count,
  COUNT(CASE WHEN l.status = 'active' THEN 1 END) as active_count
FROM categories c
LEFT JOIN listings l ON c.id = l.category_id
GROUP BY c.name
ORDER BY listing_count DESC;

-- Expected Results
□ Total listings > 500 (healthy marketplace)
□ Multiple unique sellers (>50)
□ >80% listings are active
□ Featured listings present (revenue indicator)
□ New listings being created regularly
□ Categories have reasonable distribution
```

#### **1.3 Payment Data Integrity**
```sql
-- Validation Queries
SELECT 
  COUNT(*) as total_boosts,
  COUNT(DISTINCT user_id) as unique_buyers,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_boosts,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_boosts,
  SUM(CASE WHEN status = 'paid' THEN price_in_cents END) / 100 as total_revenue
FROM listing_boosts;

-- Invoice Validation
SELECT 
  COUNT(*) as total_invoices,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
  COUNT(CASE WHEN email_sent = TRUE THEN 1 END) as emailed_invoices,
  COUNT(CASE WHEN invoice_pdf_url IS NOT NULL THEN 1 END) as invoices_with_pdf
FROM invoices;

-- Expected Results
□ Payment processing functional (boosts exist)
□ Revenue generation present (paid boosts)
□ Invoice system working
□ Email delivery functional
```

#### **1.4 Chat & Communication Data**
```sql
-- Validation Queries
SELECT 
  COUNT(*) as total_chats,
  COUNT(DISTINCT seller_id) as active_sellers,
  COUNT(DISTINCT buyer_id) as active_buyers,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_chats
FROM chats;

-- Message Activity
SELECT 
  COUNT(*) as total_messages,
  COUNT(DISTINCT chat_id) as chats_with_messages,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as messages_7d
FROM messages;

-- Expected Results
□ Chat functionality being used
□ Active buyer-seller communication
□ Recent message activity
```

### **Phase 2: File Storage Validation**

#### **2.1 Storage Bucket Integrity**
```sql
-- File Upload Tracking
SELECT 
  bucket_name,
  COUNT(*) as file_count,
  SUM(file_size) as total_size_bytes,
  COUNT(CASE WHEN is_public = TRUE THEN 1 END) as public_files,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_uploads
FROM file_uploads
GROUP BY bucket_name;

-- Expected Results
□ All buckets have files
□ File sizes reasonable (no corruption)
□ Public/private file distribution correct
□ Recent upload activity present
```

#### **2.2 Image File Validation**
```bash
# Automated File Checks
for bucket in listing-images profile-photos invoice-pdfs; do
  echo "Checking bucket: $bucket"
  
  # Count files
  file_count=$(supabase storage list $bucket --json | jq '.length')
  echo "Files in $bucket: $file_count"
  
  # Check file accessibility (sample)
  sample_file=$(supabase storage list $bucket --json | jq -r '.[0].name')
  if [ "$sample_file" != "null" ]; then
    public_url=$(supabase storage get-public-url $bucket $sample_file --json | jq -r '.publicUrl')
    http_status=$(curl -s -o /dev/null -w "%{http_code}" "$public_url")
    echo "Sample file accessibility: $http_status"
  fi
done

# Expected Results
□ All buckets accessible
□ File counts match database records
□ Sample files accessible via public URLs
□ No broken file references
```

### **Phase 3: Performance & Security Validation**

#### **3.1 Database Performance**
```sql
-- Query Performance Checks
EXPLAIN ANALYZE SELECT * FROM listings WHERE status = 'active' ORDER BY created_at DESC LIMIT 20;
EXPLAIN ANALYZE SELECT * FROM profiles WHERE id = 'user_id_placeholder';
EXPLAIN ANALYZE SELECT * FROM messages WHERE chat_id = 'chat_id_placeholder' ORDER BY created_at;

-- Index Usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Expected Results
□ Queries using indexes (no full table scans)
□ Index usage patterns reasonable
□ Query times <100ms for common operations
```

#### **3.2 RLS Policy Validation**
```sql
-- Test RLS Policies
SET ROLE anon;
-- Should fail or return limited results
SELECT COUNT(*) FROM listings; -- Should be 0 or limited

SET ROLE authenticated; -- Simulate authenticated user
-- Should work for user's own data
SELECT COUNT(*) FROM listings WHERE user_id = 'test_user_id';

-- Expected Results
□ Anonymous access properly restricted
□ Authenticated users can access own data
□ Admin access working (test with admin role)
□ No data leakage between users
```

---

## 🔄 Data Consistency Checks

### **Referential Integrity Validation**
```sql
-- Check for Orphaned Records
SELECT 'listings without valid user' as issue, COUNT(*) as count
FROM listings l
LEFT JOIN profiles p ON l.user_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 'messages without valid chat' as issue, COUNT(*) as count
FROM messages m
LEFT JOIN chats c ON m.chat_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 'boosts without valid listing' as issue, COUNT(*) as count
FROM listing_boosts lb
LEFT JOIN listings l ON lb.listing_id = l.id
WHERE l.id IS NULL;

-- Expected Results
□ Zero orphaned records
□ All foreign keys valid
□ Data relationships intact
```

### **Data Consistency Across Tables**
```sql
-- Featured Listings Consistency
SELECT 
  COUNT(*) as featured_in_listings,
  COUNT(*) as featured_boosts
FROM listings l
WHERE l.is_featured = TRUE
AND EXISTS (
  SELECT 1 FROM listing_boosts lb 
  WHERE lb.listing_id = l.id 
  AND lb.status = 'paid'
);

-- Chat-Message Consistency
SELECT 
  c.id as chat_id,
  COUNT(m.id) as message_count
FROM chats c
LEFT JOIN messages m ON c.id = m.chat_id
GROUP BY c.id
HAVING COUNT(m.id) = 0;

-- Expected Results
□ Featured listings have corresponding paid boosts
□ All chats have at least one message (or valid empty chats)
□ Data consistency maintained across related tables
```

---

## 📊 Analytics Data Setup

### **New Analytics Tables Creation**
```sql
-- These will be created fresh (no migration needed)
-- File: supabase/migrations/019_analytics_enhancements.sql

-- Analytics tables are already defined in migration design
-- Just need to apply migrations and start collecting data
```

### **Analytics Data Collection Setup**
```typescript
// Add to main application entry point
import { SupabaseAnalytics } from './lib/analytics-supabase';

// Initialize analytics
SupabaseAnalytics.init();

// Track page views on route changes
router.addEventListener('routeChange', () => {
  SupabaseAnalytics.trackPageView(window.location.pathname);
});

// Track user interactions
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const eventName = target.getAttribute('data-analytics-event');
  if (eventName) {
    SupabaseAnalytics.trackEvent(eventName);
  }
});
```

---

## 🔐 Backup & Recovery Validation

### **Current Backup Status**
```bash
# Check Supabase Backup Status
supabase backups list

# Verify Point-in-Time Recovery
supabase db restore --help

# Check WAL Archive Status
supabase db status --wal
```

### **Manual Backup Verification**
```sql
-- Create Test Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

-- Verify Backup Integrity
pg_dump $DATABASE_URL --schema-only > schema_backup.sql
pg_dump $DATABASE_URL --data-only > data_backup.sql

-- Test Restore (in development)
createdb test_restore
psql test_restore < backup_file.sql
```

### **Recovery Procedures Test**
```bash
# Document Recovery Steps
1. Identify recovery point in time
2. Stop application
3. Restore database
4. Verify data integrity
5. Restart application
6. Monitor for issues

# Test Recovery Time
time supabase db restore --timestamp "2024-01-01 12:00:00"
```

---

## 📈 Performance Benchmarks

### **Database Performance Baseline**
```sql
-- Record Current Performance Metrics
CREATE TABLE IF NOT EXISTS performance_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  query_time_ms NUMERIC NOT NULL,
  records_returned INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Benchmark Queries
INSERT INTO performance_baseline (test_name, query_time_ms, records_returned)
SELECT 
  'listings_homepage',
  EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
  COUNT(*)
FROM (
  SELECT NOW() as start_time
  FROM listings 
  WHERE status = 'active' 
  ORDER BY created_at DESC 
  LIMIT 20
) subquery;
```

### **Application Performance Metrics**
```typescript
// Performance Monitoring Setup
class PerformanceBenchmark {
  static measureQuery<T>(
    queryName: string, 
    query: () => Promise<T>
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();
      try {
        const result = await query();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log performance
        console.log(`Query ${queryName}: ${duration.toFixed(2)}ms`);
        
        // Track in analytics
        SupabaseAnalytics.trackPerformance('query_response', duration, 'ms', {
          query: queryName
        });
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }
}
```

---

## 🚨 Data Migration Risk Assessment

### **Risk Matrix**
```bash
# Data Risks: MINIMAL (no migration required)
├── Data Loss Risk: NONE (data stays in Supabase)
├── Data Corruption Risk: LOW (backup procedures in place)
├── Performance Risk: LOW (existing performance baseline)
├── Security Risk: LOW (RLS policies validated)
└── Availability Risk: LOW (Supabase high availability)

# Migration Risks: LOW (configuration changes only)
├── DNS Migration Risk: MEDIUM (5-30 min downtime)
├── Configuration Risk: LOW (well-documented changes)
├── Feature Risk: NONE (no feature changes)
└── User Impact Risk: LOW (minimal changes visible)
```

### **Mitigation Strategies**
```bash
# Data Protection
□ Daily automated backups
□ Point-in-time recovery enabled
□ Manual backup before changes
□ Data integrity checks automated
□ Performance monitoring active

# Migration Protection
□ Rollback procedures documented
□ DNS TTL reduced before change
□ Maintenance page ready
□ Support team notified
□ Monitoring alerts configured
```

---

## 📋 Pre-Migration Checklist

### **Data Validation (Week 1)**
```bash
□ User data integrity verified
□ Marketplace data complete
□ Payment data functional
□ Chat data active
□ File storage accessible
□ Database performance optimal
□ RLS policies working
□ Backup procedures tested
□ Recovery procedures documented
□ Performance benchmarks recorded
```

### **Analytics Setup (Week 2)**
```bash
□ Analytics migrations applied
□ Analytics functions deployed
□ Tracking code implemented
□ Data collection tested
□ Dashboard configured
□ Reports functional
□ Privacy controls verified
□ Data retention policies set
□ Performance monitoring active
□ Error tracking configured
```

### **Security Validation (Week 3)**
```bash
□ Access controls verified
□ Authentication flows tested
□ Authorization policies validated
□ Audit logging functional
□ Rate limiting active
□ Security headers configured
□ SSL certificates valid
□ Data encryption verified
□ Compliance checks passed
□ Security scan completed
```

---

## 📊 Post-Migration Validation

### **Immediate Checks (Day 1)**
```bash
□ All data accessible
□ User authentication working
□ Marketplace features functional
□ Payment processing operational
□ File uploads/downloads working
□ Real-time features active
□ Analytics data collecting
□ Performance metrics normal
□ Error rates acceptable
□ User feedback positive
```

### **Week 1 Monitoring**
```bash
□ Daily data integrity checks
□ Performance trend analysis
□ User behavior monitoring
□ Error log analysis
□ Backup verification
□ Security audit review
□ Analytics data validation
□ Cost analysis
□ User satisfaction survey
□ Optimization planning
```

### **Month 1 Review**
```bash
□ Monthly data integrity report
□ Performance analysis
□ Security assessment
□ Cost optimization review
□ User feedback analysis
□ Feature usage analytics
□ Backup strategy review
□ Disaster recovery test
□ Compliance verification
□ Improvement planning
```

---

## 🎯 Success Criteria

### **Data Integrity Success**
```bash
□ Zero data loss
□ Zero data corruption
□ All relationships maintained
□ Performance maintained or improved
□ Security enhanced
□ Compliance maintained
```

### **Operational Success**
```bash
□ All features functional
□ User experience maintained
□ Performance improved
□ Analytics operational
□ Monitoring comprehensive
□ Documentation complete
□ Team trained
```

### **Business Success**
```bash
□ No revenue impact
□ User engagement maintained
□ Support tickets manageable
□ Costs within budget
□ Growth trajectory maintained
□ Competitive position enhanced
```

---

## 📚 Documentation Requirements

### **Technical Documentation**
```bash
□ Data schema documentation
□ Backup procedures
□ Recovery procedures
□ Performance benchmarks
□ Security policies
□ Monitoring procedures
□ Troubleshooting guides
□ API documentation
```

### **Operational Documentation**
```bash
□ Deployment procedures
□ Monitoring runbooks
□ Incident response procedures
□ Change management procedures
□ Compliance documentation
□ User support procedures
□ Vendor management procedures
```

---

**Overall Assessment**: ✅ **NO DATA MIGRATION REQUIRED**

All critical data is already stored in Supabase with proper backup, security, and performance optimization. The focus should be on data validation, analytics setup, and ensuring data integrity during the Firebase retirement process.

**Data Confidence**: **HIGH** - Comprehensive validation procedures and backup strategies ensure data safety throughout the migration process.
