# Backend Usage Map (Firebase Edition)

This document maps how the frontend interacts with the Firebase backend services.

## 🎯 Primary Backend: Firebase

### **Database (Cloud Firestore)** ✅ **ACTIVE**
**Path**: `src/lib/database.ts`
Firestore is the primary database for application data.

| Feature | Operation | Method |
|---------|-----------|--------|
| Listings | Create | `createListing(data)` |
| Listings | Update | `updateListing(id, data)` |
| Listings | Read (Single) | `getListing(id)` |
| Listings | Read (List) | `getListings(options)` |
| Listings | Real-time | `subscribeToListing(id, cb)` |
| Chats | List | `getUserChats(userId)` |
| Chats | Real-time | `subscribeToUserChats(userId, cb)` |
| Favorites | Toggle | Handled via Firestore `favorites` collection |

### **Authentication (Firebase Auth)** ✅ **ACTIVE**
**Path**: `src/lib/auth.ts`
Firebase Auth handles user identity and session management.

| Feature | Method |
|---------|--------|
| Login | `signIn(email, password)` |
| Signup | `signUp(email, password, name)` |
| Logout | `logout()` |
| Get User | `getCurrentUser()` |
| Get User ID | `getCurrentUserId()` |
| Auth State | `onAuthStateChanged(cb)` |

### **Storage (Cloud Storage for Firebase)** ✅ **ACTIVE**
**Path**: `src/lib/storage.ts`
Storage for images and other file assets.

| Feature | Method |
|---------|--------|
| Upload Image | `uploadFile(file, path)` |
| Upload Listing Images | `uploadListingImages(files, listingId)` |
| Delete File | `deleteFile(path)` |
| Delete Listing Images | `deleteListingImages(listingId)` |

### **Functions (Cloud Functions for Firebase)** ✅ **ACTIVE**
**Path**: `src/lib/functions.ts`
Serverless functions for business logic and third-party integrations.

| Feature | Function Name |
|---------|---------------|
| Payment | `createPayment` |
| Payment | `verifyPayment` |
| Verification | `verifyLocation` |
| Moderation | `moderateContent` |
| Invoices | `createInvoice` |

---

## 🏗️ Architecture Summary

The application has been successfully migrated from Supabase to Firebase. All core functionality now utilizes Firebase services through the abstraction layer in `src/lib/`.

- **Client-Side**: React with TypeScript
- **Database**: Cloud Firestore
- **Authentication**: Firebase Auth
- **Storage**: Cloud Storage for Firebase
- **Compute**: Cloud Functions for Firebase
- **Hosting**: Firebase App Hosting

---

## 🗑️ Legacy (Supabase)

Supabase has been completely removed from the application. No `@supabase/supabase-js` dependencies remain in the codebase.
