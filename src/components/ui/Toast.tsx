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

// Individual Toast Pill Component with Radar Ping and Pause-on-Hover
const ToastCard: React.FC<{
  item: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(item.duration);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = useCallback((timeMs: number) => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(item.id);
    }, timeMs);
  }, [item.id, onDismiss]);

  React.useEffect(() => {
    startTimer(remainingTimeRef.current);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(500, remainingTimeRef.current - elapsed);
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimer(remainingTimeRef.current);
  };

  const isSuccess = item.type === 'success';
  const isError = item.type === 'error';

  // Dynamic theme styling
  const borderColor = isSuccess
    ? 'border-accent/40 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.65),0_0_24px_-4px_rgba(215,255,63,0.18)]'
    : isError
    ? 'border-danger/50 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.65),0_0_24px_-4px_rgba(163,59,50,0.25)]'
    : 'border-[#3a3935] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.65),0_0_20px_-4px_rgba(255,255,255,0.08)]';

  const beaconColor = isSuccess
    ? 'bg-accent'
    : isError
    ? 'bg-[#ff5247]'
    : 'bg-[#e5e4dc]';

  const beaconRing = isSuccess
    ? 'ring-accent/30'
    : isError
    ? 'ring-[#ff5247]/30'
    : 'ring-white/20';

  const badgeBg = isSuccess
    ? 'bg-accent/15 text-accent'
    : isError
    ? 'bg-[#a33b32]/25 text-[#ff8075]'
    : 'bg-white/10 text-[#e5e4dc]';

  const progressBg = isSuccess
    ? 'bg-accent/60'
    : isError
    ? 'bg-[#ff5247]/60'
    : 'bg-[#e5e4dc]/40';

  return (
    <div
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onDismiss(item.id)}
      className={`relative overflow-hidden pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full border bg-[#141412]/95 backdrop-blur-xl cursor-pointer select-none transition-transform active:scale-[0.98] ${borderColor} ${
        item.isExiting ? 'toast-item-exit' : 'toast-item-enter'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-1">
        {/* Animated Sonar Radar Ping Indicator */}
        <div className="relative flex items-center justify-center w-6 h-6 shrink-0" aria-hidden="true">
          <span
            className={`absolute inline-flex w-3.5 h-3.5 rounded-full opacity-75 animate-ping-radar-ring-1 ${beaconColor}`}
          />
          <span
            className={`absolute inline-flex w-3.5 h-3.5 rounded-full opacity-60 animate-ping-radar-ring-2 ${beaconColor}`}
          />
          <span
            className={`relative inline-flex rounded-full w-2.5 h-2.5 ring-2 shadow-xs ${beaconColor} ${beaconRing}`}
          />
        </div>

        {/* Content with Brand Tag & Message */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`font-display font-semibold text-[10px] tracking-[0.18em] uppercase shrink-0 px-1.5 py-0.5 rounded-xs select-none ${badgeBg}`}
          >
            {isSuccess ? 'PING' : isError ? 'ALERT' : 'PING'}
          </span>
          <span className="font-sans text-xs sm:text-[13px] font-medium text-[#f5f4ee] leading-snug break-words">
            {item.message}
          </span>
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(item.id);
        }}
        className="text-[#929087] hover:text-[#f5f4ee] hover:bg-white/10 p-1 rounded-full transition-colors cursor-pointer shrink-0 ml-0.5 focus:outline-none"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Subtle Hairline Reliability Progress Bar along bottom */}
      <div
        className={`absolute bottom-0 left-0 h-[2px] transition-all ${progressBg}`}
        style={{
          animation: `toast-progress ${item.duration}ms linear forwards`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      />
    </div>
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    // Trigger sleek exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );

    // Remove from state once exit animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 240);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 3600) => {
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
      error: (msg: string) => addToast('error', msg, 4200),
      success: (msg: string) => addToast('success', msg, 3400),
      info: (msg: string) => addToast('info', msg, 3600),
    },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Viewport: Mobile-Optimized Top-Center Floating Capsule Dock */}
      <div
        className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center gap-2.5 w-full max-w-[calc(100vw-2rem)] sm:max-w-md px-1"
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
