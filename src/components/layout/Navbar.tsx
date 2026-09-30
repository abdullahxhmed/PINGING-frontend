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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface sm:bg-surface/95 sm:backdrop-blur-md will-change-transform">
      <Container className="h-14 sm:h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5 sm:gap-3 group shrink-0" aria-label="Findat Home">
          <PingInLogo height={18} className="w-auto h-[18px] sm:h-[19px]" />
        </Link>

        {/* User / Actions */}
        <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
          {user && (
            <Link
              to="/settings"
              className="label text-[11px] sm:text-xs tracking-[0.12em] sm:tracking-[0.14em] font-semibold text-ink uppercase hover:text-muted transition-colors leading-none inline-flex items-center"
            >
              {user.name}
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="label text-[11px] sm:text-xs tracking-[0.12em] sm:tracking-[0.14em] text-muted hover:text-ink uppercase transition-colors cursor-pointer leading-none inline-flex items-center"
          >
            LOG OUT
          </button>
        </div>
      </Container>
    </header>
  );
};

export default Navbar;
