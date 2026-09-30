import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_LINKS = [
  { num: '01', id: 'the-problem', label: 'THE PROBLEM' },
  { num: '02', id: 'use-cases', label: 'USE CASES' },
  { num: '03', id: 'faq', label: 'FAQ' },
];

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle Dim Backdrop — floating over page, zero content push */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 top-14 sm:top-16 bg-black/15 z-40 sm:hidden"
            aria-hidden="true"
          />

          {/* Absolute Overlay — snappy spring bounce, zero layout shift */}
          <motion.div
            key="mobile-drawer"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: 'spring',
                stiffness: 420,
                damping: 28,
                mass: 0.7,
              },
            }}
            exit={{
              opacity: 0,
              y: -8,
              scale: 0.98,
              transition: {
                duration: 0.16,
                ease: 'easeOut',
              },
            }}
            style={{ transformOrigin: 'top center' }}
            className="absolute top-full left-0 right-0 bg-[#F4F3EE] border-b border-[#D8D5CC] shadow-2xl z-50 sm:hidden select-none"
          >
            <div className="max-w-md mx-auto px-6 py-7 space-y-6">
              
              {/* Clean Editorial Navigation Links */}
              <nav className="flex flex-col space-y-3.5">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3.5 py-1 text-ink hover:text-muted transition-colors group"
                  >
                    <span className="font-mono text-xs text-[#8C887E] tracking-widest">
                      {link.num}
                    </span>
                    <span className="font-display font-medium text-xl tracking-tight uppercase group-hover:translate-x-1 transition-transform">
                      {link.label}
                    </span>
                  </a>
                ))}
              </nav>

              {/* Minimal Divider */}
              <div className="border-t border-[#D8D5CC]" />

              {/* Signature Findat Action Buttons */}
              <div className="flex flex-col gap-2.5">
                <Link
                  to="/signup"
                  onClick={onClose}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-surface-dark hover:bg-black active:scale-[0.99] text-[#f5f4ee] rounded-sm text-xs font-sans font-semibold tracking-widest uppercase transition-all shadow-xs"
                >
                  <span>GET YOUR TAG</span>
                  <span className="text-accent text-sm">→</span>
                </Link>

                <Link
                  to="/login"
                  onClick={onClose}
                  className="w-full text-center py-2 text-xs font-sans font-medium tracking-wider uppercase text-ink hover:text-muted transition-colors"
                >
                  Sign In
                </Link>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
