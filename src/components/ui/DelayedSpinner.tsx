import React, { useState, useEffect } from 'react';

interface DelayedSpinnerProps {
  /**
   * Delay in milliseconds before showing the loader/spinner.
   * If the data query finishes before this time, nothing is rendered,
   * avoiding any flicker or flash of loading state.
   * Default: 200ms
   */
  delay?: number;
  children: React.ReactNode;
  className?: string;
}

export const DelayedSpinner: React.FC<DelayedSpinnerProps> = ({
  delay = 200,
  children,
  className = '',
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return <div className={`animate-fade-in ${className}`}>{children}</div>;
};

export default DelayedSpinner;
