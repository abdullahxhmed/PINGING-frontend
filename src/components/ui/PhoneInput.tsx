import React, { forwardRef, useState, useRef, useImperativeHandle } from 'react';

export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return { isValid: false, error: 'Please enter your 10-digit mobile number' };
  }
  if (digits.length !== 10) {
    return { isValid: false, error: 'Mobile number must be exactly 10 digits' };
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { isValid: false, error: 'Please enter a valid Indian mobile number starting with 6, 7, 8, or 9' };
  }
  return { isValid: true };
}

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, value, onChange, error, helperText, className = '', id, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const innerRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => innerRef.current!);

    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'phone-input');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(/\D/g, '');
      // If user pasted a 12-digit number starting with 91, strip country code
      if (raw.length === 12 && raw.startsWith('91')) {
        raw = raw.slice(2);
      }
      onChange(raw.slice(0, 10));
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block label text-muted mb-2">
            {label}
          </label>
        )}

        {/* Structural phone input container: left-aligned with subtle divider */}
        <div
          onClick={() => innerRef.current?.focus()}
          className={`w-full h-12 border rounded-sm bg-surface transition-colors duration-150 flex items-center px-3.5 cursor-text ${
            error
              ? 'border-danger'
              : isFocused
              ? '!border-ink !bg-[#faf9f3]'
              : 'border-border hover:border-border-strong'
          } ${className}`}
        >
          <div className="flex items-center gap-3 w-full">
            <span className="phone-prefix select-none whitespace-nowrap">
              +91
            </span>
            <span className="h-4 w-[1px] bg-border flex-shrink-0" aria-hidden="true" />
            <input
              ref={innerRef}
              id={inputId}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={value}
              onChange={handleChange}
              onFocus={(e) => {
                setIsFocused(true);
                props.onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                props.onBlur?.(e);
              }}
              placeholder="9876543210"
              className="phone-input flex-1 bg-transparent outline-none placeholder:text-muted/40 p-0 m-0"
              {...props}
            />
          </div>
        </div>

        {error && error.trim() ? (
          <p className="mt-1.5 body-sm text-danger font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 body-sm text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
