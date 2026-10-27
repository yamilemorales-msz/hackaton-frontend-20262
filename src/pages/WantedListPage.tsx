// CP2 — Listado de carteles "Se Busca".
//
// La URL es la única fuente de verdad del estado (page, size, sort, status, crewId, fruit, q).
// Flujo:  URL → parseWantedQuery (valida) → useApi(key) → GET /wanted
//         controles → updateQuery → URL (push al historial: atrás/adelante funciona)

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { getCrews, getWantedPage } from '../api/wanted';
import { useApi } from '../hooks/useApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Pagination } from '../components/Pagination';
import { WantedCard, WantedCardSkeleton } from '../components/WantedCard';
import { EmptyState, ErrorState } from '../components/StatusViews';
import {
  FRUIT_FILTERS,
  PAGE_SIZES,
  WANTED_SORTS,
  WANTED_STATUSES,
  type Crew,
  type FruitFilter,
  type PageSize,
  type WantedPage,
  type WantedSort,
  type WantedStatus,
} from '../types/api';
import {
  DEFAULT_WANTED_QUERY,
  hasActiveFilters,
  parseWantedQuery,
  toWantedSearchParams,
  wantedQueryKey,
  type WantedQuery,
} from '../utils/wantedQuery';
import { isOneOf } from '../utils/guards';
import { FRUIT_LABELS, SORT_LABELS, STATUS_LABELS, formatNumber } from '../utils/format';

const SEARCH_DEBOUNCE_MS = 400;

