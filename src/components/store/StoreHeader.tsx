import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PingInLogo } from '../brand/PingInLogo';
import { useAuth } from '../../features/auth/AuthContext';
import { ShoppingCart } from 'lucide-react';
import { MobileMenu } from '../home/MobileMenu';

export interface StoreHeaderProps {
  cartCount?: number;
  lastAddedKey?: number;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({ cartCount, lastAddedKey }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isStoreHome = location.pathname === '/shop';

  return (
    <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 hover:opacity-85 transition-opacity shrink-0"
          aria-label="Kauntact Home"
        >
          <PingInLogo height={18} className="w-auto h-[18px] sm:h-[19px]" />
        </Link>

        {/* Desktop Nav (Unified with HomePage) */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-sans font-medium tracking-wider uppercase text-muted">
          <a href="/#the-problem" className="hover:text-ink transition-colors">
            The Problem
          </a>
          <a href="/#use-cases" className="hover:text-ink transition-colors">
            Use Cases
          </a>
          <Link
            to="/shop"
            className={`transition-colors ${isStoreHome ? 'text-ink font-semibold' : 'hover:text-ink'}`}
          >
            Shop
          </Link>
          <a href="/#faq" className="hover:text-ink transition-colors">
            FAQ
          </a>
        </nav>

        {/* Right Action: Cart + User Auth + Mobile Toggle */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Simple Shopping Cart with mechanical odometer count (No pills) */}
          <AnimatePresence>
            {cartCount !== undefined && cartCount > 0 && (
              <motion.div
                key="navbar-cart-icon"
                initial={{ x: 25, opacity: 0, scale: 0.8 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 25, opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', damping: 20, stiffness: 320 }}
                className="flex items-center"
              >
                <Link
                  to="/checkout"
                  state={{ from: 'navbar' }}
                  className="flex items-center gap-1.5 p-1.5 text-ink hover:text-muted active:scale-95 transition-all cursor-pointer group"
                  aria-label={`Shopping cart with ${cartCount} items`}
                  title="View Cart"
                >
                  {/* Mechanical physical recoil on cart icon */}
                  <motion.div
                    key={`cart-icon-${lastAddedKey}`}
                    animate={
                      lastAddedKey
                        ? {
                            scale: [1, 0.82, 1.18, 0.95, 1],
                            rotate: [0, -8, 6, -2, 0],
                          }
                        : {}
                    }
                    transition={{ duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] }}
                    className="relative flex items-center justify-center"
                  >
                    <ShoppingCart className="w-5 h-5 text-ink stroke-[2.2] group-hover:scale-105 transition-transform" />
                  </motion.div>

                  {/* Odometer-style mechanical tick for the number */}
                  <div className="overflow-hidden h-4 min-w-[14px] flex items-center justify-center">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={`cart-num-${cartCount}`}
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -12, opacity: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 25,
                          mass: 0.6,
                        }}
                        className="font-mono text-xs font-bold text-ink leading-none block"
                      >
                        {cartCount}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Auth Links */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="px-3.5 py-1.5 text-xs font-sans font-medium tracking-wider uppercase text-ink hover:text-muted transition-colors border border-border rounded-xs"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-sans font-medium tracking-wider uppercase text-ink hover:text-muted transition-colors"
              >
                Sign In
              </Link>
            )}

            {!isStoreHome && (
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm text-xs font-sans font-semibold tracking-widest uppercase transition-all shadow-xs"
              >
                <span>GET YOUR TAG</span>
                <span className="text-accent">→</span>
              </Link>
            )}
          </div>

          {/* Animated Mobile Hamburger Button (Exact match with HomePage) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="sm:hidden w-10 h-10 -mr-2 flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg text-ink hover:bg-black/5 active:scale-95 focus:outline-none transition-all cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span
              className={`w-5 h-[1.5px] bg-ink rounded-full transition-transform duration-300 ease-out origin-center ${
                mobileMenuOpen ? 'rotate-45 translate-y-[4.5px]' : ''
              }`}
            />
            <span
              className={`w-5 h-[1.5px] bg-ink rounded-full transition-transform duration-300 ease-out origin-center ${
                mobileMenuOpen ? '-rotate-45 -translate-y-[4.5px]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Unified Mobile Menu Drawer */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </header>
  );
};
