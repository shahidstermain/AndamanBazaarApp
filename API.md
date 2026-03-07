# 📡 AndamanBazaar API Documentation

Complete API reference for the AndamanBazaar marketplace platform.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Database Schema](#database-schema)
- [Supabase API Endpoints](#supabase-api-endpoints)
- [Edge Functions](#edge-functions)
- [Real-time Subscriptions](#real-time-subscriptions)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## 🔐 Authentication

### Overview

AndamanBazaar uses Supabase Auth for authentication and authorization. All API calls require proper authentication.

### Authentication Flow

```typescript
// 1. Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  options: {
    data: {
      full_name: 'John Doe',
      phone: '+919876543210'
    }
  }
});

// 2. Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securePassword123'
});

// 3. Get current user
const { data: { user } } = await supabase.auth.getUser();

// 4. Sign out
const { error } = await supabase.auth.signOut();
```

### JWT Token Structure

```json
{
  "aud": "authenticated",
  "exp": 1640995200,
  "sub": "12345678-1234-1234-1234-123456789012",
  "email": "user@example.com",
  "phone": "+919876543210",
  "app_metadata": {
    "provider": "email",
    "role": "user"
  },
  "user_metadata": {
    "full_name": "John Doe"
  },
  "role": "authenticated"
}
```

---

## 🗄️ Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  trust_level TEXT DEFAULT 'newbie' CHECK (trust_level IN ('newbie', 'verified', 'legend')),
  is_verified_gps BOOLEAN DEFAULT FALSE,
  verification_coordinates POINT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### listings
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  category_id UUID REFERENCES categories(id),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  city TEXT,
  condition TEXT DEFAULT 'good' CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'poor')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft', 'removed')),
  is_featured BOOLEAN DEFAULT FALSE,
  views_count INTEGER DEFAULT 0,
  last_bumped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### categories
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### listing_images
```sql
CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### chats
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  file_url TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### chat_participants
```sql
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(chat_id, user_id)
);
```

#### favorites
```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);
```

#### boosts
```sql
CREATE TABLE boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('spark', 'boost', 'power')),
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'failed')),
  payment_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### reports
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('listing', 'user')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔌 Supabase API Endpoints

### Listings API

#### Get Listings
```typescript
// Get all listings with filters
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    user:users(
      id,
      full_name,
      avatar_url,
      trust_level
    ),
    images:listing_images(
      id,
      image_url,
      sort_order
    ),
    category:categories(
      id,
      name,
      icon
    )
  `)
  .eq('status', 'active')
  .eq('is_featured', false)
  .order('created_at', { ascending: false })
  .limit(20);
```

#### Get Featured Listings
```typescript
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    user:users(
      id,
      full_name,
      avatar_url,
      trust_level
    ),
    images:listing_images(
      id,
      image_url,
      sort_order
    ),
    category:categories(
      id,
      name,
      icon
    )
  `)
  .eq('status', 'active')
  .eq('is_featured', true)
  .order('created_at', { ascending: false })
  .limit(10);
```

#### Get Single Listing
```typescript
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    user:users(
      id,
      full_name,
      avatar_url,
      trust_level,
      phone
    ),
    images:listing_images(
      id,
      image_url,
      sort_order
    ),
    category:categories(
      id,
      name,
      icon
    )
  `)
  .eq('id', listingId)
  .single();
```

#### Create Listing
```typescript
const { data, error } = await supabase
  .from('listings')
  .insert({
    title: 'Fresh Fish - Tuna',
    description: 'Freshly caught tuna from Port Blair',
    price: 500,
    category_id: 'category-uuid',
    city: 'Port Blair',
    condition: 'good'
  })
  .select()
  .single();
```

#### Update Listing
```typescript
const { data, error } = await supabase
  .from('listings')
  .update({
    title: 'Updated Title',
    price: 600
  })
  .eq('id', listingId)
  .eq('user_id', userId) // RLS ensures user can only update their own
  .select()
  .single();
```

#### Mark as Sold
```typescript
const { data, error } = await supabase
  .from('listings')
  .update({
    status: 'sold'
  })
  .eq('id', listingId)
  .eq('user_id', userId)
  .select()
  .single();
```

#### Increment Views
```typescript
const { data, error } = await supabase.rpc('increment_views', {
  listing_id: listingId
});
```

### Search API

#### Search Listings
```typescript
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    user:users(
      id,
      full_name,
      avatar_url,
      trust_level
    ),
    images:listing_images(
      id,
      image_url,
      sort_order
    ),
    category:categories(
      id,
      name,
      icon
    )
  `)
  .eq('status', 'active')
  .ilike('title', `%${searchQuery}%`)
  .or(`description.ilike.%${searchQuery}%`)
  .order('created_at', { ascending: false })
  .limit(20);
```

