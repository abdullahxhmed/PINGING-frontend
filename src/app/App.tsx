import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { router } from './router';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
