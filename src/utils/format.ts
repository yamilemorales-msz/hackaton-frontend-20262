import type { CrewRole, FruitFilter, NewsPriority, NewsStatus, NewsType, WantedSort, WantedStatus } from '../types/api';

const numberFormatter = new Intl.NumberFormat('es-PE');
const dateFormatter = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

/** Recompensa en bayas (berries): ฿ 1,250,000,000 */
export function formatBerries(amount: number): string {
  return `฿ ${numberFormatter.format(amount)}`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateFormatter.format(date);
}

export const STATUS_LABELS: Record<WantedStatus, string> = {
  AT_LARGE: 'Prófugo',
  CAPTURED: 'Capturado',
  MISSING: 'Desaparecido',
};

export const STATUS_BADGE_CLASSES: Record<WantedStatus, string> = {
  AT_LARGE: 'bg-seal-600 text-parchment-50',
  CAPTURED: 'bg-ink-700 text-parchment-50',
  MISSING: 'bg-parchment-300 text-ink-900',
};

export const FRUIT_LABELS: Record<FruitFilter, string> = {
  PARAMECIA: 'Paramecia',
  ZOAN: 'Zoan',
  LOGIA: 'Logia',
  NONE: 'Sin fruta',
};

export const SORT_LABELS: Record<WantedSort, string> = {
  'bounty,desc': 'Mayor recompensa',
  'name,asc': 'Nombre (A-Z)',
  'updatedAt,desc': 'Actualizados recientemente',
};

export const ROLE_LABELS: Record<CrewRole, string> = {
  CAPTAIN: 'Capitán',
  FIRST_MATE: 'Primer oficial',
  NAVIGATOR: 'Navegante',
  SNIPER: 'Francotirador',
  COOK: 'Cocinero',
  DOCTOR: 'Médico',
  SHIPWRIGHT: 'Carpintero',
  MUSICIAN: 'Músico',
  ARCHAEOLOGIST: 'Arqueólogo',
  HELMSMAN: 'Timonel',
  FIGHTER: 'Combatiente',
};

/** Etiqueta segura: si el servidor envía un valor nuevo, mostramos el valor tal cual. */
export function labelFor<K extends string>(labels: Record<K, string>, value: string): string {
  return value in labels ? labels[value as K] : value;
}

export const NEWS_TYPE_LABELS: Record<NewsType, string> = {
  BOUNTY_UPDATE: 'Recompensas',
  BATTLE: 'Batalla',
  MARINE_OPERATION: 'Operación de la Marina',
  WORLD_GOVERNMENT: 'Gobierno Mundial',
  DISCOVERY: 'Descubrimiento',
};

export const NEWS_PRIORITY_LABELS: Record<NewsPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const NEWS_PRIORITY_CLASSES: Record<NewsPriority, string> = {
  LOW: 'bg-parchment-200 text-ink-700',
  MEDIUM: 'bg-parchment-300 text-ink-900',
  HIGH: 'bg-seal-600/80 text-parchment-50',
  CRITICAL: 'bg-seal-700 text-parchment-50',
};

export const NEWS_STATUS_LABELS: Record<NewsStatus, string> = {
  RUMOR: 'Rumor',
  CONFIRMED: 'Confirmada',
  DEBUNKED: 'Desmentida',
};

export const NEWS_STATUS_CLASSES: Record<NewsStatus, string> = {
  RUMOR: 'border-ink-500 text-ink-700 border-dashed',
  CONFIRMED: 'border-sea-600 text-sea-700',
  DEBUNKED: 'border-seal-600 text-seal-700 line-through',
};
