import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Bitácora', end: true },
  { to: '/wanted', label: 'Se Busca', end: false },
  { to: '/news', label: 'News Coo', end: false },
  { to: '/sagas', label: 'Poneglyph', end: false },
] as const;

export function AppLayout() {
  const { team, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-4 border-double border-ink-900 bg-parchment-200/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/compass.svg" alt="" className="size-9" />
            <div>
              <p className="font-display text-xl leading-none text-ink-900">Log Pose Console</p>
              {team && (
                <p className="mt-1 text-xs text-ink-500">
                  {team.name} · <span className="font-semibold text-ink-700">{team.code}</span>
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={logout} className="btn-secondary px-3 py-1.5">
            Cerrar sesión
          </button>
        </div>
        <nav aria-label="Principal" className="mx-auto max-w-6xl px-4">
          <ul className="-mb-1 flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block whitespace-nowrap rounded-t-md border-2 border-b-0 px-4 py-2 text-sm font-semibold ${
                      isActive
                        ? 'border-ink-900 bg-parchment-100 text-ink-900'
                        : 'border-transparent text-ink-500 hover:text-ink-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