#### Filter by Category
```typescript
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    user:users(
      id,
      full_name,
      avatar_url,
      trust_level
    ),
    images:listing_images(
      id,
      image_url,
      sort_order
    ),
    category:categories(
      id,
      name,
      icon
    )
  `)
  .eq('status', 'active')
  .eq('category_id', categoryId)
  .order('created_at', { ascending: false });
```

#### Filter by Location
```typescript
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    user:users(
      id,
      full_name,
      avatar_url,
      trust_level
    ),
    images:listing_images(
      id,
      image_url,
      sort_order
    ),
    category:categories(
      id,
      name,
      icon
    )
  `)
  .eq('status', 'active')
  .eq('city', city)
  .order('created_at', { ascending: false });
```

### Chat API

#### Get User Chats
```typescript
const { data, error } = await supabase
  .from('chat_participants')
  .select(`
    chat_id,
    joined_at,
    last_read_at,
    chats(
      updated_at,
      messages(
        content,
        created_at,
        sender_id,
        users(
          full_name,
          avatar_url
        )
      )
    )
  `)
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });
```

#### Get Chat Messages
```typescript
const { data, error } = await supabase
  .from('messages')
  .select(`
    *,
    sender:users(
      full_name,
      avatar_url
    )
  `)
  .eq('chat_id', chatId)
  .order('created_at', { ascending: true });
```

#### Send Message
```typescript
const { data, error } = await supabase
  .from('messages')
  .insert({
    chat_id: chatId,
    sender_id: userId,
    content: 'Hello, is this item still available?'
  })
  .select()
  .single();
```

#### Create Chat
```typescript
const { data, error } = await supabase
  .rpc('create_chat', {
    user1_id: currentUserId,
    user2_id: otherUserId,
    listing_id: listingId
  });
```

### Favorites API

