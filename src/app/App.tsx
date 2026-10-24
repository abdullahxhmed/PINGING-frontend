import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext';
import { SubscriptionProvider } from '../features/subscription';
import { ToastProvider } from '../components/ui/Toast';
import { router } from './router';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <RouterProvider router={router} />
        </SubscriptionProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
