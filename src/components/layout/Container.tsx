import React from 'react';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({
  as: Component = 'div',
  className = '',
  children,
  ...props
}) => {
  return (
    <Component
      className={`max-w-[var(--content-width)] w-full mx-auto px-4 sm:px-6 lg:px-8 ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Container;
