import { describe, it, expect } from "vitest";
import { listingSchema } from "../src/lib/validation";

describe("Phase 10: Post Ad Validation", () => {
  const baseListing = {
    title: "Test iPhone 15",
    description: "Perfect condition with original box.",
    price: 50000,
    category_id: "mobiles",
    condition: "like_new",
    city: "Port Blair",
    contact_preferences: { chat: true, phone: false, whatsapp: false },
  };

  it("should validate a valid listing with new Phase 10 fields", () => {
    const validListing = {
      ...baseListing,
      item_age: "1-6m",
      is_negotiable: true,
      min_price: 45000,
      has_warranty: true,
      accessories: ["Charger", "Box"],
    };
    const result = listingSchema.safeParse(validListing);
    expect(result.success).toBe(true);
  });

  it("should fail if min_price is greater than price", () => {
    const invalidListing = {
      ...baseListing,
      is_negotiable: true,
      min_price: 60000,
    };
    const result = listingSchema.safeParse(invalidListing);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "Minimum price must be less than the listing price",
      );
    }
  });

  it("should fail if too many accessories are added", () => {
    const invalidListing = {
      ...baseListing,
      accessories: Array(20).fill("Accessory"),
    };
    const result = listingSchema.safeParse(invalidListing);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "Maximum 15 accessories",
      );
    }
  });

  it("should fail if item_age is invalid", () => {
    const invalidListing = {
      ...baseListing,
      item_age: "10y", // Not in enum
    };
    const result = listingSchema.safeParse(invalidListing);
    expect(result.success).toBe(false);
  });

  it("should accept empty accessories array by default", () => {
    const result = listingSchema.safeParse(baseListing);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accessories).toEqual([]);
    }
  });
});
