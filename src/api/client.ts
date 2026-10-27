// Cliente HTTP único de la app (wrapper de fetch).
// - Lee la URL base de VITE_API_BASE_URL (nunca hardcodeada).
// - Inyecta el token: Authorization: Bearer <jwt>.
// - Convierte cualquier error del servidor en un ApiError tipado.
// - Ante un 401 en una ruta protegida avisa al AuthContext para cerrar la sesión.

import type { ApiErrorDetail } from '../types/api';
import { isRecord } from '../utils/guards';

// ---------- Token en localStorage ----------
const TOKEN_KEY = 'logpose.token';

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Sin localStorage (modo privado estricto): la sesión vive solo en memoria.
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // nada que limpiar
    }
  },
};

// ---------- ApiError ----------
export class ApiError extends Error {
  /** Código HTTP. 0 = no hubo respuesta (red caída, servidor dormido, CORS). */
  readonly status: number;
  /** Código del contrato: VALIDATION_ERROR, TOKEN_EXPIRED, NOT_FOUND, etc. */
  readonly code: string;
  /** Errores por campo (de `details`), p. ej. { email: "Formato inválido" }. */
  readonly fieldErrors: Record<string, string>;
  /** Cuerpo completo del error (p. ej. `current` en 409 NEWS_ALREADY_VERIFIED). */
  readonly body: unknown;

  constructor(message: string, status: number, code: string, fieldErrors: Record<string, string> = {}, body: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.body = body;
  }
}

/** true si la request se canceló con AbortController (no es un error real). */
export function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === 'AbortError';
}

/** Normaliza cualquier cosa lanzada a un ApiError para mostrarla en la UI. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) return new ApiError(error.message, 0, 'CLIENT_ERROR');
  return new ApiError('Ocurrió un error inesperado.', 0, 'CLIENT_ERROR');
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'La solicitud tiene datos inválidos.',
  401: 'Tu sesión no es válida. Inicia sesión de nuevo.',
  403: 'No tienes permiso para esta acción.',
  404: 'No encontramos lo que buscas.',
  409: 'Hay un conflicto con los datos enviados.',
  423: 'Necesitas el Log Pose para entrar al Grand Line.',
  429: 'Demasiadas solicitudes seguidas. Espera un momento.',
};

function isErrorDetail(value: unknown): value is ApiErrorDetail {
  return isRecord(value) && typeof value.field === 'string' && typeof value.message === 'string';
}

/** Construye el ApiError a partir del cuerpo { status, code, message, details } del contrato. */
function buildApiError(status: number, body: unknown): ApiError {
  const fallback = DEFAULT_MESSAGES[status] ?? (status >= 500 ? 'El servidor tuvo un problema. Intenta de nuevo.' : 'Error inesperado.');

  if (!isRecord(body)) return new ApiError(fallback, status, `HTTP_${status}`);

  const message = typeof body.message === 'string' && body.message.trim() !== '' ? body.message : fallback;
  const code = typeof body.code === 'string' ? body.code : `HTTP_${status}`;

  const fieldErrors: Record<string, string> = {};
  if (Array.isArray(body.details)) {
    for (const detail of body.details) {
      // Si un campo trae varios errores, nos quedamos con el primero.
      if (isErrorDetail(detail) && !(detail.field in fieldErrors)) {
        fieldErrors[detail.field] = detail.message;
      }
    }
  }

  return new ApiError(message, status, code, fieldErrors, body);
}

// ---------- Manejo global de 401 ----------
let unauthorizedHandler: (() => void) | null = null;

/** El AuthContext registra aquí qué hacer cuando la sesión deja de ser válida. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

// ---------- Request ----------
type QueryValue = string | number | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /** false para login/registro: no envía token y un 401 NO cierra la sesión. */
  auth?: boolean;
}

function getBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    throw new ApiError('Falta la variable VITE_API_BASE_URL en el archivo .env.', 0, 'MISSING_BASE_URL');
  }
  return baseUrl.replace(/\/+$/, '');
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (text === '') return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Hace la request y devuelve el JSON tipado como T.
 * Lanza ApiError si la respuesta no es 2xx, o el AbortError si se canceló.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, auth = true } = options;

  const url = new URL(getBaseUrl() + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      // Los params vacíos no se envían (el servidor los trata como ausentes).
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenStorage.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(
      'No se pudo conectar con el servidor. Revisa tu conexión (el servidor puede tardar en despertar) e inténtalo de nuevo.',
      0,
      'NETWORK_ERROR',
    );
  }

  let data: unknown;
  try {
    data = await readBody(response);
  } catch (error) {
    if (isAbortError(error)) throw error;
    data = null;
  }

  if (!response.ok) {
    const apiError = buildApiError(response.status, data);
    // Sesión vencida o token inválido en una ruta protegida → cerrar sesión global.
    if (response.status === 401 && auth) unauthorizedHandler?.();
    throw apiError;
  }

  return data as T;
}
