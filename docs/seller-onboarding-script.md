# Seller Onboarding Script — AndamanBazaar

> A trust-first, conversion-optimized onboarding flow for new sellers.

---

## Phase 1: Welcome & Trust Building (First 30 seconds)

### Screen: Welcome Modal
**Headline:** "Welcome to AndamanBazaar — Islanders Trust Islanders"

**Subtext:** "Sell to real neighbours, not anonymous internet strangers. No mainland scams, no shipping headaches."

**Primary CTA:** "Start Selling" (teal button)

**Secondary Link:** "Learn how it works" (ghost button)

---

## Phase 2: Profile Setup (Trust Foundation)

### Screen: Complete Your Seller Profile

**Progress Indicator:** Step 1 of 3

**Copy:**
> "Andaman mein sab jaante hain sab ko — phir bhi ek acchi profile helps buyers trust you faster. Complete profiles sell 3x faster."

**Required Fields:**
1. **Profile Photo** — "Add your photo — buyers trust real faces"
   - Hint: "Selfie works! Just make sure your face is clearly visible."
   - Trust Badge Preview: Shows "Verified" badge placeholder

2. **Display Name** — "Your name as buyers will see it"
   - Placeholder: "e.g., Rahul from Port Blair"

3. **Phone Number** — "For buyers to contact you"
   - Auto-verified via OTP
   - Badge: "✓ Phone Verified" appears instantly

4. **Location** — "Where are you based?"
   - Dropdown: Port Blair, Havelock, Neil, Diglipur, Mayabunder, Rangat, Other
   - Badge: "📍 Location Set"

**Trust Score Preview:**
```
Your Trust Profile
━━━━━━━━━━━━━━━━━━
✓ Phone Verified
✓ Location Set
○ Profile Photo (add to complete)
○ First Listing (post to complete)

Trust Level: Newbie → Verified (2 more steps)
```

**CTA:** "Complete Profile & Continue"

---

## Phase 3: First Listing Creation (Quick Win)

### Screen: Create Your First Listing

**Progress Indicator:** Step 2 of 3

**Copy:**
> "Perfect! Now let's post your first item. Quick listings get more views — detailed listings get more buyers."

**Quick Post Flow (2-step):**

### Step A: What are you selling?
- **Photo Upload** (Required)
  - "Add up to 5 photos — first photo is your cover"
  - Drag & drop or camera icon
  - Compression happens automatically

- **Title** (Required)
  - Placeholder: "e.g., Honda Activa 2019, Fresh Tuna 2kg, iPhone 12"

- **Price** (Required)
  - Placeholder: "₹ Price in rupees"
  - Helper: "Fair prices sell faster. Andaman price, not Amazon price!"

- **Category** (Required)
  - Quick-select chips: Electronics, Vehicles, Fresh Catch, Home & Garden, Fashion, Services, Other

**CTA:** "Next: Add Details"

### Step B: Details & Location
- **Description** (Optional)
  - Placeholder: "Describe your item — condition, reason for selling, any defects"
  - Character counter: 0/500

- **Location** (Auto-filled from profile, editable)
  - "Where can buyers see this item?"

- **Availability** (Optional)
  - Toggle: "Mark as Available Now"
  - Schedule: "Available from [date]"

**Trust Nudge:**
> "💡 Tip: Listings with descriptions get 40% more inquiries. Add a few details!"

**CTA:** "Post Listing" (primary), "Save as Draft" (secondary)

---

## Phase 4: Success & Next Steps

### Screen: Listing Live!

**Progress Indicator:** Step 3 of 3 ✓

**Celebration Animation:** Confetti + listing card preview

**Copy:**
> "🎉 Your listing is LIVE! Islanders can now see it."

**Listing Stats Preview:**
```
Your Listing Performance
━━━━━━━━━━━━━━━━━━━━━━━
👁️ Views: 0 (check back in 1 hour)
💬 Inquiries: 0
⭐ Saves: 0

💡 Boost your listing to get 3x more views
```

**Trust Progress Update:**
```
Your Trust Profile
━━━━━━━━━━━━━━━━━━
✓ Phone Verified
✓ Location Set
✓ Profile Photo
✓ First Listing

Trust Level: Newbie → Verified (complete!)
```

**CTAs:**
1. "View My Listing" (primary)
2. "Post Another Item" (secondary)
3. "Boost This Listing" (teal highlight)

---

## Phase 5: Ongoing Trust Building (Post-Onboarding)

### Trust Score System

**Newbie (0-1 completed)**
- Badge: Gray circle
- Benefits: Basic visibility

**Verified (2-3 completed)**
- Badge: Teal checkmark
- Requirements: Phone + Location + (Photo OR First Listing)
- Benefits: Higher search ranking, "Verified" badge on listings

**Trusted Seller (4+ completed)**
- Badge: Gold star
- Requirements: All profile fields + 5+ successful sales + 4.5+ rating
- Benefits: Top placement, "Trusted Seller" badge, priority support

### Trust-Building Prompts (In-App)

**After 1st sale:**
> "Congratulations on your first sale! 🎉 Add a profile photo to become a Verified Seller."

**After 5th sale:**
> "You're on a roll! 5 successful sales — you're building real trust in the community."

**After buyer leaves review:**
> "You got a ⭐⭐⭐⭐⭐ review! Trust score updated."

---

## Conversion Optimization Notes

### Friction Points Removed:
1. ✓ No email verification required (phone only)
2. ✓ No mandatory description (optional field)
3. ✓ No category drill-down (quick chips)
4. ✓ Auto-compression for photos
5. ✓ Location auto-filled from profile

### Trust Signals Throughout:
1. ✓ "Islanders trust Islanders" messaging
2. ✓ Trust badge previews
3. ✓ Progress indicators
4. ✓ Social proof hints ("listings with descriptions get 40% more inquiries")
5. ✓ Local flavor copy (builds connection)

### CTAs Optimized:
- Primary CTAs: Action-oriented, teal color
- Secondary CTAs: Ghost buttons, non-competing
- Tertiary options: Links, not buttons

---

## Mobile-First Considerations

- All screens fit in viewport (no scrolling on 375px width)
- Large touch targets (48px minimum)
- Camera integration for photo upload
- OTP auto-fill from SMS
- Bottom-sheet for category selection

---

## A/B Test Variants

### Variant A: Trust-First
- Lead with trust messaging
- Show trust badge previews early
- Emphasize "Verified" status

### Variant B: Speed-First
- Lead with "Post in 60 seconds"
- Minimize required fields
- Defer profile completion

**Recommendation:** Start with Variant A (Trust-First) — aligns with brand positioning of "no mainland scams."

---

## Implementation Checklist

- [ ] Welcome modal component
- [ ] Profile setup form with trust preview
- [ ] Quick post 2-step flow
- [ ] Success celebration screen
- [ ] Trust score calculation logic
- [ ] Trust badge display in listings
- [ ] Trust-building notification triggers
- [ ] Analytics events for each step

---

*Last updated: March 2026*
*Version: 1.0*
