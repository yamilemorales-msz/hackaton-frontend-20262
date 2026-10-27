// CP4 — Feed de noticias con infinite scroll por cursor.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useNewsFeed } from '../hooks/useNewsFeed';
import { EmptyState, ErrorState, Spinner } from '../components/StatusViews';
import {
  NEWS_PRIORITIES,
  NEWS_STATUSES,
  NEWS_TYPES,
  type NewsItem,
  type NewsPriority,
  type NewsStatus,
  type NewsType,
} from '../types/api';
import { hasNewsFilters, parseNewsFilters, toNewsSearchParams, type NewsFilters } from '../utils/newsFilters';
import { isOneOf } from '../utils/guards';
import {
  NEWS_PRIORITY_CLASSES,
  NEWS_PRIORITY_LABELS,
  NEWS_STATUS_CLASSES,
  NEWS_STATUS_LABELS,
  NEWS_TYPE_LABELS,
  formatDateTime,
} from '../utils/format';

function NewsCard({ news, fromFeed }: { news: NewsItem; fromFeed: string }) {
  return (
    <Link
      to={`/news/${encodeURIComponent(news.id)}`}
      state={{ fromFeed }}
      className="paper-card block p-4 transition-colors hover:bg-parchment-100 motion-reduce:transition-none"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold tracking-wide text-ink-500 uppercase">{NEWS_TYPE_LABELS[news.type] ?? news.type}</span>
        <span className={`rounded-full px-2 py-0.5 font-semibold ${NEWS_PRIORITY_CLASSES[news.priority] ?? ''}`}>
          {NEWS_PRIORITY_LABELS[news.priority] ?? news.priority}
        </span>
        <span className={`rounded-full border-2 px-2 py-0.5 font-semibold ${NEWS_STATUS_CLASSES[news.status] ?? ''}`}>
          {NEWS_STATUS_LABELS[news.status] ?? news.status}
        </span>
      </div>
      <h2 className="mt-2 font-display text-xl leading-snug text-ink-900">{news.title}</h2>
      <p className="mt-1 text-sm text-ink-700">{news.summary}</p>
      <p className="mt-2 text-xs text-ink-500">
        {news.source} · {news.island} · {formatDateTime(news.publishedAt)}
      </p>
    </Link>
  );
}

export function NewsFeedPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseNewsFilters(searchParams), [searchParams]);
  const canonical = toNewsSearchParams(filters).toString();

  // URL con filtros inválidos → versión limpia (sin ensuciar el historial).
  useEffect(() => {
    if (canonical !== searchParams.toString()) {
      setSearchParams(new URLSearchParams(canonical), { replace: true });
    }
  }, [canonical, searchParams, setSearchParams]);

  const { feed, loadMore, retry } = useNewsFeed(filters);

  // ---------- Infinite scroll: sentinel al final de la lista ----------
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [sentinelVisible, setSentinelVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => setSentinelVisible(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: '400px 0px' }, // empieza a cargar un poco antes de llegar al final
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Si el sentinel está visible y se puede cargar más, cargamos. Como depende del estado,
  // vuelve a evaluarse cuando termina cada carga (útil si la lista aún no llena la pantalla).
  useEffect(() => {
    if (sentinelVisible && feed.loaded && feed.hasMore && !feed.loading && !feed.error) loadMore();
  }, [sentinelVisible, feed.loaded, feed.hasMore, feed.loading, feed.error, loadMore]);

  function updateFilters(patch: Partial<NewsFilters>) {
    setSearchParams(toNewsSearchParams({ ...filters, ...patch }));
  }

  const filtersActive = hasNewsFilters(filters);
  const fromFeed = `${location.pathname}${location.search}`;
  const firstLoadFailed = feed.error !== null && feed.items.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">News Coo</h1>
        <p className="text-ink-500">Noticias del mundo, entregadas por la gaviota mensajera.</p>
      </div>

      <section aria-label="Filtros" className="paper-card grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label htmlFor="news-type" className="field-label">
            Tipo
          </label>
          <select
            id="news-type"
            className="field-input"
            value={filters.type}
            onChange={(event) => {
              const value = event.target.value;
              updateFilters({ type: isOneOf<NewsType>(NEWS_TYPES, value) ? value : '' });
            }}
          >
            <option value="">Todos</option>
            {NEWS_TYPES.map((type) => (
              <option key={type} value={type}>
                {NEWS_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="news-priority" className="field-label">
            Prioridad
          </label>
          <select
            id="news-priority"
            className="field-input"
            value={filters.priority}
            onChange={(event) => {
              const value = event.target.value;
              updateFilters({ priority: isOneOf<NewsPriority>(NEWS_PRIORITIES, value) ? value : '' });
            }}
          >
            <option value="">Todas</option>
            {NEWS_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {NEWS_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="news-status" className="field-label">
            Estado
          </label>
          <select
            id="news-status"
            className="field-input"
            value={filters.status}
            onChange={(event) => {
              const value = event.target.value;
              updateFilters({ status: isOneOf<NewsStatus>(NEWS_STATUSES, value) ? value : '' });
            }}
          >
            <option value="">Todos</option>
            {NEWS_STATUSES.map((status) => (
              <option key={status} value={status}>
                {NEWS_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section aria-label="Noticias" aria-busy={feed.loading} className="min-h-96">
        {firstLoadFailed && feed.error ? (
          <ErrorState error={feed.error} onRetry={retry} title="No llegaron las noticias" className="min-h-96" />
        ) : feed.loaded && feed.items.length === 0 ? (
          <EmptyState
            title="Sin noticias"
            description={filtersActive ? 'No hay noticias con estos filtros.' : 'La gaviota no trajo noticias todavía.'}
            className="min-h-96"
            action={
              filtersActive ? (
                <button type="button" className="btn-secondary mt-2" onClick={() => setSearchParams(new URLSearchParams())}>
                  Limpiar filtros
                </button>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-3">
            {feed.items.map((news) => (
              <li key={news.id}>
                <NewsCard news={news} fromFeed={fromFeed} />
              </li>
            ))}
          </ul>
        )}

        {/* Pie del feed: cargando / error con reintento / fin de la lista */}
        <div className="flex min-h-20 items-center justify-center py-4" aria-live="polite">
          {feed.loading ? (
            <Spinner label={feed.items.length === 0 ? 'Cargando noticias…' : 'Cargando más noticias…'} />
          ) : feed.error && feed.items.length > 0 ? (
            <div role="alert" className="flex flex-wrap items-center justify-center gap-3 text-sm text-seal-700">
              <span>No se pudieron cargar más noticias: {feed.error.message}</span>
              <button type="button" className="btn-secondary py-1" onClick={retry}>
                Reintentar
              </button>
            </div>
          ) : feed.loaded && !feed.hasMore && feed.items.length > 0 ? (
            <p className="text-sm text-ink-500">— Fin de las noticias —</p>
          ) : null}
        </div>
        {/* Sentinel: cuando entra en pantalla se pide el siguiente bloque */}
        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      </section>
    </div>
  );
}
