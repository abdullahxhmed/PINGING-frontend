import React, { useEffect } from 'react';
import { Outlet, useLocation, ScrollRestoration } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';

/**
 * RootLayout: Guarantees that every navigation (link click, button press, or route change)
 * mounts at the top of the page, resetting window and document scroll positions.
 */
export const RootLayout: React.FC = () => {
  const { pathname, search, hash } = useLocation();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (hash) {
      // If a specific section hash anchor is targeted, scroll to it
      const elementId = hash.replace('#', '');
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // Always blur active element to dismiss mobile keyboard and reset focus zoom
    if (document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }

    // Always reset scroll to the top immediately upon page transition
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // Enforce viewport zoom reset across mobile browsers
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
    }
  }, [pathname, search, hash]);

  return (
    <>
      <ScrollRestoration />
      <motion.div
        key={pathname}
        initial={{ opacity: shouldReduceMotion ? 1 : 0.8 }}
        animate={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen flex flex-col"
      >
        <Outlet />
      </motion.div>
    </>
  );
};

export default RootLayout;
