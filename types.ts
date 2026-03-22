
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
  trust_level: 'newbie' | 'verified' | 'legend';
  created_at: string;

  // Milestone 2: Experiences Marketplace fields
  is_operator: boolean;
  operator_verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  operator_id_document_url?: string;
  operator_business_address?: string;
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

export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair';
export type ItemAge = '<1m' | '1-6m' | '6-12m' | '1-2y' | '2-5y' | '5y+';
export type ListingStatus = 'draft' | 'pending_review' | 'active' | 'sold' | 'expired' | 'deleted';
export type ModerationStatus = 'auto_approved' | 'pending_review' | 'approved' | 'rejected';

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

  // AI
  ai_metadata?: AiMetadata;

  // Milestone 2: Experiences Marketplace
  is_experience: boolean;
  inventory_per_slot: number;

  // Relations
  created_at: string;
  updated_at?: string;
  images?: ListingImage[];
  seller?: Profile;
  pricing_tiers?: PricingTier[];
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
  last_message?: string;
  last_message_at: string;
  buyer_unread_count: number;
  seller_unread_count: number;
  listing?: Listing;
  other_party?: Profile;
  // Fix: Added buyer and seller properties to satisfy Supabase aliased joins
  buyer?: Profile;
  seller?: Profile;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  message_text: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
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

export type BoostTierKey = 'spark' | 'boost' | 'power';
export type BoostStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';

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

// ===== Experience & Booking Types =====

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface PricingTier {
  id: string;
  listing_id: string;
  name: string;
  price: number;
  description?: string;
  created_at: string;
}

export interface ExperienceAvailability {
  id: string;
  listing_id: string;
  slot_date: string;
  slots_available: number;
}

export interface GuestDetail {
  tier_id: string;
  count: number;
}

export interface Booking {
  id: string;
  user_id: string;
  listing_id: string;
  booking_date: string;
  booking_status: 'pending' | 'paid' | 'completed' | 'disputed' | 'cancelled';
  release_status: 'locked' | 'released';
  total_amount: number;
  advance_amount: number;
  commission_amount: number;
  cashfree_order_id?: string;
  guest_details: GuestDetail[];
  contact_number?: string;
  special_requests?: string;
  created_at: string;
  updated_at: string;
  listing?: Listing;
  user?: Profile;
}

// ===== Trust Engine Types =====

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
  userId: string;
  bookingId: string;
  ratings: ReviewRatings;
  avgRating: number;
  comment: string;
  mediaUrls: string[];
  createdAt: string;
}

export type OperatorTier = 'basic' | 'verified' | 'premium';

export interface Operator {
  id: string;
  userId: string;
  verificationTier: OperatorTier;
  documents: {
    idProof?: string;
    addressProof?: string;
    license?: string;
  };
  verifiedAt?: string;
}

export interface TrustScoreResult {
  trustScore: number;
  badge: 'Low' | 'Good' | 'Trusted' | 'Premium';
}

// ===== Smart Activity Filter & Match Score Types =====

export type ActivityDifficulty = 'Easy' | 'Medium' | 'Hard';
export type Island = 'Port Blair' | 'Havelock' | 'Neil Island' | 'Baratang' | 'Diglipur' | 'Long Island';
export type ActivityType = 'Scuba Diving' | 'Snorkeling' | 'Trekking' | 'History' | 'Leisure' | 'Water Sports' | 'Beaches';

export interface Activity {
  id: string;
  title: string;
  island: Island;
  type: ActivityType;
  price: number;
  durationMinutes: number;
  difficulty: ActivityDifficulty;
  familyFriendly: boolean;
  requiresSwimming: boolean;
  season: string[]; // e.g., ["Oct", "Nov", ...]
  rating: number;
  reviewCount: number;
  location: {
    lat: number;
    lng: number;
  };
  operatorId: string; // Linking to the Trust Engine
  trustScore?: number;
  trustBadge?: 'Low' | 'Good' | 'Trusted' | 'Premium';
}

export type GroupType = 'family' | 'solo' | 'couple';
export type UserPersona = 'Adventure' | 'Relaxation' | 'Culture' | 'Luxury';

export interface UserPreferences {
  budget: number;
  interests: ActivityType[];
  persona: UserPersona;
  groupType: GroupType;
}

export interface MatchScoreResult {
  activityId: string;
  score: number;
  reasons?: string[];
}

export interface ActivityFilterParams {
  islands: Island[];
  types: ActivityType[];
  budgetRange: [number, number];
  durationRange: [number, number];
  difficulty?: ActivityDifficulty;
  familyFriendly?: boolean;
  requiresSwimming?: boolean;
  minRating: number;
}