# Firestore Schema Design - Phase 2

**Project**: AndamanBazaarApp (andamanbazaar.in)  
**Migration**: Supabase PostgreSQL → Firestore  
**Date**: March 2026  
**Engineer**: Senior Backend Engineer

---

## Overview

This document defines the Firestore database schema that will replace the Supabase PostgreSQL schema. The design preserves all existing functionality while optimizing for Firestore's NoSQL architecture and scalability.

---

## Design Principles

1. **Denormalization for Performance**: Duplicate data where read performance is critical
2. **Hierarchical Data**: Use subcollections for one-to-many relationships
3. **Composite Documents**: Group related data to minimize reads
4. **Index Optimization**: Design queries first, then create indexes
5. **Security Rule Compatibility**: Structure data to work with efficient security rules

---

## Core Collections

### 1. users

Replaces: `profiles`, `user_roles` tables

```typescript
interface UserDocument {
  // Core profile fields
  id: string; // Firebase Auth UID
  email: string;
  phone?: string;
  name: string;
  avatar?: string; // Firebase Storage URL

  // Location verification
  locationVerified: boolean;
  locationVerifiedAt?: Timestamp;
  lastVerificationLat?: number;
  lastVerificationLng?: number;
  verificationIp?: string;
  verificationAttempts: number;
  verificationBlockedUntil?: Timestamp;

  // User preferences
  contactPreferences: {
    whatsapp: boolean;
    phone: boolean;
    chat: boolean;
  };

  // Role and permissions
  role: "user" | "moderator" | "admin";
  isActive: boolean;
  isBanned: boolean;
  bannedUntil?: Timestamp;
  banReason?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt: Timestamp;

  // Stats (denormalized for performance)
  stats: {
    listingCount: number;
    soldCount: number;
    favoriteCount: number;
    chatCount: number;
    rating: number;
    reviewCount: number;
  };
}
```

**Indexes**:

- `email` (unique)
- `phone` (unique)
- `role`
- `locationVerified`
- `isActive`
- `stats.listingCount`
- `lastActiveAt`

---

### 2. listings

Replaces: `listings` table

```typescript
interface ListingDocument {
  id: string; // Auto-generated UUID

  // Basic info
  title: string;
  description: string;
  price: number;
  isNegotiable: boolean;
  minPrice?: number;
  condition: "new" | "like_new" | "good" | "fair";

  // Category and location
  category: string; // Category ID
  subcategory?: string;
  city: string;
  area?: string;
  latitude?: number;
  longitude?: number;

  // Media
  images: ListingImage[]; // Array of image objects
  videoUrl?: string;

  // Item details
  itemAge?: string;
  hasWarranty: boolean;
  warrantyExpiry?: Timestamp;
  hasInvoice: boolean;
  accessories?: string;

  // Status and visibility
  status: "draft" | "active" | "sold" | "deleted" | "expired";
  isActive: boolean;
  isFeatured: boolean;
  featuredTier?: "basic" | "premium" | "premium_plus";
  featuredUntil?: Timestamp;

  // Interaction data
  viewCount: number;
  favoriteCount: number;
  chatCount: number;
  bumpCount: number;
  lastBumpedAt?: Timestamp;

  // Ownership
  userId: string; // User ID of seller

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
  deletedAt?: Timestamp;

  // AI metadata
  aiMetadata?: {
    suggestedTitle?: string;
    suggestedDescription?: string;
    suggestedCategory?: string;
    suggestedCondition?: string;
    confidence: number;
  };

  // Moderation
  moderationStatus: "pending" | "approved" | "rejected";
  moderationNotes?: string;
  moderatedAt?: Timestamp;
  moderatedBy?: string;

  // Draft support
  draftStep?: number;
  idempotencyKey?: string;
}

interface ListingImage {
  id: string;
  url: string; // Firebase Storage URL
  order: number;
  caption?: string;
  uploadedAt: Timestamp;
}
```

**Indexes**:

- `userId`
- `status`
- `isActive`
- `category`
- `city`
- `price`
- `isFeatured`
- `featuredUntil`
- `createdAt`
- `expiresAt`
- `viewCount`
- `favoriteCount`
- Composite: `status` + `category` + `city`
- Composite: `isActive` + `isFeatured` + `featuredUntil`

---

### 3. chats

Replaces: `chats` table

