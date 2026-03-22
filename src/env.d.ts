/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_KEY: string;
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
    readonly VITE_FIREBASE_MEASUREMENT_ID: string;
    readonly VITE_RATE_LIMIT_WINDOW?: string;
    readonly VITE_RATE_LIMIT_MAX_REQUESTS?: string;
    readonly VITE_ENABLE_CSP?: string;
    readonly VITE_ENV?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
