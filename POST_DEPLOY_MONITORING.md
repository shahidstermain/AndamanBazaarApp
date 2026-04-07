# Post-Deploy Monitoring

## Release Recommendation

**Current recommendation: not safe to deploy until blockers in `RELEASE_CHECKLIST.md` are fixed.**

This document defines what to monitor once those blockers are resolved and the release proceeds.

## Monitoring Windows

### First 15 Minutes

Monitor continuously:

- Homepage availability
- Auth entry flow
- Listings feed load
- Listing detail load
- Create listing save path
- Payment initiation
- Payment confirmation return path
- 404 rate
- Static asset 404s

### First 60 Minutes

Monitor every 5 to 10 minutes:

- Client-side console errors
- Supabase auth failures
- Supabase storage failures
- Edge function errors
- Payment webhook failures
- Sitemap/robots accessibility
- SSL and redirect consistency

### First 24 Hours

Monitor hourly:

- Error trends
- Performance regressions
- Search indexing signals
- Payment conversion anomalies
- User support complaints

## Critical Health Signals

### Availability

- `GET /` returns 200
- `GET /health.json` returns 200 with valid JSON
- `GET /robots.txt` returns 200
- `GET /sitemap.xml` returns 200

### Static Assets

Verify there are no production 404s for:

- `/favicon.ico`
- `/apple-touch-icon.png`
- `/favicon-32x32.png`
- `/favicon-16x16.png`
- `/safari-pinned-tab.svg`

### Auth

Watch for:

- login failures
- signup failures
- OAuth callback loops
- verification email redirect issues
- unexpected redirects to `/auth`

### Listing Experience

Watch for:

- failed `listings` queries
- image load failures
- listing create/update failures
- storage bucket permission failures
- seller profile fetch failures

### Payment Flows

Watch for:

- `create-boost-order` failures
- `cashfree-webhook` failures
- delayed webhook processing
- success page shown without backend `paid` status
- duplicate or abandoned order creation

## Suggested Dashboards

### Browser / Frontend

Track in browser monitoring or manual console sampling:

- uncaught exceptions
- route-level crashes
- chunk load failures
- failed network requests
- hydration or bundle issues

### Supabase

Track:

- Auth error rate
- PostgREST/API error rate
- Storage upload failures
- Edge function errors
- row-level security denials that affect normal flows

### Payments

Track:

- orders created per hour
- successful payment confirmations per hour
- failed webhook verifications
- pending payments older than expected threshold
- mismatch between created orders and confirmed boosts

## Manual Monitoring Commands

### Basic HTTP Checks

```bash
curl -sf https://andamanbazaar.in/health.json
curl -sf https://andamanbazaar.in/robots.txt
curl -sf https://andamanbazaar.in/sitemap.xml
curl -I https://andamanbazaar.in/apple-touch-icon.png
curl -I https://andamanbazaar.in/favicon-32x32.png
curl -I https://andamanbazaar.in/favicon-16x16.png
curl -I https://andamanbazaar.in/safari-pinned-tab.svg
```

### Redirect and SSL Checks

```bash
curl -I http://andamanbazaar.in
curl -I https://www.andamanbazaar.in
openssl s_client -connect andamanbazaar.in:443 -servername andamanbazaar.in < /dev/null
```

### Search/Crawl Checks

```bash
curl -s https://andamanbazaar.in/robots.txt
curl -s https://andamanbazaar.in/sitemap.xml | head -40
```

## Key Metrics and Thresholds

### Availability

- **Target**: 99.9%+ during first 24 hours
- **Alert**: any sustained 5xx or blank-screen report

### Client Errors

- **Target**: near-zero uncaught exceptions
- **Alert**: repeated route crashes or asset 404s

### Page Load and UX

- **Target**:
  - homepage interactive within expected baseline
  - listings page usable within expected baseline
  - listing detail loads without broken media
- **Alert**: visible performance regression versus staging or prior baseline

### Payment Integrity

- **Target**:
  - payment initiation succeeds reliably
  - confirmation only after backend verified success
  - no false-positive success confirmations
- **Alert**:
  - any report of boost shown active when payment is not confirmed
  - webhook verification failures spike
  - pending payments accumulate

## High-Priority Alert Conditions

Escalate immediately if any of the following happens:

- homepage or listings page unavailable
- authentication broken for valid users
- listing creation fails for normal users
- image uploads fail broadly
- payment success page shows success for non-paid orders
- 404s on required static assets from `index.html`
- domain or SSL misconfiguration causes browser warnings
- `robots.txt` or `sitemap.xml` inaccessible or incorrect

## Triage Playbook

### Severity 1

Use for:

- full site outage
- auth outage
- payment integrity issue
- data exposure or security issue

Immediate actions:

- halt promotion or traffic cutover
- notify engineering owner
- consider rollback
- post incident note

### Severity 2

Use for:

- broken non-core CTA
- missing icons/assets
- sitemap/SEO mismatch
- partial page failures

Immediate actions:

- log defect
- patch urgently
- decide whether rollback is necessary based on blast radius

### Severity 3

Use for:

- cosmetic mobile issue
- non-critical metadata gap
- minor console warnings without user impact

Immediate actions:

- log issue
- patch in next release window

## Monitoring Checklist

### Immediately After Deploy

- [ ] `health.json` returns 200
- [ ] homepage loads
- [ ] listings page loads
- [ ] one listing detail page loads
- [ ] auth page loads
- [ ] `/robots.txt` returns expected content
- [ ] `/sitemap.xml` returns expected production URLs
- [ ] icon assets return 200
- [ ] no obvious console exceptions

### First 15 Minutes

- [ ] create listing tested
- [ ] edit listing tested
- [ ] profile update tested
- [ ] one payment initiation tested
- [ ] one payment confirmation tested
- [ ] no unusual 404 patterns

### First Hour

- [ ] no error spikes in Supabase logs
- [ ] no payment webhook spikes or signature failures
- [ ] no support reports of login/create/payment failures
- [ ] mobile spot check completed

## Ownership

### Frontend Owner

Responsible for:

- route integrity
- client errors
- broken links
- static assets
- mobile responsiveness
- SEO and metadata files

### Backend / Supabase Owner

Responsible for:

- auth health
- database read/write health
- storage uploads
- edge function execution
- CORS and callback config

### Payments Owner

Responsible for:

- order creation
- redirect correctness
- webhook verification
- boost activation
- payment support escalations

## Exit Criteria for Stable Release

Consider the release stable only when:

- no Sev1 events occur in first 24 hours
- no unresolved payment integrity issues remain
- no broken internal CTA routes remain
- sitemap and robots reflect production correctly
- all required icon assets resolve successfully
- auth callback configuration is verified on production domain

## Current Reality

If you deploy the current code as reviewed, monitoring will likely surface these issues quickly:

- homepage CTA 404s from `/create`
- sitemap mismatch using `.com`
- icon asset 404s
- payment success false positives under delayed or pending confirmations

That is why the current release recommendation remains:

**not safe to deploy**
