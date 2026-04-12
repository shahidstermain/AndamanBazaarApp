# Cashfree Environment Setup Guide

## Overview

This guide covers the complete setup of Cashfree payment integration for AndamanBazaar using Firebase Cloud Functions. The setup includes Cashfree account configuration, Firebase Functions environment setup, and security considerations.

## Prerequisites

- Firebase project with Cloud Functions enabled
- Cashfree merchant account (sandbox or production)
- Node.js 18+ for local development
- Firebase CLI installed

## Cashfree Account Setup

### 1. Create Cashfree Account

1. Sign up at [Cashfree Dashboard](https://dashboard.cashfree.com)
2. Complete KYC verification
3. Choose your plan (sandbox is free for testing)

### 2. Get API Credentials

From Cashfree Dashboard → Settings → API Keys:

```bash
# Sandbox Environment
CASHFREE_SANDBOX_APP_ID=your_sandbox_app_id
CASHFREE_SANDBOX_SECRET_KEY=your_sandbox_secret_key

# Production Environment (after KYC)
CASHFREE_PRODUCTION_APP_ID=your_production_app_id
CASHFREE_PRODUCTION_SECRET_KEY=your_production_secret_key
```

### 3. Configure Webhooks

1. Go to Cashfree Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-region-project.cloudfunctions.net/cashfreeWebhook`
3. Set webhook events:
   - Order Paid
   - Order Failed
   - Order Cancelled
   - Order Expired
4. Generate webhook signature secret
5. Test webhook configuration

## Firebase Functions Setup

### 1. Install Dependencies

```bash
cd functions
npm install firebase-admin firebase-functions cashfree-pg
npm install --save-dev @types/node
```

### 2. Update package.json

```json
{
  "name": "andaman-bazaar-functions",
  "version": "1.0.0",
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "dependencies": {
    "firebase-admin": "^11.0.0",
    "firebase-functions": "^4.0.0",
    "cashfree-pg": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^4.9.0"
  }
}
```

### 3. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2017"
  },
  "compileOnSave": true,
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

### 4. Set Environment Variables

#### Method 1: Firebase CLI (Recommended)

```bash
# Sandbox Environment
firebase functions:config:set cashfree.env="sandbox"
firebase functions:config:set cashfree.app_id="your_sandbox_app_id"
firebase functions:config:set cashfree.secret_key="your_sandbox_secret_key"
firebase functions:config:set cashfree.webhook_secret="your_webhook_secret"

# Production Environment
firebase functions:config:set cashfree.env="production"
firebase functions:config:set cashfree.app_id="your_production_app_id"
firebase functions:config:set cashfree.secret_key="your_production_secret_key"
firebase functions:config:set cashfree.webhook_secret="your_webhook_secret"

# App URLs
firebase functions:config:set app.frontend_url="https://your-app.com"
firebase functions:config:set app.functions_url="https://your-region-project.cloudfunctions.net"
```

#### Method 2: Secret Manager (More Secure)

```bash
# Create secrets
firebase functions:secrets:set CASHFREE_APP_ID
firebase functions:secrets:set CASHFREE_SECRET_KEY
firebase functions:secrets:set CASHFREE_WEBHOOK_SECRET

# Grant access to secrets
gcloud secrets add-iam-policy-binding CASHFREE_APP_ID \
  --member="serviceAccount:your-project@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### Method 3: Environment File (Development Only)

```bash
# .env (functions directory)
CASHFREE_ENV=sandbox
CASHFREE_APP_ID=your_sandbox_app_id
CASHFREE_SECRET_KEY=your_sandbox_secret_key
CASHFREE_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=http://localhost:3000
FUNCTIONS_URL=http://localhost:5001/your-project/us-central1
```

## Firebase Functions Configuration

### 1. Update functions/src/index.ts

```typescript
import * as functions from "firebase-functions";
import {
  createOrder,
  cleanupExpiredReservations,
} from "./payments/createOrder";
import {
  cashfreeWebhook,
  webhookHealthCheck,
} from "./payments/cashfreeWebhook";
import {
  checkPaymentStatus,
  getPaymentHistory,
  getPaymentDetails,
} from "./payments/checkPaymentStatus";

// Export payment functions
exports.createOrder = createOrder;
exports.checkPaymentStatus = checkPaymentStatus;
exports.getPaymentHistory = getPaymentHistory;
exports.getPaymentDetails = getPaymentDetails;
exports.cashfreeWebhook = cashfreeWebhook;
exports.webhookHealthCheck = webhookHealthCheck;
exports.cleanupExpiredReservations = cleanupExpiredReservations;

// Scheduled tasks
exports.scheduledCleanup = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(cleanupExpiredReservations);
```

### 2. Configure Firebase Functions

```json
// firebase.json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18",
    "memory": "512MB",
    "maxInstances": 100,
    "timeout": "60s",
    "environment": {
      "CASHFREE_ENV": "${CASHFREE_ENV}",
      "CASHFREE_APP_ID": "${CASHFREE_APP_ID}",
      "CASHFREE_SECRET_KEY": "${CASHFREE_SECRET_KEY}",
      "CASHFREE_WEBHOOK_SECRET": "${CASHFREE_WEBHOOK_SECRET}",
      "FRONTEND_URL": "${FRONTEND_URL}",
      "FUNCTIONS_URL": "${FUNCTIONS_URL}"
    }
  }
}
```

## Security Configuration

### 1. Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Payments collection - only authenticated users can read/write their own
    match /payments/{orderId} {
      allow read, write: if request.auth != null &&
        (resource.data.buyerId == request.auth.uid ||
         resource.data.sellerId == request.auth.uid);
    }

    // Payment events - read-only for authenticated users
    match /paymentEvents/{eventId} {
      allow read: if request.auth != null;
      allow write: if false; // Only functions can write
    }

    // Purchases collection - buyer and seller access
    match /purchases/{purchaseId} {
      allow read: if request.auth != null &&
        (resource.data.buyerId == request.auth.uid ||
         resource.data.sellerId == request.auth.uid);
      allow write: if false; // Only functions can write
    }

    // Listings - update permissions for payment status
    match /listings/{listingId} {
      allow read: if true;
      allow write: if request.auth != null &&
        (resource.data.userId == request.auth.uid ||
         request.auth.token.admin == true);
    }
  }
}
```

### 2. CORS Configuration

```typescript
// functions/src/utils/cors.ts
import * as cors from "cors";

