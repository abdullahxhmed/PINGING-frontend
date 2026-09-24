import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-surface-dark/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        <div
          className={`relative transform overflow-hidden rounded-[var(--radius-sm)] bg-surface text-left transition-all sm:my-8 w-full ${maxWidths[maxWidth]} p-6 sm:p-7 border border-border`}
        >
          <div className="flex items-start justify-between pb-4 border-b border-border">
            <div>
              <h3 className="heading-md text-ink text-lg">{title}</h3>
              {description && (
                <p className="body-sm text-muted mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-[var(--radius-sm)] text-muted hover:text-ink hover:bg-bg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
};
