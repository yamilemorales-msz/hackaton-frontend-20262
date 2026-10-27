import { isRecord } from './guards';

/**
 * Lee `state.from` (la ruta privada que el usuario quería abrir) de forma segura.
 * Solo acepta rutas internas ("/algo"), nunca URLs externas ("//evil.com").
 */
export function getRedirectTarget(state: unknown): string {
  if (isRecord(state) && typeof state.from === 'string') {
    const from = state.from;
    if (from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/login') && !from.startsWith('/register')) {
      return from;
    }
  }
  return '/';
}
