import React from 'react';
import { AuthPage } from '../Auth/AuthPage';

export const LoginPage: React.FC = () => {
  return <AuthPage initialMode="login" />;
};

export default LoginPage;
