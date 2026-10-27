import { apiRequest } from './client';
import type { SagaStory, SagaSummary } from '../types/api';

export function getSagas(signal?: AbortSignal): Promise<SagaSummary[]> {
  return apiRequest<SagaSummary[]>('/sagas', { signal });
}

export function getSagaStory(id: string, signal?: AbortSignal): Promise<SagaStory> {
  return apiRequest<SagaStory>(`/sagas/${encodeURIComponent(id)}/story`, { signal });
}
