# AndamanBazaar Deployment Runbook (Firebase Edition)

## Quick Reference

**Repository**: shahidster1711/AndamanBazaarApp
**Primary Domain**: andamanbazaar.in
**Staging Domain**: staging.andamanbazaar.in
**Hosting**: Firebase Hosting (primary)
**Backend**: Firebase (Auth, Firestore, Storage, Functions)

---

## Architecture Overview

### Application Type

- **Frontend**: Vite + React SPA (Single Page Application)
- **Build Output**: Static files in `dist/` directory
- **Backend**: Firebase (Native integration - auth, database, storage, functions)
- **Runtime**: Node.js 18+ for Cloud Functions

### Hosting Strategy

| Component | Platform                     | Purpose                               |
| --------- | ---------------------------- | ------------------------------------- |
| Frontend  | Firebase Hosting             | Global CDN, SSL, SPA routing          |
| Database  | Cloud Firestore              | NoSQL document database               |
| Auth      | Firebase Auth                | User identity & session management    |
| Storage   | Cloud Storage for Firebase   | Image & file hosting                  |
| Functions | Cloud Functions for Firebase | Serverless business logic             |
| Payments  | Cashfree                     | Payment gateway (via Cloud Functions) |

---

## Pre-Deployment Checklist

### Environment Setup

#### 1. Configure GitHub Secrets

Navigate to Settings > Secrets and variables > Actions, add:

**Firebase Configuration:**

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT=<JSON service account key>
```

**Application Secrets (Build-time):**

```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

#### 2. Firebase CLI Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Use project
firebase use your-project-id
```

#### 3. Domain Configuration

In Firebase Console:

1. Go to Hosting > Custom domains
2. Add `andamanbazaar.in`
3. Add `www.andamanbazaar.in` (redirect to apex)
4. Add `staging.andamanbazaar.in`
5. Follow DNS verification steps

---

## Deployment Workflows

### Standard Deployment (Git Push)

```
main branch push → Production deploy
staging branch push → Staging deploy
```

### Manual Deployment

```bash
# Deploy to Firebase (Hosting + Functions)
npm run build
firebase deploy
```

### Local Build & Deploy

```bash
# Build for production
npm ci
npm run build

# Deploy to Firebase manually
firebase deploy --only hosting,functions
```

---

## Build Process

### Step-by-Step

1. **Install Dependencies**

   ```bash
   npm ci
   ```

2. **Run Quality Checks**

   ```bash
   npm run lint          # ESLint
   npx tsc --noEmit      # TypeScript
   npm run test:unit     # Unit tests
   ```

3. **Build Application**
   ```bash
   npm run build
   ```

---

## Health Checks

### Endpoint

```
GET /health.json
```

### Response

```json
{
  "status": "healthy",
  "version": "abc123",
  "timestamp": "2026-03-16T10:00:00Z",
  "environment": "production"
}
```

---

## Post-Deployment Verification

### Manual Smoke Tests

After each production deployment:

1. **Verify Home Page**: https://andamanbazaar.in loads successfully.
2. **Verify Auth**: Login and logout flows work correctly.
3. **Verify Listings**: Create a test listing and verify it appears.
4. **Verify Images**: Upload an image and verify it displays.
5. **Verify Payments**: Test a small transaction in sandbox mode if applicable.

---

## Troubleshooting

### Build Failures

**TypeScript errors:**

```bash
npx tsc --noEmit
# Fix all type errors before deploying
```

**ESLint errors:**

```bash
npm run lint -- --fix
```

### Runtime Issues

**Blank page after deployment:**

- Check browser console for errors.
- Verify environment variables are correctly baked into the build.
- Confirm Firebase configuration in `src/lib/firebase.ts`.

**Function errors:**

- Check Firebase console logs for Cloud Functions.
- Verify environment variables for functions are set via `firebase functions:secrets:set`.

---

## Emergency Procedures

### Quick Rollback

```bash
# Rollback via Firebase CLI
firebase hosting:rollback
```

---

## Document History

- **Created**: March 12, 2026
- **Updated**: March 16, 2026 (Migrated to Firebase)
- **Version**: 2.0
