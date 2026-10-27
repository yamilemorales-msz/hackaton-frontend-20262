/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API, p. ej. https://logpose-api-jg7f.onrender.com/api/v1 */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
