import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useSubscription } from '../../features/subscription';
import { Container } from './Container';
import { PingInLogo, PlusLogo } from '../brand/PingInLogo';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isPlus } = useSubscription();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('has_wiggled_plus');
      sessionStorage.removeItem('has_wiggled_plus_drawer');
    }
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface sm:bg-surface/95 sm:backdrop-blur-md will-change-transform">
      <Container className="h-14 sm:h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-1.5 group shrink-0" aria-label="Kauntact Home">
          <PingInLogo height={18} className="w-auto h-[18px] sm:h-[19px]" />
          {isPlus && (
            <PlusLogo height={17} width={17} className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
          )}
        </Link>

        {/* User / Actions */}
        <div className="flex items-center gap-3.5 sm:gap-6 lg:gap-8">

          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider bg-ink text-surface hover:opacity-90 transition-opacity"
              title="Open Admin Console"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>Admin</span>
            </Link>
          )}

          {user && (
            <Link
              to="/settings"
              className="label text-[11px] sm:text-xs tracking-[0.12em] sm:tracking-[0.14em] font-semibold text-ink uppercase hover:text-muted transition-colors leading-none inline-flex items-center"
            >
              {user.name || 'ACCOUNT'}
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
