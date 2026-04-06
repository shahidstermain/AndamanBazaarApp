# Firestore Security Rules - Phase 2

**Project**: AndamanBazaarApp (andamanbazaar.in)  
**Migration**: Supabase RLS → Firestore Security Rules  
**Date**: March 2026  
**Engineer**: Senior Backend Engineer

---

## Overview

These Firestore Security Rules replace the Supabase Row Level Security (RLS) policies. They enforce the same security model while optimizing for Firestore's rule engine.

---

## Global Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isModerator() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['moderator', 'admin'];
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isActiveUser(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data.isActive == true;
    }
    
    function isNotBanned(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data.isBanned != true;
    }
    
    function canAccessListing(listingId) {
      return isAuthenticated() && 
             isOwner(get(/databases/$(database)/documents/listings/$(listingId).data.userId)) ||
             get(/databases/$(database)/documents/listings/$(listingId).data.isActive == true);
    }
    
    function isValidTimestamp(timestamp) {
      return timestamp is timestamp;
    }
    
    // Deny all by default
    match /{document=**} {
      allow read, write: if false;
    }
```

---

## 1. users Collection

```javascript
    // users collection
    match /users/{userId} {
      // Public read access to basic profile info
      allow read: if isAuthenticated() && 
                   isActiveUser(userId) && 
                   isNotBanned(userId) &&
                   (isOwner(userId) || isModerator());
      
      // Users can update their own profile (except role and ban status)
      allow update: if isOwner(userId) && 
                    isActiveUser(userId) && 
                    isNotBanned(userId) &&
                    request.resource.data.keys().hasAll(['name', 'phone', 'avatar', 'contactPreferences']) &&
                    request.resource.data.role == resource.data.role &&
                    request.resource.data.isBanned == resource.data.isBanned &&
                    request.resource.data.isActive == resource.data.isActive;
      
      // Only admins can create users (handled by auth triggers)
      allow create: if isAdmin();
      
      // Only admins can delete users (soft delete via isActive)
      allow delete: if false; // Use soft delete instead
      
      // No one can change role except admins
      // No one can change ban status except admins/moderators
    }
```

---

## 2. listings Collection

```javascript
    // listings collection
    match /listings/{listingId} {
      // Public read access for active listings
      allow read: if resource.data.isActive == true &&
                   resource.data.status in ['active', 'sold'] &&
                   resource.data.status != 'deleted';
      
      // Owners can read their own listings (including drafts)
      allow read: if isOwner(resource.data.userId);
      
      // Admins/moderators can read all listings
      allow read: if isModerator();
      
      // Users can create listings (must be active and not banned)
      allow create: if isAuthenticated() && 
                    isActiveUser(request.auth.uid) && 
                    isNotBanned(request.auth.uid) &&
                    isOwner(request.resource.data.userId) &&
                    request.resource.data.keys().hasAll([
                      'title', 'description', 'price', 'category', 'city', 
                      'status', 'userId', 'createdAt', 'updatedAt'
                    ]) &&
                    request.resource.data.status in ['draft', 'active'] &&
                    request.resource.data.userId == request.auth.uid &&
                    isValidTimestamp(request.resource.data.createdAt) &&
                    isValidTimestamp(request.resource.data.updatedAt);
      
      // Owners can update their listings
      allow update: if isOwner(resource.data.userId) && 
                    isActiveUser(resource.auth.uid) && 
                    isNotBanned(request.auth.uid) &&
                    // Cannot change ownership
                    request.resource.data.userId == resource.data.userId &&
                    // Cannot change to deleted status (use soft delete)
                    request.resource.data.status != 'deleted' &&
                    // Featured status can only be changed by admins
                    request.resource.data.isFeatured == resource.data.isFeatured &&
                    request.resource.data.featuredUntil == resource.data.featuredUntil;
      
      // Admins can update any listing
      allow update: if isModerator() &&
                    isValidTimestamp(request.resource.data.updatedAt);
      
      // No direct delete - use soft delete
      allow delete: if false;
    }
