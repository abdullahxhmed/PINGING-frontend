import React, { useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from 'motion/react';
import { ArrowRight } from 'lucide-react';

import { useAuth } from '../../features/auth/AuthContext';
import { getNavItems, type NavItemConfig } from '../../config/navigation';

export interface FallingNavMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items?: NavItemConfig[];
}

export const FallingNavMenu: React.FC<FallingNavMenuProps> = ({
  isOpen,
  onClose,
  items: customItems,
}) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const navItems = customItems ?? getNavItems(isAuthenticated);
  const totalItems = navItems.length;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, item: NavItemConfig) => {
      // Allow user to open in new tab with modifier keys
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        onClose();
        return;
      }

      event.preventDefault();
      onClose();

      if (location.pathname === item.to) {
        return;
      }

      // Smoothly navigate after the exit animation completes so the new page doesn't pop in abruptly
      const exitDelay = shouldReduceMotion ? 0 : 300;
      setTimeout(() => {
        navigate(item.to);
      }, exitDelay);
    },
    [location.pathname, navigate, onClose, shouldReduceMotion]
  );

  const isActive = useCallback(
    (targetPath: string) => {
      if (targetPath.startsWith('/#')) {
        return (
          location.pathname === '/' &&
          location.hash === targetPath.replace('/', '')
        );
      }

      return location.pathname === targetPath;
    },
    [location.pathname, location.hash]
  );

  const rowVariants: Variants = {
    initial: () => ({
      y: shouldReduceMotion ? 0 : '100%',
      opacity: shouldReduceMotion ? 1 : 0,
    }),

    animate: (index: number) => ({
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : {
            delay: index * 0.1,
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
          },
    }),

    exit: (index: number) => ({
      y: shouldReduceMotion ? 0 : '100%',
      opacity: shouldReduceMotion ? 1 : 0,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : {
            delay: (totalItems - 1 - index) * 0.03,
            duration: 0.18,
            ease: [0.4, 0, 1, 1],
          },
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment key="falling-navigation">
          {/* Backdrop: independent of the falling rows */}
          <motion.div
            key="falling-nav-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.28,
            }}
            onClick={onClose}
            className="fixed inset-0 top-14 sm:top-16 z-30 bg-black/30"
            aria-hidden="true"
          />

          {/* The panel has a fixed height and never animates its dimensions. */}
          <motion.div
            key="falling-nav-stack"
            id="falling-nav-menu"
            className="
              fixed top-14 sm:top-16 inset-x-0 z-40
              h-[33dvh] min-h-[220px] max-h-[400px]
              pointer-events-none
            "
          >
            <nav
              aria-label="Main navigation"
              className="relative h-full w-full pointer-events-auto"
            >
              {navItems.map((item, index) => {
                const active = isActive(item.to);
                const rowHeight = 100 / totalItems;
                const isLast = index === totalItems - 1;
                const isSignIn = item.id === 'signin' || item.id === 'dashboard';

                return (
                  <motion.div
                    key={item.id}
                    custom={index}
                    variants={rowVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className={`
                      absolute inset-x-0
                      flex items-stretch
                      bg-[#F4F3EE]
                      ${!isLast ? 'border-b border-border/70' : 'shadow-[0_16px_36px_-6px_rgba(0,0,0,0.14)]'}
                    `}
                    style={{
                      top: `${index * rowHeight}%`,
                      height: `${rowHeight}%`,
                      zIndex: totalItems - index,
                    }}
                  >
                    <Link
                      to={item.to}
                      onClick={(event) => handleLinkClick(event, item)}
                      className={`
                        group flex h-full w-full items-center
                        ${isSignIn ? 'justify-center px-4' : 'justify-start px-6 sm:px-12'}
                        text-base sm:text-lg md:text-xl font-semibold font-sans tracking-tight
                        transition-colors select-none
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-inset
                        focus-visible:ring-ink
                        ${
                          active
                            ? 'text-ink bg-ink/[0.04]'
                            : isSignIn
                            ? 'text-ink hover:bg-ink/[0.02]'
                            : 'text-muted hover:text-ink hover:bg-ink/[0.02]'
                        }
                      `}
                      aria-current={active ? 'page' : undefined}
                    >
                      {isSignIn ? (
                        <span className="inline-flex items-center gap-2 text-ink group-hover:text-muted transition-colors">
                          <span>{item.label}</span>
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:translate-x-1.5" />
                        </span>
                      ) : (
                        <span>{item.label}</span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};

export default FallingNavMenu;
