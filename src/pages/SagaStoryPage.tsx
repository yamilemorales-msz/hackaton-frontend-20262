// CP5 — La saga contada como scrollytelling, 100% con la data de GET /sagas/{id}/story.
//
// Piezas clave:
//  - Etapa activa: un IntersectionObserver mira qué etapa cruza la franja central de la pantalla.
//  - Mapa persistente (sticky): el barco se mueve a la isla de la etapa activa y la ruta
//    recorrida se dibuja hasta ahí.
//  - Colores y métricas: salen SIEMPRE de la etapa activa (variables CSS --story-*).
//  - URL: ?stage=<slug>. Abrir esa URL lleva directo a esa etapa.
//  - Scroll-driven animations (CSS) si el navegador las soporta; si no, JS equivalente.
//  - prefers-reduced-motion: sin animaciones, todo el contenido sigue visible.
//  - Teclado: botones de etapa (Tab + Enter) y flechas ← → para ir a la anterior/siguiente.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getSagaStory } from '../api/sagas';
import { useApi } from '../hooks/useApi';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusViews';
import type { Palette, SagaStage, SagaStory, StageMetric } from '../types/api';
import { formatBerries, formatNumber } from '../utils/format';
import { prefersReducedMotion, sagaTitleTransitionStyle } from '../utils/viewTransition';

// ---------- Utilidades ----------

/** Paleta de la etapa activa como variables CSS (las usan las clases bg-[var(--story-bg)], etc.). */
function paletteVars(palette: Palette): CSSProperties {
  const vars = {
    '--story-bg': palette.background,
    '--story-surface': palette.surface,
    '--story-primary': palette.primary,
    '--story-accent': palette.accent,
    '--story-text': palette.text,
  };
  return vars as unknown as CSSProperties;
}

function formatMetric(metric: StageMetric): string {
  if (metric.unit === 'berries') return formatBerries(metric.value);
  if (metric.unit === '%') return `${formatNumber(metric.value)} %`;
  if (metric.unit.startsWith('/')) return `${formatNumber(metric.value)}${metric.unit}`;
  return `${formatNumber(metric.value)} ${metric.unit}`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

// ---------- Barra de progreso de scroll ----------

/**
 * Con soporte de CSS Scroll-driven Animations, la barra se anima con `animation-timeline: scroll()`
 * (ver index.css). Sin soporte (o con reduced motion) calculamos el progreso en JS y lo pasamos
 * como variable CSS: el resultado visual es el mismo.
 */
function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cssHandlesIt = CSS.supports('animation-timeline: scroll()') && !prefersReducedMotion();
    if (cssHandlesIt) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      barRef.current?.style.setProperty('--scroll-progress', String(progress));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className="story-scroll-progress fixed inset-x-0 top-0 z-50 h-1.5 origin-left bg-[var(--story-primary)]"
    />
  );
}

// ---------- Mapa del Grand Line ----------

