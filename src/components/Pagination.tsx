interface PaginationProps {
  /** Página actual, base 0 (como la API). */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/** Números visibles alrededor de la página actual (máx. 5). */
function visiblePages(page: number, totalPages: number): number[] {
  const windowSize = 5;
  const start = Math.max(0, Math.min(page - 2, totalPages - windowSize));
  const end = Math.min(totalPages, start + windowSize);
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function Pagination({ page, totalPages, onPageChange, disabled = false }: PaginationProps) {
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1;
  const pages = visiblePages(page, totalPages);
  const baseButton =
    'min-w-10 rounded-md border-2 px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40';

  return (
    // Siempre se renderiza (aunque esté deshabilitada) para que el layout no salte.
    <nav aria-label="Paginación" className="flex min-h-12 flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        className={`${baseButton} border-ink-300 bg-parchment-50`}
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || isFirst || totalPages === 0}
      >
        ← Anterior
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? 'page' : undefined}
          className={`${baseButton} ${
            p === page ? 'border-ink-900 bg-ink-900 text-parchment-50' : 'border-ink-300 bg-parchment-50 hover:bg-parchment-200'
          }`}
          onClick={() => onPageChange(p)}
          disabled={disabled || p === page}
        >
          {p + 1}
        </button>
      ))}
      <button
        type="button"
        className={`${baseButton} border-ink-300 bg-parchment-50`}
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || isLast || totalPages === 0}
      >
        Siguiente →
      </button>
      <span className="w-full text-center text-xs text-ink-500">
        {totalPages > 0 ? `Página ${page + 1} de ${totalPages}` : ' '}
      </span>
    </nav>
  );
}
