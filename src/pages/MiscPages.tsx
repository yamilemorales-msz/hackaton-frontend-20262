import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** 404: cualquier ruta que no existe. */
export function NotFoundPage() {
  const { status } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-7xl text-seal-700">404</p>
      <h1 className="font-display text-3xl">Esta isla no aparece en el mapa</h1>
      <p className="max-w-md text-ink-500">El Log Pose no encuentra la ruta que buscas. Quizá la marea se la llevó.</p>
      <Link to={status === 'authenticated' ? '/' : '/login'} className="btn-primary">
        {status === 'authenticated' ? 'Volver a la bitácora' : 'Ir al inicio de sesión'}
      </Link>
    </div>
  );
}

/** Rutas del Grand Line (CP4 y CP5): protegidas, se implementan después del CP3. */
export function GrandLinePlaceholder({ title }: { title: string }) {
  return (
    <div className="paper-card flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="max-w-md text-ink-500">Esta sección del Grand Line se abre después de obtener el Log Pose (CP3).</p>
    </div>
  );
}
