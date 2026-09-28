import { useState, useEffect, useRef } from 'react';

/**
 * useSmoothLoading
 *
 * Solves the "Flash of Loading State" (FOLS) when queries resolve fast (~50-150ms).
 * Guarantees that any loading state is displayed for a minimum duration (default 350ms)
 * to prevent the spinner or skeleton from flickering in for a split second and vanishing.
 */
export function useSmoothLoading(isLoading: boolean, minDurationMs = 350): boolean {
  const [smoothLoading, setSmoothLoading] = useState(isLoading);
  const startTimeRef = useRef<number | null>(isLoading ? Date.now() : null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (isLoading) {
      startTimeRef.current = Date.now();
      setSmoothLoading(true);
    } else {
      if (startTimeRef.current !== null) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, minDurationMs - elapsed);

        if (remaining > 0) {
          timeoutId = setTimeout(() => {
            setSmoothLoading(false);
            startTimeRef.current = null;
          }, remaining);
        } else {
          setSmoothLoading(false);
          startTimeRef.current = null;
        }
      } else {
        setSmoothLoading(false);
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading, minDurationMs]);

  return smoothLoading;
}
