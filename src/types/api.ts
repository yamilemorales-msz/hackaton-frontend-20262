// Tipos derivados del contrato OpenAPI (Swagger) de la Log Pose API.

// ---------- Enums ----------
export const WANTED_STATUSES = ['AT_LARGE', 'CAPTURED', 'MISSING'] as const;
export type WantedStatus = (typeof WANTED_STATUSES)[number];

export const FRUIT_TYPES = ['PARAMECIA', 'ZOAN', 'LOGIA'] as const;
export type FruitType = (typeof FRUIT_TYPES)[number];

/** El filtro `fruit` acepta además NONE (= sin fruta). */
export const FRUIT_FILTERS = [...FRUIT_TYPES, 'NONE'] as const;
export type FruitFilter = (typeof FRUIT_FILTERS)[number];

export const CREW_ROLES = [
  'CAPTAIN',
  'FIRST_MATE',
  'NAVIGATOR',
  'SNIPER',
  'COOK',
  'DOCTOR',
  'SHIPWRIGHT',
  'MUSICIAN',
  'ARCHAEOLOGIST',
  'HELMSMAN',
  'FIGHTER',
] as const;
export type CrewRole = (typeof CREW_ROLES)[number];

export const WANTED_SORTS = ['bounty,desc', 'name,asc', 'updatedAt,desc'] as const;
export type WantedSort = (typeof WANTED_SORTS)[number];

export const PAGE_SIZES = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export type LogPoseStatus = 'LOCKED' | 'UNLOCKED';

// ---------- Errores ----------
export interface ApiErrorDetail {
  field: string;
  message: string;
}

/** Formato de error común a todas las rutas. */
export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  traceId?: string;
  details?: ApiErrorDetail[];
}

// ---------- Auth ----------
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Team {
  code: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  teamName: string;
  email: string;
  password: string;
}

/** Respuesta de POST /auth/login y POST /auth/register. */
export interface LoginResponse {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: User;
  team: Team;
}

export interface MeResponse {
  user: User;
  team: Team;
  expiresAt: string;
}

// ---------- Tripulaciones y carteles ----------
export interface CrewRef {
  id: string;
  name: string;
}

export interface Crew {
  id: string;
  name: string;
  shipName: string;
  jollyRogerColor: string;
  memberCount: number;
  totalBounty: number;
}

export interface DevilFruit {
  name: string;
  type: FruitType;
}

export interface WantedSummary {
  id: string;
  name: string;
  epithet: string;
  bounty: number;
  status: WantedStatus;
  crew: CrewRef;
  role: CrewRole;
  devilFruit: DevilFruit | null;
  threatLevel: number;
  lastSeenIsland: string;
  updatedAt: string;
}

export interface BountyHistoryEntry {
  amount: number;
  issuedAt: string;
}

export interface WantedDetail extends WantedSummary {
  age: number;
  heightCm: number;
  bio: string;
  lastSeen: { island: string; seenAt: string };
  bountyHistory: BountyHistoryEntry[];
}

export interface WantedPage {
  content: WantedSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// ---------- Dashboard y Log Pose ----------
export interface DashboardSummary {
  team: Team;
  wanted: {
    total: number;
    totalBounty: number;
    averageBounty: number;
    byStatus: Record<WantedStatus, number>;
    byFruit: Record<FruitFilter, number>;
  };
  crews: {
    total: number;
    mostWanted: Crew | null;
  };
  topBounties: WantedSummary[];
  generatedAt: string;
}

export interface LogPose {
  status: LogPoseStatus;
  grandLineUnlocked: boolean;
  unlockedAt: string | null;
  message: string;
}

// ---------- Noticias (CP4) ----------
export const NEWS_TYPES = ['BOUNTY_UPDATE', 'BATTLE', 'MARINE_OPERATION', 'WORLD_GOVERNMENT', 'DISCOVERY'] as const;
export type NewsType = (typeof NEWS_TYPES)[number];

export const NEWS_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type NewsPriority = (typeof NEWS_PRIORITIES)[number];

export const NEWS_STATUSES = ['RUMOR', 'CONFIRMED', 'DEBUNKED'] as const;
export type NewsStatus = (typeof NEWS_STATUSES)[number];

/** Estados a los que se puede verificar un RUMOR. */
export type NewsVerification = 'CONFIRMED' | 'DEBUNKED';

export interface NewsItem {
  id: string;
  type: NewsType;
  priority: NewsPriority;
  status: NewsStatus;
  title: string;
  summary: string;
  source: string;
  island: string;
  relatedWanted: { id: string; name: string } | null;
  publishedAt: string;
  updatedAt: string;
  verifiedAt: string | null;
}

export interface NewsDetail extends NewsItem {
  body: string[];
}

export interface NewsFeed {
  items: NewsItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ---------- Sagas (CP5) ----------
export interface Palette {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
}

export interface SagaSummary {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  synopsis: string;
  stageCount: number;
  totalDistanceNm: number;
  firstIsland: string;
  lastIsland: string;
  palette: Palette;
}

export type StageMetricKey = 'distanceNm' | 'crewMorale' | 'bountyPool' | 'marineThreat';

export interface StageMetric {
  key: StageMetricKey;
  label: string;
  value: number;
  unit: string;
}

export interface SagaStage {
  id: string;
  order: number;
  slug: string;
  title: string;
  narrative: string[];
  island: { id: string; name: string; x: number; y: number };
  palette: Palette;
  metrics: StageMetric[];
}

export interface SagaStory {
  saga: SagaSummary & { intro: string };
  /** Sistema de coordenadas del mapa: viewBox="0 0 width height". */
  map: { width: number; height: number };
  stages: SagaStage[];
}
