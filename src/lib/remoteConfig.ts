import { getRemoteConfig, fetchAndActivate, getValue, RemoteConfig } from 'firebase/remote-config';
import app from './firebase';

// ============================================================
// Firebase Remote Config — Feature flags & pricing overrides
// ============================================================
// Default values are the source of truth when offline or before
// the first fetch. They mirror src/lib/pricing.ts constants.

const DEFAULTS: Record<string, string | number | boolean> = {
  boost_spark_price_inr: 49,
  boost_boost_price_inr: 99,
  boost_power_price_inr: 199,
  boost_spark_days: 3,
  boost_boost_days: 7,
  boost_power_days: 30,

  max_listing_images: 8,
  max_listings_per_user: 20,
  enable_boost_payments: true,
  enable_location_verification: true,
  enable_ai_moderation: true,
  maintenance_mode: false,
  maintenance_message: '',
  app_min_version: '1.0.0',

  featured_listing_limit: 6,
  chat_message_char_limit: 1000,
  listing_title_max_length: 80,
};

let rc: RemoteConfig | null = null;

const getRC = (): RemoteConfig => {
  if (rc) return rc;
  rc = getRemoteConfig(app);
  rc.settings = {
    minimumFetchIntervalMillis: import.meta.env.PROD ? 3_600_000 : 60_000,
    fetchTimeoutMillis: 10_000,
  };
  rc.defaultConfig = DEFAULTS;
  return rc;
};

// ── Public API ───────────────────────────────────────────────

/**
 * Fetches and activates Remote Config.
 * Safe to call on app start — resolves quickly from cache.
 */
export const initRemoteConfig = async (): Promise<void> => {
  try {
    await fetchAndActivate(getRC());
  } catch (err) {
    console.warn('Remote Config fetch failed (using defaults):', err);
  }
};

export const rcBool = (key: string): boolean =>
  getValue(getRC(), key).asBoolean();

export const rcString = (key: string): string =>
  getValue(getRC(), key).asString();

export const rcNumber = (key: string): number =>
  getValue(getRC(), key).asNumber();

/** Typed helpers for the app's known config keys */
export const remoteConfig = {
  isMaintenanceMode: () => rcBool('maintenance_mode'),
  maintenanceMessage: () => rcString('maintenance_message'),

  isBoostEnabled: () => rcBool('enable_boost_payments'),
  isLocationVerificationEnabled: () => rcBool('enable_location_verification'),
  isAIModerationEnabled: () => rcBool('enable_ai_moderation'),

  boostSparkPrice: () => rcNumber('boost_spark_price_inr'),
  boostBoostPrice: () => rcNumber('boost_boost_price_inr'),
  boostPowerPrice: () => rcNumber('boost_power_price_inr'),

  maxListingImages: () => rcNumber('max_listing_images'),
  maxListingsPerUser: () => rcNumber('max_listings_per_user'),
  featuredListingLimit: () => rcNumber('featured_listing_limit'),
  chatMessageCharLimit: () => rcNumber('chat_message_char_limit'),
};
