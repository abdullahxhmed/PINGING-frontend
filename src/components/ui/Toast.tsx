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

// Seamless, Sharp Ping Toast Pill
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

  const isSuccess = item.type === 'success';
  const isError = item.type === 'error';

  return (
    <div
      role="alert"
      onClick={() => onDismiss(item.id)}
      className={`pointer-events-auto inline-flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-sm bg-surface-dark text-[#f5f4ee] border border-black/80 shadow-[0_4px_16px_rgba(0,0,0,0.22)] cursor-pointer select-none max-w-[calc(100vw-2rem)] sm:max-w-md transition-all ${
        item.isExiting ? 'toast-item-exit' : 'toast-item-enter'
      }`}
    >
      {/* Unique Radar Ping Beacon */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isSuccess ? 'bg-accent' : isError ? 'bg-danger' : 'bg-[#edece6]'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isSuccess ? 'bg-accent' : isError ? 'bg-danger' : 'bg-[#edece6]'
          }`}
        />
      </span>

      {/* Message Text */}
      <span className="text-xs font-sans font-medium text-[#f5f4ee] leading-tight tracking-wide break-words">
        {item.message}
      </span>

      {/* Micro Dismiss */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(item.id);
        }}
        className="text-[#929087] hover:text-[#f5f4ee] transition-colors cursor-pointer shrink-0 ml-1 p-0.5"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
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
    }, 160);
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
        className="fixed top-3.5 sm:top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center gap-2 px-2"
        style={{ top: 'max(0.875rem, env(safe-area-inset-top, 0.875rem))' }}
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