```typescript
interface ChatDocument {
  id: string; // Auto-generated UUID

  // Participants
  buyerId: string;
  sellerId: string;
  listingId: string;

  // Chat state
  isActive: boolean;
  isArchived: boolean;
  archivedBy?: string; // 'buyer' | 'seller'
  archivedAt?: Timestamp;

  // Message tracking
  lastMessageId?: string;
  lastMessageAt?: Timestamp;
  buyerUnreadCount: number;
  sellerUnreadCount: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt: Timestamp;

  // Listing snapshot (denormalized for performance)
  listingSnapshot: {
    title: string;
    price: number;
    status: string;
    images: string[]; // First image URL
  };
}
```

**Indexes**:

- `buyerId`
- `sellerId`
- `listingId`
- `isActive`
- `isArchived`
- `lastMessageAt`
- `lastActiveAt`
- Composite: `buyerId` + `isActive`
- Composite: `sellerId` + `isActive`

---

### 4. messages (Subcollection of chats)

Replaces: `messages` table

```typescript
interface MessageDocument {
  id: string; // Auto-generated within chat

  // Content
  content: string;
  type: "text" | "image" | "location" | "system";
  imageUrl?: string; // Firebase Storage URL

  // Sender
  senderId: string;
  senderRole: "buyer" | "seller";

  // Status
  isDelivered: boolean;
  deliveredAt?: Timestamp;
  isRead: boolean;
  readAt?: Timestamp;
  isEdited: boolean;
  editedAt?: Timestamp;
  isDeleted: boolean;
  deletedAt?: Timestamp;

  // Reactions
  reactions: MessageReaction[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface MessageReaction {
  emoji: string;
  userId: string;
  createdAt: Timestamp;
}
```

**Indexes**:

- `senderId`
- `isRead`
- `isDelivered`
- `createdAt`
- Composite: `isRead` + `createdAt`

---

### 5. favorites

Replaces: `favorites` table

```typescript
interface FavoriteDocument {
  id: string; // Composite: `${userId}_${listingId}`

  userId: string;
  listingId: string;

  // Listing snapshot (denormalized)
  listingSnapshot: {
    title: string;
    price: number;
    image: string;
    status: string;
    sellerId: string;
  };

  createdAt: Timestamp;
}
```

**Indexes**:

- `userId`
- `listingId`
- `createdAt`
- Composite: `userId` + `createdAt`

---

### 6. reports

Replaces: `reports` table

```typescript
interface ReportDocument {
  id: string; // Auto-generated UUID

  // Report details
  type: "listing" | "user" | "message";
  targetId: string; // ID of reported item
  reason: string;
  description: string;

  // Reporter
  reporterId: string;
  reporterInfo: {
    name: string;
    email: string;
  };

  // Status
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  priority: "low" | "medium" | "high";

  // Resolution
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Target snapshot (denormalized)
  targetSnapshot?: any; // Varies by report type
}
```

**Indexes**:

- `type`
- `status`
- `priority`
- `reporterId`
- `createdAt`
- `resolvedAt`

---

## Payment Collections

### 7. listingBoosts

Replaces: `listing_boosts` table

```typescript
interface ListingBoostDocument {
  id: string; // Auto-generated UUID

  // Boost details
  listingId: string;
  userId: string; // Purchaser
  tier: "basic" | "premium" | "premium_plus";
  amount: number; // INR
  duration: number; // Days

  // Payment info
  paymentId: string; // Cashfree payment ID
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paidAt?: Timestamp;

  // Status
  status: "active" | "expired" | "cancelled";
  startedAt?: Timestamp;
  expiresAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Cashfree details
  cfOrderId?: string;
  cfPaymentToken?: string;
  cfSignature?: string;
}
```

**Indexes**:

- `listingId`
- `userId`
- `status`
- `paymentStatus`
- `expiresAt`
- `createdAt`
- Composite: `status` + `expiresAt`

---

### 8. invoices

Replaces: `invoices` table

```typescript
interface InvoiceDocument {
  id: string; // Auto-generated UUID

  // Invoice details
  invoiceNumber: string; // Format: AB-INV-YYYYMM-NNNNN
  type: "boost" | "featured" | "other";

  // Customer
  userId: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };

  // Items
  items: InvoiceItem[];

  // Amounts
  subtotal: number;
  tax: number;
  total: number;
  currency: string;

  // Status
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  paidAt?: Timestamp;

  // Payment
  paymentId?: string;
  paymentMethod?: string;

  // File
  pdfUrl?: string; // Firebase Storage URL

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
```

**Indexes**:

- `invoiceNumber` (unique)
- `userId`
- `status`
- `type`
- `createdAt`
- `paidAt`
- `dueDate`

---

### 9. paymentAuditLog

