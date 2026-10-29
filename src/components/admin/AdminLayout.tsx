import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Container } from '../layout/Container';
import { PingInLogo } from '../brand/PingInLogo';
import {
  ExternalLink,
  LogOut,
  Menu,
  ChevronDown,
  Moon,
  Sun,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('kauntact_admin_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('kauntact_admin_theme', next);
    } catch {
      // Ignore quota errors
    }
  };

  // Immediately apply theme before paint to eliminate any white flash
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem('kauntact_admin_theme');
      if (saved === 'dark') {
        document.documentElement.setAttribute('data-admin-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-admin-theme');
      }
    } catch {
      // Ignore
    }
  }, []);

  // Keep document.documentElement synchronized while on admin routes
  // When navigating away from /admin, remove it so user app and storefront stay light
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-admin-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-admin-theme');
    }

    return () => {
      // Only remove if actually navigating away from admin
      if (!window.location.pathname.startsWith('/admin')) {
        document.documentElement.removeAttribute('data-admin-theme');
      }
    };
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Close account menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Overview', to: '/admin', exact: true },
    { label: 'Orders', to: '/admin/orders' },
    { label: 'Fulfillment', to: '/admin/fulfillment' },
    { label: 'Inventory', to: '/admin/inventory' },
    { label: 'Products', to: '/admin/catalog' },
    { label: 'Users', to: '/admin/users' },
    { label: 'Communications', to: '/admin/communications' },
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <div data-admin-theme={theme} className="min-h-screen bg-bg flex flex-col text-ink font-sans selection:bg-accent selection:text-ink">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-sm">
        <Container className="h-14 flex items-center justify-between gap-4">
          {/* Left: Brand + Status */}
          <div className="flex items-center gap-6">
            <Link to="/admin" className="flex items-center gap-2 group shrink-0">
              <PingInLogo height={17} className="w-auto h-[17px]" />
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-ink text-surface font-semibold tracking-wider ml-1">
                Admin
              </span>
            </Link>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      isActive
                        ? 'text-ink bg-bg font-semibold'
                        : 'text-muted hover:text-ink hover:bg-bg/60'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right: Account Menu & Utilities */}
          <div className="flex items-center gap-2">
            {/* Direct Link to User App */}
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted hover:text-ink transition-colors"
            >
              <span>User App</span>
              <ExternalLink className="w-3 h-3 text-muted/60" />
            </Link>

            {/* Admin Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-full border border-border hover:border-border-strong bg-surface text-muted hover:text-ink transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-accent" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Account Menu Trigger */}
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-full border border-border hover:border-border-strong bg-surface transition-colors cursor-pointer"
                aria-label="Account menu"
              >
                <span className="text-xs font-medium text-ink max-w-[120px] truncate hidden sm:inline">
                  {user?.name || 'Admin'}
                </span>
                <span className="w-6 h-6 rounded-full bg-ink text-surface text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {userInitial}
                </span>
                <ChevronDown className="w-3 h-3 text-muted hidden sm:inline mr-1" />
              </button>

              {/* Account Dropdown */}
              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-lg shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 border-b border-border">
                    <p className="font-semibold text-ink truncate">{user?.name || 'Administrator'}</p>
                    <p className="font-mono text-[11px] text-muted truncate mt-0.5">{user?.mobileNumber || ''}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-medium uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      ADMIN
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                        setAccountMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2 flex items-center justify-between text-muted hover:text-ink hover:bg-bg transition-colors text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {theme === 'dark' ? (
                          <Sun className="w-3.5 h-3.5 text-accent" />
                        ) : (
                          <Moon className="w-3.5 h-3.5" />
                        )}
                        <span>Appearance</span>
                      </span>
                      <span className="text-[10px] font-mono uppercase text-muted/70">
                        {theme === 'dark' ? 'Dark' : 'Light'}
                      </span>
                    </button>
                    <Link
                      to="/dashboard"
                      onClick={() => setAccountMenuOpen(false)}
                      className="w-full px-3.5 py-2 flex items-center justify-between text-muted hover:text-ink hover:bg-bg transition-colors"
                    >
                      <span>Switch to User App</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted/60" />
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-border">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-3.5 py-2 flex items-center gap-2 text-danger hover:bg-danger/10 transition-colors text-left font-medium cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded text-ink border border-border hover:bg-bg"
              aria-label="Toggle navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </Container>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-surface px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-ink text-surface font-semibold'
                      : 'text-muted hover:text-ink hover:bg-bg'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-border mt-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted hover:text-ink hover:bg-bg rounded transition-colors text-left cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? (
                    <Sun className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <Moon className="w-3.5 h-3.5" />
                  )}
                  <span>Appearance</span>
                </span>
                <span className="text-[10px] font-mono uppercase text-muted/70">
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </span>
              </button>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs text-muted hover:text-ink"
              >
                <span>Switch to User App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-6 sm:py-8">
        <Container>{children}</Container>
      </main>

      {/* Restrained Footer */}
      <footer className="border-t border-border bg-surface/50 py-4">
        <Container className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">KaunTact Console</span>
            <span className="text-border">•</span>
            <span>Operations &amp; Inventory Control</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-sans">
            <span>Signed in as {user?.name || 'Admin'}</span>
          </div>
        </Container>
      </footer>
    </div>
  );
};
