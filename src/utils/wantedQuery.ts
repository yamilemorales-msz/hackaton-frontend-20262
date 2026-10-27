// Estado del listado /wanted <-> URL.
// La URL es la ÚNICA fuente de verdad: page, size, sort, status, crewId, fruit y q
// se leen siempre de ?query. Así recargar, compartir o usar atrás/adelante
// reconstruye exactamente la misma vista.

import {
  FRUIT_FILTERS,
  PAGE_SIZES,
  WANTED_SORTS,
  WANTED_STATUSES,
  type FruitFilter,
  type PageSize,
  type WantedSort,
  type WantedStatus,
} from '../types/api';
import { isOneOf } from './guards';

export interface WantedQuery {
  page: number;
  size: PageSize;
  sort: WantedSort;
  status: WantedStatus | '';
  crewId: string;
  fruit: FruitFilter | '';
  q: string;
}

/** Valores por defecto del contrato: page=0, size=20, sort=bounty,desc. */
export const DEFAULT_WANTED_QUERY: WantedQuery = {
  page: 0,
  size: 20,
  sort: 'bounty,desc',
  status: '',
  crewId: '',
  fruit: '',
  q: '',
};

const MAX_Q_LENGTH = 100;
const MAX_CREW_ID_LENGTH = 200;

/**
 * Lee la URL y devuelve un estado SIEMPRE válido.
 * Cualquier valor inválido (page=-3, size=7, sort=hack, status=foo...) cae a su default,
 * así una URL manipulada nunca rompe la vista ni provoca un 400 del servidor.
 */
export function parseWantedQuery(params: URLSearchParams): WantedQuery {
  const rawPage = params.get('page') ?? '';
  const pageNumber = /^\d{1,6}$/.test(rawPage) ? Number(rawPage) : DEFAULT_WANTED_QUERY.page;

  const sizeNumber = Number(params.get('size'));
  const size = isOneOf(PAGE_SIZES, sizeNumber) ? sizeNumber : DEFAULT_WANTED_QUERY.size;

  const rawSort = params.get('sort');
  const sort = isOneOf(WANTED_SORTS, rawSort) ? rawSort : DEFAULT_WANTED_QUERY.sort;

  const rawStatus = params.get('status');
  const status = isOneOf(WANTED_STATUSES, rawStatus) ? rawStatus : '';

  const rawFruit = params.get('fruit');
  const fruit = isOneOf(FRUIT_FILTERS, rawFruit) ? rawFruit : '';

  const rawCrewId = (params.get('crewId') ?? '').trim();
  const crewId = rawCrewId.length <= MAX_CREW_ID_LENGTH ? rawCrewId : '';

  const q = (params.get('q') ?? '').trim().slice(0, MAX_Q_LENGTH);

  return { page: pageNumber, size, sort, status, crewId, fruit, q };
}

/**
 * Convierte el estado a query string "canónico": solo incluye lo que difiere del default
 * y siempre en el mismo orden. URLs cortas y comparables.
 */
export function toWantedSearchParams(query: WantedQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status) params.set('status', query.status);
  if (query.crewId) params.set('crewId', query.crewId);
  if (query.fruit) params.set('fruit', query.fruit);
  if (query.sort !== DEFAULT_WANTED_QUERY.sort) params.set('sort', query.sort);
  if (query.size !== DEFAULT_WANTED_QUERY.size) params.set('size', String(query.size));
  if (query.page !== DEFAULT_WANTED_QUERY.page) params.set('page', String(query.page));
  return params;
}

/** Clave estable de una consulta: sirve para caché y para detectar cambios. */
export function wantedQueryKey(query: WantedQuery): string {
  return `wanted?${toWantedSearchParams(query).toString()}`;
}

export function hasActiveFilters(query: WantedQuery): boolean {
  return query.q !== '' || query.status !== '' || query.crewId !== '' || query.fruit !== '';
}