Replaces: `payment_audit_log` table

```typescript
interface PaymentAuditLogDocument {
  id: string; // Auto-generated UUID

  // Event details
  eventType:
    | "order_created"
    | "payment_initiated"
    | "payment_success"
    | "payment_failed"
    | "refund_initiated"
    | "refund_success"
    | "webhook_received";

  // Payment info
  paymentId: string;
  orderId?: string;
  amount?: number;
  currency?: string;

  // User
  userId?: string;

  // Provider details
  provider: "cashfree";
  providerEventId?: string;
  providerData?: any;

  // Status
  status: "success" | "failed" | "pending";

  // Metadata
  createdAt: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}
```

**Indexes**:

- `paymentId`
- `eventType`
- `userId`
- `status`
- `createdAt`
- `providerEventId`

---

## Analytics Collections

### 10. auditLogs

Replaces: `audit_logs` table

```typescript
interface AuditLogDocument {
  id: string; // Auto-generated UUID

  // Event details
  action: string; // 'listing_created', 'profile_updated', 'login', etc.
  resourceType: string;
  resourceId?: string;

  // User
  userId?: string;
  userRole?: string;

  // Details
  details?: any;
  oldValues?: any;
  newValues?: any;

  // Context
  ipAddress?: string;
  userAgent?: string;

  // Metadata
  createdAt: Timestamp;
}
```

**Indexes**:

- `userId`
- `action`
- `resourceType`
- `createdAt`
- Composite: `userId` + `createdAt`

---

### 11. securityEvents

Replaces: `security_events` table

```typescript
interface SecurityEventDocument {
  id: string; // Auto-generated UUID

  // Event details
  eventType:
    | "login_failed"
    | "rate_limit_exceeded"
    | "suspicious_activity"
    | "banned_user_attempt"
    | "payment_fraud_detected";

  // User
  userId?: string;
  email?: string;
  ipAddress?: string;

  // Severity
  severity: "low" | "medium" | "high" | "critical";

  // Details
  details?: any;

  // Resolution
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  resolution?: string;

  // Metadata
  createdAt: Timestamp;
}
```

**Indexes**:

- `eventType`
- `severity`
- `userId`
- `ipAddress`
- `resolved`
- `createdAt`
- Composite: `severity` + `resolved`

---

### 12. listingViews

Replaces: `listing_views` table

```typescript
interface ListingViewDocument {
  id: string; // Composite: `${listingId}_${userId}_${date}`

  listingId: string;
  userId?: string; // null for anonymous views
  ipAddress?: string;
  userAgent?: string;

  // Date (YYYY-MM-DD format for partitioning)
  date: string;

  // View details
  viewCount: number; // Increment for each view
  firstViewAt: Timestamp;
  lastViewAt: Timestamp;

  // Location (if available)
  country?: string;
  city?: string;
}
```

**Indexes**:

- `listingId`
- `userId`
- `date`
- `viewCount`
- `firstViewAt`
- `lastViewAt`
- Composite: `listingId` + `date`

---

### 13. userInteractions

Replaces: `user_interactions` table

```typescript
interface UserInteractionDocument {
  id: string; // Composite: `${userId}_${listingId}_${type}`

  userId: string;
  listingId: string;
  type: "view" | "favorite" | "share" | "contact";

  // Interaction data
  count: number;
  firstAt: Timestamp;
  lastAt: Timestamp;

  // Context
  source?: string; // 'search', 'recommendation', 'direct', etc.
  metadata?: any;
}
```

**Indexes**:

- `userId`
- `listingId`
- `type`
- `lastAt`
- Composite: `userId` + `type` + `lastAt`

---

### 14. recommendations

Replaces: `recommendations_cache` table

```typescript
interface RecommendationDocument {
  id: string; // Composite: `${userId}_${type}`

  userId: string;
  type: "similar_listings" | "trending" | "new_in_area" | "based_on_views";

  // Recommendations
  listingIds: string[];
  generatedAt: Timestamp;
  expiresAt: Timestamp;

  // Algorithm info
  algorithm: string;
  version: string;
  confidence: number;

  // Performance tracking
  clicked?: string[]; // Listing IDs that were clicked
  viewed?: string[]; // Listing IDs that were viewed
}
```

**Indexes**:

- `userId`
- `type`
- `expiresAt`
- `generatedAt`
- Composite: `userId` + `type`

---

### 15. trending

Replaces: `trending_listings` table

