import React from 'react';
import { AuthPage } from '../Auth/AuthPage';

export const SignupPage: React.FC = () => {
  return <AuthPage initialMode="signup" />;
};

export default SignupPage;
