// Guardas de rutas.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SplashScreen } from './StatusViews';
import { getRedirectTarget } from '../utils/redirect';

/**
 * Rutas privadas. Sin sesión → /login, guardando en `state.from` la ruta COMPLETA
 * (pathname + search + hash) para volver exactamente ahí después de iniciar sesión.
 */
export function ProtectedRoute() {
  const { status, restoreError, retryRestore } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <SplashScreen error={restoreError} onRetry={retryRestore} />;

  if (status === 'anonymous') {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}

/** Login y registro: si ya hay sesión, mandamos al destino pendiente (o al dashboard). */
export function PublicOnlyRoute() {
  const { status, restoreError, retryRestore } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <SplashScreen error={restoreError} onRetry={retryRestore} />;
  if (status === 'authenticated') return <Navigate to={getRedirectTarget(location.state)} replace />;

  return <Outlet />;
}
