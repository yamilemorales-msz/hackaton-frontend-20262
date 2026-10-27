import { Link } from 'react-router-dom';
import { getDashboardSummary, getLogPose } from '../api/dashboard';
import { useApi } from '../hooks/useApi';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusViews';
import { FRUIT_FILTERS, WANTED_STATUSES, type DashboardSummary, type LogPose } from '../types/api';
import {
  FRUIT_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  formatBerries,
  formatDateTime,
  formatNumber,
} from '../utils/format';

function LogPoseCard() {
  const { data, error, loading, retry } = useApi<LogPose>('log-pose', getLogPose);

  return (
    <section aria-labelledby="logpose-title" className="paper-card p-5">
      <h2 id="logpose-title" className="font-display text-xl">
        Log Pose
      </h2>
      {/* min-h fija: loading / error / datos ocupan el mismo alto */}
      <div className="mt-3 min-h-32">
        {error ? (
          <ErrorState error={error} onRetry={retry} title="Sin lectura del Log Pose" className="min-h-32" />
        ) : !data ? (
          <LoadingState label="Leyendo el Log Pose…" className="min-h-32" />
        ) : (
          <div className="space-y-2">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                data.grandLineUnlocked ? 'bg-sea-600 text-parchment-50' : 'bg-ink-700 text-parchment-50'
              }`}
            >
              {data.grandLineUnlocked ? 'GRAND LINE ABIERTO' : 'GRAND LINE BLOQUEADO'}
            </span>
            <p className="text-ink-700">{data.message}</p>
            {data.unlockedAt && <p className="text-xs text-ink-500">Obtenido: {formatDateTime(data.unlockedAt)}</p>}
            {loading && <p className="text-xs text-ink-500">Actualizando…</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border-2 border-ink-300 bg-parchment-100 p-4">
      <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl break-words text-ink-900">{value}</p>
    </div>
  );
}

function SummaryContent({ summary }: { summary: DashboardSummary }) {
  // Estado vacío definido por el contrato: wanted.total === 0.
  if (summary.wanted.total === 0) {
    return (
      <EmptyState
        title="El tablón está vacío"
        description="Tu workspace todavía no tiene carteles de Se Busca."
        className="min-h-64"
      />
    );
  }

  const { wanted, crews, topBounties } = summary;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Carteles" value={formatNumber(wanted.total)} />
        <StatTile label="Recompensa total" value={formatBerries(wanted.totalBounty)} />
        <StatTile label="Recompensa promedio" value={formatBerries(wanted.averageBounty)} />
        <StatTile label="Tripulaciones" value={formatNumber(crews.total)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border-2 border-ink-300 bg-parchment-100 p-4">
          <h3 className="text-sm font-bold tracking-wide text-ink-700 uppercase">Por estado</h3>
          <ul className="mt-3 space-y-2">
            {WANTED_STATUSES.map((status) => (
              <li key={status} className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASSES[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="font-semibold">{formatNumber(wanted.byStatus[status] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border-2 border-ink-300 bg-parchment-100 p-4">
          <h3 className="text-sm font-bold tracking-wide text-ink-700 uppercase">Por fruta del diablo</h3>
          <ul className="mt-3 space-y-2">
            {FRUIT_FILTERS.map((fruit) => (
              <li key={fruit} className="flex items-center justify-between gap-2">
                <span>{FRUIT_LABELS[fruit]}</span>
                <span className="font-semibold">{formatNumber(wanted.byFruit[fruit] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {crews.mostWanted && (
        <div className="rounded-md border-2 border-ink-300 bg-parchment-100 p-4">
          <h3 className="text-sm font-bold tracking-wide text-ink-700 uppercase">Tripulación más buscada</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              aria-hidden="true"
              className="size-6 rounded-full border-2 border-ink-900"
              style={{ backgroundColor: crews.mostWanted.jollyRogerColor }}
            />
            <p className="font-display text-lg">{crews.mostWanted.name}</p>
            <p className="text-sm text-ink-500">
              Barco {crews.mostWanted.shipName} · {crews.mostWanted.memberCount} carteles ·{' '}
              {formatBerries(crews.mostWanted.totalBounty)}
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold tracking-wide text-ink-700 uppercase">Mayores recompensas</h3>
        {topBounties.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">Sin carteles destacados.</p>
        ) : (
          <ol className="mt-3 divide-y divide-ink-300 rounded-md border-2 border-ink-300 bg-parchment-100">
            {topBounties.map((poster, index) => (
              <li key={poster.id}>
                <Link
                  to={`/wanted/${encodeURIComponent(poster.id)}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-parchment-200"
                >
                  <span>
                    <span className="mr-2 font-display text-ink-500">#{index + 1}</span>
                    <span className="font-semibold">{poster.name}</span>
                    <span className="text-ink-500"> “{poster.epithet}”</span>
                  </span>
                  <span className="font-semibold text-seal-700">{formatBerries(poster.bounty)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="text-xs text-ink-500">Calculado: {formatDateTime(summary.generatedAt)}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data, error, loading, retry } = useApi<DashboardSummary>('dashboard-summary', getDashboardSummary);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">Bitácora de la tripulación</h1>
        <p className="text-ink-500">Indicadores de tu workspace en tiempo real.</p>
      </div>

      <LogPoseCard />

      <section aria-labelledby="summary-title" className="paper-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 id="summary-title" className="font-display text-xl">
            Resumen
          </h2>
          {loading && data && <span className="text-xs text-ink-500">Actualizando…</span>}
        </div>
        <div className="mt-4 min-h-64">
          {error ? (
            <ErrorState error={error} onRetry={retry} title="No pudimos cargar el resumen" className="min-h-64" />
          ) : !data ? (
            <LoadingState label="Cargando indicadores…" className="min-h-64" />
          ) : (
            <SummaryContent summary={data} />
          )}
        </div>
      </section>
    </div>
  );
}
