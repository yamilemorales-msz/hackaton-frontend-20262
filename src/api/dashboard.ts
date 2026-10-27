import { apiRequest } from './client';
import type { DashboardSummary, LogPose } from '../types/api';

export function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>('/dashboard/summary', { signal });
}

export function getLogPose(signal?: AbortSignal): Promise<LogPose> {
  return apiRequest<LogPose>('/log-pose', { signal });
}
