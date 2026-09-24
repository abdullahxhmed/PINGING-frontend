import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Container } from './Container';
import { PingInLogo } from '../brand/PingInLogo';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <Container className="h-16 flex items-center justify-between">
        {/* Brand with Rive Animation */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <PingInLogo height={32} width={136} />
          <span className="label text-[10px] text-muted tracking-widest uppercase border-l border-border pl-3 hidden sm:inline-block">
            2026
          </span>
        </Link>

        {/* User / Actions */}
        <div className="flex items-center gap-6 sm:gap-8">
          {user && (
            <Link
              to="/settings"
              className="label text-xs tracking-[0.14em] font-semibold text-ink uppercase hover:text-muted transition-colors"
            >
              {user.name}
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="label text-xs tracking-[0.14em] text-muted hover:text-ink uppercase transition-colors cursor-pointer"
          >
            LOG OUT
          </button>
        </div>
      </Container>
    </header>
  );
};

export default Navbar;
