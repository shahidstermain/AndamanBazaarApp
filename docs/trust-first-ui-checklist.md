# Trust-First UI Checklist — AndamanBazaar

> A comprehensive checklist for designing trust-building UI patterns across the application.

---

## Core Trust Principles

### 1. Transparency

- [ ] Show seller verification status clearly
- [ ] Display listing freshness indicators
- [ ] Reveal seller response time estimates
- [ ] Show buyer reviews and ratings prominently
- [ ] Make pricing and fees transparent

### 2. Local Verification

- [ ] GPS-based location verification
- [ ] Phone number verification (OTP)
- [ ] Island residency indicators
- [ ] "Verified Local" badge system
- [ ] Location-based trust scoring

### 3. Safety First

- [ ] Safety tips in high-risk interactions
- [ ] Report/block functionality accessible
- [ ] In-app chat (no external contact initially)
- [ ] Scam prevention warnings
- [ ] Moderation status visible

---

## UI Component Checklist

### Trust Badges

#### Badge Hierarchy

```
Newbie (default)
├── Gray circle icon
├── "New Seller" label
└── No special benefits

Verified
├── Teal checkmark icon
├── "Verified" label
├── Requirements: Phone + Location + (Photo OR Listing)
└── Benefits: Higher search ranking

Trusted Seller
├── Gold star icon
├── "Trusted" label
├── Requirements: 5+ sales + 4.5+ rating + full profile
└── Benefits: Top placement, priority support

Island Legend
├── Crown icon
├── "Legend" label
├── Requirements: 50+ successful trades
└── Benefits: Maximum visibility, exclusive features
```

#### Badge Display Rules

- [ ] Show on all listing cards
- [ ] Show on seller profile page
- [ ] Show in chat header
- [ ] Show in search results
- [ ] Badge links to trust explanation

#### Badge Visual Specs

```css
/* Newbie */
background: bg-gray-100
color: text-gray-600
icon: Circle (gray)

/* Verified */
background: bg-teal-50
color: text-teal-700
icon: BadgeCheck (teal)
border: border-teal-200

/* Trusted */
background: bg-amber-50
color: text-amber-700
icon: Star (gold)
border: border-amber-200

/* Legend */
background: bg-gradient-to-r from-amber-400 to-orange-400
color: text-white
icon: Crown (white)
shadow: shadow-lg
```

---

### Seller Trust Card

**Location:** Listing detail page, seller section

**Required Elements:**

- [ ] Profile photo (or placeholder with initials)
- [ ] Seller name
- [ ] Trust badge
- [ ] Verification status list:
  - ✓ Phone verified
  - ✓ Location verified
  - ✓ Profile complete
  - ✓ Response rate (if available)
- [ ] Member since date
- [ ] Total listings count
- [ ] "View Seller Profile" link

**Visual Design:**

```
┌─────────────────────────────────────┐
│  [Photo]  Rahul Sharma              │
│           ★ Verified Seller         │
│                                      │
│  ✓ Phone Verified                   │
│  ✓ Location: Port Blair             │
│  ✓ Response Rate: 85%               │
│  📅 Member since Jan 2024           │
│  📦 12 active listings               │
│                                      │
│  [View Profile] [Contact Seller]    │
└─────────────────────────────────────┘
```

---

### Freshness Badges

**Purpose:** Show listing recency to build trust

**Badge Types:**

- [ ] **Fresh** — Listed today/tomorrow (green)
- [ ] **Active** — Seller active in last 24h (teal)
- [ ] **Hot** — 10+ views in last hour (coral)
- [ ] **Expiring** — Listing older than 30 days (amber)

**Display Rules:**

- [ ] Show on listing cards
- [ ] Show in search results
- [ ] Auto-hide after threshold

---

### Safety Nudges

**Trigger Points:**

1. [ ] First message in chat
2. [ ] Price negotiation
3. [ ] Meeting arrangement
4. [ ] Payment discussion
5. [ ] External contact request

**Safety Nudge Template:**

```tsx
<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest text-center">
    🛡️ Safety Tip: Meet in public places and never share banking details.
  </p>
</div>
```

**Safety Nudge Messages:**

- Chat start: "Meet in public places and verify items before payment."
- Payment: "Never share OTP, PIN, or banking details with anyone."
- Meeting: "Meet during daylight in crowded areas. Bring a friend if possible."
- External contact: "Keep conversations on AndamanBazaar for your safety."

---

### Verification Status Indicators

#### Phone Verification

- [ ] Show "✓ Phone Verified" badge
- [ ] Display in seller trust card
- [ ] Show in profile completion meter

#### Location Verification

- [ ] GPS verification on listing creation
- [ ] Show "📍 Location Verified" badge
- [ ] Display verified location badge on listings

#### Profile Completeness

- [ ] Progress bar showing completion %
- [ ] Checklist of missing items
- [ ] Trust score impact indicator

---

## Page-Specific Trust Elements

### Home Page

- [ ] Hero section: "Buy & Sell locally in Andaman — no mainland scams"
- [ ] Featured listings show trust badges
- [ ] Fresh catch section shows verified fishermen
- [ ] Category chips show verified listing counts

### Listings Page

- [ ] Filter by "Verified Sellers Only"
- [ ] Sort by "Most Trusted"
- [ ] Trust badge on every listing card
- [ ] Freshness indicator on cards
- [ ] Seller location visible

