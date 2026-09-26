import React from 'react';
import { Navbar } from './Navbar';
import { Container } from './Container';

import { PingInSvgLogo } from '../brand/PingInLogo';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg flex flex-col text-ink">
      <Navbar />
      <main className="flex-1 py-8">
        <Container>
          {children}
        </Container>
      </main>
      <footer className="border-t border-border bg-surface py-6">
        <Container className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-3">
            <PingInSvgLogo height={18} className="text-ink" />
            <span className="text-border-strong">•</span>
            <span>Private contact made safe and seamless.</span>
          </div>
          <p>© {new Date().getFullYear()} PINGIN</p>
        </Container>
      </footer>
    </div>
  );
};
