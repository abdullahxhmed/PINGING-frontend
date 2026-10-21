import React, { useState, useRef, useEffect } from 'react';
import type { Resource } from '../../types/api';
import { extractResourceTag, getResourceContactUrl } from '../../lib/api';
import { buildTagQrUrl } from '../../lib/qr';
import { PingInQrCode } from '../qr/PingInQrCode';
import { useToast } from '../ui/Toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  Copy,
  Download,
  Check,
  X,
  QrCode,
} from 'lucide-react';

export interface ShareTagSheetProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource;
}

export const ShareTagSheet: React.FC<ShareTagSheetProps> = ({
  isOpen,
  onClose,
  resource,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling while sheet is open and handle Escape key
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const tagNumber = extractResourceTag(resource);
  // Ensure the link and QR target the persistent public physical tag identifier (/t/:identifier)
  const publicUrl = tagNumber ? buildTagQrUrl(tagNumber) : getResourceContactUrl(resource);
  const qrTarget = tagNumber || publicUrl || resource.id;

  // 1. Native Web Share or fallback to clipboard
  const handleShareLink = async () => {
    if (!publicUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${resource.name} • Contact Tag`,
          text: `Scan or visit to connect privately with the owner of ${resource.name}.`,
          url: publicUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // 2. Copy link to clipboard with feedback
  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // 3. Download clean high-resolution printable PNG
  const handleDownloadQr = async () => {
    const svg = qrContainerRef.current?.querySelector('svg');
    if (!svg) {
      toast.error('QR code not ready for download');
      return;
    }

    setIsDownloading(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      // Clone SVG and set explicit high-resolution vector dimensions
      const svgClone = svg.cloneNode(true) as SVGSVGElement;
      const QR_SIZE = 1000;
      svgClone.setAttribute('width', QR_SIZE.toString());
      svgClone.setAttribute('height', QR_SIZE.toString());
      const svgData = new XMLSerializer().serializeToString(svgClone);

      const CANVAS_WIDTH = 1200;
      const CANVAS_HEIGHT = 1500;
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsDownloading(false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Solid background matching Kauntact aesthetic
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Subtle outer border
      ctx.strokeStyle = '#E5E5E0';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 40);

      // Title
      ctx.fillStyle = '#11110F';
      ctx.font = '700 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(resource.name.toUpperCase(), CANVAS_WIDTH / 2, 140);

      // Subtitle
      ctx.fillStyle = '#73736C';
      ctx.font = '500 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('SCAN TO CONTACT OWNER PRIVATELY', CANVAS_WIDTH / 2, 200);

      // Load SVG via object URL for maximum cross-browser fidelity
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const qrX = (CANVAS_WIDTH - QR_SIZE) / 2;
        const qrY = 260;
        ctx.drawImage(img, qrX, qrY, QR_SIZE, QR_SIZE);
        URL.revokeObjectURL(blobUrl);

        // Tag Number Badge below QR
        if (tagNumber) {
          ctx.fillStyle = '#11110F';
          ctx.font = '600 40px monospace';
          ctx.fillText(`TAG #${tagNumber}`, CANVAS_WIDTH / 2, qrY + QR_SIZE + 90);
        }

        // Trigger download
        const a = document.createElement('a');
        const cleanName = resource.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        a.download = `${cleanName}-qr.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        setIsDownloading(false);
        toast.success('QR Code downloaded');
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        setIsDownloading(false);
        toast.error('Could not generate QR image');
      };

      img.src = blobUrl;
    } catch (err) {
      console.error('Failed to download QR code', err);
      setIsDownloading(false);
      toast.error('Download failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">
          {/* Backdrop with restrained dimming */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/50 backdrop-blur-[2px] cursor-pointer"
          />

          {/* Bottom Sheet Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-sheet-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
            }}
            className="relative w-full sm:max-w-md bg-surface border-t sm:border border-border rounded-t-2xl sm:rounded-xl shadow-2xl px-5 pt-3 sm:pt-5 sm:px-6 z-10 max-h-[85vh] sm:max-h-[88vh] overflow-y-auto no-scrollbar"
          >
            {/* Subtle Top Drag Handle (Mobile only) */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3 sm:hidden shrink-0" />

            {/* Header: Title, Description & Accessible Close Button */}
            <div className="flex items-start justify-between gap-3 pb-1">
              <div className="min-w-0 pr-2">
                <h2
                  id="share-sheet-title"
                  className="font-display font-medium text-xl sm:text-2xl text-ink tracking-tight uppercase leading-snug truncate"
                >
                  Share {resource.name}
                </h2>
                <p className="font-sans text-xs text-muted mt-0.5 leading-relaxed">
                  Share the contact link or let someone scan the QR.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close share sheet"
                className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 p-2.5 text-muted hover:text-ink rounded-full hover:bg-border/30 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Centered QR Preview: Scaled to 180–200 px for optimal mobile proportions */}
            <div className="my-3 sm:my-4 flex flex-col items-center justify-center">
              <div
                ref={qrContainerRef}
                className="w-[188px] h-[188px] max-w-[50vw] aspect-square p-2.5 bg-white border border-border rounded-lg shadow-xs flex items-center justify-center shrink-0"
              >
                <PingInQrCode
                  value={qrTarget}
                  size={168}
                  includeMargin={false}
                />
              </div>

              {/* Printed Tag Identifier: Restrained, compact pill directly beneath QR */}
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ink text-surface font-mono text-[11px] font-semibold tracking-wider">
                <QrCode className="h-3 w-3 text-surface" />
                <span>{tagNumber ? `#${tagNumber}` : 'DIGITAL TAG'}</span>
              </div>
            </div>

            {/* Improved Action Layout: Clear visual hierarchy & >= 44px tap targets */}
            <div className="space-y-2 pt-1 pb-1">
              {/* Primary Action: Share */}
              <button
                type="button"
                onClick={handleShareLink}
                className="w-full min-h-[46px] h-[46px] px-4 bg-ink text-surface rounded-xs font-sans text-xs font-semibold tracking-wider uppercase hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Share2 className="h-4 w-4 shrink-0" />
                <span>Share</span>
              </button>

              {/* Two-row Secondary & Tertiary Actions: Balanced across 320px–430px screens */}
              <div className="grid grid-cols-2 gap-2">
                {/* Secondary Action: Copy link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="min-h-[44px] h-[44px] px-3 border border-border bg-surface text-ink rounded-xs font-sans text-xs font-medium tracking-wider uppercase hover:border-ink active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <span className="text-success font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-muted shrink-0" />
                      <span>Copy link</span>
                    </>
                  )}
                </button>

                {/* Tertiary / Less Prominent Action: Download QR */}
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={isDownloading}
                  className="min-h-[44px] h-[44px] px-3 border border-border/80 bg-surface/50 text-muted hover:text-ink hover:border-ink rounded-xs font-sans text-xs font-medium tracking-wider uppercase active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span>{isDownloading ? 'Saving...' : 'Download QR'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShareTagSheet;