```

---

## 3. chats Collection

```javascript
    // chats collection
    match /chats/{chatId} {
      // Participants can read their chats
      allow read: if (isOwner(resource.data.buyerId) || 
                    isOwner(resource.data.sellerId)) &&
                    isActiveUser(resource.data.buyerId) &&
                    isActiveUser(resource.data.sellerId) &&
                    isNotBanned(resource.data.buyerId) &&
                    isNotBanned(resource.data.sellerId);
      
      // Admins/moderators can read all chats
      allow read: if isModerator();
      
      // Users can create chats (buyer initiates)
      allow create: if isAuthenticated() && 
                    isActiveUser(request.auth.uid) && 
                    isNotBanned(request.auth.uid) &&
                    isOwner(request.resource.data.buyerId) &&
                    // Verify listing exists and belongs to seller
                    get(/databases/$(database)/documents/listings/$(request.resource.data.listingId)).data.userId == request.resource.data.sellerId &&
                    get(/databases/$(database)/documents/listings/$(request.resource.data.listingId)).data.isActive == true &&
                    // Prevent duplicate chats
                    !exists(/databases/$(database)/documents/chats/$(chatId)) &&
                    request.resource.data.keys().hasAll([
                      'buyerId', 'sellerId', 'listingId', 'createdAt', 'updatedAt'
                    ]) &&
                    isValidTimestamp(request.resource.data.createdAt) &&
                    isValidTimestamp(request.resource.data.updatedAt);
      
      // Participants can update chat status (archive, read counts)
      allow update: if (isOwner(resource.data.buyerId) || 
                    isOwner(resource.data.sellerId)) &&
                    isActiveUser(resource.data.buyerId) &&
                    isActiveUser(resource.data.sellerId) &&
                    isNotBanned(resource.data.buyerId) &&
                    isNotBanned(resource.data.sellerId) &&
                    // Cannot change participants or listing
                    request.resource.data.buyerId == resource.data.buyerId &&
                    request.resource.data.sellerId == resource.data.sellerId &&
                    request.resource.data.listingId == resource.data.listingId &&
                    isValidTimestamp(request.resource.data.updatedAt);
      
      // No delete - use soft delete via isActive
      allow delete: if false;
    }
```

---

## 4. messages Subcollection

```javascript
      // messages subcollection of chats
      match /messages/{messageId} {
        // Chat participants can read messages
        allow read: if (isOwner(/databases/$(database)/documents/chats/$(chatId).data.buyerId) || 
                      isOwner(/databases/$(database)/documents/chats/$(chatId).data.sellerId)) &&
                      isActiveUser(/databases/$(database)/documents/chats/$(chatId).data.buyerId) &&
                      isActiveUser(/databases/$(database)/documents/chats/$(chatId).data.sellerId) &&
                      isNotBanned(/databases/$(database)/documents/chats/$(chatId).data.buyerId) &&
                      isNotBanned(/databases/$(database)/documents/chats/$(chatId).data.sellerId);
        
        // Admins/moderators can read all messages
        allow read: if isModerator();
        
        // Chat participants can create messages
        allow create: if isAuthenticated() && 
                      isActiveUser(request.auth.uid) && 
                      isNotBanned(request.auth.uid) &&
                      (isOwner(/databases/$(database)/documents/chats/$(chatId).data.buyerId) || 
                       isOwner(/databases/$(database)/documents/chats/$(chatId).data.sellerId)) &&
                      // Sender must be a participant
                      (request.resource.data.senderId == /databases/$(database)/documents/chats/$(chatId).data.buyerId ||
                       request.resource.data.senderId == /databases/$(database)/documents/chats/$(chatId).data.sellerId) &&
                      request.resource.data.senderId == request.auth.uid &&
                      request.resource.data.keys().hasAll([
                        'content', 'type', 'senderId', 'senderRole', 'createdAt'
                      ]) &&
                      isValidTimestamp(request.resource.data.createdAt);
        
        // Senders can update their own messages (edit, read status)
        allow update: if isOwner(resource.data.senderId) &&
                      isActiveUser(request.auth.uid) && 
                      isNotBanned(request.auth.uid) &&
                      // Cannot change sender or content type
                      request.resource.data.senderId == resource.data.senderId &&
                      request.resource.data.type == resource.data.type &&
                      isValidTimestamp(request.resource.data.updatedAt);
        
        // No delete - use soft delete
        allow delete: if false;
      }
