/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT_MS: string;
  readonly VITE_REALTIME_URL: string;
  readonly VITE_MAPS_PROVIDER: string;
  readonly VITE_MAPS_API_KEY: string;
  readonly VITE_APP_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
