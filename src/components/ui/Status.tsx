import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral';

export interface StatusProps {
  children?: React.ReactNode;
  variant?: StatusVariant;
  dotPosition?: 'left' | 'right';
  className?: string;
}

export const Status: React.FC<StatusProps> = ({
  children = 'Active',
  variant = 'success',
  dotPosition = 'left',
  className = '',
}) => {
  const dotModifier =
    variant === 'neutral'
      ? 'status-dot-neutral'
      : variant === 'danger'
      ? 'status-dot-danger'
      : variant === 'warning'
      ? 'status-dot-warning'
      : 'status-dot-active';

  const dot = <span className={`status-dot ${dotModifier}`.trim()} aria-hidden="true" />;

  return (
    <span className={`status ${className}`.trim()}>
      {dotPosition === 'left' && dot}
      <span>{children}</span>
      {dotPosition === 'right' && dot}
    </span>
  );
};

export default Status;
