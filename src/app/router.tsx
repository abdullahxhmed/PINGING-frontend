import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';
import { HomePage } from '../pages/Home/HomePage';
import { StorefrontPage } from '../pages/Storefront/StorefrontPage';
import { CheckoutPage } from '../pages/Checkout/CheckoutPage';
import { OrderConfirmationPage } from '../pages/Checkout/OrderConfirmationPage';
import { OrderTrackingPage } from '../pages/Tracking/OrderTrackingPage';
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
import { AdminCatalogPage } from '../pages/Admin/AdminCatalogPage';
import { AdminProductDetailPage } from '../pages/Admin/AdminProductDetailPage';
import { AdminCreateProductPage } from '../pages/Admin/AdminCreateProductPage';
import { AdminCreateBundlePage } from '../pages/Admin/AdminCreateBundlePage';
import { AdminStorefrontSlotsPage } from '../pages/Admin/AdminStorefrontSlotsPage';
import { AdminOrdersPage } from '../pages/Admin/AdminOrdersPage';
import { AdminFulfillmentPage } from '../pages/Admin/AdminFulfillmentPage';
import { AdminCommunicationsPage } from '../pages/Admin/AdminCommunicationsPage';
import { PlusPlanPage } from '../pages/Plus/PlusPlanPage';
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

      // Kauntact Plus 12-Month Plan Page
      {
        path: '/plus',
        element: <PlusPlanPage />,
      },
      {
        path: '/plans',
        element: <PlusPlanPage />,
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
  {
    path: '/order/:orderId/track',
    element: <OrderTrackingPage />,
  },
  {
    path: '/track',
    element: <OrderTrackingPage />,
  },
  {
    path: '/track/:identifier',
    element: <OrderTrackingPage />,
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
    path: '/tag/suspended',
    element: <QrResolverPage />,
  },
  {
    path: '/tag-suspended',
    element: <QrResolverPage />,
  },
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
    path: '/admin/orders',
    element: (
      <AdminGuard>
        <AdminOrdersPage />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/fulfillment',
    element: (
      <AdminGuard>
        <AdminFulfillmentPage />
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
    path: '/admin/catalog',
    element: (
      <AdminGuard>
        <AdminCatalogPage />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/catalog/products/new',
    element: (
      <AdminGuard>
        <AdminCreateProductPage />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/catalog/bundles/new',
    element: (
      <AdminGuard>
        <AdminCreateBundlePage />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/catalog/products/:id',
    element: (
      <AdminGuard>
        <AdminProductDetailPage />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/catalog/storefront',
    element: (
      <AdminGuard>
        <AdminStorefrontSlotsPage />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/catalog/slots',
    element: <Navigate to="/admin/catalog/storefront" replace />,
  },
  {
    path: '/admin/products',
    element: <Navigate to="/admin/catalog" replace />,
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
    path: '/admin/inventory/batches',
    element: <Navigate to="/admin/inventory?tab=batches" replace />,
  },
  {
    path: '/admin/inventory/inwarding',
    element: <Navigate to="/admin/inventory?tab=inwarding" replace />,
  },
  {
    path: '/admin/inventory/overview',
    element: <Navigate to="/admin/inventory?tab=overview" replace />,
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
