import { apiRequest } from './client';
import type { LoginRequest, LoginResponse, MeResponse, RegisterRequest } from '../types/api';

export function loginRequest(credentials: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: credentials, auth: false });
}

/** El registro devuelve la sesión ya iniciada (mismo formato que el login). */
export function registerRequest(data: RegisterRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/register', { method: 'POST', body: data, auth: false });
}

export function getMe(signal?: AbortSignal): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', { signal });
}
