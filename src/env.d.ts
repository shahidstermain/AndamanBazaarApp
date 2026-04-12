/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_CASHFREE_PROD: string;
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
