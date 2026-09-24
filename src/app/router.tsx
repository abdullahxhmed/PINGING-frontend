import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthPage } from '../pages/Auth/AuthPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { ResourceDetailsPage } from '../pages/ResourceDetails/ResourceDetailsPage';
import { PublicContactPage } from '../pages/PublicContact/PublicContactPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { SettingsPage } from '../pages/Settings/SettingsPage';

export const router = createBrowserRouter([
  // Unified Public Landing & Auth Routes with persistent canvas
  {
    element: <AuthPage />,
    children: [
      {
        path: '/login',
        element: null,
      },
      {
        path: '/signup',
        element: null,
      },
    ],
  },

  // Public Contact Surface (Anonymous QR destination)
  {
    path: '/contact/:token',
    element: <PublicContactPage />,
  },
  {
    path: '/c/:token',
    element: <PublicContactPage />,
  },

  // Protected Owner Dashboard Surfaces
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/resources',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/resources/:id',
    element: (
      <ProtectedRoute>
        <ResourceDetailsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: <Navigate to="/settings" replace />,
  },

  // Fallback Route
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
