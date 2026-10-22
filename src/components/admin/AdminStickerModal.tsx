import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PingInQrCode } from '../qr/PingInQrCode';
import { buildTagQrUrl } from '../../lib/qr';
import {
  renderKauntactSticker,
  downloadCanvasPng,
  printStickerFromDataUrl,
  STICKER_WIDTH,
  STICKER_HEIGHT,
  loadStickerTemplate,
  type StickerTheme,
  DARK_QR_FG_COLOR,
  LIGHT_QR_FG_COLOR,
} from '../../lib/stickerGenerator';
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';

interface AdminStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTagNumber?: string;
  initialQrUrl?: string;
  initialTheme?: StickerTheme;
  resourceName?: string;
  ownerName?: string;
}

export const AdminStickerModal: React.FC<AdminStickerModalProps> = ({
  isOpen,
  onClose,
  initialTagNumber = '',
  initialQrUrl = '',
  initialTheme = 'dark',
  resourceName,
  ownerName,
}) => {
  const [theme, setTheme] = useState<StickerTheme>(initialTheme);
  const [tagNumber, setTagNumber] = useState(initialTagNumber);
  const [isRendering, setIsRendering] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [templates, setTemplates] = useState<{
    light: HTMLImageElement | null;
    dark: HTMLImageElement | null;
  }>({
    light: null,
    dark: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrSvgWrapperRef = useRef<HTMLDivElement | null>(null);

  // Sync initial tag and theme
  useEffect(() => {
    if (initialTagNumber) {
      setTagNumber(initialTagNumber);
    }
  }, [initialTagNumber]);

  useEffect(() => {
    if (initialTheme) {
      setTheme(initialTheme);
    }
  }, [initialTheme]);

  // Preload both templates when modal opens
  useEffect(() => {
    if (!isOpen) return;

    Promise.all([loadStickerTemplate('dark'), loadStickerTemplate('light')])
      .then(([darkImg, lightImg]) => {
        setTemplates({ dark: darkImg, light: lightImg });
      })
      .catch((err) => console.error('Failed to preload sticker templates:', err));
  }, [isOpen]);

  const cleanTag = (tagNumber || '').trim().toUpperCase();
  const targetQrUrl = initialQrUrl || buildTagQrUrl(cleanTag || 'PINGIN');
  const activeTemplate = templates[theme];

  const updateSticker = useCallback(async () => {
    const svgEl = qrSvgWrapperRef.current?.querySelector('svg');
    if (!canvasRef.current || !svgEl) return;
    setIsRendering(true);
    try {
      const xml = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });

      await renderKauntactSticker(canvasRef.current, {
        tagNumber: cleanTag,
        theme,
        qrSource: img,
        templateImage: activeTemplate,
      });

      URL.revokeObjectURL(url);
      const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
      setPreviewDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to render sticker:', err);
    } finally {
      setIsRendering(false);
    }
  }, [cleanTag, theme, activeTemplate]);

  // Trigger render when QR svg is ready, tag updates, or theme changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        updateSticker();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, cleanTag, theme, activeTemplate, updateSticker]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const filename = `kauntact_${theme}_sticker_${cleanTag || 'sample'}.png`;
    downloadCanvasPng(canvasRef.current, filename);
  };

  const handlePrint = () => {
    if (!previewDataUrl) return;
    printStickerFromDataUrl(previewDataUrl, cleanTag || 'sample');
  };

  const handleCopyLink = () => {
    if (!targetQrUrl) return;
    navigator.clipboard.writeText(targetQrUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-ink/60 backdrop-blur-xs">
      {/* Canonical Single QR Builder Source (PingInQrCode) */}
      <div style={{ position: 'absolute', left: -9999, top: -9999, opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
        <div ref={qrSvgWrapperRef}>
          <PingInQrCode
            key={`qr-src-${theme}-${cleanTag}`}
            value={cleanTag || 'PINGIN'}
            size={675}
            level="H"
            bgColor="transparent"
            fgColor={theme === 'dark' ? DARK_QR_FG_COLOR : LIGHT_QR_FG_COLOR}
            includeMargin={false}
          />
        </div>
        {/* Full-resolution offscreen canvas (1033x1447) */}
        <canvas ref={canvasRef} width={STICKER_WIDTH} height={STICKER_HEIGHT} />
      </div>

      <div className="w-full max-w-4xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-ink text-accent flex items-center justify-center font-bold text-xs shadow-xs">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink leading-tight">
                Kauntact QR Sticker Studio
              </h3>
              <p className="font-mono text-[11px] text-muted">
                {STICKER_WIDTH} × {STICKER_HEIGHT} px high-res print specification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-ink p-1.5 rounded-md hover:bg-bg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Visual Sticker Preview */}
          <div className="md:col-span-7 flex flex-col items-center justify-center bg-bg/80 border border-border rounded-lg p-5 relative overflow-hidden min-h-[380px]">
            {isRendering && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-ink mb-2" />
                <span className="font-mono text-xs uppercase tracking-wider text-muted">
                  Rendering sticker plate...
                </span>
              </div>
            )}

            {previewDataUrl ? (
              <div className="relative group max-w-[320px] sm:max-w-[360px] w-full transition-transform duration-300">
                <img
                  src={previewDataUrl}
                  alt={`Kauntact Sticker #${cleanTag}`}
                  className="w-full h-auto rounded-lg shadow-xl border border-black/10 select-none"
                />

                {/* Tag Overlay Label Badge */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-surface-dark/90 backdrop-blur-xs text-white rounded text-[10px] font-mono tracking-widest uppercase flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span>#{cleanTag || 'UNSET'}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted font-mono text-xs py-12">
                <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                <span>Loading template assets...</span>
              </div>
            )}
          </div>

          {/* Right Column: Controls, Tag Editor, and Actions */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-5">
            {/* Tag Config Form */}
            <div className="space-y-4">
              {/* Theme Selector: Dark Plate vs Light Plate */}
              <div className="p-1 bg-bg border border-border rounded-lg grid grid-cols-2 gap-1 select-none">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`py-1.5 px-3 rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-ink text-surface shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-accent" />
                  <span>Dark Plate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`py-1.5 px-3 rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-ink text-surface shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-muted" />
                  <span>Light Plate</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1.5">
                  Tag Number ({theme === 'dark' ? 'Satoshi Medium · #6B6961 · Spacing 0' : 'Satoshi · #737373 · Tracking 25'})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={tagNumber}
                    onChange={(e) => setTagNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. J39VFSA"
                    maxLength={14}
                    className="w-full px-3.5 py-2.5 bg-bg border border-border rounded font-mono text-sm tracking-widest font-bold uppercase text-ink focus:outline-none focus:border-ink transition-colors"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-mono text-muted">
                    #{cleanTag}
                  </span>
                </div>
              </div>

              {/* Target QR Destination */}
              <div className="p-3 bg-bg border border-border rounded space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted uppercase tracking-wider">
                  <span>Encoded Destination</span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1 text-ink hover:text-accent font-semibold transition-colors cursor-pointer"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3 h-3 text-success" />
                        <span className="text-success">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-ink break-all select-all font-medium">
                  {targetQrUrl}
                </div>
              </div>

              {/* Meta details if available */}
              {(resourceName || ownerName) && (
                <div className="p-3 bg-surface border border-border rounded text-xs space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                    Paired Entity
                  </span>
                  {resourceName && (
                    <div className="font-semibold text-ink">{resourceName}</div>
                  )}
                  {ownerName && (
                    <div className="text-muted text-[11px] font-mono">{ownerName}</div>
                  )}
                </div>
              )}

              {/* Specification checklist */}
              <div className="p-3 bg-bg/50 border border-border/80 rounded space-y-1.5 text-[11px] font-mono text-muted">
                <div className="flex items-center gap-2 text-ink font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span>Production Ready Specs ({theme.toUpperCase()})</span>
                </div>
                {theme === 'dark' ? (
                  <>
                    <div>• Base: darkKauntactStickerTemplate.png</div>
                    <div>• Tag: Top-right, Satoshi Medium, #6B6961 (Spacing 0)</div>
                    <div>• QR Code: #F5F4EE in rounded #262621 square</div>
                    <div>• Output: 1033 × 1447 px 300 DPI layout</div>
                  </>
                ) : (
                  <>
                    <div>• Base: kauntactStickerTemplate.png</div>
                    <div>• Tag: Top-right, Satoshi, #737373 (Tracking 25)</div>
                    <div>• QR Code: Transparent in #EDECE6 box</div>
                    <div>• Output: 1033 × 1447 px 300 DPI layout</div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5 border-t border-border">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isRendering || !previewDataUrl}
                className="w-full py-3 px-4 bg-ink text-surface hover:opacity-90 rounded font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-accent" />
                <span>Download {theme === 'dark' ? 'Dark' : 'Light'} PNG (1033×1447)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isRendering || !previewDataUrl}
                className="w-full py-2.5 px-4 bg-surface border border-border hover:border-ink rounded font-semibold text-xs tracking-wider uppercase text-ink flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-muted" />
                <span>Print Sticker Plate</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
