import React from 'react';

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  className = '',
  ...props
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`w-px self-stretch bg-border shrink-0 ${className}`.trim()}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      />
    );
  }

  return (
    <hr
      className={`border-0 border-t border-border w-full my-0 ${className}`.trim()}
      {...props}
    />
  );
};

export default Divider;
