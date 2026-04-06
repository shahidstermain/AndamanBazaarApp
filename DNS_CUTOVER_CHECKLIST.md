# DNS Cutover Checklist - AndamanBazaar.in

## Overview

This checklist ensures zero-downtime migration when cutting over DNS for andamanbazaar.in to Firebase Hosting.

**Domain**: andamanbazaar.in  
**Primary Target**: Firebase Hosting  
**Expected Downtime**: 0-5 minutes (during TTL propagation)  
**Rollback Time**: < 5 minutes

---

## Pre-Migration Requirements

### 1. Firebase Hosting Setup

- [ ] Firebase project created and configured
- [ ] Firebase Hosting enabled
- [ ] Staging environment deployed and tested
- [ ] Production environment deployed and tested
- [ ] Custom domain verified in Firebase Console
- [ ] SSL certificate provisioned (automatic)

### 2. Current DNS Audit

- [ ] Document all existing DNS records
- [ ] Check current TTL values
- [ ] Identify all subdomains in use
- [ ] Verify email MX records (if any)
- [ ] Check for wildcard DNS records

### 3. Application Readiness

- [ ] Staging deployment successful at staging.andamanbazaar.in
- [ ] Production build tested locally
- [ ] Health endpoint configured (/health.json)
- [ ] Environment variables validated for production
- [ ] Supabase production project ready
- [ ] Cashfree production credentials configured

### 4. Rollback Plan

- [ ] Previous hosting provider access confirmed
- [ ] Rollback DNS records documented
- [ ] Rollback procedure tested
- [ ] Team contact list updated

---

## Migration Steps

### Phase 1: Preparation (T-24 hours)

#### DNS TTL Reduction
```bash
# Lower TTL to 300 seconds (5 minutes) 24 hours before migration
# This allows for fast cutover and rollback

# Current recommended DNS settings:
Name: @
Type: A
Value: 199.36.158.100  # Firebase IP
TTL: 300  # Reduced from 3600 or higher

Name: www
Type: CNAME
Value: andamanbazaar-in.web.app
TTL: 300

Name: staging
Type: CNAME
Value: andamanbazaar-in--staging.web.app
TTL: 300
```

- [ ] Reduce A record TTL to 300 seconds
- [ ] Reduce CNAME record TTL to 300 seconds
- [ ] Wait 24 hours for TTL propagation (T-24h to T-0h)

#### Pre-Migration Testing
- [ ] Verify staging environment works on staging.andamanbazaar.in
- [ ] Test all critical user flows on staging
- [ ] Verify payment processing in sandbox mode
- [ ] Test authentication flows
- [ ] Test image uploads and display

---

### Phase 2: Migration Execution (T-0)

#### Step 1: Deploy Production Build
```bash
# Deploy latest production build
npm ci
npm run build
firebase deploy --only hosting --message "Pre-DNS cutover deployment"

# Verify deployment
firebase hosting:sites:get --site andamanbazaar-in
```

- [ ] Production build deployed
- [ ] Firebase deployment verified
- [ ] Test Firebase URL directly: https://andamanbazaar-in.web.app
- [ ] All pages loading correctly

#### Step 2: Final Pre-Cutover Check
```bash
# Test health endpoint
curl -sf https://andamanbazaar-in.web.app/health.json
echo "✅ Health check passed"

# Test critical pages
curl -sf https://andamanbazaar-in.web.app/login > /dev/null
curl -sf https://andamanbazaar-in.web.app/listings > /dev/null
echo "✅ Critical pages accessible"
```

- [ ] Health check passes
- [ ] Login page accessible
- [ ] Listings page accessible
- [ ] No console errors

#### Step 3: Execute DNS Cutover

**Option A: Apex Domain (andamanbazaar.in)**
```
# BEFORE (current hosting)
Name: @
Type: A
Value: [OLD_SERVER_IP]

# AFTER (Firebase Hosting)
Name: @
Type: A
Value: 199.36.158.100
# OR use CNAME flattening if provider supports it:
# Type: CNAME
# Value: andamanbazaar-in.web.app
```

