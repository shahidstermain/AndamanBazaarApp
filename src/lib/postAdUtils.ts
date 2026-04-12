import { DraftListing, ContactPreferences, ItemCondition } from "../types";
import { safeRandomUUID } from "./random";

// ===== CONSTANTS =====

const DRAFT_KEY_PREFIX = "draft_listing_";
const DRAFT_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// ===== DRAFT AUTOSAVE =====

/**
 * Get the localStorage key for the current user's draft
 */
function getDraftKey(userId: string): string {
  return `${DRAFT_KEY_PREFIX}${userId}`;
}

/**
 * Save or update a draft listing to localStorage.
 * Debounced externally — this is the raw save function.
 */
export function saveDraft(userId: string, draft: Partial<DraftListing>): void {
  try {
    const existing = loadDraft(userId);
    const merged: DraftListing = {
      step: draft.step ?? existing?.step ?? 1,
      title: draft.title ?? existing?.title ?? "",
      description: draft.description ?? existing?.description ?? "",
      price: draft.price ?? existing?.price ?? "",
      condition: (draft.condition ??
        existing?.condition ??
        "good") as ItemCondition,
      is_negotiable: draft.is_negotiable ?? existing?.is_negotiable ?? true,
      min_price: draft.min_price ?? existing?.min_price,
      item_age: draft.item_age ?? existing?.item_age,
      has_warranty: draft.has_warranty ?? existing?.has_warranty ?? false,
      warranty_expiry: draft.warranty_expiry ?? existing?.warranty_expiry,
      has_invoice: draft.has_invoice ?? existing?.has_invoice ?? false,
      accessories: draft.accessories ?? existing?.accessories ?? [],
      city: draft.city ?? existing?.city ?? "Port Blair",
      area: draft.area ?? existing?.area ?? "",
      category: draft.category ?? existing?.category,
      subcategory: draft.subcategory ?? existing?.subcategory,
      contact_preferences: draft.contact_preferences ??
        existing?.contact_preferences ?? { chat: true },
      image_previews: draft.image_previews ?? existing?.image_previews ?? [],
      idempotency_key:
        draft.idempotency_key ??
        existing?.idempotency_key ??
        generateIdempotencyKey(),
      updated_at: Date.now(),
    };
    localStorage.setItem(getDraftKey(userId), JSON.stringify(merged));
  } catch (e) {
    console.warn("Failed to save draft:", e);
  }
}

/**
 * Load a draft listing from localStorage.
 * Returns null if no draft exists or if the draft has expired.
 */
export function loadDraft(userId: string): DraftListing | null {
  try {
    const raw = localStorage.getItem(getDraftKey(userId));
    if (!raw) return null;

    const draft = JSON.parse(raw) as DraftListing;

    // Check TTL expiry (72 hours)
    if (Date.now() - draft.updated_at > DRAFT_TTL_MS) {
      clearDraft(userId);
      return null;
    }

    return draft;
  } catch (e) {
    console.warn("Failed to load draft:", e);
    return null;
  }
}

/**
 * Clear the draft for a user (after successful publish or manual clear).
 */
export function clearDraft(userId: string): void {
  try {
    localStorage.removeItem(getDraftKey(userId));
  } catch (e) {
    console.warn("Failed to clear draft:", e);
  }
}

/**
 * Check if a draft exists for the current user.
 */
export function hasDraft(userId: string): boolean {
  return loadDraft(userId) !== null;
}

// ===== IDEMPOTENCY KEY =====

/**
 * Generate a UUID v4 idempotency key for preventing duplicate submissions.
 */
export function generateIdempotencyKey(): string {
  return safeRandomUUID();
}

// ===== DEBOUNCE HELPER =====

/**
 * Creates a debounced version of a function.
 * Used for draft autosave (3-second debounce).
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

// ===== CONTACT PREFERENCES HELPERS =====

export const DEFAULT_CONTACT_PREFERENCES: ContactPreferences = {
  chat: true,
  phone: false,
  whatsapp: false,
};

/**
 * Load saved contact preferences from localStorage.
 */
export function loadContactPreferences(): ContactPreferences {
  try {
    const raw = localStorage.getItem("contact_preferences");
    if (!raw) return DEFAULT_CONTACT_PREFERENCES;
    return JSON.parse(raw) as ContactPreferences;
  } catch {
    return DEFAULT_CONTACT_PREFERENCES;
  }
}

/**
 * Save contact preferences to localStorage for reuse across listings.
 */
export function saveContactPreferences(prefs: ContactPreferences): void {
  try {
    localStorage.setItem("contact_preferences", JSON.stringify(prefs));
  } catch (e) {
    console.warn("Failed to save contact preferences:", e);
  }
}

// ===== ANDAMAN ISLANDS =====

export const ANDAMAN_CITIES = [
  "Port Blair",
  "Havelock",
  "Neil Island",
  "Diglipur",
  "Mayabunder",
  "Rangat",
  "Campbell Bay",
  "Car Nicobar",
  "Kamorta",
  "Little Andaman",
] as const;

export type AndamanCity = (typeof ANDAMAN_CITIES)[number];

// ===== ITEM AGE OPTIONS =====

export const ITEM_AGE_OPTIONS = [
  { value: "<1m", label: "Less than 1 month" },
  { value: "1-6m", label: "1–6 months" },
  { value: "6-12m", label: "6–12 months" },
  { value: "1-2y", label: "1–2 years" },
  { value: "2-5y", label: "2–5 years" },
  { value: "5y+", label: "5+ years" },
] as const;

// ===== CONDITION OPTIONS =====

export const CONDITION_OPTIONS = [
  { value: "new", label: "New", description: "Unused, sealed or with tags" },
  {
    value: "like_new",
    label: "Like New",
    description: "Used briefly, no visible wear",
  },
  {
    value: "good",
    label: "Good",
    description: "Works perfectly, minor cosmetic wear",
  },
  {
    value: "fair",
    label: "Fair",
    description: "Functional, visible signs of use",
  },
] as const;

// ===== CATEGORIES =====

export const CATEGORIES = [
  { id: "mobiles", name: "Mobiles", icon: "📱" },
  { id: "vehicles", name: "Vehicles", icon: "🏍️" },
  { id: "home", name: "Home", icon: "🏠" },
  { id: "fashion", name: "Fashion", icon: "👗" },
  { id: "property", name: "Property", icon: "🏢" },
  { id: "services", name: "Services", icon: "🔧" },
  { id: "other", name: "Other", icon: "📦" },
] as const;
