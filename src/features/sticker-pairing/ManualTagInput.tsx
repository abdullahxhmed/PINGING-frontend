import React, { useState } from 'react';
import { Camera, ArrowRight } from 'lucide-react';
import { extractCleanTagId } from './useQrScanner';

interface ManualTagInputProps {
  onSubmitCode: (code: string) => void;
  onSwitchToCamera: () => void;
}

export const ManualTagInput: React.FC<ManualTagInputProps> = ({
  onSubmitCode,
  onSwitchToCamera,
}) => {
  const [code, setCode] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = extractCleanTagId(code);
    if (!clean) return;
    onSubmitCode(clean);
  };

  return (
    <div className="p-5 bg-surface border border-border rounded-xl space-y-4 shadow-sm">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink mb-1">
          Sticker code
        </label>
        <p className="text-[11px] text-muted mb-2.5">
          Use the 7-character code printed below the sticker’s QR.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={(el) => {
              inputRef.current = el;
              if (el) el.focus();
            }}
            type="text"
            autoFocus
            placeholder="e.g. JE5PBCE"
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full h-11 px-3.5 bg-bg border border-border focus:border-ink rounded-xs font-satoshi font-medium text-base uppercase text-ink outline-none tracking-wider placeholder:text-muted/50"
          />

          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full h-10 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded-xs hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Verify sticker</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      <div className="pt-2 text-center border-t border-border">
        <button
          type="button"
          onClick={onSwitchToCamera}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-medium transition-colors cursor-pointer"
        >
          <Camera className="h-3.5 w-3.5" />
          <span>Switch back to camera scanner</span>
        </button>
      </div>
    </div>
  );
};

export default ManualTagInput;