**Option B: www Subdomain**
```
# BEFORE (if using www)
Name: www
Type: A
Type: CNAME
Value: [OLD_VALUE]

# AFTER (Firebase Hosting)
Name: www
Type: CNAME
Value: andamanbazaar-in.web.app
```

**Option C: Apex + www (Recommended)**
```
# Apex domain
Name: @
Type: A
Value: 199.36.158.100

# WWW subdomain
Name: www
Type: CNAME
Value: andamanbazaar-in.web.app

# Staging subdomain
Name: staging
Type: CNAME
Value: andamanbazaar-in--staging.web.app
```

- [ ] Update A record for @ (apex) to 199.36.158.100
- [ ] Update CNAME record for www to andamanbazaar-in.web.app
- [ ] Save changes in DNS provider
- [ ] Note the change timestamp

---

### Phase 3: Verification (T+0 to T+30 minutes)

#### DNS Propagation Check
```bash
# Check DNS propagation (run every 5 minutes)
# This may show old and new IPs during propagation

dig andamanbazaar.in A +short
dig www.andamanbazaar.in CNAME +short
dig staging.andamanbazaar.in CNAME +short

# Global propagation check (using multiple DNS servers)
dig @8.8.8.8 andamanbazaar.in A +short
dig @1.1.1.1 andamanbazaar.in A +short
dig @208.67.222.222 andamanbazaar.in A +short
```

- [ ] DNS A record resolves to 199.36.158.100
- [ ] DNS CNAME for www resolves to andamanbazaar-in.web.app
- [ ] Propagation confirmed across multiple DNS servers

#### Application Verification
```bash
# Test main domain
curl -sf https://andamanbazaar.in/health.json
echo "✅ Main domain health check"

# Test WWW redirect (if applicable)
curl -sfL https://www.andamanbazaar.in/health.json
echo "✅ WWW subdomain working"

# Test staging
curl -sf https://staging.andamanbazaar.in/health.json
echo "✅ Staging working"
```

- [ ] https://andamanbazaar.in loads successfully
- [ ] https://www.andamanbazaar.in loads successfully (or redirects)
- [ ] https://staging.andamanbazaar.in loads successfully
- [ ] SSL certificate valid (no browser warnings)

#### Critical Functionality Tests
- [ ] Homepage loads without errors
- [ ] User can log in
- [ ] User can create a listing
- [ ] User can upload images
- [ ] User can initiate payment (test mode)
- [ ] Search functionality works
- [ ] Mobile responsiveness verified

#### Monitor for Issues
```bash
# Set up continuous monitoring for 30 minutes
while true; do
  curl -sf https://andamanbazaar.in/health.json && echo "$(date): OK" || echo "$(date): FAILED"
  sleep 60
done
```

- [ ] No 5xx errors in first 30 minutes
- [ ] Error rate < 1%
- [ ] Response times normal (< 2s)
- [ ] No user complaints received

---

### Phase 4: Post-Migration (T+30 minutes to T+24 hours)

#### Restore Normal TTL
```
# After successful migration (T+24 hours), restore normal TTL
Name: @
Type: A
Value: 199.36.158.100
TTL: 3600  # Restore to 1 hour or normal value

Name: www
Type: CNAME
Value: andamanbazaar-in.web.app
TTL: 3600
```

- [ ] Increase TTL to normal values (3600 or higher)
- [ ] Save DNS changes

#### Cleanup
- [ ] Update documentation with new hosting information
- [ ] Notify team of successful migration
- [ ] Update monitoring dashboards
- [ ] Archive old hosting configuration

#### Monitoring (24-48 hours)
- [ ] Monitor error rates continuously
- [ ] Watch for DNS-related issues
- [ ] Check SSL certificate auto-renewal
- [ ] Verify CDN performance
- [ ] Monitor page load times

---

## Rollback Procedure

If issues are detected during or after migration:

### Immediate Rollback (< 5 minutes)

```bash
# Revert DNS to previous values
# Log into DNS provider and restore:
# - A record to previous IP
# - CNAME to previous value

# Verify rollback
dig andamanbazaar.in A +short
curl -sf https://andamanbazaar.in/health.json
```

