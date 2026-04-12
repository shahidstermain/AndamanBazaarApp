import { describe, it, expect } from "vitest";
import { listingSchema, validateFileUpload } from "../../src/lib/validation";

const baseValidListing = {
  title: "Fresh Fishing Boat Engine",
  description:
    "Well maintained engine in excellent condition. Suitable for island fishing use.",
  price: 12000,
  category_id: "vehicles",
  condition: "good" as const,
  city: "Port Blair",
  is_negotiable: true,
  accessories: [],
  contact_preferences: { chat: true, phone: false, whatsapp: false },
};

describe("Create listing validation (deterministic)", () => {
  it("accepts a fully valid listing payload", () => {
    const result = listingSchema.safeParse(baseValidListing);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = listingSchema.safeParse({
      ...baseValidListing,
      title: "",
      description: "",
      category_id: "",
      city: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects price lower than ₹1", () => {
    const result = listingSchema.safeParse({ ...baseValidListing, price: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects price higher than ₹10,000,000", () => {
    const result = listingSchema.safeParse({
      ...baseValidListing,
      price: 10000001,
    });
    expect(result.success).toBe(false);
  });

  it("rejects title with disallowed characters", () => {
    const result = listingSchema.safeParse({
      ...baseValidListing,
      title: "Title<script>alert(1)</script>",
    });
    expect(result.success).toBe(false);
  });
});

describe("File upload validation for listing images", () => {
  const makeFile = (name: string, type: string, sizeBytes = 1024): File => {
    return new File([new Uint8Array(sizeBytes)], name, { type });
  };

  it("accepts valid image types", () => {
    const jpg = makeFile("listing.jpg", "image/jpeg");
    const png = makeFile("listing.png", "image/png");
    const webp = makeFile("listing.webp", "image/webp");

    expect(validateFileUpload(jpg).valid).toBe(true);
    expect(validateFileUpload(png).valid).toBe(true);
    expect(validateFileUpload(webp).valid).toBe(true);
  });

  it("rejects disguised php file with .jpg extension", () => {
    const disguised = makeFile("shell.php.jpg", "application/x-php");
    const result = validateFileUpload(disguised);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  it("rejects oversized image beyond 5MB", () => {
    const oversized = makeFile("huge.jpg", "image/jpeg", 6 * 1024 * 1024);
    const result = validateFileUpload(oversized);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("5MB");
  });

  it("rejects zero-byte files", () => {
    const empty = new File([], "empty.jpg", { type: "image/jpeg" });
    const result = validateFileUpload(empty);
    expect(result.valid).toBe(false);
  });
});
