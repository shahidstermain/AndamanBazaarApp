# Environment Variable Mapping - Phase 2

**Project**: AndamanBazaarApp (andamanbazaar.in)  
**Migration**: Supabase → Firebase Environment Variables  
**Date**: March 2026  
**Engineer**: Senior Backend Engineer

---

## Overview

This document maps all Supabase environment variables to their Firebase equivalents and identifies new variables needed for the Firebase migration.

---

## Current Supabase Environment Variables

### Frontend (VITE_*) Variables

| Supabase Variable | Firebase Equivalent | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `VITE_FIREBASE_API_KEY` + `VITE_FIREBASE_AUTH_DOMAIN` | Firebase uses separate config |
| `VITE_SUPABASE_ANON_KEY` | `VITE_FIREBASE_API_KEY` | Firebase uses API key for auth |
| `VITE_API_KEY` | **REMOVE** | Gemini key moves to Cloud Functions |
| `VITE_FIREBASE_API_KEY` | Keep | Already configured |
| `VITE_FIREBASE_AUTH_DOMAIN` | Keep | Already configured |
| `VITE_FIREBASE_PROJECT_ID` | Keep | Already configured |
| `VITE_FIREBASE_STORAGE_BUCKET` | Keep | Already configured |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Keep | Already configured |
| `VITE_FIREBASE_APP_ID` | Keep | Already configured |
| `VITE_FIREBASE_MEASUREMENT_ID` | Keep | Already configured |
| `VITE_RATE_LIMIT_WINDOW` | Keep | Used by security.ts |
| `VITE_RATE_LIMIT_MAX_REQUESTS` | Keep | Used by security.ts |
| `VITE_ENABLE_CSP` | Keep | Content Security Policy |
| `VITE_ENV` | Keep | Environment identifier |

### Backend/Edge Function Variables

| Supabase Variable | Firebase Equivalent | Notes |
|---|---|---|
| `SUPABASE_URL` | `FIREBASE_PROJECT_ID` | Project identifier |
| `SUPABASE_SERVICE_ROLE_KEY` | **REMOVE** | Firebase uses service account JSON |
| `CASHFREE_APP_ID` | Keep | Payment provider |
| `CASHFREE_SECRET_KEY` | Keep | Payment provider |
| `RESEND_API_KEY` | Keep | Email service |
| `GOOGLE_GENERATIVE_AI_API_KEY` | **MOVE TO CLOUD FUNCTIONS** | AI service |

---

## New Firebase Environment Variables

### Frontend (.env)

```bash
# Firebase Configuration (replace Supabase)
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id

# App Configuration (keep existing)
VITE_ENV=development|staging|production
VITE_ENABLE_CSP=true
VITE_RATE_LIMIT_WINDOW=900
VITE_RATE_LIMIT_MAX_REQUESTS=100

# REMOVED (moved to backend)
# VITE_API_KEY (Gemini) - MOVE TO CLOUD FUNCTIONS
# VITE_SUPABASE_URL - NO LONGER NEEDED
# VITE_SUPABASE_ANON_KEY - NO LONGER NEEDED
```

### Backend/Cloud Functions (.env)

```bash
# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Payment Configuration (keep existing)
CASHFREE_APP_ID=your-cashfree-app-id
CASHFREE_SECRET_KEY=your-cashfree-secret-key
CASHFREE_ENVIRONMENT=TEST|PRODUCTION

# Email Configuration (keep existing)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@andamanbazaar.in

# AI Configuration (moved from frontend)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Location Verification
IP_GEOLOCATION_API_KEY=your-ip-geo-api-key
GEOCODING_API_KEY=your-geocoding-api-key

# Security
JWT_SECRET=your-jwt-secret-for-tokens
WEBHOOK_SECRET_CASHFREE=your-webhook-secret

# External Services
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production
```

---

## Firebase Service Account Setup

### 1. Create Service Account

```bash
# In Firebase Console:
# 1. Go to Project Settings > Service Accounts
# 2. Click "Generate new private key"
# 3. Save the JSON file
# 4. Convert JSON to environment variables
```

### 2. Service Account JSON to Environment Variables

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-...@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

Converted to:
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## Migration Steps

### Phase 1: Add Firebase Variables

1. Update `.env.example` with Firebase configuration
2. Add Firebase Admin SDK variables to Cloud Functions
3. Remove Supabase variables from `.env.example`

### Phase 2: Update Code References

1. Update `src/lib/supabase.ts` → `src/lib/firebase.ts`
2. Update all imports from Supabase to Firebase
3. Update environment variable usage

### Phase 3: Cloud Function Environment

1. Set Firebase service account variables
2. Move Gemini API key to Cloud Functions
3. Configure webhook secrets

---

## Code Changes Required

### 1. Firebase Client Initialization

```typescript
// src/lib/firebase.ts (replace supabase.ts)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### 2. Cloud Function Initialization

```typescript
// functions/src/firebase.ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

