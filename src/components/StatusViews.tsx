// Estados reutilizables: cargando, error con reintento y vacío.

import type { ReactNode } from 'react';
import type { ApiError } from '../api/client';

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-ink-500">
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-ink-300 border-t-seal-600 motion-reduce:animate-none"
      />
      <span className="text-sm">{label}</span>
    </span>
  );
}

export function LoadingState({ label = 'Cargando…', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex min-h-40 items-center justify-center ${className}`}>
      <Spinner label={label} />
    </div>
  );
}

interface ErrorStateProps {
  error: ApiError;
  onRetry: () => void;
  title?: string;
  className?: string;
  /** Acción extra (p. ej. "Limpiar filtros"). */
  extraAction?: ReactNode;
}

export function ErrorState({ error, onRetry, title = 'No pudimos cargar esto', className = '', extraAction }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-seal-600/50 bg-parchment-50/70 p-6 text-center ${className}`}
    >
      <p className="font-display text-xl text-seal-700">{title}</p>
      <p className="max-w-md text-sm text-ink-700">{error.message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onRetry} className="btn-primary">
          Reintentar
        </button>
        {extraAction}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-300 bg-parchment-50/60 p-6 text-center ${className}`}
    >
      <p className="font-display text-xl text-ink-700">{title}</p>
      {description && <p className="max-w-md text-sm text-ink-500">{description}</p>}
      {action}
    </div>
  );
}

/** Pantalla completa mientras se valida la sesión guardada (nunca se muestra el login aquí). */
export function SplashScreen({ error, onRetry }: { error?: ApiError | null; onRetry?: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-display text-4xl text-ink-900">Log Pose Console</p>
      {error && onRetry ? (
        <>
          <p className="max-w-sm text-ink-700">{error.message}</p>
          <button type="button" onClick={onRetry} className="btn-primary">
            Reintentar
          </button>
        </>
      ) : (
        <Spinner label="Verificando la sesión de la tripulación…" />
      )}
    </div>
  );
}
