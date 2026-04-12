# AndamanBazaar Rollback Plan

## Overview

This document provides procedures for rolling back production deployments to maintain service availability and minimize user impact.

**Scope**: Frontend application (Firebase Hosting)
**Domains**: andamanbazaar.in, www.andamanbazaar.in
**Current Version**: Tracked via Git SHA and build artifacts

---

## Rollback Triggers

### Automatic Triggers

- Health check failures for > 5 minutes
- Error rate > 10% for > 3 minutes
- Payment processing failures
- Critical user journey broken (login, listing creation)

### Manual Triggers

- Critical bug discovered in production
- Security vulnerability
- Performance degradation
- Data integrity issues

---

## Rollback Methods

### Method 1: Firebase Hosting Rollback (Fastest - 30 seconds)

**Use when**: Need immediate rollback to previous version

```bash
# List recent releases
firebase hosting:releases:list --site andamanbazaar-in

# Rollback to previous version
firebase hosting:clone andamanbazaar-in:live andamanbazaar-in:live-1 --region us-central1

# Verify rollback
curl https://andamanbazaar.in/health.json
```

**Time to complete**: 30-60 seconds
**Downtime**: Minimal (< 10 seconds)

---

### Method 2: Git-based Rollback (Recommended)

**Use when**: Need to rollback to specific known-good commit

```bash
# Identify last known good commit
git log --oneline -20

# Rollback to specific commit
git checkout <commit-sha>

# Install dependencies and build
npm ci
npm run build

# Deploy to production
firebase deploy --only hosting --message "Rollback to $(git rev-parse --short HEAD)"

# Return to main branch
git checkout main
```

**Time to complete**: 3-5 minutes
**Downtime**: 1-2 minutes during deployment

---

### Method 3: GitHub Actions Rollback

**Use when**: Need documented, auditable rollback

```bash
# Trigger rollback workflow via GitHub CLI
gh workflow run rollback.yml -f commit=<commit-sha> -f reason="Critical bug in payments"

# Or via GitHub web UI:
# 1. Go to Actions tab
# 2. Select "Rollback Production"
# 3. Click "Run workflow"
# 4. Enter commit SHA and reason
```

**Time to complete**: 5-7 minutes
**Downtime**: 2-3 minutes
**Benefits**: Full audit trail, automated notifications

---

### Method 4: Emergency Maintenance Mode

**Use when**: Need immediate site takedown (security breach, data corruption)

```bash
# Create maintenance page
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AndamanBazaar - Maintenance</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%);
      color: white;
      text-align: center;
    }
    .container {
      max-width: 500px;
      padding: 2rem;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.1rem;
      line-height: 1.6;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔧</div>
    <h1>Under Maintenance</h1>
    <p>We're performing essential updates to improve your experience. We'll be back shortly.</p>
    <p style="margin-top: 2rem; font-size: 0.9rem; opacity: 0.8;">
      For urgent inquiries, contact support@andamanbazaar.in
    </p>
  </div>
</body>
</html>
EOF

# Deploy immediately
firebase deploy --only hosting --message "EMERGENCY MAINTENANCE"

# Notify team
echo "🚨 MAINTENANCE MODE ACTIVATED - $(date)" | slack-notify #ops-channel
```

**Time to complete**: 10 seconds
**Downtime**: Full site unavailable
**Use only for**: Critical security/data issues

---

## Rollback Decision Matrix

| Scenario       | Method                 | Time | Risk             |
| -------------- | ---------------------- | ---- | ---------------- |
| Payment broken | Method 1 (Firebase)    | 30s  | Low              |
| Login broken   | Method 1 (Firebase)    | 30s  | Low              |
| Critical bug   | Method 2 (Git)         | 3-5m | Low              |
| Security issue | Method 4 (Maintenance) | 10s  | High (full down) |
| Performance    | Method 2 (Git)         | 3-5m | Low              |
| Data issue     | Method 4 (Maintenance) | 10s  | High (full down) |

---

## Rollback Procedures

### Standard Rollback Procedure

1. **Assess Impact**

   ```bash
   # Check error rates
   curl -s https://andamanbazaar.in/health.json

   # Review recent deployments
   firebase hosting:releases:list
   ```

2. **Communicate**
   - Post in #incident-response Slack channel
   - Notify on-call engineer
   - Update status page if available

3. **Execute Rollback**

   ```bash
   # Choose appropriate method above
   # Document action taken
   echo "Rollback executed at $(date) - Method: Firebase" >> rollback-log.txt
   ```

4. **Verify**

   ```bash
   # Health check
   curl https://andamanbazaar.in/health.json

   # Smoke tests
   curl -s https://andamanbazaar.in/login | grep -i "login"
   curl -s https://andamanbazaar.in/listings | grep -i "listing"
   ```