export function WantedListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1) Leer y validar la URL. Valores inválidos ya vienen corregidos a sus defaults.
  const query = useMemo(() => parseWantedQuery(searchParams), [searchParams]);
  const canonicalSearch = toWantedSearchParams(query).toString();

  // Siempre tenemos a mano la URL más reciente (para efectos que no deben re-ejecutarse por ella).
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  });

  // 2) Si la URL traía basura (page=-1, size=7, sort=xyz...), la reemplazamos por la versión limpia.
  //    replace: true → no ensucia el historial.
  useEffect(() => {
    if (canonicalSearch !== searchParams.toString()) {
      setSearchParams(new URLSearchParams(canonicalSearch), { replace: true });
    }
  }, [canonicalSearch, searchParams, setSearchParams]);

  /**
   * Cambia parte del estado en la URL. Cambiar filtros, búsqueda, orden o tamaño
   * SIEMPRE vuelve a la página 0 (la página actual podría no existir con el nuevo filtro).
   */
  function updateQuery(patch: Partial<WantedQuery>, { resetPage = true } = {}) {
    const current = parseWantedQuery(searchParamsRef.current);
    const next: WantedQuery = { ...current, ...patch, ...(resetPage ? { page: 0 } : {}) };
    setSearchParams(toWantedSearchParams(next));
  }

  // 3) Búsqueda con debounce: el input es estado local; solo el valor "quieto" va a la URL.
  const [searchInput, setSearchInput] = useState(query.q);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  // URL → input: si q cambia por atrás/adelante o "limpiar", el input lo refleja.
  useEffect(() => {
    setSearchInput((current) => (current.trim() === query.q ? current : query.q));
  }, [query.q]);

  // input (debounced) → URL. Solo cuando el usuario dejó de escribir 400 ms.
  useEffect(() => {
    const normalized = debouncedSearch.trim().slice(0, 100);
    const current = parseWantedQuery(searchParamsRef.current);
    if (current.q === normalized) return; // nada cambió: no tocamos la URL
    setSearchParams(toWantedSearchParams({ ...current, q: normalized, page: 0 }));
  }, [debouncedSearch, setSearchParams]);

  // 4) Datos. La key depende de TODO el estado: si cambia, useApi cancela la request vieja
  //    (AbortController) y descarta cualquier respuesta que no sea la última (requestId).
  const requestKey = wantedQueryKey(query);
  const { data, error, loading, retry } = useApi<WantedPage>(
    requestKey,
    (signal) => getWantedPage(query, signal),
    { cache: true },
  );

  const crews = useApi<Crew[]>('crews', getCrews, { cache: true });

  // 5) La página pedida ya no existe (p. ej. compartieron ?page=40 o se borraron datos):
  //    el servidor responde content: [] con totalPages correcto → vamos a la última válida.
  const pageOutOfRange = data !== null && query.page > 0 && query.page >= data.totalPages;
  useEffect(() => {
    if (!pageOutOfRange || data === null) return;
    const lastValidPage = Math.max(0, data.totalPages - 1);
    const current = parseWantedQuery(searchParamsRef.current);
    setSearchParams(toWantedSearchParams({ ...current, page: lastValidPage }), { replace: true });
  }, [pageOutOfRange, data, setSearchParams]);

  function handlePageChange(page: number) {
    updateQuery({ page }, { resetPage: false });
    window.scrollTo({ top: 0 });
  }

  function clearFilters() {
    setSearchInput('');
    updateQuery({ q: '', status: '', crewId: '', fruit: '' });
  }

  const fromList = `${location.pathname}${location.search}`;
  const filtersActive = hasActiveFilters(query);
  const skeletonCount = Math.min(query.size, 12);

  // Opciones de tripulación: si la URL trae un crewId que no está en la lista, igual lo mostramos.
  const crewOptions = crews.data ?? [];
  const crewIdUnknown = query.crewId !== '' && crews.data !== null && !crewOptions.some((c) => c.id === query.crewId);

  // ---------- Contenido del área de resultados (mismo alto mínimo en todos los estados) ----------
  let results: ReactNode;
  if (error && !data) {
    results = (
      <ErrorState
        error={error}
        onRetry={retry}
        title="No pudimos traer los carteles"
        className="min-h-[36rem]"
        extraAction={
          filtersActive ? (
            <button type="button" className="btn-secondary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          ) : undefined
        }
      />
    );
  } else if (!data || pageOutOfRange) {
    results = (
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <li key={i}>
            <WantedCardSkeleton />
          </li>
        ))}
      </ul>
    );
  } else if (data.content.length === 0) {
    results = (
      <EmptyState
        title="Sin resultados"
        description={
          filtersActive
            ? 'Ningún cartel coincide con estos filtros.'
            : 'Todavía no hay carteles en el tablón de tu workspace.'
        }
        className="min-h-[36rem]"
        action={
          filtersActive ? (
            <button type="button" className="btn-secondary mt-2" onClick={clearFilters}>
              Limpiar filtros
            </button>
          ) : undefined
        }
      />
    );
  } else {
    results = (
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.content.map((poster) => (
          <li key={poster.id}>
            <WantedCard poster={poster} fromList={fromList} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">Carteles de Se Busca</h1>
        <p className="text-ink-500">Filtra, busca y ordena los carteles del tablón de la Guild.</p>
      </div>

      {/* ---------- Controles ---------- */}
      <section aria-label="Filtros" className="paper-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor="wanted-search" className="field-label">
            Buscar por nombre o epíteto
          </label>
          <input
            id="wanted-search"
            type="search"
            value={searchInput}
            maxLength={100}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Ej. Ancla Roja"
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="wanted-status" className="field-label">
            Estado
          </label>
          <select
            id="wanted-status"
            className="field-input"
            value={query.status}
            onChange={(event) => {
              const value = event.target.value;
              updateQuery({ status: isOneOf<WantedStatus>(WANTED_STATUSES, value) ? value : '' });
            }}
          >
            <option value="">Todos</option>
            {WANTED_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="wanted-crew" className="field-label">
            Tripulación
          </label>
          <select
            id="wanted-crew"
            className="field-input"
            value={query.crewId}
            disabled={crews.data === null && !crews.error}
            onChange={(event) => updateQuery({ crewId: event.target.value })}
          >
            <option value="">{crews.data === null && !crews.error ? 'Cargando…' : 'Todas'}</option>
            {crewIdUnknown && <option value={query.crewId}>Tripulación desconocida</option>}
            {crewOptions.map((crew) => (
              <option key={crew.id} value={crew.id}>
                {crew.name}
              </option>
            ))}
          </select>
          {crews.error && (
            <button type="button" onClick={crews.retry} className="mt-1 text-xs font-semibold text-seal-700 underline">
              No cargaron las tripulaciones. Reintentar
            </button>
          )}
        </div>

        <div>
          <label htmlFor="wanted-fruit" className="field-label">
            Fruta del diablo
          </label>
          <select
            id="wanted-fruit"
            className="field-input"
            value={query.fruit}
            onChange={(event) => {
              const value = event.target.value;
              updateQuery({ fruit: isOneOf<FruitFilter>(FRUIT_FILTERS, value) ? value : '' });
            }}
          >
            <option value="">Todas</option>
            {FRUIT_FILTERS.map((fruit) => (
              <option key={fruit} value={fruit}>
                {FRUIT_LABELS[fruit]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="wanted-sort" className="field-label">
            Ordenar por
          </label>
          <select
            id="wanted-sort"
            className="field-input"
            value={query.sort}
            onChange={(event) => {
              const value = event.target.value;
              updateQuery({ sort: isOneOf<WantedSort>(WANTED_SORTS, value) ? value : DEFAULT_WANTED_QUERY.sort });
            }}
          >
            {WANTED_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 sm:col-span-2 lg:col-span-6">
          <div className="flex items-center gap-2">
            <label htmlFor="wanted-size" className="text-sm text-ink-700">
              Por página
            </label>
            <select
              id="wanted-size"
              className="field-input w-auto py-1"
              value={query.size}
              onChange={(event) => {
                const value = Number(event.target.value);
                updateQuery({ size: isOneOf<PageSize>(PAGE_SIZES, value) ? value : DEFAULT_WANTED_QUERY.size });
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn-secondary py-1.5" onClick={clearFilters} disabled={!filtersActive && searchInput === ''}>
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* ---------- Resumen (alto fijo para no mover el layout) ---------- */}
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-2 text-sm text-ink-700" aria-live="polite">
        <span>
          {data && !pageOutOfRange
            ? `${formatNumber(data.totalElements)} cartel${data.totalElements === 1 ? '' : 'es'} encontrado${data.totalElements === 1 ? '' : 's'}`
            : error && !data
              ? ' '
              : 'Buscando carteles…'}
        </span>
        {loading && data && <span className="text-ink-500">Actualizando…</span>}
        {error && data && (
          <span className="text-seal-700">
            No se pudo actualizar.{' '}
            <button type="button" onClick={retry} className="font-semibold underline">
              Reintentar
            </button>
          </span>
        )}
      </div>

      {/* ---------- Resultados ---------- */}
      <section aria-label="Resultados" className="min-h-[36rem]">
        {results}
      </section>

      <Pagination
        page={query.page}
        totalPages={data?.totalPages ?? 0}
        onPageChange={handlePageChange}
        disabled={!data || loading}
      />
    </div>
  );
}
