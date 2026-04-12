import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

export const DashboardPage = lazy(() => import('src/pages/dashboard'));
export const UserPage = lazy(() => import('src/pages/user'));
export const TradesPage = lazy(() => import('src/pages/trades'));
export const AIPage = lazy(() => import('src/pages/ai'));
export const ProfilePage = lazy(() => import('src/pages/profile'));
export const AnalysisPage = lazy(() => import('src/pages/analysis'));
export const AnalysisCreatePage = lazy(() => import('src/pages/analysis-create'));
export const AnalysisEditPage = lazy(() => import('src/pages/analysis-edit'));
export const AnalysisViewPage = lazy(() => import('src/pages/analysis-view'));
export const NewsPage = lazy(() => import('src/pages/news'));
export const CalendarPage = lazy(() => import('src/pages/calendar'));
export const BookmarksPage = lazy(() => import('src/pages/bookmarks'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));

const renderFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flex: '1 1 auto',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

export const routesSection: RouteObject[] = [
  {
    element: (
      <DashboardLayout>
        <Suspense fallback={renderFallback()}>
          <Outlet />
        </Suspense>
      </DashboardLayout>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'user', element: <UserPage /> },
      { path: 'trades', element: <TradesPage /> },
      { path: 'ai', element: <AIPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'analysis', element: <AnalysisPage /> },
      { path: 'analysis/create', element: <AnalysisCreatePage /> },
      { path: 'analysis/:id/edit', element: <AnalysisEditPage /> },
      { path: 'news', element: <NewsPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'bookmarks', element: <BookmarksPage /> },
    ],
  },
  {
    path: 'sign-in',
    element: (
      <AuthLayout>
        <SignInPage />
      </AuthLayout>
    ),
  },
  {
    path: 'analysis/:id',
    element: (
      <Suspense fallback={renderFallback()}>
        <AnalysisViewPage />
      </Suspense>
    ),
  },
  {
    path: '404',
    element: <Page404 />,
  },
  { path: '*', element: <Page404 /> },
];
