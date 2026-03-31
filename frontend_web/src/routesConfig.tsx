import { PATHS } from '@/constants/path.ts';
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { LandingPage } from './pages/Landing.tsx';
import { ContentPage } from './pages/content/ContentPage.tsx';
import { InsightsPage } from './pages/insights/InsightsPage.tsx';

const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));

export const appRoutes = [
  { path: PATHS.OAUTH_CB, element: <OAuthCallback /> },
  {
    element: <AppLayout />,
    children: [
      { path: PATHS.HOME, element: <LandingPage /> },
      { path: PATHS.CONTENT, element: <ContentPage /> },
      { path: PATHS.INSIGHTS, element: <InsightsPage /> },
      { path: '*', element: <Navigate to={PATHS.HOME} replace /> },
    ],
  },
];
