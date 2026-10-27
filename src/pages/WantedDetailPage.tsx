import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getWantedById } from '../api/wanted';
import { useApi } from '../hooks/useApi';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusViews';
import { PosterPortrait, ThreatLevel } from '../components/WantedCard';
import type { WantedDetail } from '../types/api';
import { isRecord } from '../utils/guards';
import {
  FRUIT_LABELS,
  ROLE_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  formatBerries,
  formatDateTime,
  labelFor,
} from '../utils/format';

export function WantedDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { data, error, loading, retry } = useApi<WantedDetail>(
    id ? `wanted-detail:${id}` : null,
    (signal) => getWantedById(id, signal),
  );

  // ¿Llegamos desde el listado? Entonces "volver" = atrás en el historial:
  // recupera la URL exacta (filtros, página) y la posición del scroll.
  const cameFromList = isRecord(location.state) && typeof location.state.fromList === 'string';

  function goBack() {
    if (cameFromList) navigate(-1);
    else navigate('/wanted');
  }

  const backButton = (
    <button type="button" onClick={goBack} className="btn-secondary">
      ← Volver al listado
    </button>
  );

  if (error?.status === 404) {
    return (
      <div className="space-y-4">
        {backButton}
        <EmptyState
          title="Cartel no encontrado"
          description="Este cartel no existe en el tablón de tu tripulación."
          className="min-h-80"
          action={
            <Link to="/wanted" className="btn-primary mt-2">
              Ver todos los carteles
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {backButton}

      {error && !data ? (
        <ErrorState error={error} onRetry={retry} title="No pudimos cargar el cartel" className="min-h-80" />
      ) : !data ? (
        <LoadingState label="Desenrollando el cartel…" className="min-h-80" />
      ) : (
        <article className="paper-card grid gap-6 p-5 md:grid-cols-[18rem_1fr]">
          <div>
            <p className="text-center font-display text-3xl tracking-[0.3em]">SE BUSCA</p>
            <PosterPortrait name={data.name} className="mt-3 h-56" />
            <p className="mt-3 text-center text-xs tracking-widest text-ink-500 uppercase">Vivo o muerto</p>
            <p className="text-center font-display text-3xl text-seal-700">{formatBerries(data.bounty)}</p>
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl">{data.name}</h1>
              <p className="text-lg text-ink-500 italic">“{data.epithet}”</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[data.status] ?? 'bg-parchment-300'}`}>
                  {labelFor(STATUS_LABELS, data.status)}
                </span>
                <ThreatLevel level={data.threatLevel} />
                {loading && <span className="text-xs text-ink-500">Actualizando…</span>}
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="field-label">Tripulación</dt>
                <dd>{data.crew.name}</dd>
              </div>
              <div>
                <dt className="field-label">Puesto</dt>
                <dd>{labelFor(ROLE_LABELS, data.role)}</dd>
              </div>
              <div>
                <dt className="field-label">Fruta del diablo</dt>
                <dd>
                  {data.devilFruit
                    ? `${data.devilFruit.name} (${labelFor(FRUIT_LABELS, data.devilFruit.type)})`
                    : 'Ninguna'}
                </dd>
              </div>
              <div>
                <dt className="field-label">Edad · Estatura</dt>
                <dd>
                  {data.age} años · {data.heightCm} cm
                </dd>
              </div>
              <div>
                <dt className="field-label">Visto por última vez</dt>
                <dd>
                  {data.lastSeen.island} · {formatDateTime(data.lastSeen.seenAt)}
                </dd>
              </div>
              <div>
                <dt className="field-label">Actualizado</dt>
                <dd>{formatDateTime(data.updatedAt)}</dd>
              </div>
            </dl>

            {data.bio && (
              <div>
                <h2 className="field-label">Reseña</h2>
                <p className="leading-relaxed text-ink-700">{data.bio}</p>
              </div>
            )}

            <div>
              <h2 className="field-label">Historial de recompensas</h2>
              {data.bountyHistory.length === 0 ? (
                <p className="text-sm text-ink-500">Sin historial.</p>
              ) : (
                <ol className="mt-1 divide-y divide-ink-300 rounded-md border-2 border-ink-300 bg-parchment-100 text-sm">
                  {data.bountyHistory.map((entry, index) => (
                    <li key={`${entry.issuedAt}-${index}`} className="flex justify-between gap-2 px-3 py-2">
                      <span>{formatDateTime(entry.issuedAt)}</span>
                      <span className="font-semibold">{formatBerries(entry.amount)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
