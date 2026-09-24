import React from 'react';

export interface ConnectionMotifProps {
  variant?: 'simple' | 'arrow' | 'flow';
  leftLabel?: string;
  rightLabel?: string;
  centerLabel?: string;
  active?: boolean;
  className?: string;
}

export const ConnectionMotif: React.FC<ConnectionMotifProps> = ({
  variant = 'simple',
  leftLabel,
  rightLabel,
  centerLabel,
  active = false,
  className = '',
}) => {
  // If no labels, render the clean standalone graphic line
  if (!leftLabel && !rightLabel && !centerLabel) {
    return (
      <div
        className={`inline-flex items-center gap-0 w-28 sm:w-36 select-none ${className}`}
        aria-hidden="true"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
            active ? 'bg-ink' : 'bg-ink'
          }`}
        />
        <span className="flex-1 h-[1px] bg-border-strong" />
        {variant === 'arrow' ? (
          <span className="text-[10px] text-ink -ml-1 leading-none">▸</span>
        ) : null}
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
            active ? 'bg-accent ring-1 ring-ink/20' : 'bg-ink'
          }`}
        />
      </div>
    );
  }

  // If labels are provided, render the communication bridge
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div className="flex items-center gap-3 w-full justify-between">
        {leftLabel && (
          <span className="label text-[10px] tracking-widest text-muted uppercase">
            {leftLabel}
          </span>
        )}

        <div className="flex-1 flex items-center min-w-[60px] mx-2">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              active ? 'bg-ink' : 'bg-subtle'
            }`}
          />
          <span
            className={`flex-1 h-[1px] transition-colors ${
              active ? 'bg-ink' : 'bg-border'
            }`}
          />
          {variant === 'arrow' && (
            <span className={`text-[10px] leading-none -ml-1 ${active ? 'text-accent' : 'text-subtle'}`}>
              ▸
            </span>
          )}
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              active ? 'bg-accent ring-1 ring-ink/20' : 'bg-subtle'
            }`}
          />
        </div>

        {rightLabel && (
          <span
            className={`label text-[10px] tracking-widest uppercase ${
              active ? 'text-ink font-semibold' : 'text-muted'
            }`}
          >
            {rightLabel}
          </span>
        )}
      </div>

      {centerLabel && (
        <span
          className={`label text-[9px] tracking-[0.14em] uppercase mt-1.5 ${
            active ? 'text-ink font-semibold' : 'text-subtle'
          }`}
        >
          {centerLabel}
        </span>
      )}
    </div>
  );
};

export default ConnectionMotif;
