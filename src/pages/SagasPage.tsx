// CP5 — Resumen de las sagas disponibles.

import { Link } from 'react-router-dom';
import { getSagas } from '../api/sagas';
import { useApi } from '../hooks/useApi';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusViews';
import type { SagaSummary } from '../types/api';
import { formatNumber } from '../utils/format';
import { sagaTitleTransitionStyle } from '../utils/viewTransition';

function SagaCard({ saga }: { saga: SagaSummary }) {
  const { palette } = saga;
  return (
    <Link
      to={`/sagas/${encodeURIComponent(saga.id)}`}
      // View Transition API cuando el navegador la soporta; si no, navegación normal.
      viewTransition
      className="block h-full rounded-lg border-2 p-5 shadow-[4px_4px_0_0_var(--color-ink-900)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ backgroundColor: palette.background, color: palette.text, borderColor: palette.primary }}
    >
      <p className="text-xs font-bold tracking-widest uppercase" style={{ color: palette.accent }}>
        Saga {saga.order} · {saga.stageCount} etapas
      </p>
      <h2 className="mt-1 font-display text-2xl" style={sagaTitleTransitionStyle(saga.id)}>
        {saga.title}
      </h2>
      <p className="text-sm opacity-90">{saga.subtitle}</p>
      <p className="mt-3 text-sm leading-relaxed">{saga.synopsis}</p>
      <p className="mt-4 text-xs font-semibold" style={{ color: palette.primary }}>
        {saga.firstIsland} → {saga.lastIsland} · {formatNumber(saga.totalDistanceNm)} mn
      </p>
    </Link>
  );
}

export function SagasPage() {
  const { data, error, retry } = useApi<SagaSummary[]>('sagas', getSagas, { cache: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">Poneglyph</h1>
        <p className="text-ink-500">Las piedras guardan la verdadera historia del Grand Line. Elige una saga.</p>
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={retry} title="No pudimos leer los Poneglyphs" className="min-h-80" />
      ) : !data ? (
        <LoadingState label="Descifrando los Poneglyphs…" className="min-h-80" />
      ) : data.length === 0 ? (
        <EmptyState title="Sin sagas" description="Todavía no hay sagas disponibles." className="min-h-80" />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {[...data]
            .sort((a, b) => a.order - b.order)
            .map((saga) => (
              <li key={saga.id}>
                <SagaCard saga={saga} />
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
