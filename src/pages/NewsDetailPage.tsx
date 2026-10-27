// CP4 — Detalle de una noticia y verificación de rumores (PATCH /news/{id}/status).

import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getNewsById, updateNewsStatus } from '../api/news';
import { toApiError, type ApiError } from '../api/client';
import { useApi } from '../hooks/useApi';
import { applyNewsUpdateToFeeds } from '../hooks/useNewsFeed';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusViews';
import { NEWS_STATUSES, type NewsDetail, type NewsVerification } from '../types/api';
import { isOneOf, isRecord } from '../utils/guards';
import {
  NEWS_PRIORITY_CLASSES,
  NEWS_PRIORITY_LABELS,
  NEWS_STATUS_CLASSES,
  NEWS_STATUS_LABELS,
  NEWS_TYPE_LABELS,
  formatDateTime,
} from '../utils/format';

/** En 409 NEWS_ALREADY_VERIFIED el servidor envía `current` con la noticia actual. */
function readCurrentFromConflict(error: ApiError): NewsDetail | null {
  if (!isRecord(error.body)) return null;
  const current = error.body.current;
  if (isRecord(current) && typeof current.id === 'string' && isOneOf(NEWS_STATUSES, current.status)) {
    return current as unknown as NewsDetail;
  }
  return null;
}

export function NewsDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { data, error, retry } = useApi<NewsDetail>(id ? `news-detail:${id}` : null, (signal) => getNewsById(id, signal));

  // Versión actualizada tras verificar (reemplaza a la de la request inicial).
  const [updated, setUpdated] = useState<NewsDetail | null>(null);
  const news = updated && updated.id === id ? updated : data;

  const [pendingStatus, setPendingStatus] = useState<NewsVerification | null>(null);
  const [verifyError, setVerifyError] = useState<ApiError | null>(null);
  const [lastAttempt, setLastAttempt] = useState<NewsVerification | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function verify(status: NewsVerification) {
    if (!news || pendingStatus) return; // acción deshabilitada mientras hay una request en vuelo
    setPendingStatus(status);
    setLastAttempt(status);
    setVerifyError(null);
    setSuccessMessage(null);
    try {
      const result = await updateNewsStatus(news.id, status);
      setUpdated(result);
      applyNewsUpdateToFeeds(result); // el feed mostrará el nuevo estado al volver
      setSuccessMessage(`Noticia marcada como ${NEWS_STATUS_LABELS[result.status].toLowerCase()}.`);
    } catch (err) {
      const apiError = toApiError(err);
      const current = apiError.code === 'NEWS_ALREADY_VERIFIED' ? readCurrentFromConflict(apiError) : null;
      if (current) {
        // Alguien ya la verificó con el otro estado: mostramos el estado real.
        setUpdated(current);
        applyNewsUpdateToFeeds(current);
      }
      // Si falla, NO tocamos el estado mostrado (se conserva el anterior).
      setVerifyError(apiError);
    } finally {
      setPendingStatus(null);
    }
  }

  const cameFromFeed = isRecord(location.state) && typeof location.state.fromFeed === 'string';
  const backButton = (
    <button type="button" className="btn-secondary" onClick={() => (cameFromFeed ? navigate(-1) : navigate('/news'))}>
      ← Volver al feed
    </button>
  );

  if (error?.status === 404) {
    return (
      <div className="space-y-4">
        {backButton}
        <EmptyState title="Noticia no encontrada" description="Esta noticia no existe en tu workspace." className="min-h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {backButton}

      {error && !news ? (
        <ErrorState error={error} onRetry={retry} title="No pudimos cargar la noticia" className="min-h-80" />
      ) : !news ? (
        <LoadingState label="Leyendo la noticia…" className="min-h-80" />
      ) : (
        <article className="paper-card space-y-4 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold tracking-wide text-ink-500 uppercase">{NEWS_TYPE_LABELS[news.type] ?? news.type}</span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${NEWS_PRIORITY_CLASSES[news.priority] ?? ''}`}>
              {NEWS_PRIORITY_LABELS[news.priority] ?? news.priority}
            </span>
            <span className={`rounded-full border-2 px-2 py-0.5 font-semibold ${NEWS_STATUS_CLASSES[news.status] ?? ''}`}>
              {NEWS_STATUS_LABELS[news.status] ?? news.status}
            </span>
          </div>

          <h1 className="font-display text-3xl leading-tight sm:text-4xl">{news.title}</h1>
          <p className="text-sm text-ink-500">
            {news.source} · {news.island} · Publicada {formatDateTime(news.publishedAt)}
            {news.verifiedAt && ` · Verificada ${formatDateTime(news.verifiedAt)}`}
          </p>

          <p className="text-lg text-ink-700">{news.summary}</p>
          <div className="space-y-3 leading-relaxed">
            {news.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {news.relatedWanted && (
            <p className="text-sm">
              Cartel relacionado:{' '}
              <Link to={`/wanted/${encodeURIComponent(news.relatedWanted.id)}`} className="font-semibold text-sea-700 underline">
                {news.relatedWanted.name}
              </Link>
            </p>
          )}

          {/* ---------- Verificación ---------- */}
          <section aria-labelledby="verify-title" className="rounded-md border-2 border-ink-300 bg-parchment-100 p-4">
            <h2 id="verify-title" className="font-display text-lg">
              Verificar rumor
            </h2>
            {news.status === 'RUMOR' ? (
              <>
                <p className="mt-1 text-sm text-ink-500">¿Qué dicen tus informantes sobre esta noticia?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary bg-sea-600 hover:bg-sea-700"
                    disabled={pendingStatus !== null}
                    onClick={() => verify('CONFIRMED')}
                  >
                    {pendingStatus === 'CONFIRMED' ? 'Confirmando…' : 'Confirmar'}
                  </button>
                  <button type="button" className="btn-primary" disabled={pendingStatus !== null} onClick={() => verify('DEBUNKED')}>
                    {pendingStatus === 'DEBUNKED' ? 'Desmintiendo…' : 'Desmentir'}
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-700">
                Esta noticia ya fue verificada como <strong>{NEWS_STATUS_LABELS[news.status]}</strong>.
              </p>
            )}

            <div aria-live="polite" className="mt-3 min-h-6">
              {successMessage && <p className="text-sm font-semibold text-sea-700">✓ {successMessage}</p>}
              {verifyError && (
                <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-seal-700">
                  <span>{verifyError.message}</span>
                  {lastAttempt && news.status === 'RUMOR' && (
                    <button
                      type="button"
                      className="btn-secondary py-1"
                      disabled={pendingStatus !== null}
                      onClick={() => verify(lastAttempt)}
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </article>
      )}
    </div>
  );
}
