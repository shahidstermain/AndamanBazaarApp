# Backend Usage Map (Firebase Edition)

This document maps how the frontend interacts with the Firebase backend services.

## 🎯 Primary Backend: Firebase

### **Database (Cloud Firestore)** ✅ **ACTIVE**

**Path**: `src/lib/database.ts`
Firestore is the primary database for application data.

| Feature   | Operation     | Method                                       |
| --------- | ------------- | -------------------------------------------- |
| Listings  | Create        | `createListing(data)`                        |
| Listings  | Update        | `updateListing(id, data)`                    |
| Listings  | Read (Single) | `getListing(id)`                             |
| Listings  | Read (List)   | `getListings(options)`                       |
| Listings  | Real-time     | `subscribeToListing(id, cb)`                 |
| Chats     | List          | `getUserChats(userId)`                       |
| Chats     | Real-time     | `subscribeToUserChats(userId, cb)`           |
| Favorites | Toggle        | Handled via Firestore `favorites` collection |

### **Authentication (Firebase Auth)** ✅ **ACTIVE**

**Path**: `src/lib/auth.ts`
Firebase Auth handles user identity and session management.

| Feature     | Method                          |
| ----------- | ------------------------------- |
| Login       | `signIn(email, password)`       |
| Signup      | `signUp(email, password, name)` |
| Logout      | `logout()`                      |
| Get User    | `getCurrentUser()`              |
| Get User ID | `getCurrentUserId()`            |
| Auth State  | `onAuthStateChanged(cb)`        |

### **Storage (Cloud Storage for Firebase)** ✅ **ACTIVE**

**Path**: `src/lib/storage.ts`
Storage for images and other file assets.

| Feature               | Method                                  |
| --------------------- | --------------------------------------- |
| Upload Image          | `uploadFile(file, path)`                |
| Upload Listing Images | `uploadListingImages(files, listingId)` |
| Delete File           | `deleteFile(path)`                      |
| Delete Listing Images | `deleteListingImages(listingId)`        |

### **Functions (Cloud Functions for Firebase)** ✅ **ACTIVE**

**Path**: `src/lib/functions.ts`
Serverless functions for business logic and third-party integrations.

| Feature      | Function Name     |
| ------------ | ----------------- |
| Payment      | `createPayment`   |
| Payment      | `verifyPayment`   |
| Verification | `verifyLocation`  |
| Moderation   | `moderateContent` |
| Invoices     | `createInvoice`   |

---

## 🏗️ Architecture Summary

The application's core frontend backend flows now use Firebase through the abstraction layer in `src/lib/`. Firebase is the active runtime backend for all features listed above.

- **Client-Side**: React with TypeScript
- **Primary Database**: Cloud Firestore
- **Primary Authentication**: Firebase Auth
- **Primary Storage**: Cloud Storage for Firebase
- **Primary Compute**: Cloud Functions for Firebase
- **Hosting**: Firebase App Hosting

---

## 🗑️ Legacy / Transitional (Supabase)

Supabase is no longer the primary application backend. However, some repository-level Supabase references (e.g. environment samples, CI workflow mock values, legacy test scaffolding) may still exist while migration cleanup is in progress. Treat Firebase as the active runtime and verify any remaining `VITE_SUPABASE_*` configuration before removing it from operational environments.
