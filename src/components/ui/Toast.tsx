import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  isExiting: boolean;
  duration: number;
}

interface ToastContextType {
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
    info: (message: string) => void;
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

  return (
    <div
      role="alert"
      onClick={() => onDismiss(item.id)}
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-sm bg-surface-dark border border-white/10 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.5)] cursor-pointer select-none w-full sm:w-auto sm:min-w-[280px] sm:max-w-md transition-transform active:scale-[0.99] ${
        item.isExiting ? 'toast-item-exit' : 'toast-item-enter'
      }`}
    >
      {/* Message Text: Only red for errors, all white otherwise */}
      <span
        className={`text-xs sm:text-sm font-sans font-medium leading-snug tracking-wide break-words flex-1 ${
          isError ? 'text-[#ff7875]' : 'text-[#f5f4ee]'
        }`}
      >
        {item.message}
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
    (type: ToastType, message: string, duration = 3200) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = {
        id,
        type,
        message,
        isExiting: false,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const value = {
    toast: {
      error: (msg: string) => addToast('error', msg, 3800),
      success: (msg: string) => addToast('success', msg, 3000),
      info: (msg: string) => addToast('info', msg, 3200),
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
