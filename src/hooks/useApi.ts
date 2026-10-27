// Hook reutilizable de datos: loading / error / data / retry.
//
// PROTECCIÓN CONTRA RESPUESTAS ANTIGUAS (race conditions), dos capas:
//  1. AbortController: cuando cambia la `key` (otros filtros, otra página) el cleanup
//     del useEffect cancela la request anterior.
//  2. requestId: cada ejecución incrementa un contador; una respuesta solo se guarda
//     si su id sigue siendo el último. Aunque una respuesta vieja "se escape" del abort,
//     nunca pisa a la más reciente.
// Además el estado guarda la `key` a la que pertenecen los datos: si la key actual
// no coincide, esos datos NO se muestran (regla del Log Pose: nunca un rumbo falso).

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, isAbortError, toApiError } from '../api/client';

// Caché simple en memoria (por key exacta). Permite que al volver de un detalle
// el listado aparezca al instante en la misma posición, y luego se revalida.
const responseCache = new Map<string, unknown>();

export function clearApiCache(): void {
  responseCache.clear();
}

interface ApiState<T> {
  key: string | null;
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

export interface UseApiResult<T> {
  data: T | null;
  error: ApiError | null;
  /** true mientras hay una request en vuelo para la key actual. */
  loading: boolean;
  retry: () => void;
}

interface UseApiOptions {
  /** Mostrar al instante la última respuesta guardada para esta misma key. */
  cache?: boolean;
}

/**
 * @param key  Identifica QUÉ se está pidiendo. Si cambia, se hace una nueva request.
 *             `null` = no pedir nada todavía.
 * @param fetcher Función que hace la request usando el AbortSignal recibido.
 */
export function useApi<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const useCache = options.cache ?? false;

  const readCache = (k: string | null): T | null =>
    useCache && k !== null && responseCache.has(k) ? (responseCache.get(k) as T) : null;

  const [state, setState] = useState<ApiState<T>>(() => ({
    key,
    data: readCache(key),
    error: null,
    loading: key !== null,
  }));
  const [retryCount, setRetryCount] = useState(0);

  // Guardamos el fetcher en un ref para no tener que ponerlo en las dependencias
  // (es una función nueva en cada render y causaría un bucle de requests).
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const latestRequestId = useRef(0);

  useEffect(() => {
    if (key === null) return;

    const requestId = ++latestRequestId.current;
    const controller = new AbortController();

    setState((prev) => ({
      key,
      // Si es la misma key (reintento) conservamos lo que había; si es otra, solo la caché de ESA key.
      data: prev.key === key && prev.data !== null ? prev.data : readCache(key),
      error: null,
      loading: true,
    }));

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        // Respuesta vieja → se descarta.
        if (controller.signal.aborted || requestId !== latestRequestId.current) return;
        if (useCache) responseCache.set(key, result);
        setState({ key, data: result, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || requestId !== latestRequestId.current) return;
        // Conservamos los datos que ya había para esta misma key.
        setState((prev) => ({
          key,
          data: prev.key === key ? prev.data : null,
          error: toApiError(error),
          loading: false,
        }));
      });

    // Cleanup: al cambiar la key o desmontar, cancelamos la request en vuelo.
    return () => controller.abort();
    // Solo key y retryCount disparan una nueva request (a propósito).
  }, [key, retryCount]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  // Durante el primer render tras cambiar la key, el estado aún es de la key vieja:
  // en ese caso NO devolvemos esos datos.
  const isCurrent = state.key === key;
  return {
    data: isCurrent ? state.data : readCache(key),
    error: isCurrent ? state.error : null,
    loading: key !== null && (!isCurrent || state.loading),
    retry,
  };
}
