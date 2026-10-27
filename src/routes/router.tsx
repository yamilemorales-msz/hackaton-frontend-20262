import { Outlet, ScrollRestoration, createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from '../components/routeGuards';
import { AppLayout } from '../components/AppLayout';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { DashboardPage } from '../pages/DashboardPage';
import { WantedListPage } from '../pages/WantedListPage';
import { WantedDetailPage } from '../pages/WantedDetailPage';
import { GrandLinePlaceholder, NotFoundPage } from '../pages/MiscPages';

/** Raíz: ScrollRestoration recuerda el scroll de cada entrada del historial (volver del detalle). */
function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: '/wanted', element: <WantedListPage /> },
              { path: '/wanted/:id', element: <WantedDetailPage /> },
              // Grand Line (CP4 / CP5): rutas ya protegidas, listas para implementar.
              { path: '/news', element: <GrandLinePlaceholder title="News Coo" /> },
              { path: '/news/:id', element: <GrandLinePlaceholder title="News Coo" /> },
              { path: '/sagas', element: <GrandLinePlaceholder title="Poneglyph" /> },
              { path: '/sagas/:id', element: <GrandLinePlaceholder title="Poneglyph" /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
