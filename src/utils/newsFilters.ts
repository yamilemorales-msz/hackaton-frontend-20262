// Filtros del feed /news <-> URL (type, priority, status). Igual que en /wanted:
// la URL es la fuente de verdad y los valores inválidos se descartan.

import {
  NEWS_PRIORITIES,
  NEWS_STATUSES,
  NEWS_TYPES,
  type NewsPriority,
  type NewsStatus,
  type NewsType,
} from '../types/api';
import { isOneOf } from './guards';

export interface NewsFilters {
  type: NewsType | '';
  priority: NewsPriority | '';
  status: NewsStatus | '';
}

export function parseNewsFilters(params: URLSearchParams): NewsFilters {
  const type = params.get('type');
  const priority = params.get('priority');
  const status = params.get('status');
  return {
    type: isOneOf(NEWS_TYPES, type) ? type : '',
    priority: isOneOf(NEWS_PRIORITIES, priority) ? priority : '',
    status: isOneOf(NEWS_STATUSES, status) ? status : '',
  };
}

export function toNewsSearchParams(filters: NewsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.status) params.set('status', filters.status);
  return params;
}

/** Clave estable de un conjunto de filtros: identifica "qué feed" es. */
export function newsFiltersKey(filters: NewsFilters): string {
  return toNewsSearchParams(filters).toString();
}

export function hasNewsFilters(filters: NewsFilters): boolean {
  return filters.type !== '' || filters.priority !== '' || filters.status !== '';
}
