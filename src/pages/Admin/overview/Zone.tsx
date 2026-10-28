import React from 'react';
import { Link } from 'react-router-dom';

export interface SupportingRow {
  label: string;
  value: React.ReactNode;
}

export interface ZoneProps {
  title: string;
  question: string; // 6 words max
  hero: React.ReactNode;
  subLine: React.ReactNode;
  visual?: React.ReactNode;
  rows?: SupportingRow[]; // at most 2 supporting rows
  link: {
    text: string;
    href: string;
  };
}

export const Zone: React.FC<ZoneProps> = ({
  title,
  question,
  hero,
  subLine,
  visual,
  rows = [],
  link,
}) => {
  return (
    <div className="rounded-md border border-border bg-surface p-5 flex flex-col justify-between h-full space-y-4">
      <div className="space-y-3">
        {/* Motif + Title & Question */}
        <div>
          {/* 24x3px Headline motif bar */}
          <div className="w-6 h-[3px] bg-ink mb-2" />
          <h2 className="text-sm font-medium text-ink font-sans tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-muted font-sans mt-0.5">
            {question}
          </p>
        </div>

        {/* Hero Number & Sub-line */}
        <div className="pt-1">
          <div className="text-3xl sm:text-4xl font-display font-medium text-ink tracking-tight tabular-nums">
            {hero}
          </div>
          <div className="text-xs text-muted font-sans mt-1">
            {subLine}
          </div>
        </div>

        {/* Visual Slot */}
        {visual && <div className="pt-1">{visual}</div>}

        {/* Supporting Rows (max 2) */}
        {rows.length > 0 && (
          <div className="divide-y divide-border/60 border-t border-border/60 pt-1">
            {rows.slice(0, 2).map((r, i) => (
              <div
                key={i}
                className="py-1.5 flex items-center justify-between text-xs font-sans"
              >
                <span className="text-muted">{r.label}</span>
                <span className="text-ink font-medium tabular-nums">{r.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ONE Link at the bottom */}
      <div className="pt-2 border-t border-border/40">
        <Link
          to={link.href}
          className="inline-flex items-center text-xs font-medium text-ink hover:underline font-sans"
        >
          <span>{link.text}</span>
        </Link>
      </div>
    </div>
  );
};