```

---

## 5. favorites Collection

```javascript
    // favorites collection
    match /favorites/{favoriteId} {
      // Users can read their own favorites
      allow read: if isOwner(resource.data.userId) &&
                    isActiveUser(resource.auth.uid) && 
                    isNotBanned(request.auth.uid);
      
      // Listing owners can see who favorited their listings
      allow read: if isOwner(get(/databases/$(database)/documents/listings/$(resource.data.listingId)).data.userId) &&
                    isActiveUser(get(/databases/$(database)/documents/listings/$(resource.data.listingId)).data.userId) &&
                    isNotBanned(get(/databases/$(database)/documents/listings/$(resource.data.listingId)).data.userId);
      
      // Users can create favorites
      allow create: if isAuthenticated() && 
                    isActiveUser(request.auth.uid) && 
                    isNotBanned(request.auth.uid) &&
                    isOwner(request.resource.data.userId) &&
                    request.resource.data.userId == request.auth.uid &&
                    // Listing must exist and be active
                    get(/databases/$(database)/documents/listings/$(request.resource.data.listingId)).data.isActive == true &&
                    // Prevent duplicates
                    !exists(/databases/$(database)/documents/favorites/$(favoriteId)) &&
                    request.resource.data.keys().hasAll([
                      'userId', 'listingId', 'createdAt'
                    ]) &&
                    isValidTimestamp(request.resource.data.createdAt);
      
      // Users can delete their own favorites
      allow delete: if isOwner(resource.data.userId) &&
                    isActiveUser(request.auth.uid) && 
                    isNotBanned(request.auth.uid);
      
      // No updates - favorites are immutable
      allow update: if false;
    }
```

---

## 6. reports Collection

```javascript
    // reports collection
    match /reports/{reportId} {
      // Reporters can read their own reports
      allow read: if isOwner(resource.data.reporterId) &&
                    isActiveUser(request.auth.uid) && 
                    isNotBanned(request.auth.uid);
      
      // Admins/moderators can read all reports
      allow read: if isModerator();
      
      // Users can create reports
      allow create: if isAuthenticated() && 
                    isActiveUser(request.auth.uid) && 
                    isNotBanned(request.auth.uid) &&
                    isOwner(request.resource.data.reporterId) &&
                    request.resource.data.reporterId == request.auth.uid &&
                    request.resource.data.keys().hasAll([
                      'type', 'targetId', 'reason', 'description', 'reporterId', 'createdAt'
                    ]) &&
                    request.resource.data.type in ['listing', 'user', 'message'] &&
                    isValidTimestamp(request.resource.data.createdAt);
      
      // Admins/moderators can update reports
      allow update: if isModerator() &&
                    isValidTimestamp(request.resource.data.updatedAt);
      
      // No delete - reports are permanent
      allow delete: if false;
    }
