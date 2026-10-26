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
  renderMiniSticker,
  loadMiniTemplate,
  MINI_DARK_WIDTH,
  MINI_DARK_HEIGHT,
  MINI_WHITE_WIDTH,
  MINI_WHITE_HEIGHT,
} from '../../lib/stickerGenerator';
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';

export type StickerFormat = 'standard' | 'mini';

interface AdminStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTagNumber?: string;
  initialQrUrl?: string;
  initialTheme?: StickerTheme;
  initialFormat?: StickerFormat;
  resourceName?: string;
  ownerName?: string;
}

export const AdminStickerModal: React.FC<AdminStickerModalProps> = ({
  isOpen,
  onClose,
  initialTagNumber = '',
  initialQrUrl = '',
  initialTheme = 'dark',
  initialFormat = 'standard',
  resourceName,
  ownerName,
}) => {
  const [format, setFormat] = useState<StickerFormat>(initialFormat);
  const [theme, setTheme] = useState<StickerTheme>(initialTheme);
  const [tagNumber, setTagNumber] = useState(initialTagNumber);
  const [isRendering, setIsRendering] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [standardTemplates, setStandardTemplates] = useState<{
    light: HTMLImageElement | null;
    dark: HTMLImageElement | null;
  }>({
    light: null,
    dark: null,
  });
  const [miniTemplates, setMiniTemplates] = useState<{
    light: HTMLImageElement | null;
    dark: HTMLImageElement | null;
  }>({
    light: null,
    dark: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrSvgWrapperRef = useRef<HTMLDivElement | null>(null);

  // Sync initial tag, theme, and format
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

  useEffect(() => {
    if (initialFormat) {
      setFormat(initialFormat);
    }
  }, [initialFormat]);

  // Preload both standard and mini templates when modal opens
  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      loadStickerTemplate('dark'),
      loadStickerTemplate('light'),
      loadMiniTemplate('dark'),
      loadMiniTemplate('white'),
    ])
      .then(([darkImg, lightImg, miniDarkImg, miniWhiteImg]) => {
        setStandardTemplates({ dark: darkImg, light: lightImg });
        setMiniTemplates({ dark: miniDarkImg, light: miniWhiteImg });
      })
      .catch((err) => console.error('Failed to preload sticker templates:', err));
  }, [isOpen]);

  const cleanTag = (tagNumber || '').trim().toUpperCase();
  const targetQrUrl = initialQrUrl || buildTagQrUrl(cleanTag || 'PINGIN');

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

      if (format === 'mini') {
        const miniImg = theme === 'dark' ? miniTemplates.dark : miniTemplates.light;
        await renderMiniSticker(canvasRef.current, {
          tag: cleanTag,
          theme,
          qrSource: img,
          baseImage: miniImg,
        });
      } else {
        const standardImg = standardTemplates[theme];
        await renderKauntactSticker(canvasRef.current, {
          tagNumber: cleanTag,
          theme,
          qrSource: img,
          templateImage: standardImg,
        });
      }

      URL.revokeObjectURL(url);
      const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
      setPreviewDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to render sticker:', err);
    } finally {
      setIsRendering(false);
    }
  }, [cleanTag, theme, format, standardTemplates, miniTemplates]);

  // Trigger render when QR svg is ready, tag updates, theme changes, or format toggles
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        updateSticker();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, cleanTag, theme, format, standardTemplates, miniTemplates, updateSticker]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const prefix = format === 'mini' ? 'kauntact_mini' : 'kauntact';
    const filename = `${prefix}_${theme}_sticker_${cleanTag || 'sample'}.png`;
    downloadCanvasPng(canvasRef.current, filename);
  };

  const handlePrint = () => {
    if (!previewDataUrl) return;
    printStickerFromDataUrl(
      previewDataUrl,
      `${format === 'mini' ? 'Mini ' : ''}#${cleanTag || 'sample'}`
    );
  };

  const handleCopyLink = () => {
    if (!targetQrUrl) return;
    navigator.clipboard.writeText(targetQrUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-5 bg-bg md:bg-ink/60 md:backdrop-blur-xs">
      {/* Canonical Single QR Builder Source (PingInQrCode) */}
      <div style={{ position: 'absolute', left: -9999, top: -9999, opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
        <div ref={qrSvgWrapperRef}>
          <PingInQrCode
            key={`qr-src-${format}-${theme}-${cleanTag}`}
            value={cleanTag || 'PINGIN'}
            size={726}
            level="H"
            bgColor="transparent"
            fgColor={theme === 'dark' ? DARK_QR_FG_COLOR : LIGHT_QR_FG_COLOR}
            includeMargin={false}
          />
        </div>
        {/* Offscreen canvas */}
        <canvas
          ref={canvasRef}
          width={format === 'mini' ? (theme === 'dark' ? MINI_DARK_WIDTH : MINI_WHITE_WIDTH) : STICKER_WIDTH}
          height={format === 'mini' ? (theme === 'dark' ? MINI_DARK_HEIGHT : MINI_WHITE_HEIGHT) : STICKER_HEIGHT}
        />
      </div>

      <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl bg-surface md:border md:border-border rounded-xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-border flex items-center justify-between bg-surface shrink-0 z-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-ink leading-tight">
              Sticker Preview
            </h3>
            <p className="font-mono text-[11px] sm:text-xs text-muted">
              #{cleanTag || 'UNSET'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-bg hover:bg-border/60 text-ink flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Column: Interactive Visual Sticker Preview */}
          <div className="md:col-span-6 flex flex-col items-center justify-center bg-bg/60 border border-border rounded-xl p-4 sm:p-5 relative overflow-hidden min-h-[220px] sm:min-h-[280px]">
            {isRendering && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-ink mb-1.5" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                  Rendering...
                </span>
              </div>
            )}

            {previewDataUrl ? (
              <div className="max-w-[200px] sm:max-w-[240px] md:max-w-[280px] w-full transition-transform duration-300">
                <img
                  src={previewDataUrl}
                  alt={`Kauntact Sticker #${cleanTag}`}
                  className="w-full h-auto rounded-lg shadow-lg border border-black/10 select-none mx-auto block"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted font-mono text-xs py-8 sm:py-12">
                <RefreshCw className="w-5 h-5 animate-spin mb-2" />
                <span>Loading template...</span>
              </div>
            )}
          </div>

          {/* Right Column: Controls, Tag Editor, and Actions */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              {/* Format Selector: Standard vs Mini */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
                  Format
                </label>
                <div className="p-1 bg-bg border border-border rounded-lg grid grid-cols-2 gap-1 select-none">
                  <button
                    type="button"
                    onClick={() => setFormat('standard')}
                    className={`h-9 px-2 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      format === 'standard'
                        ? 'bg-ink text-surface shadow-xs'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('mini')}
                    className={`h-9 px-2 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      format === 'mini'
                        ? 'bg-ink text-surface shadow-xs'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    Mini
                  </button>
                </div>
              </div>

              {/* Theme Selector: Dark Plate vs Light Plate */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
                  Plate Color
                </label>
                <div className="p-1 bg-bg border border-border rounded-lg grid grid-cols-2 gap-1 select-none">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`h-9 px-2 rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-ink text-surface shadow-xs'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`h-9 px-2 rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-ink text-surface shadow-xs'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              {/* Tag Number Input */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
                  Tag Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={tagNumber}
                    onChange={(e) => setTagNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. J39VFSA"
                    maxLength={14}
                    className="w-full h-11 px-3.5 bg-bg border border-border rounded-lg font-mono text-sm tracking-widest font-bold uppercase text-ink focus:outline-none focus:border-ink transition-colors"
                  />
                  <span className="absolute right-3.5 top-3 text-[11px] font-mono text-muted">
                    #{cleanTag}
                  </span>
                </div>
              </div>

              {/* Target QR Destination Link */}
              <div className="p-3 bg-bg border border-border rounded-lg space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted uppercase tracking-wider">
                  <span>Scan Target URL</span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1 text-ink hover:text-muted font-medium transition-colors cursor-pointer"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3 h-3 text-success" />
                        <span className="text-success font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-ink truncate select-all">
                  {targetQrUrl}
                </div>
              </div>

              {/* Meta details if available */}
              {(resourceName || ownerName) && (
                <div className="p-3 bg-surface border border-border rounded-lg text-xs space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted block">
                    Assigned Entity
                  </span>
                  {resourceName && (
                    <div className="font-semibold text-ink truncate">{resourceName}</div>
                  )}
                  {ownerName && (
                    <div className="text-muted text-[11px] font-mono truncate">{ownerName}</div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Action Buttons (Hidden on mobile) */}
            <div className="hidden md:flex flex-col space-y-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isRendering || !previewDataUrl}
                className="w-full h-11 bg-ink text-surface hover:opacity-90 active:scale-[0.99] rounded font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isRendering || !previewDataUrl}
                className="w-full h-10 bg-surface border border-border hover:border-ink rounded font-semibold text-xs tracking-wider uppercase text-ink flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-muted" />
                <span>Print Sticker</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Action Bar (Visible only on mobile) */}
        <div className="md:hidden p-3 border-t border-border bg-surface shrink-0 z-10 flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isRendering || !previewDataUrl}
            className="flex-1 h-12 bg-ink text-surface active:scale-[0.98] rounded-lg font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isRendering || !previewDataUrl}
            className="w-12 h-12 border border-border rounded-lg flex items-center justify-center text-ink hover:bg-bg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 shrink-0"
            aria-label="Print Sticker"
            title="Print Sticker"
          >
            <Printer className="w-4 h-4 text-muted" />
          </button>
        </div>
      </div>
    </div>
  );
};
