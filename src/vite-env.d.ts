/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REB_API_KEY: string;
  readonly VITE_CORS_PROXY: string;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}