```

---

## 7. Payment Collections

### 7.1 listingBoosts

```javascript
    // listingBoosts collection
    match /listingBoosts/{boostId} {
      // Users can read their own boosts
      allow read: if isOwner(resource.data.userId) &&
                    isActiveUser(request.auth.uid) && 
                    isNotBanned(request.auth.uid);
      
      // Listing owners can see boosts on their listings
      allow read: if isOwner(get(/databases/$(database)/documents/listings/$(resource.data.listingId)).data.userId) &&
                    isActiveUser(get(/databases/$(database)/documents/listings/$(resource.data.listingId)).data.userId) &&
                    isNotBanned(get(/databases/$(database)/documents/listings/$(resource.data.listingId)).data.userId);
      
      // Admins can read all boosts
      allow read: if isAdmin();
      
      // Only Cloud Functions can create boosts (server-side)
      allow create: if false; // Created by Cloud Functions only
      
      // Only Cloud Functions can update boosts (payment status)
      allow update: if false; // Updated by Cloud Functions only
      
      // No delete - boosts are permanent
      allow delete: if false;
    }
```

### 7.2 invoices

```javascript
    // invoices collection
    match /invoices/{invoiceId} {
      // Users can read their own invoices
      allow read: if isOwner(resource.data.userId) &&
                    isActiveUser(request.auth.uid) && 
                    isNotBanned(request.auth.uid);
      
      // Admins can read all invoices
      allow read: if isAdmin();
      
      // Only Cloud Functions can create invoices
      allow create: if false;
      
      // Only Cloud Functions can update invoices
      allow update: if false;
      
      // No delete - invoices are permanent
      allow delete: if false;
    }
```

### 7.3 paymentAuditLog

```javascript
    // paymentAuditLog collection
    match /paymentAuditLog/{logId} {
      // Only admins can read payment audit logs
      allow read: if isAdmin();
      
      // Only Cloud Functions can create audit logs
      allow create: if false;
      
      // No updates or deletes - audit logs are immutable
      allow update, delete: if false;
    }
```

---

## 8. Analytics Collections

### 8.1 auditLogs

```javascript
    // auditLogs collection
    match /auditLogs/{logId} {
      // Users can read their own audit logs
      allow read: if isOwner(resource.data.userId) &&
                    isActiveUser(request.auth.uid) && 
                    isNotBanned(request.auth.uid);
      
      // Admins can read all audit logs
      allow read: if isAdmin();
      
      // Only Cloud Functions can create audit logs
      allow create: if false;
      
      // No updates or deletes - audit logs are immutable
      allow update, delete: if false;
    }
```

### 8.2 securityEvents

```javascript
    // securityEvents collection
    match /securityEvents/{eventId} {
      // Only admins can read security events
      allow read: if isAdmin();
      
      // Only Cloud Functions can create security events
      allow create: if false;
      
      // Admins can resolve events
      allow update: if isAdmin() &&
                    request.resource.data.resolved == true &&
                    request.resource.data.resolvedBy == request.auth.uid &&
                    isValidTimestamp(request.resource.data.resolvedAt);
      
      // No delete - security events are permanent
      allow delete: if false;
    }
```

### 8.3 listingViews

```javascript
    // listingViews collection
    match /listingViews/{viewId} {
      // Anyone can increment view count (via Cloud Function)
      allow read: if false; // Not directly readable
      
      // Only Cloud Functions can create/update view records
      allow create, update: if false;
    }
```

---

## 9. Supporting Collections

### 9.1 rateLimits

```javascript
    // rateLimits collection
    match /rateLimits/{limitId} {
      // No direct access - managed by Cloud Functions
      allow read, write: if false;
    }
```

### 9.2 categories

```javascript
    // categories collection
    match /categories/{categoryId} {
      // Public read access to active categories
      allow read: if resource.data.isActive == true;
      
      // Admins can read all categories
      allow read: if isAdmin();
      
      // Only admins can create/update categories
      allow create, update: if isAdmin();
      
      // No delete - deactivate instead
      allow delete: if false;
    }
```

### 9.3 appConfig

```javascript
    // appConfig collection
    match /appConfig/{configId} {
      // Only admins can access app config
      allow read, write: if isAdmin();
    }