5. **Monitor**
   - Watch error rates for 15 minutes
   - Monitor user complaints/support tickets
   - Verify critical flows working

6. **Post-Incident**
   - Document root cause
   - Create incident report
   - Schedule post-mortem

---

## Rollback Checklist

- [ ] Identify rollback trigger and severity
- [ ] Choose appropriate rollback method
- [ ] Notify team via Slack (#deployments or #incident-response)
- [ ] Execute rollback
- [ ] Verify health check endpoint returns 200
- [ ] Run smoke tests on critical pages
- [ ] Monitor error rates for 15 minutes
- [ ] Update status page if applicable
- [ ] Document rollback in incident log
- [ ] Schedule post-mortem if needed

---

## Version Management

### Build Artifacts

GitHub Actions retains build artifacts for 14 days:

- Staging builds: `build-staging`
- Production builds: `build-production`

### Access Previous Builds

```bash
# Download specific build via GitHub CLI
gh run download <run-id> -n build-production

# List available artifacts
gh run list --workflow=deploy.yml
```

### Git Tags for Releases

```bash
# Tag known good versions
git tag -a v1.2.3-stable <commit-sha> -m "Stable release"
git push origin v1.2.3-stable

# Rollback to tag
git checkout v1.2.3-stable
npm ci && npm run build
firebase deploy --only hosting
```

---

## Communication Templates

### Slack Notification - Rollback Initiated

```
🔄 **ROLLBACK INITIATED**

Environment: Production
Reason: [Brief reason]
Method: [Firebase/Git/Maintenance]
Initiated by: @username
Time: [Timestamp]

Expected downtime: [X minutes]
Monitoring: https://andamanbazaar.in/health.json
```

### Slack Notification - Rollback Complete

```
✅ **ROLLBACK COMPLETE**

Environment: Production
Version: [Commit SHA or Release]
Time to complete: [X minutes]

Verification:
- Health check: ✅
- Smoke tests: ✅
- Error rate: [Normal/Elevated]

Next steps:
- Monitor for 15 minutes
- [Any follow-up actions]
```

### Status Page Update

```
**Incident**: Service degradation
**Status**: Monitoring
**Impact**: Partial - some users may experience [specific issue]
**Resolution**: Service restored via rollback at [time]
**Next Update**: [Time + 30 minutes]
```

---

## Rollback Automation

### GitHub Actions Workflow

Create `.github/workflows/rollback.yml`:

```yaml
name: Rollback Production

on:
  workflow_dispatch:
    inputs:
      commit:
        description: "Commit SHA to rollback to"
        required: true
      reason:
        description: "Reason for rollback"
        required: true
      environment:
        description: "Environment"
        default: "production"
        type: choice
        options:
          - staging
          - production

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - name: Checkout to target commit
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.commit }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Deploy rollback
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: "${{ secrets.GITHUB_TOKEN }}"
          firebaseServiceAccount: "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}"
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
          channelId: ${{ github.event.inputs.environment == 'production' && 'live' || 'staging' }}

      - name: Notify team
        run: |
          echo "🔄 Rollback complete: ${{ github.event.inputs.commit }}"
          echo "Reason: ${{ github.event.inputs.reason }}"
```

---

## Database Rollback Considerations

**Important**: Frontend rollback does NOT rollback database changes.

### If Database Changes Involved

1. **Supabase Migrations**: Cannot be rolled back automatically
2. **Data Changes**: May require manual intervention
3. **Edge Functions**: Automatically match frontend version

### Coordination with Backend

When rolling back frontend:

- Verify Supabase project is compatible
- Check edge function versions
- Confirm database schema compatibility
- Test critical user flows end-to-end

---

## Post-Rollback Actions

### Immediate (0-1 hour)

1. Monitor error rates and user feedback
2. Verify all critical features working
3. Confirm payment processing functional
4. Check authentication flow

### Short-term (1-24 hours)

1. Fix identified issues in main branch
2. Add tests to prevent regression
3. Update documentation
4. Communicate with users if needed

### Long-term (1-7 days)

1. Conduct post-mortem
2. Identify root cause
3. Implement preventive measures
4. Update deployment checklist

---

## Rollback Log

| Date   | Time   | Initiated By | Reason   | Method   | Duration   | Outcome           |
| ------ | ------ | ------------ | -------- | -------- | ---------- | ----------------- |
| [Date] | [Time] | [Name]       | [Reason] | [Method] | [Duration] | [Success/Failure] |

---

## Emergency Contacts

- **On-call Engineer**: [Phone/Slack]
- **Engineering Lead**: [Phone/Slack]
- **Product Manager**: [Phone/Slack]
- **Firebase Support**: https://firebase.google.com/support

---

## Document History

- **Created**: March 12, 2026
- **Last Updated**: March 12, 2026
- **Version**: 1.0
