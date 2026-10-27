import { Outlet, ScrollRestoration, createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from '../components/routeGuards';
import { AppLayout } from '../components/AppLayout';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { DashboardPage } from '../pages/DashboardPage';
import { WantedListPage } from '../pages/WantedListPage';
import { WantedDetailPage } from '../pages/WantedDetailPage';
import { NotFoundPage } from '../pages/MiscPages';
import { NewsFeedPage } from '../pages/NewsFeedPage';
import { NewsDetailPage } from '../pages/NewsDetailPage';
import { SagasPage } from '../pages/SagasPage';
import { SagaStoryPage } from '../pages/SagaStoryPage';

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
              // Grand Line (requieren Log Pose en el servidor)
              { path: '/news', element: <NewsFeedPage /> },
              { path: '/news/:id', element: <NewsDetailPage /> },
              { path: '/sagas', element: <SagasPage /> },
              { path: '/sagas/:id', element: <SagaStoryPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