```

### 9.4 recommendations & trending

```javascript
    // recommendations collection
    match /recommendations/{recId} {
      // Users can read their own recommendations
      allow read: if isOwner(resource.data.userId) &&
                    isActiveUser(request.auth.uid) && 
                    isNotBanned(request.auth.uid) &&
                    resource.data.expiresAt > timestamp.now();
      
      // Only Cloud Functions can create/update recommendations
      allow create, update: if false;
      
      // No delete - let them expire
      allow delete: if false;
    }
    
    // trending collection
    match /trending/{trendingId} {
      // Public read access to trending data
      allow read: if resource.data.date == timestamp.now().formatDate('yyyy-MM-dd');
      
      // Only Cloud Functions can create/update trending data
      allow create, update: if false;
      
      // No delete - keep historical data
      allow delete: if false;
    }
```

---

## 10. Storage Security Rules

```javascript
// Firebase Storage Security Rules
service firebase.storage {
  match /b/{bucket}/o {
    // User avatars
    match /avatars/{userId}/{allPaths=**} {
      // Public read access to avatars
      allow read: if true;
      
      // Users can upload to their own avatar folder
      allow write: if isAuthenticated() && 
                    request.auth.uid == userId &&
                    resource.size < 5 * 1024 * 1024 && // 5MB limit
                    resource.contentType.matches('image/.*');
    }
    
    // Listing images
    match /listing-images/{listingId}/{allPaths=**} {
      // Public read access to listing images
      allow read: if true;
      
      // Listing owners can upload images
      allow write: if isAuthenticated() &&
                    get(/databases/$(database)/documents/listings/$(listingId)).data.userId == request.auth.uid &&
                    resource.size < 10 * 1024 * 1024 && // 10MB limit
                    resource.contentType.matches('image/.*');
    }
    
    // Invoice PDFs
    match /invoices/{invoiceId}/{allPaths=**} {
      // Users can read their own invoices
      allow read: if isAuthenticated() &&
                    get(/databases/$(database)/documents/invoices/$(invoiceId)).data.userId == request.auth.uid;
      
      // Admins can read all invoices
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Only Cloud Functions can upload invoices
      allow write: if false; // Created by Cloud Functions only
    }
  }
}
```

---

## 11. Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "listings",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "category",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "city",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "listings",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isFeatured",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "featuredUntil",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "chats",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "buyerId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "lastMessageAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "chats",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "sellerId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "lastMessageAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isRead",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "favorites",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "listingViews",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "listingId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "date",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "viewCount",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## Security Rule Testing

### Test Cases to Implement

1. **User Authentication**
   - Unauthenticated users cannot access protected data
   - Banned users cannot access any features
   - Inactive users cannot create content

2. **Ownership Verification**
   - Users can only modify their own listings
   - Chat participants can only access their chats
   - Users can only manage their own favorites

3. **Role-Based Access**
   - Admins can access all data
   - Moderators can moderate listings and reports
   - Regular users have limited access

4. **Data Integrity**
   - Critical fields cannot be modified by users
   - Soft-delete is enforced
   - Timestamps are validated

5. **Payment Security**
   - Payment operations are server-side only
   - Audit logs are immutable
   - Financial data is protected

---

## Migration Notes

### Differences from Supabase RLS

1. **No DELETE Operations**: All deletes are soft deletes
2. **Server-Side Creation**: Payment and audit documents are server-only
3. **Explicit Ownership**: All write operations verify ownership
4. **Timestamp Validation**: All timestamps are validated
5. **Composite Indexes**: Required for complex queries

### Performance Considerations

1. **Denormalization**: User stats and listing snapshots are duplicated
2. **Subcollections**: Messages and typing events are nested
3. **Composite Queries**: Indexes are optimized for common query patterns
4. **Security Rule Caching**: Rules are optimized for cache efficiency

---

## Next Steps

1. Deploy security rules to Firebase project
2. Create Firestore indexes
3. Test all security rule scenarios
4. Begin Phase 3: Firebase Auth Migration

**Security Rules Complete** ✅
