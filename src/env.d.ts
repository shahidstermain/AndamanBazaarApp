/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
    readonly VITE_FIREBASE_MEASUREMENT_ID: string;
    readonly VITE_FIREBASE_CREATE_PAYMENT_FUNCTION?: string;
    readonly VITE_FIREBASE_VERIFY_PAYMENT_FUNCTION?: string;
    readonly VITE_FIREBASE_VERIFY_LOCATION_FUNCTION?: string;
    readonly VITE_FIREBASE_MODERATE_CONTENT_FUNCTION?: string;
    readonly VITE_FIREBASE_CREATE_INVOICE_FUNCTION?: string;
    readonly VITE_FIREBASE_WEBHOOK_FUNCTION?: string;
    readonly VITE_FIREBASE_HEALTH_FUNCTION?: string;
    readonly VITE_FIREBASE_SECURE_SYNC_FUNCTION?: string;
    readonly VITE_FIREBASE_AI_SUGGEST_FUNCTION?: string;
    readonly VITE_CASHFREE_ENV?: string;
    readonly VITE_RATE_LIMIT_WINDOW?: string;
    readonly VITE_RATE_LIMIT_MAX_REQUESTS?: string;
    readonly VITE_ENABLE_CSP?: string;
    readonly VITE_ENV?: string;
    readonly VITE_E2E_BYPASS_AUTH?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