function GrandLineMap({ story, stages, activeIndex }: { story: SagaStory; stages: SagaStage[]; activeIndex: number }) {
  const { width, height } = story.map;
  const active = stages[activeIndex];
  const allPoints = stages.map((s) => `${s.island.x},${s.island.y}`).join(' ');
  // Ruta recorrida: desde la primera isla hasta la etapa activa.
  const traveledPoints = stages
    .slice(0, activeIndex + 1)
    .map((s) => `${s.island.x},${s.island.y}`)
    .join(' ');

  function labelAnchor(x: number): 'start' | 'middle' | 'end' {
    if (x > width * 0.85) return 'end';
    if (x < width * 0.15) return 'start';
    return 'middle';
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Mapa del Grand Line. El barco está en ${active?.island.name ?? ''}, etapa ${activeIndex + 1} de ${stages.length}.`}
      className="h-auto w-full rounded-lg border-2 border-[var(--story-primary)] bg-[var(--story-surface)]"
    >
      {/* Olas decorativas */}
      {Array.from({ length: 6 }, (_, i) => (
        <path
          key={i}
          d={`M0 ${((i + 0.5) * height) / 6} q ${width / 20} -12 ${width / 10} 0 t ${width / 10} 0 t ${width / 10} 0 t ${width / 10} 0 t ${width / 10} 0 t ${width / 10} 0 t ${width / 10} 0 t ${width / 10} 0 t ${width / 10} 0 t ${width / 10} 0`}
          fill="none"
          stroke="var(--story-text)"
          strokeOpacity="0.08"
          strokeWidth="3"
        />
      ))}

      {/* Ruta completa (pendiente) */}
      <polyline points={allPoints} fill="none" stroke="var(--story-text)" strokeOpacity="0.3" strokeWidth="4" strokeDasharray="10 12" />
      {/* Ruta recorrida */}
      <polyline
        points={traveledPoints}
        fill="none"
        stroke="var(--story-primary)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {stages.map((stage, index) => {
        const visited = index <= activeIndex;
        const isActive = index === activeIndex;
        const labelY = stage.island.y < 40 ? stage.island.y + 40 : stage.island.y - 24;
        return (
          <g key={stage.id}>
            <circle
              cx={stage.island.x}
              cy={stage.island.y}
              r={isActive ? 15 : 10}
              fill={visited ? 'var(--story-accent)' : 'var(--story-bg)'}
              stroke="var(--story-text)"
              strokeWidth="3"
            />
            <text
              x={stage.island.x}
              y={labelY}
              textAnchor={labelAnchor(stage.island.x)}
              fontSize={isActive ? 26 : 20}
              fontWeight={isActive ? 700 : 500}
              fill="var(--story-text)"
              opacity={isActive ? 1 : 0.75}
            >
              {stage.island.name}
            </text>
          </g>
        );
      })}

      {/* Barco: se traslada a la isla activa (la transición CSS se desactiva con reduced motion) */}
      {active && (
        <g className="story-ship" style={{ transform: `translate(${active.island.x}px, ${active.island.y}px)` }}>
          <g transform="translate(0,-34)">
            <path d="M-22 6 L22 6 L14 18 L-14 18 Z" fill="var(--story-primary)" stroke="var(--story-text)" strokeWidth="2.5" />
            <line x1="0" y1="6" x2="0" y2="-24" stroke="var(--story-text)" strokeWidth="3" />
            <path d="M2 -22 L20 0 L2 0 Z" fill="var(--story-accent)" stroke="var(--story-text)" strokeWidth="2" />
          </g>
        </g>
      )}
    </svg>
  );
}

// ---------- Historia ----------

function StoryView({ story }: { story: SagaStory }) {
  const stages = useMemo(() => [...story.stages].sort((a, b) => a.order - b.order), [story.stages]);
  const [searchParams, setSearchParams] = useSearchParams();

  // Etapa inicial: la que indica la URL (?stage=slug). Si no existe, la primera.
  const urlSlug = searchParams.get('stage');
  const urlIndex = stages.findIndex((s) => s.slug === urlSlug);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, urlIndex));

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  });

  /** Ir a una etapa: scroll hasta su sección y foco en su título (no se salta contenido). */
  const goToStage = useCallback(
    (index: number) => {
      const clamped = Math.min(stages.length - 1, Math.max(0, index));
      const section = sectionRefs.current[clamped];
      if (!section) return;
      setActiveIndex(clamped);
      section.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      headingRefs.current[clamped]?.focus({ preventScroll: true });
    },
    [stages.length],
  );

  // Deep link: si la URL trae una etapa, saltamos directo a ella al abrir (sin animación).
  const didInitialScroll = useRef(false);
  useLayoutEffect(() => {
    if (didInitialScroll.current) return;
    didInitialScroll.current = true;
    if (urlIndex > 0) sectionRefs.current[urlIndex]?.scrollIntoView({ block: 'start' });
  }, [urlIndex]);

  // Etapa activa por scroll: la que cruza la franja central de la pantalla.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.stageIndex);
          if (Number.isInteger(index)) setActiveIndex(index);
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const section of sectionRefs.current) if (section) observer.observe(section);
    return () => observer.disconnect();
  }, [stages]);

  // Etapa activa → URL (replace: no llena el historial; preventScrollReset: no salta arriba).
  useEffect(() => {
    const slug = stages[activeIndex]?.slug;
    if (!slug || searchParamsRef.current.get('stage') === slug) return;
    setSearchParams({ stage: slug }, { replace: true, preventScrollReset: true });
  }, [activeIndex, stages, setSearchParams]);

  // Teclado: ← → para etapa anterior/siguiente (↑ ↓ siguen haciendo scroll normal).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToStage(activeIndex + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToStage(activeIndex - 1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, goToStage]);

  const active = stages[activeIndex] ?? stages[0];
  if (!active) {
    return <EmptyState title="Saga sin etapas" description="Esta saga todavía no tiene historia." className="min-h-80" />;
  }

  const progressPercent = ((activeIndex + 1) / stages.length) * 100;

  return (
    <div
      className="story-root -mx-4 bg-[var(--story-bg)] px-4 pt-4 pb-[45vh] text-[var(--story-text)] sm:mx-0 sm:rounded-xl sm:px-6"
      style={paletteVars(active.palette)}
    >
      <ScrollProgressBar />

      <Link
        to="/sagas"
        viewTransition
        className="inline-block rounded-md border-2 border-[var(--story-primary)] px-3 py-1.5 text-sm font-semibold"
      >
        ← Todas las sagas
      </Link>

      <header className="mx-auto max-w-3xl py-8 text-center">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--story-accent)' }}>
          Saga {story.saga.order} · {story.saga.firstIsland} → {story.saga.lastIsland}
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl" style={sagaTitleTransitionStyle(story.saga.id)}>
          {story.saga.title}
        </h1>
        <p className="mt-2 text-lg opacity-90">{story.saga.subtitle}</p>
        <p className="mt-4 leading-relaxed">{story.saga.intro}</p>
        <p className="mt-4 text-xs opacity-75">Desplázate para navegar · Usa ← → o los botones de etapa con el teclado</p>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8">
        {/* ---------- Panel persistente: progreso, mapa y métricas ---------- */}
        <aside
          aria-label="Bitácora del recorrido"
          className="sticky top-0 z-10 -mx-4 bg-[var(--story-bg)] px-4 pt-3 pb-3 lg:top-6 lg:mx-0 lg:self-start lg:px-0"
        >
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span>
              Etapa {activeIndex + 1} de {stages.length} · {active.island.name}
            </span>
            <span>{Math.round(progressPercent)} %</span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso del recorrido"
            aria-valuemin={1}
            aria-valuemax={stages.length}
            aria-valuenow={activeIndex + 1}
            className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--story-surface)]"
          >
            <div className="story-progress-fill h-full rounded-full bg-[var(--story-primary)]" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="mt-2">
            <GrandLineMap story={story} stages={stages} activeIndex={activeIndex} />
          </div>

          {/* Métricas: SIEMPRE las de la etapa activa */}
          <dl className="mt-2 grid grid-cols-2 gap-1.5 text-xs sm:gap-2 lg:text-sm">
            {active.metrics.map((metric) => (
              <div key={metric.key} className="rounded-md bg-[var(--story-surface)] px-2 py-1.5">
                <dt className="opacity-80">{metric.label}</dt>
                <dd className="font-bold" style={{ color: 'var(--story-primary)' }}>
                  {formatMetric(metric)}
                </dd>
              </div>
            ))}
          </dl>

          {/* Navegación por teclado entre etapas */}
          <nav aria-label="Etapas de la saga" className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => goToStage(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="rounded-md border-2 border-[var(--story-primary)] px-2 py-0.5 text-sm font-semibold disabled:opacity-40"
              aria-label="Etapa anterior"
            >
              ←
            </button>
            {stages.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => goToStage(index)}
                aria-current={index === activeIndex ? 'step' : undefined}
                aria-label={`Etapa ${index + 1}: ${stage.title}`}
                className={`size-7 rounded-full border-2 border-[var(--story-primary)] text-xs font-bold ${
                  index === activeIndex ? 'bg-[var(--story-primary)] text-[var(--story-bg)]' : ''
                }`}
              >
                {index + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goToStage(activeIndex + 1)}
              disabled={activeIndex === stages.length - 1}
              className="rounded-md border-2 border-[var(--story-primary)] px-2 py-0.5 text-sm font-semibold disabled:opacity-40"
              aria-label="Etapa siguiente"
            >
              →
            </button>
          </nav>
        </aside>

        {/* ---------- Etapas (narrativa activada por scroll) ---------- */}
        <ol className="mt-6 space-y-[30vh] lg:mt-0">
          {stages.map((stage, index) => (
            <li key={stage.id}>
              <section
                id={`etapa-${stage.slug}`}
                ref={(element) => {
                  sectionRefs.current[index] = element;
                }}
                data-stage-index={index}
                aria-labelledby={`stage-title-${stage.id}`}
                className="flex min-h-[60vh] scroll-mt-[24rem] items-center sm:scroll-mt-[28rem] lg:scroll-mt-10"
              >
                <article
                  data-active={index === activeIndex}
                  className="story-stage-card w-full rounded-xl border-2 border-[var(--story-primary)] bg-[var(--story-surface)] p-5 shadow-lg sm:p-7"
                >
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--story-accent)' }}>
                    Etapa {stage.order} · {stage.island.name}
                  </p>
                  <h2
                    id={`stage-title-${stage.id}`}
                    ref={(element) => {
                      headingRefs.current[index] = element;
                    }}
                    tabIndex={-1}
                    className="mt-1 font-display text-2xl sm:text-3xl"
                  >
                    {stage.title}
                  </h2>
                  <div className="mt-3 space-y-3 leading-relaxed">
                    {stage.narrative.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              </section>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function SagaStoryPage() {
  const { id = '' } = useParams();
  const { data, error, retry } = useApi<SagaStory>(id ? `saga-story:${id}` : null, (signal) => getSagaStory(id, signal), {
    cache: true,
  });

  if (error?.status === 404) {
    return (
      <EmptyState
        title="Saga no encontrada"
        description="Este Poneglyph no existe en tu workspace."
        className="min-h-80"
        action={
          <Link to="/sagas" viewTransition className="btn-primary mt-2">
            Ver todas las sagas
          </Link>
        }
      />
    );
  }
  if (error && !data) return <ErrorState error={error} onRetry={retry} title="No pudimos leer este Poneglyph" className="min-h-80" />;
  if (!data) return <LoadingState label="Descifrando el Poneglyph…" className="min-h-80" />;

  // key: si cambia la saga, el componente arranca de cero (etapa, refs, scroll).
  return <StoryView key={data.saga.id} story={data} />;
}
