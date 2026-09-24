import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  isVisible: boolean;
  isExiting: boolean;
}

interface ToastContextType {
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    // Clear auto-dismiss timer if present
    const existingTimeout = timeoutsRef.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutsRef.current.delete(id);
    }

    // Trigger exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true, isVisible: false } : t))
    );

    // Remove from state after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 280);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = {
        id,
        type,
        message,
        isVisible: false,
        isExiting: false,
      };

      setToasts((prev) => [...prev, newToast]);

      // Next frame: trigger smooth enter animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, isVisible: true } : t))
          );
        });
      });

      // Auto-dismiss after 3800ms
      const timeout = setTimeout(() => {
        dismissToast(id);
      }, 3800);

      timeoutsRef.current.set(id, timeout);
    },
    [dismissToast]
  );

  const value = {
    toast: {
      error: (msg: string) => addToast('error', msg),
      success: (msg: string) => addToast('success', msg),
      info: (msg: string) => addToast('info', msg),
    },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`toast-item ${
              t.isVisible && !t.isExiting ? 'toast-visible' : ''
            } ${t.isExiting ? 'toast-exiting' : ''} pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-sm shadow-xl border text-sm bg-surface-dark text-surface ${
              t.type === 'error'
                ? 'border-danger/40'
                : t.type === 'success'
                ? 'border-accent/40'
                : 'border-border'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'error' && (
                <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
              )}
              {t.type === 'success' && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
              )}
              {t.type === 'info' && (
                <Info className="h-4 w-4 shrink-0 text-subtle" />
              )}
              <span className="body-sm text-surface leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-subtle hover:text-surface p-1 cursor-pointer shrink-0 transition-colors"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
