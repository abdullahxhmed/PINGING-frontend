import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({
  children,
  required,
  className = '',
  ...props
}) => {
  return (
    <label
      className={`label block text-muted mb-2 ${className}`.trim()}
      {...props}
    >
      {children}
      {required && (
        <span className="text-danger ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
};

export default Label;
