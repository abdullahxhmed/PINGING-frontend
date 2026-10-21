import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Navbar } from './Navbar';
import { Container } from './Container';

import { PingInSvgLogo } from '../brand/PingInLogo';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col text-ink">
      <Navbar />
      <main className="flex-1 py-6 sm:py-8">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.24,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="w-full will-change-[opacity,transform]"
          >
            {children}
          </motion.div>
        </Container>
      </main>
      <footer className="mt-auto border-t border-border bg-surface py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <Container className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-3">
            ©<PingInSvgLogo height={13} className="text-muted/70 hover:text-ink transition-colors" />
            <span className="text-border-strong">•</span>
            <span>Private contact made safe and seamless.</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/contact"
              className="px-3 py-1 rounded-sm border border-border hover:border-ink hover:text-ink text-muted font-sans text-xs font-medium uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
            >
              Feedback
            </Link>
          </div>
        </Container>
      </footer>
    </div>
  );
};
