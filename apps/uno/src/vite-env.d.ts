/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG: string;
  readonly VITE_DEBUG_TOUCH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