const corsHandler = cors({
  origin: ["https://your-app.com", "https://your-app.firebaseapp.com"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export { corsHandler };
```

## Testing Setup

### 1. Local Development

```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, test functions
firebase functions:shell
```

### 2. Environment Variables for Testing

```bash
# .env.test
CASHFREE_ENV=sandbox
CASHFREE_APP_ID=test_app_id
CASHFREE_SECRET_KEY=test_secret_key
CASHFREE_WEBHOOK_SECRET=test_webhook_secret
FRONTEND_URL=http://localhost:3000
FUNCTIONS_URL=http://localhost:5001/your-project/us-central1
```

### 3. Test Scripts

```javascript
// test/payment.test.js
const testFunctions = require("firebase-functions-test")();
const admin = require("firebase-admin");
const { createOrder } = require("../lib/payments/createOrder");

// Mock Firebase Auth
const mockAuth = {
  uid: "test-user-123",
  token: {
    email: "test@example.com",
  },
};

// Test order creation
const testCreateOrder = async () => {
  const data = {
    listingId: "test-listing-123",
    customerEmail: "test@example.com",
    customerPhone: "+919876543210",
  };

  const wrapped = testFunctions.wrap(createOrder);
  const result = await wrapped(data, { auth: mockAuth });

  console.log("Order created:", result);
};
```

## Deployment

### 1. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific functions
firebase deploy --only functions:createOrder,functions:cashfreeWebhook,functions:checkPaymentStatus
```

### 2. Verify Deployment

```bash
# Check function logs
firebase functions:log

# Test webhook endpoint
curl https://your-region-project.cloudfunctions.net/webhookHealthCheck
```

### 3. Update Cashfree Webhook URL

1. Go to Cashfree Dashboard → Settings → Webhooks
2. Update webhook URL to deployed function URL
3. Test webhook with Cashfree's test tool

## Monitoring and Debugging

### 1. Logging

```typescript
// Add structured logging
import { logger } from "firebase-functions/v2";

logger.info("Payment order created", {
  orderId,
  buyerId,
  amount,
  timestamp: new Date().toISOString(),
});
```

### 2. Error Tracking

```typescript
// Error reporting
import { reportError } from "firebase-functions/v2";

try {
  // Payment logic
} catch (error) {
  reportError(error, { context: "payment-processing" });
  throw error;
}
```

### 3. Performance Monitoring

```typescript
// Performance traces
import { trace } from "firebase-functions/v2/performance";

const paymentTrace = trace("payment-processing");
paymentTrace.start();
// ... payment logic
paymentTrace.stop();
```

## Production Checklist

### Security

- [ ] All secrets stored in Secret Manager or Firebase Config
- [ ] Webhook signature verification enabled
- [ ] CORS properly configured
- [ ] Firestore security rules deployed
- [ ] HTTPS only (automatic with Functions)

### Configuration

- [ ] Production Cashfree credentials set
- [ ] Frontend URL configured
- [ ] Functions URL configured
- [ ] Webhook URL updated in Cashfree
- [ ] Environment variables verified

### Testing

- [ ] Sandbox testing completed
- [ ] Webhook testing successful
- [ ] Error handling verified
- [ ] Load testing performed
- [ ] Security testing completed

### Monitoring

- [ ] Logging configured
- [ ] Error tracking enabled
- [ ] Performance monitoring setup
- [ ] Alert rules configured
- [ ] Health check endpoint working

## Troubleshooting

### Common Issues

1. **Webhook Not Received**
   - Check webhook URL in Cashfree dashboard
   - Verify function is deployed and accessible
   - Check CORS configuration

2. **Signature Verification Failed**
   - Verify webhook secret matches Cashfree configuration
   - Check signature generation logic
   - Ensure payload is not modified

3. **Order Creation Fails**
   - Verify Cashfree credentials
   - Check Firebase Auth configuration
   - Validate input data format

4. **Environment Variables Not Available**
   - Check Firebase Functions config
   - Verify deployment with environment variables
   - Check function runtime logs

### Debug Commands

```bash
# Check function logs
firebase functions:log --only createOrder

# Check configuration
firebase functions:config:get

# Test function locally
firebase emulators:start --only functions

# Deploy with debug
firebase deploy --only functions --debug
```

### Support

- Firebase Functions Documentation
- Cashfree API Documentation
- Firebase Support
- Cashfree Merchant Support

## Maintenance

### Regular Tasks

1. **Monitor payment success rates**
2. **Review webhook delivery logs**
3. **Update Cashfree credentials if rotated**
4. **Backup Firestore payment data**
5. **Review security rules**

### Updates

1. **Keep dependencies updated**
2. **Monitor Cashfree API changes**
3. **Update Firebase Functions runtime**
4. **Review and update security rules**
5. **Test new features in sandbox**

---

## Quick Reference

### Environment Variables

```bash
CASHFREE_ENV=sandbox|production
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret_key
CASHFREE_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=https://your-app.com
FUNCTIONS_URL=https://your-region-project.cloudfunctions.net
```

### Key URLs

- Cashfree Dashboard: https://dashboard.cashfree.com
- Firebase Console: https://console.firebase.google.com
- Functions URL: https://your-region-project.cloudfunctions.net
- Webhook URL: https://your-region-project.cloudfunctions.net/cashfreeWebhook

### Important Commands

```bash
# Set config
firebase functions:config:set cashfree.env="sandbox"

# Deploy
firebase deploy --only functions

# Logs
firebase functions:log

# Emulate
firebase emulators:start
```

### Security Notes

- Never expose secret keys in frontend code
- Always verify webhook signatures
- Use HTTPS for all communications
- Implement proper authentication
- Regular security audits recommended
