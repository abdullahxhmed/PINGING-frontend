import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from '../pages/Home/HomePage';
import { AuthPage } from '../pages/Auth/AuthPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { ResourceDetailsPage } from '../pages/ResourceDetails/ResourceDetailsPage';
import { PublicContactPage } from '../pages/PublicContact/PublicContactPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { SettingsPage } from '../pages/Settings/SettingsPage';
// import { KeychainPage } from '../pages/Keychain/KeychainPage';

export const router = createBrowserRouter([
  // Public Home Page
  {
    path: '/',
    element: <HomePage />,
  },

  // Keychain Studio (unmounted for now)
  // {
  //   path: '/keychain',
  //   element: <KeychainPage />,
  // },
  // {
  //   path: '/keychain-generator',
  //   element: <KeychainPage />,
  // },

  // Auth Routes
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
