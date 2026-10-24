import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { X, ArrowUpRight } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastOptions {
  duration?: number;
  onClick?: () => void;
  actionLabel?: string;
}

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  isExiting: boolean;
  duration: number;
  onClick?: () => void;
  actionLabel?: string;
}

export interface ToastContextType {
  toast: {
    error: (message: string, options?: ToastOptions | number) => void;
    success: (message: string, options?: ToastOptions | number) => void;
    info: (message: string, options?: ToastOptions | number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Clean, Architectural Toast Card
const ToastCard: React.FC<{
  item: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(item.id);
    }, item.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.duration, item.id, onDismiss]);

  const isError = item.type === 'error';
  const hasAction = Boolean(item.onClick);

  return (
    <div
      role={hasAction ? 'button' : 'alert'}
      tabIndex={hasAction ? 0 : undefined}
      onClick={() => {
        if (item.onClick) {
          item.onClick();
        }
        onDismiss(item.id);
      }}
      onKeyDown={(e) => {
        if (hasAction && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          item.onClick?.();
          onDismiss(item.id);
        }
      }}
      className={`group pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-sm bg-surface-dark border border-white/10 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.5)] cursor-pointer select-none w-full sm:w-auto sm:min-w-[280px] sm:max-w-md transition-all active:scale-[0.99] hover:border-white/25 hover:bg-[#191917] ${
        item.isExiting ? 'toast-item-exit' : 'toast-item-enter'
      }`}
    >
      {/* Message Text with inline underlined action and 45-degree arrow */}
      <span
        className={`text-xs sm:text-sm font-sans font-medium leading-snug tracking-wide break-words flex-1 ${
          isError ? 'text-[#ff7875]' : 'text-[#f5f4ee]'
        }`}
      >
        {item.message}
        {hasAction && (
          <span className="inline-flex items-center gap-0.5 underline underline-offset-4 decoration-white/70 hover:decoration-white font-semibold text-[#f5f4ee] ml-1.5 whitespace-nowrap cursor-pointer">
            <span>{item.actionLabel || 'View plan'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 inline shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        )}
      </span>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(item.id);
        }}
        className="text-[#929087] hover:text-[#f5f4ee] transition-colors cursor-pointer shrink-0 p-1 -mr-1"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 280);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions | number) => {
      const id = Math.random().toString(36).substring(2, 9);
      const opts: ToastOptions =
        typeof options === 'number' ? { duration: options } : options || {};
      const defaultDuration = opts.onClick ? 5000 : type === 'error' ? 3800 : type === 'success' ? 3000 : 3600;
      const duration = opts.duration ?? defaultDuration;

      const newToast: ToastItem = {
        id,
        type,
        message,
        isExiting: false,
        duration,
        onClick: opts.onClick,
        actionLabel: opts.actionLabel,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const value = {
    toast: {
      error: (msg: string, opts?: ToastOptions | number) => addToast('error', msg, opts),
      success: (msg: string, opts?: ToastOptions | number) => addToast('success', msg, opts),
      info: (msg: string, opts?: ToastOptions | number) => addToast('info', msg, opts),
    },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Clean Top-Center Floating Dock */}
      <div
        className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center gap-2 px-3 w-full max-w-sm sm:max-w-md sm:w-auto"
        style={{ top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismissToast} />
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
