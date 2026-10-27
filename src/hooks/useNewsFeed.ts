// Feed de noticias con infinite scroll basado en cursor.
//
// Reglas que cumple:
//  - Una sola carga en vuelo: `inFlightRef` guarda el AbortController de la request actual;
//    si ya hay una, loadMore() no hace nada.
//  - Ninguna noticia dos veces (regla de Nami): al agregar un bloque se filtran los ids ya vistos.
//  - Cambiar filtros con una carga en vuelo NUNCA mezcla resultados: se aborta la request,
//    y además cada respuesta trae la `key` de sus filtros; si ya no es la actual, se descarta.
//  - Un error NO borra lo ya cargado: se guarda aparte y se puede reintentar.
//  - Al volver del detalle no se vuelve a pedir nada: el feed vive en una caché en memoria
//    (por filtros) y el componente arranca desde ahí.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getNewsFeed } from '../api/news';
import { ApiError, isAbortError, toApiError } from '../api/client';
import type { NewsItem } from '../types/api';
import { newsFiltersKey, parseNewsFilters, type NewsFilters } from '../utils/newsFilters';

export interface FeedState {
  /** Filtros a los que pertenece este feed (newsFiltersKey). */
  key: string;
  items: NewsItem[];
  nextCursor: string | null;
  hasMore: boolean;
  /** true después de la primera respuesta exitosa. */
  loaded: boolean;
  loading: boolean;
  error: ApiError | null;
}

function emptyFeed(key: string): FeedState {
  return { key, items: [], nextCursor: null, hasMore: true, loaded: false, loading: false, error: null };
}

// ---------- Caché de feeds (por filtros) ----------
const feedCache = new Map<string, FeedState>();

export function clearNewsFeedCache(): void {
  feedCache.clear();
}

/**
 * Tras verificar una noticia, actualiza su estado en todos los feeds guardados.
 * Si un feed está filtrado por un estado que ya no coincide (p. ej. status=RUMOR), se quita de ahí.
 */
export function applyNewsUpdateToFeeds(updated: NewsItem): void {
  for (const [key, feed] of feedCache) {
    const filters = parseNewsFilters(new URLSearchParams(key));
    const stillMatches = filters.status === '' || filters.status === updated.status;
    const items = stillMatches
      ? feed.items.map((item) => (item.id === updated.id ? { ...item, ...pickItemFields(updated) } : item))
      : feed.items.filter((item) => item.id !== updated.id);
    feedCache.set(key, { ...feed, items });
  }
}

/** Solo los campos de NewsItem (sin `body` del detalle). */
function pickItemFields(news: NewsItem): NewsItem {
  return {
    id: news.id,
    type: news.type,
    priority: news.priority,
    status: news.status,
    title: news.title,
    summary: news.summary,
    source: news.source,
    island: news.island,
    relatedWanted: news.relatedWanted,
    publishedAt: news.publishedAt,
    updatedAt: news.updatedAt,
    verifiedAt: news.verifiedAt,
  };
}

const CURSOR_ERRORS = new Set(['INVALID_CURSOR', 'CURSOR_FILTER_MISMATCH']);

export function useNewsFeed(filters: NewsFilters) {
  const key = newsFiltersKey(filters);

  const [feed, setFeedState] = useState<FeedState>(() => feedCache.get(key) ?? emptyFeed(key));

  // Refs con lo más reciente (los callbacks asíncronos los leen sin quedar "congelados").
  const feedRef = useRef(feed);
  const keyRef = useRef(key);
  const filtersRef = useRef(filters);
  const inFlightRef = useRef<AbortController | null>(null);

  /** Actualiza estado + ref + caché a la vez (solo si el feed sigue siendo el de los filtros actuales). */
  const commit = useCallback((next: FeedState) => {
    if (next.key !== keyRef.current) return;
    feedRef.current = next;
    feedCache.set(next.key, next);
    setFeedState(next);
  }, []);

  // Cambio de filtros: abortar la carga en vuelo y arrancar el feed de los nuevos filtros.
  useEffect(() => {
    keyRef.current = key;
    filtersRef.current = filters;
    const initial = feedCache.get(key) ?? emptyFeed(key);
    // Una carga que quedó "en vuelo" en caché ya no existe: la marcamos como no cargando.
    const clean = { ...initial, loading: false };
    feedRef.current = clean;
    setFeedState(clean);

    return () => {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
    // Solo `key` dispara el efecto: filters cambia junto con key (key se deriva de filters).
  }, [key]);

  const loadMore = useCallback(() => {
    const current = feedRef.current;
    if (inFlightRef.current) return; // una sola carga adicional en vuelo
    if (current.key !== keyRef.current) return;
    if (current.loaded && !current.hasMore) return; // fin de la lista

    const requestKey = current.key;
    const controller = new AbortController();
    inFlightRef.current = controller;
    commit({ ...current, loading: true, error: null });

    getNewsFeed(filtersRef.current, current.loaded ? current.nextCursor : null, controller.signal)
      .then((response) => {
        if (controller.signal.aborted || requestKey !== keyRef.current) return; // respuesta de otros filtros
        const latest = feedRef.current;
        const seen = new Set(latest.items.map((item) => item.id));
        const freshItems = response.items.filter((item) => !seen.has(item.id)); // sin duplicados
        commit({
          ...latest,
          items: [...latest.items, ...freshItems],
          nextCursor: response.nextCursor,
          hasMore: response.hasMore && response.nextCursor !== null,
          loaded: true,
          loading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || requestKey !== keyRef.current) return;
        const apiError = toApiError(error);
        if (CURSOR_ERRORS.has(apiError.code)) {
          // Cursor inválido o de otros filtros: el contrato dice "pedir el feed sin cursor".
          commit(emptyFeed(requestKey));
          return;
        }
        // Conservamos las noticias ya cargadas; solo guardamos el error.
        commit({ ...feedRef.current, loading: false, error: apiError });
      })
      .finally(() => {
        if (inFlightRef.current === controller) inFlightRef.current = null;
      });
  }, [commit]);

  // Primera carga de estos filtros (si no venían de la caché).
  useEffect(() => {
    if (feed.key === key && !feed.loaded && !feed.loading && !feed.error) loadMore();
  }, [feed.key, feed.loaded, feed.loading, feed.error, key, loadMore]);

  const retry = useCallback(() => {
    commit({ ...feedRef.current, error: null });
    loadMore();
  }, [commit, loadMore]);

  return { feed: feed.key === key ? feed : emptyFeed(key), loadMore, retry };
}
