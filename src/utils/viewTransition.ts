import type { CSSProperties } from 'react';

/** Nombre de view-transition válido (solo letras, números y guiones) y único por saga. */
export function sagaTransitionName(sagaId: string): string {
  return `saga-${sagaId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

/**
 * Estilo `view-transition-name` para un elemento compartido entre el resumen y la historia:
 * el título de la saga "viaja" de la tarjeta al encabezado. Si el navegador no soporta
 * View Transitions, la propiedad se ignora y la navegación es normal.
 */
export function sagaTitleTransitionStyle(sagaId: string): CSSProperties {
  const style = { viewTransitionName: sagaTransitionName(sagaId) };
  return style as unknown as CSSProperties;
}

/** true si el usuario pidió reducir el movimiento en su sistema. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
