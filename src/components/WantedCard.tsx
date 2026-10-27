import { Link } from 'react-router-dom';
import type { WantedSummary } from '../types/api';
import {
  FRUIT_LABELS,
  ROLE_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  formatBerries,
  labelFor,
} from '../utils/format';

/** Placeholder genérico (la API no envía imágenes y no usamos arte oficial). */
export function PosterPortrait({ name, className = '' }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden rounded border-2 border-ink-700 bg-gradient-to-b from-parchment-200 to-parchment-300 ${className}`}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-x-0 bottom-0 h-4/5 w-full text-ink-500/35" fill="currentColor">
        <circle cx="50" cy="38" r="20" />
        <path d="M12 100 C 14 70, 34 60, 50 60 C 66 60, 86 70, 88 100 Z" />
      </svg>
      <span className="relative font-display text-3xl text-ink-700">{initials}</span>
    </div>
  );
}

export function ThreatLevel({ level }: { level: number }) {
  const safeLevel = Math.max(0, Math.min(5, Math.round(level)));
  return (
    <span aria-label={`Amenaza ${safeLevel} de 5`} title={`Amenaza ${safeLevel} de 5`} className="tracking-widest text-seal-600">
      {'★'.repeat(safeLevel)}
      <span className="text-ink-300">{'★'.repeat(5 - safeLevel)}</span>
    </span>
  );
}

interface WantedCardProps {
  poster: WantedSummary;
  /** Ruta + query del listado, para que el detalle sepa volver exactamente ahí. */
  fromList: string;
}

export function WantedCard({ poster, fromList }: WantedCardProps) {
  return (
    <Link
      to={`/wanted/${encodeURIComponent(poster.id)}`}
      state={{ fromList }}
      className="paper-card group flex h-full min-h-[19rem] flex-col p-3 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <p className="text-center font-display text-lg tracking-[0.3em] text-ink-900">SE BUSCA</p>
      <PosterPortrait name={poster.name} className="mt-2 h-28" />
      <div className="mt-2 flex flex-1 flex-col text-center">
        <p className="truncate font-semibold text-ink-900 group-hover:underline" title={poster.name}>
          {poster.name}
        </p>
        <p className="truncate text-sm text-ink-500 italic" title={poster.epithet}>
          “{poster.epithet}”
        </p>
        <p className="mt-1 font-display text-xl text-seal-700">{formatBerries(poster.bounty)}</p>
        <div className="mt-auto space-y-1 pt-2 text-xs text-ink-700">
          <div className="flex items-center justify-between gap-2">
            <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_BADGE_CLASSES[poster.status] ?? 'bg-parchment-300'}`}>
              {labelFor(STATUS_LABELS, poster.status)}
            </span>
            <ThreatLevel level={poster.threatLevel} />
          </div>
          <p className="truncate" title={poster.crew.name}>
            {poster.crew.name} · {labelFor(ROLE_LABELS, poster.role)}
          </p>
          <p className="truncate">
            {poster.devilFruit
              ? `${poster.devilFruit.name} (${labelFor(FRUIT_LABELS, poster.devilFruit.type)})`
              : 'Sin fruta del diablo'}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** Mismo tamaño que la tarjeta real: evita saltos de layout mientras carga. */
export function WantedCardSkeleton() {
  return (
    <div aria-hidden="true" className="paper-card flex h-full min-h-[19rem] flex-col gap-2 p-3">
      <div className="mx-auto h-5 w-24 animate-pulse rounded bg-parchment-300 motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded bg-parchment-200 motion-reduce:animate-none" />
      <div className="mx-auto h-4 w-3/4 animate-pulse rounded bg-parchment-300 motion-reduce:animate-none" />
      <div className="mx-auto h-3 w-1/2 animate-pulse rounded bg-parchment-200 motion-reduce:animate-none" />
      <div className="mx-auto h-6 w-2/3 animate-pulse rounded bg-parchment-300 motion-reduce:animate-none" />
      <div className="mt-auto h-10 animate-pulse rounded bg-parchment-200 motion-reduce:animate-none" />
    </div>
  );
}
