// Manejo de sesión.
//
// status:
//  - 'checking'      → hay token guardado y lo estamos validando con GET /auth/me.
//                      Mientras tanto se muestra un splash, NUNCA el login.
//  - 'authenticated' → sesión válida.
//  - 'anonymous'     → sin sesión.
//
// Si CUALQUIER request protegida responde 401 (token inválido o vencido), el cliente HTTP
// llama al handler registrado aquí: se limpia la sesión y ProtectedRoute redirige al login
// recordando la ruta donde estaba el usuario.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, isAbortError, setUnauthorizedHandler, toApiError, tokenStorage } from '../api/client';
import { getMe, loginRequest, registerRequest } from '../api/auth';
import { clearApiCache } from '../hooks/useApi';
import { clearNewsFeedCache } from '../hooks/useNewsFeed';
import type { LoginRequest, RegisterRequest, Team, User } from '../types/api';

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface Session {
  user: User;
  team: Team;
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  team: Team | null;
  /** Error de red al restaurar la sesión (p. ej. servidor dormido). */
  restoreError: ApiError | null;
  retryRestore: () => void;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Si al cargar la app hay token, arrancamos en 'checking' (no mostramos login aún).
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.get() ? 'checking' : 'anonymous'));
  const [session, setSession] = useState<Session | null>(null);
  const [restoreError, setRestoreError] = useState<ApiError | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    clearApiCache(); // no dejar datos del equipo anterior en memoria
    clearNewsFeedCache();
    setSession(null);
    setRestoreError(null);
    setStatus('anonymous');
  }, []);

  // 401 global → cerrar sesión.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Restaurar sesión al recargar: validamos el token guardado con GET /auth/me.
  useEffect(() => {
    if (!tokenStorage.get()) return;

    const controller = new AbortController();
    setStatus('checking');
    setRestoreError(null);

    getMe(controller.signal)
      .then((me) => {
        setSession({ user: me.user, team: me.team });
        setStatus('authenticated');
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        const apiError = toApiError(error);
        if (apiError.status === 401) {
          clearSession(); // token vencido/revocado
        } else {
          // Error de red o 5xx: el token puede seguir siendo válido.
          // Nos quedamos en 'checking' y mostramos un botón de reintento en el splash.
          setRestoreError(apiError);
        }
      });

    return () => controller.abort();
  }, [restoreAttempt, clearSession]);

  const retryRestore = useCallback(() => setRestoreAttempt((n) => n + 1), []);

  // Login y registro devuelven { token, user, team }: guardamos y entramos directo.
  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await loginRequest(credentials);
    clearApiCache();
    clearNewsFeedCache();
    tokenStorage.set(response.token);
    setSession({ user: response.user, team: response.team });
    setRestoreError(null);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await registerRequest(data);
    clearApiCache();
    clearNewsFeedCache();
    tokenStorage.set(response.token);
    setSession({ user: response.user, team: response.team });
    setRestoreError(null);
    setStatus('authenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      team: session?.team ?? null,
      restoreError,
      retryRestore,
      login,
      register,
      logout: clearSession,
    }),
    [status, session, restoreError, retryRestore, login, register, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return context;
}