export const db = getFirestore();
export const storage = getStorage();
```

### 3. Environment Variable Validation

```typescript
// src/lib/env.ts
export const env = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
  },
  app: {
    env: import.meta.env.VITE_ENV || 'development',
    enableCSP: import.meta.env.VITE_ENABLE_CSP === 'true',
    rateLimitWindow: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW || '900'),
    rateLimitMax: parseInt(import.meta.env.VITE_RATE_LIMIT_MAX_REQUESTS || '100')
  }
};

export const isFirebaseConfigured = () => {
  return env.firebase.apiKey && 
         env.firebase.projectId && 
         env.firebase.authDomain;
};
```

---

## Environment-Specific Configurations

### Development (.env.development)

```bash
# Firebase Development
VITE_FIREBASE_PROJECT_ID=andamanbazaar-dev
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=andamanbazaar-dev.firebaseapp.com

# Development Features
VITE_ENV=development
VITE_ENABLE_CSP=false
VITE_RATE_LIMIT_WINDOW=60
VITE_RATE_LIMIT_MAX_REQUESTS=1000
```

### Staging (.env.staging)

```bash
# Firebase Staging
VITE_FIREBASE_PROJECT_ID=andamanbazaar-staging
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=andamanbazaar-staging.firebaseapp.com

# Staging Features
VITE_ENV=staging
VITE_ENABLE_CSP=true
VITE_RATE_LIMIT_WINDOW=300
VITE_RATE_LIMIT_MAX_REQUESTS=200
```

### Production (.env.production)

```bash
# Firebase Production
VITE_FIREBASE_PROJECT_ID=andamanbazaar-prod
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=andamanbazaar-prod.firebaseapp.com

# Production Features
VITE_ENV=production
VITE_ENABLE_CSP=true
VITE_RATE_LIMIT_WINDOW=900
VITE_RATE_LIMIT_MAX_REQUESTS=100
```

---

## Cloud Functions Environment

### Local Development (.env)

```bash
# Firebase Admin (local)
FIREBASE_PROJECT_ID=andamanbazaar-dev
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@andamanbazaar-dev.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Payment (test)
CASHFREE_APP_ID=TEST123
CASHFREE_SECRET_KEY=TEST_SECRET
CASHFREE_ENVIRONMENT=TEST

# Email
RESEND_API_KEY=re_test_...
RESEND_FROM_EMAIL=noreply@andamanbazaar.in

# AI
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...

# Security
WEBHOOK_SECRET_CASHFREE=your-webhook-secret
```

### Production (Firebase Console)

Set these in Firebase Console > Functions > Configure:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `CASHFREE_APP_ID`
- `CASHFREE_SECRET_KEY`
- `CASHFREE_ENVIRONMENT=PRODUCTION`
- `RESEND_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `WEBHOOK_SECRET_CASHFREE`

---

## Migration Checklist

### Before Migration

- [ ] Create Firebase project
- [ ] Generate service account key
- [ ] Set up Authentication providers
- [ ] Configure Storage bucket
- [ ] Create Firestore database
- [ ] Set up environment variables locally

### During Migration

- [ ] Update `.env.example`
- [ ] Create `src/lib/firebase.ts`
- [ ] Update all imports
- [ ] Test Firebase connection
- [ ] Deploy Cloud Functions with env vars

### After Migration

- [ ] Remove Supabase variables
- [ ] Delete `src/lib/supabase.ts`
- [ ] Update documentation
- [ ] Test all features
- [ ] Monitor for errors

---

## Security Considerations

### Frontend Variables

- `VITE_FIREBASE_API_KEY`: Public, safe to expose
- `VITE_FIREBASE_AUTH_DOMAIN`: Public, safe to expose
- `VITE_FIREBASE_PROJECT_ID`: Public, safe to expose
- `VITE_FIREBASE_STORAGE_BUCKET`: Public, safe to expose

### Backend Variables (NEVER in frontend)

- `FIREBASE_PRIVATE_KEY`: Secret, server-only
- `CASHFREE_SECRET_KEY`: Secret, server-only
- `RESEND_API_KEY`: Secret, server-only
- `GOOGLE_GENERATIVE_AI_API_KEY`: Secret, server-only
- `WEBHOOK_SECRET_CASHFREE`: Secret, server-only

### Best Practices

1. Never commit `.env` files
2. Use different keys for each environment
3. Rotate keys regularly
4. Monitor for exposed keys
5. Use Firebase Emulator for local development

---

## Troubleshooting

### Common Issues

1. **"Firebase project not initialized"**
   - Check `VITE_FIREBASE_PROJECT_ID`
   - Verify Firebase project exists

2. **"Permission denied" errors**
   - Check service account permissions
   - Verify security rules

3. **"Invalid API key"**
   - Check Firebase API key
   - Verify key restrictions

4. **"Environment variable not found"**
   - Check `.env` file
   - Verify variable names

### Debug Commands

```bash
# Check environment variables
npm run build
grep -r "VITE_" dist/

# Test Firebase connection
npm run dev
# Check browser console for Firebase errors

# Test Cloud Functions
firebase functions:shell
# Test individual functions
```

---

**Environment Mapping Complete** ✅
