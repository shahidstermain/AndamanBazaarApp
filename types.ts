export interface Profile {
  id: string;
  phone_number?: string;
  name?: string;
  email?: string;
  profile_photo_url?: string;
  city?: string;
  area?: string;
  is_location_verified: boolean;
  location_verified_at?: string;
  last_verification_lat?: number;
  last_verification_lng?: number;
  verification_ip?: string;
  verification_attempts?: number;
  verification_blocked_until?: string;
  total_listings: number;
  successful_sales: number;
  trust_level: "newbie" | "verified" | "legend" | "official";
  is_official?: boolean;
  response_rate?: number;
  avg_response_hours?: number;
  created_at: string;
  // Operator verification fields
  operator_business_address?: string;
  operator_verification_status?: "pending" | "verified" | "rejected";
  operator_id_document_url?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url?: string;
  description?: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
}

export type ItemCondition = "new" | "like_new" | "good" | "fair";
export type ItemAge = "<1m" | "1-6m" | "6-12m" | "1-2y" | "2-5y" | "5y+";
export type ListingStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "sold"
  | "expired"
  | "deleted";
export type ModerationStatus =
  | "auto_approved"
  | "pending_review"
  | "approved"
  | "rejected";

export interface ContactPreferences {
  chat: boolean;
  phone?: boolean;
  whatsapp?: boolean;
}

export interface AiMetadata {
  suggested_title?: string;
  suggested_description?: string;
  suggested_category?: string;
  suggested_condition?: ItemCondition;
  estimated_price_range?: { low: number; high: number };
  title_accepted?: boolean;
  description_accepted?: boolean;
  price_accepted?: boolean;
}

export interface Listing {
  id: string;
  user_id: string;
  is_official?: boolean;
  category_id: string;
  subcategory_id?: string;
  title: string;
  description: string;
  price: number;
  condition: ItemCondition;
  city: string;
  area?: string;

  // Pricing
  is_negotiable: boolean;
  min_price?: number;

  // Item details
  item_age?: ItemAge;
  has_warranty: boolean;
  warranty_expiry?: string;
  has_invoice: boolean;
  accessories: string[];

  // Contact
  contact_preferences: ContactPreferences;

  // Status & moderation
  status: ListingStatus;
  moderation_status: ModerationStatus;
  moderation_notes?: string;
  is_featured: boolean;
  views_count: number;

  // Draft
  draft_step?: number;
  idempotency_key?: string;
  is_urgent?: boolean; // Label as urgent for faster sale

  // AI
  ai_metadata?: AiMetadata;

  // Relations
  created_at: string;
  updated_at?: string;
  images?: ListingImage[];
  seller?: Profile;

  // Freshness metadata
  last_active_at?: string;
  availability_status?: "available" | "sold_recently" | "inactive";
  response_rate?: number; // 0-100
  avg_response_hours?: number;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  display_order: number;
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing?: Listing;
}

export interface Chat {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  // Firebase shape compatibility (camelCase)
  listingId?: string;
  buyerId?: string;
  sellerId?: string;
  last_message?: string;
  last_message_at: string;
  lastMessageAt?: string;
  buyer_unread_count: number;
  seller_unread_count: number;
  buyerUnreadCount?: number;
  sellerUnreadCount?: number;
  listing?: Listing;
  other_party?: Profile;
  // Chat participant profiles (buyer and seller) populated via Firestore joins
  buyer?: Profile;
  seller?: Profile;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  message_text: string;
  content?: string; // Standard field name
  image_url?: string;
  is_read: boolean;
  created_at: string;
  // New Offer Fields
  type?: "text" | "offer" | "system";
  offerAmount?: number;
  offerStatus?: "pending" | "accepted" | "rejected";
  // Firebase compatibility
  senderId?: string;
  isRead?: boolean;
}

// ===== Draft Types =====

export interface DraftListing {
  step: number;
  category?: string;
  subcategory?: string;
  title: string;
  description: string;
  price: string;
  condition: ItemCondition;
  is_negotiable: boolean;
  min_price?: string;
  item_age?: ItemAge;
  has_warranty: boolean;
  warranty_expiry?: string;
  has_invoice: boolean;
  accessories: string[];
  city: string;
  area: string;
  contact_preferences: ContactPreferences;
  image_previews: string[];
  idempotency_key: string;
  is_urgent?: boolean;
  updated_at: number;
}

// ===== Price Suggestion Types =====

export interface PriceSuggestion {
  avg_price: number;
  min_price: number;
  max_price: number;
  listing_count: number;
}

// ===== AI Suggestion Types =====

export interface AiSuggestion {
  suggested_title?: string;
  suggested_description?: string;
  suggested_category?: string;
  suggested_condition?: ItemCondition;
  estimated_price_range?: { low: number; high: number };
}

// ===== Boost / Featured Ad Types =====

export type BoostTierKey = "spark" | "boost" | "power";
export type BoostStatus =
  | "pending"
  | "paid"
  | "expired"
  | "failed"
  | "refunded";

export interface ListingBoost {
  id: string;
  listing_id: string;
  user_id: string;
  tier: BoostTierKey;
  amount_inr: number;
  duration_days: number;
  status: BoostStatus;
  cashfree_order_id?: string;
  cashfree_payment_id?: string;
  payment_method: string;
  featured_from?: string;
  featured_until?: string;
  created_at: string;
  updated_at: string;
}

// ===== Activities Marketplace Types =====

export type Island =
  | "Port Blair"
  | "Havelock"
  | "Neil Island"
  | "Baratang"
  | "Diglipur"
  | "Long Island";
export type ActivityType =
  | "Scuba Diving"
  | "Snorkeling"
  | "Trekking"
  | "History"
  | "Leisure"
  | "Water Sports"
  | "Beaches";

export interface Activity {
  id: string;
  title: string;
  type: ActivityType;
  island: Island;
  price: number;
  durationMinutes: number;
  rating: number;
  reviewCount: number;
  difficulty: "Easy" | "Moderate" | "Hard";
  familyFriendly: boolean;
  requiresSwimming: boolean;
  trustScore?: number;
  trustBadge?: "Low" | "Good" | "Trusted" | "Premium";
  season: string[];
  location: { lat: number; lng: number };
  operatorId?: string;
  description?: string;
  matchScore?: number;
  matchReasons?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityFilterParams {
  islands?: Island[];
  types?: ActivityType[];
  budgetRange: [number, number];
  durationRange: [number, number];
  familyFriendly?: boolean;
  requiresSwimming?: boolean;
  minRating: number;
}

export interface UserPreferences {
  budget: number;
  interests: ActivityType[];
  persona: "Adventure" | "Relaxation" | "Culture" | "Luxury";
  groupType: "solo" | "couple" | "family" | "group";
}

export interface ReviewRatings {
  safety: number;
  value: number;
  fun: number;
  communication: number;
  accuracy: number;
}

export interface Review {
  id: string;
  activityId: string;
  bookingId: string;
  userId?: string;
  ratings: ReviewRatings;
  avgRating: number;
  comment: string;
  mediaUrls?: string[];
  createdAt: string;
  isVerified?: boolean;
}
