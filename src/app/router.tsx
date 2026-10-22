import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';
import { HomePage } from '../pages/Home/HomePage';
import { StorefrontPage } from '../pages/Storefront/StorefrontPage';
import { CheckoutPage } from '../pages/Checkout/CheckoutPage';
import { OrderConfirmationPage } from '../pages/Checkout/OrderConfirmationPage';
import { AuthPage } from '../pages/Auth/AuthPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { ResourceDetailsPage } from '../pages/ResourceDetails/ResourceDetailsPage';
import { PublicContactPage } from '../pages/PublicContact/PublicContactPage';
import { ContactPage } from '../pages/Contact/ContactPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import { QrResolverPage } from '../pages/QrResolver/QrResolverPage';
import { QrPairPage } from '../pages/QrPair/QrPairPage';
import { AdminGuard } from '../features/admin/AdminGuard';
import { AdminLoginPage } from '../pages/Admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/Admin/AdminDashboardPage';
import { AdminUsersPage } from '../pages/Admin/AdminUsersPage';
import { AdminQrInventoryPage } from '../pages/Admin/AdminQrInventoryPage';
import { AdminCommunicationsPage } from '../pages/Admin/AdminCommunicationsPage';
// import { KeychainPage } from '../pages/Keychain/KeychainPage';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Main Application Home Page
      {
        path: '/',
        element: <HomePage />,
      },

  // Kauntact Storefront & Purchase Flow (Public, No Login Required)
  {
    path: '/shop',
    element: <StorefrontPage />,
  },
  {
    path: '/store',
    element: <StorefrontPage />,
  },
  {
    path: '/checkout',
    element: <CheckoutPage />,
  },
  {
    path: '/order/:orderId',
    element: <OrderConfirmationPage />,
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

  // Public Contact & Feedback Page
  {
    path: '/contact',
    element: <ContactPage />,
  },
  {
    path: '/help',
    element: <Navigate to="/contact" replace />,
  },
  {
    path: '/support',
    element: <Navigate to="/contact" replace />,
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

  // Public QR Tag Scanner & Resolver (/qr/:identifier, /t/:identifier)
  {
    path: '/qr/:identifier',
    element: <QrResolverPage />,
  },
  {
    path: '/t/:identifier',
    element: <QrResolverPage />,
  },

  // Protected QR Pairing Suite
  {
    path: '/pair',
    element: (
      <ProtectedRoute>
        <QrPairPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pair/:token',
    element: (
      <ProtectedRoute>
        <QrPairPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/qr/pair',
    element: <Navigate to="/pair" replace />,
  },

  // Tag Status Surfaces
  {
    path: '/tag/revoked',
    element: <QrResolverPage />,
  },
  {
    path: '/tag-inactive',
    element: <QrResolverPage />,
  },
  {
    path: '/tag-not-found',
    element: <QrResolverPage />,
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

  // Admin Routes
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: (
      <AdminGuard>
        <AdminDashboardPage />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <AdminGuard>
        <AdminUsersPage />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/inventory',
    element: (
      <AdminGuard>
        <AdminQrInventoryPage />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/qr',
    element: <Navigate to="/admin/inventory" replace />,
  },
  {
    path: '/admin/communications',
    element: (
      <AdminGuard>
        <AdminCommunicationsPage />
      </AdminGuard>
    ),
  },

      // Fallback Route
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
