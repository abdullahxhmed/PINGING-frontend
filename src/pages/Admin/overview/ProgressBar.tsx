import React from 'react';

interface ProgressBarProps {
  percentage: number; // 0 to 100
  labelLeft?: string;
  labelRight?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  labelLeft,
  labelRight,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));

  return (
    <div className="space-y-1 py-1">
      <div className="h-1.5 w-full bg-border rounded-sm overflow-hidden">
        <div
          style={{ width: `${clamped}%` }}
          className="h-full bg-ink transition-all duration-300"
        />
      </div>
      {(labelLeft || labelRight) && (
        <div className="flex items-center justify-between text-[11px] font-sans text-muted">
          <span>{labelLeft}</span>
          <span>{labelRight}</span>
        </div>
      )}
    </div>
  );
};

