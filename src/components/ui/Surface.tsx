import React from 'react';

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  variant?: 'default' | 'flat' | 'dark';
  className?: string;
  children: React.ReactNode;
}

export const Surface: React.FC<SurfaceProps> = ({
  as: Component = 'div',
  variant = 'default',
  className = '',
  children,
  ...props
}) => {
  const variantClass =
    variant === 'flat'
      ? 'surface-flat'
      : variant === 'dark'
      ? 'surface-dark'
      : 'surface';

  return (
    <Component
      className={`${variantClass} p-5 sm:p-7 ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Surface;
