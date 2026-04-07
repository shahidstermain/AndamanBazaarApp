export const SECRET_NAMES = {
  GCP_SERVICE_ACCOUNT_JSON: 'GCP_SERVICE_ACCOUNT_JSON',
  GEMINI_API_KEY: 'GEMINI_API_KEY',
  CASHFREE_APP_ID: 'CASHFREE_APP_ID',
  CASHFREE_SECRET_KEY: 'CASHFREE_SECRET_KEY',
  // CASHFREE_WEBHOOK_SECRET removed - v2025-01-01 uses CASHFREE_SECRET_KEY for webhook verification (HMAC of x-webhook-ts + rawBody)
} as const;

export const ADMIN_SECRET_BINDINGS = [
  SECRET_NAMES.GCP_SERVICE_ACCOUNT_JSON,
];

export const CASHFREE_SECRET_BINDINGS = [
  SECRET_NAMES.GCP_SERVICE_ACCOUNT_JSON,
  SECRET_NAMES.CASHFREE_APP_ID,
  SECRET_NAMES.CASHFREE_SECRET_KEY,
  // CASHFREE_WEBHOOK_SECRET removed - v2025-01-01 uses CASHFREE_SECRET_KEY
];

export const MODERATION_SECRET_BINDINGS = [
  SECRET_NAMES.GCP_SERVICE_ACCOUNT_JSON,
  SECRET_NAMES.GEMINI_API_KEY,
];

export const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`${name} is not configured`);
  }

  return value;
};
