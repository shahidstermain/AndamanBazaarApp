# Production Deployment Configuration

## Target Architecture

- **Type**: Static SPA (Single Page Application)
- **Build Output**: `dist/` folder with static files
- **Runtime**: None required (Firebase Hosting / Nginx / CDN)
- **Backend**: Supabase (external service)

## Hosting Options

### Option 1: Firebase Hosting (Recommended)

- Global CDN with edge caching
- Automatic SSL certificates
- SPA routing support
- Atomic deployments
- Built-in CI/CD integration

### Option 2: Docker + Nginx (Alternative)

- Self-hosted or cloud VM
- Full control over configuration
- Easy local testing
- Portable across providers

### Option 3: Static CDN (AWS S3, Cloudflare, etc.)

- Maximum performance
- Cost-effective for high traffic
- Requires separate CI/CD setup

## Build Process

```bash
# 1. Install dependencies
npm ci

# 2. Run all tests
npm run test:unit
npm run test:integration
npm run test:security
npm run test:accessibility

# 3. Build production bundle
npm run build

# 4. Verify build output
ls -la dist/

# 5. Deploy (Firebase)
npm run firebase-deploy

# OR deploy (Docker)
docker-compose up --build -d
```

## Environment Files Required

### Staging (.env.staging)

```
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_SUPABASE_PROJECT_ID=xxx
VITE_CASHFREE_ENV=sandbox
VITE_GOOGLE_GENERATIVE_AI_API_KEY=xxx
```

### Production (.env.production)

```
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_SUPABASE_PROJECT_ID=xxx
VITE_CASHFREE_ENV=production
VITE_GOOGLE_GENERATIVE_AI_API_KEY=xxx
```

## Domain Configuration

- **Production**: andamanbazaar.in, www.andamanbazaar.in
- **Staging**: staging.andamanbazaar.in
- **Health Check**: /health.json (static file)

## Pre-deployment Checklist

- [ ] All environment variables configured in GitHub Secrets
- [ ] Firebase project connected (or alternative hosting ready)
- [ ] DNS records configured
- [ ] SSL certificates ready (automatic with Firebase)
- [ ] Staging deployment tested
- [ ] Database migrations applied to production
- [ ] Edge functions deployed to production Supabase project