- [ ] Revert A record to previous IP
- [ ] Revert CNAME to previous value
- [ ] Verify DNS propagation
- [ ] Confirm old site accessible
- [ ] Test critical functionality on old site

### Communication Template

```
🔄 DNS ROLLBACK EXECUTED

Time: [Timestamp]
Reason: [Brief reason]
Action: DNS records reverted to previous hosting

Current Status: Service restored to previous hosting
Impact: [X] minutes of potential inconsistency

Next Steps:
- Investigate root cause
- Fix issues in Firebase configuration
- Schedule new migration window
```

---

## DNS Configuration Reference

### Firebase Hosting IPs
```
199.36.158.100
```

### Firebase Hosting CNAMEs
```
Production: andamanbazaar-in.web.app
Staging: andamanbazaar-in--staging.web.app
```

### Recommended DNS Records

**For Firebase Hosting (Final State):**
```
# Apex domain
Name: @
Type: A
Value: 199.36.158.100
TTL: 3600

# WWW subdomain (redirects to apex)
Name: www
Type: CNAME
Value: andamanbazaar-in.web.app
TTL: 3600

# Staging environment
Name: staging
Type: CNAME
Value: andamanbazaar-in--staging.web.app
TTL: 3600

# Email (if using third-party email)
Name: @
Type: MX
Value: [Email provider MX records]

# TXT records (for verification)
Name: @
Type: TXT
Value: [Firebase verification token]
```

---

## Testing Checklist

### Pre-Migration
- [ ] Firebase URL works: https://andamanbazaar-in.web.app
- [ ] Staging URL works: https://andamanbazaar-in--staging.web.app
- [ ] All critical paths tested on Firebase
- [ ] Performance acceptable (Lighthouse score > 90)

### During Migration
- [ ] DNS changes saved successfully
- [ ] No errors during propagation
- [ ] Site remains accessible throughout

### Post-Migration
- [ ] HTTPS working with valid certificate
- [ ] No mixed content warnings
- [ ] All assets loading (CSS, JS, images)
- [ ] SEO meta tags correct
- [ ] Favicon and manifest working
- [ ] Service Worker registered (PWA)
- [ ] Analytics tracking active

---

## Common Issues & Solutions

### Issue: DNS Not Propagating
**Symptoms**: Old IP still resolving after TTL period  
**Solution**: Clear local DNS cache, check with multiple resolvers

### Issue: SSL Certificate Error
**Symptoms**: Browser shows certificate warning  
**Solution**: Wait for Firebase SSL provisioning (can take up to 24 hours for new domains)

### Issue: 404 Errors
**Symptoms**: SPA routes return 404  
**Solution**: Verify Firebase rewrites configured in firebase.json

### Issue: Assets Not Loading
**Symptoms**: CSS/JS 404 or mixed content warnings  
**Solution**: Check base URL in vite.config.ts, verify all URLs use HTTPS

### Issue: CORS Errors
**Symptoms**: API calls failing  
**Solution**: Verify Supabase CORS settings include new domain

---

## Success Criteria

✅ **Migration is successful when:**

1. andamanbazaar.in resolves to Firebase Hosting (199.36.158.100)
2. www.andamanbazaar.in resolves to Firebase CNAME
3. SSL certificate is valid and auto-renewing
4. All critical user journeys work
5. No increase in error rates
6. Page load times improved or maintained
7. No user-reported issues for 48 hours

---

## Contact Information

**DNS Provider**: [Name] - [Support URL]  
**Firebase Support**: https://firebase.google.com/support  
**Domain Registrar**: [Name] - [Support URL]

**Team Contacts:**
- On-call Engineer: [Contact]
- DevOps Lead: [Contact]
- Engineering Manager: [Contact]

---

## Document History

- **Created**: March 12, 2026
- **Last Updated**: March 12, 2026
- **Version**: 1.0
- **Planned Migration Date**: [To be filled]
- **Actual Migration Date**: [To be filled]
