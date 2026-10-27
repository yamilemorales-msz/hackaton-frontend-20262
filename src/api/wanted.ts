import { apiRequest } from './client';
import type { Crew, WantedDetail, WantedPage } from '../types/api';
import type { WantedQuery } from '../utils/wantedQuery';

/** GET /wanted con paginación REAL del servidor: solo pide la página actual. */
export function getWantedPage(query: WantedQuery, signal?: AbortSignal): Promise<WantedPage> {
  return apiRequest<WantedPage>('/wanted', {
    signal,
    query: {
      page: query.page,
      size: query.size,
      sort: query.sort,
      status: query.status,
      crewId: query.crewId,
      fruit: query.fruit,
      q: query.q,
    },
  });
}

export function getWantedById(id: string, signal?: AbortSignal): Promise<WantedDetail> {
  // encodeURIComponent: los ids son opacos, nunca los armamos a mano.
  return apiRequest<WantedDetail>(`/wanted/${encodeURIComponent(id)}`, { signal });
}

export function getCrews(signal?: AbortSignal): Promise<Crew[]> {
  return apiRequest<Crew[]>('/crews', { signal });
}