### Listing Detail Page

- [ ] Seller trust card (full)
- [ ] Listing creation date
- [ ] View count
- [ ] Save count
- [ ] Safety tips for high-value items
- [ ] "Report Listing" button
- [ ] Similar listings from trusted sellers

### Chat Interface

- [ ] Seller trust badge in header
- [ ] Safety nudge on first message
- [ ] Report/block menu accessible
- [ ] No external links allowed (auto-blocked)
- [ ] Typing indicator for real-time trust
- [ ] Response time estimate

### Profile Page

- [ ] Trust score prominently displayed
- [ ] Verification checklist
- [ ] Trust level progress bar
- [ ] Reviews and ratings section
- [ ] Response rate statistics
- [ ] Member since date

### Create Listing Page

- [ ] Trust score preview
- [ ] "Complete profile to boost trust" nudge
- [ ] Location verification prompt
- [ ] Photo quality tips
- [ ] Pricing guidance (fair price indicators)

---

## Trust-Building Copy Guidelines

### Do's ✓

- Use "islanders trust islanders" messaging
- Emphasize "local" and "verified"
- Show real statistics when possible
- Use social proof ("X people viewed this today")
- Celebrate trust milestones

### Don'ts ✗

- Never use "safe" without proof
- Don't over-promise verification
- Avoid generic "secure" language
- Don't hide trust requirements
- Never fake trust indicators

---

## Trust Score Calculation

### Formula

```typescript
function calculateTrustScore(seller: Seller): number {
  let score = 0;

  // Verification (40 points max)
  if (seller.phone_verified) score += 15;
  if (seller.location_verified) score += 10;
  if (seller.profile_photo) score += 10;
  if (seller.email_verified) score += 5;

  // Activity (30 points max)
  score += Math.min(seller.total_listings * 2, 10);
  score += Math.min(seller.successful_sales, 10);
  score += Math.min(seller.response_rate / 10, 10);

  // Reputation (30 points max)
  score += (seller.average_rating / 5) * 20;
  score += Math.min(seller.total_reviews, 10);

  return Math.min(score, 100);
}
```

### Trust Levels

- **0-29:** Newbie (gray badge)
- **30-59:** Verified (teal badge)
- **60-79:** Trusted (gold badge)
- **80-100:** Legend (crown badge)

---

## Trust Indicators in Code

### TrustBadge Component

```tsx
interface TrustBadgeProps {
  level: "newbie" | "verified" | "trusted" | "legend";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

// Already implemented in src/components/TrustBadge.tsx
```

### TrustCard Component

```tsx
interface TrustCardProps {
  seller: {
    name: string;
    profile_photo_url: string;
    trust_level: TrustLevel;
    phone_verified: boolean;
    location: string;
    response_rate: number;
    created_at: string;
    total_listings: number;
  };
  className?: string;
}

// Already implemented in src/components/TrustCard.tsx
```

---

## Analytics Events to Track

### Trust-Related Events

- [ ] `trust_badge_viewed` — When badge is seen
- [ ] `trust_card_expanded` — When user views full trust info
- [ ] `verification_started` — When user initiates verification
- [ ] `verification_completed` — When verification succeeds
- [ ] `trust_level_upgraded` — When seller levels up
- [ ] `safety_nudge_dismissed` — When user closes safety tip
- [ ] `report_submitted` — When user reports listing/user

### Conversion Events

- [ ] `listing_viewed_from_verified_seller` — Track conversion
- [ ] `chat_started_with_verified_seller` — Track engagement
- [ ] `purchase_from_trusted_seller` — Track sales conversion

---

## Accessibility Considerations

- [ ] Trust badges have aria-labels
- [ ] Color is not the only trust indicator (use icons + text)
- [ ] Trust score readable by screen readers
- [ ] High contrast mode support
- [ ] Trust indicators keyboard navigable

---

## Mobile-Specific Trust UI

- [ ] Trust badges visible in card view (not just detail)
- [ ] Swipe to view trust details
- [ ] Pull-to-refresh updates trust indicators
- [ ] Push notifications for trust level changes
- [ ] Haptic feedback on trust milestones

---

## Implementation Priority

### Phase 1 (Critical)

1. TrustBadge component (already exists)
2. TrustCard component (already exists)
3. Phone verification UI
4. Location verification UI
5. Safety nudge in chat

### Phase 2 (Important)

1. Trust score calculation
2. Profile completeness meter
3. Freshness badges
4. Filter by verified sellers
5. Report/block functionality

### Phase 3 (Enhancement)

1. Trust analytics dashboard
2. Trust milestone celebrations
3. Trust-based pricing suggestions
4. Trust-based search ranking
5. Trust-based notifications

---

## Testing Checklist

### Visual Testing

- [ ] Trust badges render correctly at all sizes
- [ ] Trust cards display all required info
- [ ] Safety nudges appear at right moments
- [ ] Freshness badges update correctly

### Functional Testing

- [ ] Trust score calculates correctly
- [ ] Verification flow works end-to-end
- [ ] Report/block functionality works
- [ ] Trust level upgrades trigger correctly

### User Testing

- [ ] Users understand trust badges
- [ ] Trust indicators increase confidence
- [ ] Safety tips are noticed and valued
- [ ] Verification process is not frustrating

---

_Last updated: March 2026_
_Version: 1.0_
