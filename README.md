# AndamanBazaar

AndamanBazaar is a hyper-local marketplace for the Andaman & Nicobar Islands. This repository uses Firebase and Google Cloud Platform as the primary backend stack.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Authentication: Firebase Authentication
- Database: Cloud Firestore
- File Storage: Firebase Storage
- Server-side logic: Firebase Cloud Functions
- Hosting: Firebase Hosting / App Hosting
- Payments: Cashfree (verified server-side via Cloud Functions)

## Backend Direction

New backend work should use Firebase/GCP services only:

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Functions (or GCP server runtimes) for privileged operations
- Firebase Security Rules using `request.auth.uid`

Security constraints are documented in `AGENTS.md`.

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create local env file

```bash
cp .env.example .env
```

3. Fill Firebase web config and Cloud Function URLs in `.env`.

4. Start dev server

```bash
npm run dev
```

5. Open `http://localhost:5173`.

## Required Frontend Env Keys

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

VITE_FIREBASE_CREATE_PAYMENT_FUNCTION=
VITE_FIREBASE_VERIFY_PAYMENT_FUNCTION=
VITE_FIREBASE_VERIFY_LOCATION_FUNCTION=
VITE_FIREBASE_MODERATE_CONTENT_FUNCTION=
VITE_FIREBASE_CREATE_INVOICE_FUNCTION=
VITE_FIREBASE_WEBHOOK_FUNCTION=
VITE_FIREBASE_HEALTH_FUNCTION=
VITE_FIREBASE_SECURE_SYNC_FUNCTION=
VITE_FIREBASE_AI_SUGGEST_FUNCTION=
```

Do not expose private credentials in frontend `VITE_` variables.