```typescript
interface TrendingDocument {
  id: string; // Composite: `${category}_${city}_${date}`

  category?: string;
  city?: string;
  date: string; // YYYY-MM-DD

  // Trending listings
  listingIds: string[];
  scores: number[]; // Parallel array with scores

  // Metrics
  totalViews: number;
  totalFavorites: number;
  totalContacts: number;

  // Generation info
  generatedAt: Timestamp;
  algorithm: string;
}
```

**Indexes**:

- `category`
- `city`
- `date`
- `generatedAt`
- Composite: `category` + `city` + `date`

---

## Supporting Collections

### 16. rateLimits

Replaces: `rate_limits` table

```typescript
interface RateLimitDocument {
  id: string; // Composite: `${key}_${window}`

  key: string; // Format: `uuid:action` or `ip:action`
  action: string;

  // Rate limiting
  count: number;
  windowStart: Timestamp;
  windowEnd: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:

- `key`
- `action`
- `windowEnd`
- Composite: `key` + `action`

---

### 17. chatTypingEvents (Subcollection of chats)

Replaces: `chat_typing_events` table

```typescript
interface ChatTypingEventDocument {
  id: string; // Auto-generated within chat

  userId: string;
  isTyping: boolean;
  expiresAt: Timestamp; // Auto-expire after 10 seconds

  createdAt: Timestamp;
}
```

**Indexes**:

- `userId`
- `isTyping`
- `expiresAt`
- `createdAt`

---

### 18. categories

Static collection for marketplace categories

```typescript
interface CategoryDocument {
  id: string; // Category ID (e.g., 'mobiles', 'vehicles')

  name: string;
  displayName: string;
  description?: string;
  icon?: string;

  // Hierarchy
  parentId?: string;
  level: number;
  order: number;

  // Settings
  isActive: boolean;
  requiresApproval: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:

- `parentId`
- `level`
- `order`
- `isActive`

---

### 19. appConfig

Application configuration

```typescript
interface AppConfigDocument {
  id: string; // Fixed ID: 'global'

  // App settings
  version: string;
  maintenance: boolean;
  maintenanceMessage?: string;

  // Feature flags
  features: {
    locationVerification: boolean;
    aiSuggestions: boolean;
    trendingEnabled: boolean;
    recommendationsEnabled: boolean;
  };

  // Rate limits
  rateLimits: {
    defaultWindow: number; // seconds
    defaultMax: number;
    locationVerificationWindow: number;
    locationVerificationMax: number;
  };

  // Payment settings
  payment: {
    cashfreeEnabled: boolean;
    cashfreeSandbox: boolean;
    boostTiers: {
      basic: { price: number; duration: number };
      premium: { price: number; duration: number };
      premiumPlus: { price: number; duration: number };
    };
  };

  // Storage settings
  storage: {
    maxImagesPerListing: number;
    maxImageSize: number; // MB
    allowedFormats: string[];
  };

  // Metadata
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## Data Relationships Summary

```
users
├── listings (userId)
├── chats (buyerId, sellerId)
├── favorites (userId)
├── reports (reporterId)
├── listingBoosts (userId)
├── invoices (userId)
├── auditLogs (userId)
├── securityEvents (userId)
├── userInteractions (userId)
├── recommendations (userId)
└── rateLimits (key contains userId)

listings
├── messages (via chats)
├── favorites (listingId)
├── reports (targetId)
├── listingBoosts (listingId)
├── listingViews (listingId)
├── userInteractions (listingId)
└── trending (listingIds array)

chats
├── messages (subcollection)
└── chatTypingEvents (subcollection)

payments
├── listingBoosts (paymentId)
├── invoices (paymentId)
└── paymentAuditLog (paymentId)
```

---

## Migration Strategy

### Data Transfer Order

1. **Static Data** (categories, appConfig)
2. **Users** (profiles, roles)
3. **Core Data** (listings, images)
4. **Relationships** (chats, messages, favorites)
5. **Payments** (boosts, invoices, audit logs)
6. **Analytics** (views, interactions, recommendations)
7. **Supporting** (rate limits, security events)

### Validation Scripts

- User data integrity
- Listing-image relationships
- Chat-message consistency
- Payment-audit alignment
- View deduplication

### Rollback Plan

- Keep Supabase database read-only for 30 days
- Export Firestore data daily
- Validation scripts to compare data consistency

---

## Next Steps

1. Create Firestore Security Rules (SECURITY_RULES.md)
2. Create Environment Variable Mapping (ENV_MAPPING.md)
3. Begin Phase 3: Firebase Auth Migration
4. Set up Firebase project and initialize services

**Schema Design Complete** ✅