#### Get User Favorites
```typescript
const { data, error } = await supabase
  .from('favorites')
  .select(`
    *,
    listings(
      *,
      user:users(
        id,
        full_name,
        avatar_url,
        trust_level
      ),
      images:listing_images(
        id,
        image_url,
        sort_order
      ),
      category:categories(
        id,
        name,
        icon
      )
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

#### Add to Favorites
```typescript
const { data, error } = await supabase
  .from('favorites')
  .insert({
    user_id: userId,
    listing_id: listingId
  });
```

#### Remove from Favorites
```typescript
const { data, error } = await supabase
  .from('favorites')
  .delete()
  .eq('user_id', userId)
  .eq('listing_id', listingId);
```

### User Profile API

#### Get User Profile
```typescript
const { data, error } = await supabase
  .from('users')
  .select(`
    *,
    listings(
      id,
      title,
      price,
      status,
      created_at,
      images:listing_images(
        id,
        image_url,
        sort_order
      )
    )
  `)
  .eq('id', userId)
  .single();
```

#### Update User Profile
```typescript
const { data, error } = await supabase
  .from('users')
  .update({
    full_name: 'John Doe',
    phone: '+919876543210',
    avatar_url: 'https://example.com/avatar.jpg'
  })
  .eq('id', userId)
  .select()
  .single();
```

---

## ⚡ Edge Functions

### Payment Processing

#### Cashfree Webhook
```typescript
// POST /functions/v1/cashfree-webhook
// Body: Cashfree webhook payload

export default async function handler(req: Request) {
  const signature = req.headers.get('x-webhook-signature');
  const payload = await req.json();
  
  // Verify webhook signature
  const isValid = verifyWebhookSignature(signature, payload);
  
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  // Process payment
  if (payload.type === 'payment.captured') {
    await activateBoost(payload.data.order_id);
  }
  
  return new Response('OK', { status: 200 });
}
```

#### Generate Invoice
```typescript
// POST /functions/v1/generate-invoice
// Body: { boost_id: string }

export default async function handler(req: Request) {
  const { boost_id } = await req.json();
  
  // Generate invoice PDF
  const invoice = await generateInvoicePDF(boost_id);
  
  return new Response(invoice, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="invoice.pdf"'
    }
  });
}
```

### AI Moderation

#### Image Moderation
```typescript
// POST /functions/v1/moderate-image
// Body: { image_url: string }

export default async function handler(req: Request) {
  const { image_url } = await req.json();
  
  // Analyze image with Gemini AI
  const analysis = await analyzeImage(image_url);
  
  // Check for inappropriate content
  const isAppropriate = checkContentAppropriateness(analysis);
  
  return Response.json({
    approved: isAppropriate,
    confidence: analysis.confidence,
    categories: analysis.categories
  });
}
```

---

## 📡 Real-time Subscriptions

### Chat Messages
```typescript
// Subscribe to chat messages
const subscription = supabase
  .channel(`chat:${chatId}`)
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `chat_id=eq.${chatId}`
    },
    (payload) => {
      // Handle new message
      console.log('New message:', payload.new);
    }
  )
  .subscribe();
```

### Listing Updates
```typescript
// Subscribe to listing updates
const subscription = supabase
  .channel('listings')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'listings'
    },
    (payload) => {
      // Handle listing changes
      console.log('Listing updated:', payload);
    }
  )
  .subscribe();
```

### User Status
```typescript
// Subscribe to user presence
const subscription = supabase
  .channel('presence')
  .on('presence', 
    { event: 'sync' }, 
    () => {
      // Handle presence updates
      console.log('Presence updated:', subscription.presenceState());
    }
  )
  .subscribe();
```

---

## ❌ Error Handling

### Standard Error Response Format

```typescript
interface APIError {
  error: {
    message: string;
    code: string;
    details?: any;
  };
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `PGRST116` | No rows returned | 404 |
| `PGRST301` | Relation does not exist | 400 |
| `PGRST200` | Success | 200 |
| `JWT_INVALID` | Invalid JWT token | 401 |
| `JWT_EXPIRED` | JWT token expired | 401 |
| `RLS_VIOLATION` | Row level security violation | 403 |
| `RATE_LIMIT` | Rate limit exceeded | 429 |

### Error Handling Example

```typescript
const { data, error } = await supabase
  .from('listings')
  .select('*')
  .eq('id', listingId);

if (error) {
  console.error('API Error:', error);
  
  switch (error.code) {
    case 'PGRST116':
      // Listing not found
      showToast('Listing not found', 'error');
      break;
    case 'JWT_INVALID':
      // Authentication required
      showToast('Please login to continue', 'error');
      break;
    case 'RLS_VIOLATION':
      // Permission denied
      showToast('You do not have permission to access this resource', 'error');
      break;
    default:
      showToast('An error occurred. Please try again', 'error');
  }
}
```

---

## 🚦 Rate Limiting

### Rate Limits by Endpoint

| Endpoint | Limit | Time Window |
|----------|-------|-------------|
| Create Listing | 10/hour | 1 hour |
| Send Message | 50/hour | 1 hour |
| Upload Image | 20/hour | 1 hour |
| Login Attempts | 5/hour | 1 hour |
| Search API | 100/minute | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Handling

```typescript
const handleRateLimit = (error: any) => {
  if (error.status === 429) {
    const resetTime = error.headers.get('X-RateLimit-Reset');
    const waitTime = resetTime ? parseInt(resetTime) - Date.now() : 60000;
    
    showToast(`Rate limit exceeded. Please try again in ${Math.ceil(waitTime / 1000)} seconds`, 'warning');
  }
};
```

---

## 🔧 Development Tools

### API Testing with Postman

Use the provided Postman collection: `postman_collection.json`

### Database Migrations

```bash
# Apply migrations
supabase db push

# Generate types
supabase gen types typescript --local > types.ts

# Reset database
supabase db reset
```

### Local Development

```bash
# Start local Supabase
supabase start

# View logs
supabase logs

# Access Studio
supabase stop
```

---

## 📚 SDK Examples

### React Hook Example

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Custom hook for listings
export const useListings = (filters?: ListingFilters) => {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          user:users(id, full_name, avatar_url, trust_level),
          images:listing_images(id, image_url, sort_order),
          category:categories(id, name, icon)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

// Mutation for creating listing
export const useCreateListing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (listing: CreateListingData) => {
      const { data, error } = await supabase
        .from('listings')
        .insert(listing)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      showToast('Listing created successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to create listing', 'error');
    }
  });
};
```

### TypeScript Types

```typescript
// Generated types from Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          trust_level: 'newbie' | 'verified' | 'legend';
          is_verified_gps: boolean;
          verification_coordinates: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      // ... other tables
    };
  };
}
```

---

## 🔍 Monitoring & Debugging

### Request Logging

```typescript
// Log all API requests
supabase.realtime.onConnect(() => {
  console.log('Connected to Supabase Realtime');
});

supabase.realtime.onDisconnect(() => {
  console.log('Disconnected from Supabase Realtime');
});
```

### Performance Monitoring

```typescript
// Track API performance
const trackAPICall = async (operation: string, fn: () => Promise<any>) => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`API Call: ${operation} took ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`API Call: ${operation} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};
```

---

*Last updated: March 7, 2026*
