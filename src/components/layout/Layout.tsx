import React from 'react';
import { Navbar } from './Navbar';
import { Container } from './Container';

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
        <Container className="text-center text-xs text-muted">
          <p>© {new Date().getFullYear()} PingIn. Private contact made safe and seamless.</p>
        </Container>
      </footer>
    </div>
  );
};
