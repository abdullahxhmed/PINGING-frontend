import React from 'react';

export type IconButtonVariant = 'ghost' | 'secondary' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      variant = 'ghost',
      size = 'md',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses =
      size === 'sm'
        ? 'w-8 h-8 text-sm'
        : size === 'lg'
        ? 'w-11 h-11 text-lg'
        : 'w-9 h-9 text-base';

    const variantClasses =
      variant === 'secondary'
        ? 'border border-border bg-transparent text-ink hover:bg-surface hover:border-border-strong'
        : variant === 'danger'
        ? 'text-danger hover:bg-danger/10'
        : 'text-muted hover:text-ink hover:bg-surface';

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`.trim()}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
