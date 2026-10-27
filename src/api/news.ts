import { apiRequest } from './client';
import type { NewsDetail, NewsFeed, NewsVerification } from '../types/api';
import type { NewsFilters } from '../utils/newsFilters';

export const NEWS_PAGE_LIMIT = 20;

/** GET /news/feed. Sin cursor = primera carga; con cursor = siguiente bloque (mismos filtros). */
export function getNewsFeed(filters: NewsFilters, cursor: string | null, signal?: AbortSignal): Promise<NewsFeed> {
  return apiRequest<NewsFeed>('/news/feed', {
    signal,
    query: {
      cursor,
      limit: NEWS_PAGE_LIMIT,
      type: filters.type,
      priority: filters.priority,
      status: filters.status,
    },
  });
}

export function getNewsById(id: string, signal?: AbortSignal): Promise<NewsDetail> {
  return apiRequest<NewsDetail>(`/news/${encodeURIComponent(id)}`, { signal });
}

/** PATCH /news/{id}/status: verifica un RUMOR como CONFIRMED o DEBUNKED. */
export function updateNewsStatus(id: string, status: NewsVerification): Promise<NewsDetail> {
  return apiRequest<NewsDetail>(`/news/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status },
  });
}
