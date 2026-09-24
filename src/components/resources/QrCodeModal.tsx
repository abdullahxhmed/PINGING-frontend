import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Check, Copy, ExternalLink, Download, Printer, Share2 } from 'lucide-react';
import { getPublicBaseUrl, getPublicDomain } from '../../lib/api';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  resourceName: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.arcTo(x, y + radius, x, y, radius);
  ctx.closePath();
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  token,
  resourceName,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const qrSvgRef = useRef<HTMLDivElement>(null);
  const stickerPlateRef = useRef<HTMLDivElement>(null);

  // 3D Card Tilt State
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHoveringCard, setIsHoveringCard] = useState(false);

  // Dynamically resolve environment / Vercel / custom live domain URL
  const baseUrl = getPublicBaseUrl();
  const domain = getPublicDomain();
  const publicUrl = `${baseUrl}/c/${token}`;

  const shortToken = token.length > 8 ? token.slice(0, 8) : token;
  const displayUrl = `${domain}/c/${shortToken}`;
  const footerText = `visit ${domain} to get yours!`;

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = stickerPlateRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Card sticks / tilts directly toward cursor
    const rotateX = -((y - centerY) / centerY) * 13;
    const rotateY = ((x - centerX) / centerX) * 13;

    setTilt({ rotateX, rotateY, scale: 1.03 });
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.2,
    });
  };

  const handleCardMouseEnter = () => {
    setIsHoveringCard(true);
  };

  const handleCardMouseLeave = () => {
    setIsHoveringCard(false);
    setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `PingIn Contact QR`,
          text: `Contact owner anonymously via PingIn:`,
          url: publicUrl,
        });
      } else {
        await handleCopy();
      }
    } catch {
      // User cancelled
    } finally {
      setIsSharing(false);
    }
  };

  /**
   * Generates a high-resolution, print-ready PingIn sticker PNG matching
   * the exact physical template:
   * - Rounded corner plate (#F4F3EE) with subtle border (#D8D5CC)
   * - Top wordmark PINGIN with green circular ring
   * - Headline: "NEED TO CONTACT THE OWNER? SCAN HERE"
   * - Sharp scannable QR code
   * - pingin.com/c/••••
   * - Centered dividing rule
   * - Footer: "visit ${domain} to get yours!"
   */
  const handleDownloadPrintablePng = async () => {
    if (!qrSvgRef.current) return;
    const svg = qrSvgRef.current.querySelector('svg');
    if (!svg) return;

    setIsGeneratingPng(true);

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      // 4x Supersampling for crystal-clear, ultra-HD print fidelity (2400 x 2960 px at 300+ DPI)
      const SCALE = 4;
      const LOGICAL_WIDTH = 600;
      const LOGICAL_HEIGHT = 740;
      const QR_LOGICAL_SIZE = 420;
      const QR_PIXEL_SIZE = QR_LOGICAL_SIZE * SCALE; // 1680 x 1680 px native QR resolution

      // Clone SVG and set explicit high-resolution vector dimensions before serialization
      const svgClone = svg.cloneNode(true) as SVGSVGElement;
      svgClone.setAttribute('width', QR_PIXEL_SIZE.toString());
      svgClone.setAttribute('height', QR_PIXEL_SIZE.toString());
      const svgData = new XMLSerializer().serializeToString(svgClone);

      const canvas = document.createElement('canvas');
      canvas.width = LOGICAL_WIDTH * SCALE;
      canvas.height = LOGICAL_HEIGHT * SCALE;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsGeneratingPng(false);
        return;
      }

      // Enable high-quality smoothing for typography and borders
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Scale coordinates so all layout math stays clean and intuitive
      ctx.scale(SCALE, SCALE);

      const qrImg = new Image();

      qrImg.onload = () => {
        // 1. Solid sticker surface (#F4F3EE) filling entire canvas
        ctx.fillStyle = '#F4F3EE';
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

        // 2. Crisp outer boundary sticker border
        drawRoundedRect(ctx, 4, 4, LOGICAL_WIDTH - 8, LOGICAL_HEIGHT - 8, 20);
        ctx.strokeStyle = '#D8D5CC';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. Top Header: PINGIN + Circular Green Ring
        ctx.fillStyle = '#11110F';
        ctx.font = '500 20px "Clash Display", -apple-system, sans-serif';
        if ('letterSpacing' in ctx) {
          (ctx as any).letterSpacing = '0.14em';
        }
        ctx.textAlign = 'left';
        ctx.fillText('PINGIN', 36, 46);
        if ('letterSpacing' in ctx) {
          (ctx as any).letterSpacing = '0px';
        }

        // Circular ring on right
        ctx.beginPath();
        ctx.arc(LOGICAL_WIDTH - 42, 40, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#D7FF3F';
        ctx.fill();
        ctx.strokeStyle = '#11110F';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 4. Headline: NEED TO CONTACT THE OWNER? SCAN HERE
        ctx.fillStyle = '#11110F';
        ctx.font = '800 35px "Clash Display", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NEED TO CONTACT', LOGICAL_WIDTH / 2, 94);
        ctx.fillText('THE OWNER?', LOGICAL_WIDTH / 2, 133);
        ctx.fillText('SCAN HERE', LOGICAL_WIDTH / 2, 172);

        // 5. Scannable QR Code: disable smoothing for pixel-perfect 1:1 vector sharpness
        const qrX = (LOGICAL_WIDTH - QR_LOGICAL_SIZE) / 2;
        const qrY = 192;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(qrImg, qrX, qrY, QR_LOGICAL_SIZE, QR_LOGICAL_SIZE);
        ctx.imageSmoothingEnabled = true;

        // 6. Textual URL under QR
        ctx.fillStyle = '#8C897F';
        ctx.font = '500 15px "General Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(displayUrl, LOGICAL_WIDTH / 2, 646);

        // 7. Short Centered Horizontal Divider
        const ruleWidth = 140;
        const ruleX = (LOGICAL_WIDTH - ruleWidth) / 2;
        ctx.beginPath();
        ctx.strokeStyle = '#D8D5CC';
        ctx.lineWidth = 1.2;
        ctx.moveTo(ruleX, 672);
        ctx.lineTo(ruleX + ruleWidth, 672);
        ctx.stroke();

        // 8. Footer: visit ${domain} to get yours!
        ctx.fillStyle = '#8C897F';
        ctx.font = '500 13px "General Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(footerText, LOGICAL_WIDTH / 2, 702);

        // 9. Download the crystal-clear, ultra-HD sticker PNG
        const link = document.createElement('a');
        link.download = `PingIn-Sticker-${shortToken}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        setIsGeneratingPng(false);
      };

      qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Failed to generate PNG sticker', err);
      setIsGeneratingPng(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="PRINTABLE STICKER"
      description={`Physical adhesive sticker for ${resourceName || 'your resource'}.`}
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Interactive 3D Perspective Mouse-Sticking Card */}
        <div className="w-full flex justify-center [perspective:1000px] select-none py-2 sm:py-3">
          <div
            id="printable-sticker-plate"
            ref={stickerPlateRef}
            onMouseMove={handleCardMouseMove}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(${tilt.scale}, ${tilt.scale}, ${tilt.scale})`,
              boxShadow: isHoveringCard
                ? `${-tilt.rotateY * 1.8}px ${18 + tilt.rotateX * 1.4}px 38px -6px rgba(17, 17, 15, 0.25), 0 22px 42px -10px rgba(17, 17, 15, 0.16), 0 2px 6px rgba(17, 17, 15, 0.08)`
                : '0 14px 32px -8px rgba(17, 17, 15, 0.16), 0 6px 16px -4px rgba(17, 17, 15, 0.09), 0 1px 3px rgba(17, 17, 15, 0.06)',
              transition: isHoveringCard
                ? 'transform 0.08s ease-out, box-shadow 0.08s ease-out'
                : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
              transformStyle: 'preserve-3d',
            }}
            className="relative bg-[#F4F3EE] text-[#11110F] p-4 sm:p-5 rounded-xl border border-[#D8D5CC] flex flex-col items-center text-center w-full max-w-[260px] sm:max-w-[290px] cursor-grab active:cursor-grabbing overflow-hidden"
          >
            {/* Dynamic Glare Highlight Overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300 z-10"
              style={{
                background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, ${glare.opacity}), transparent 65%)`,
                opacity: isHoveringCard ? 1 : 0,
              }}
            />

            {/* Parallax Content Layer with translateZ */}
            <div
              style={{ transform: 'translateZ(18px)', transformStyle: 'preserve-3d' }}
              className="w-full flex flex-col items-center"
            >
              {/* Top Bar: Wordmark + green circular ring indicator */}
              <div className="flex items-center justify-between w-full pb-1">
                <span className="font-display font-medium text-xs sm:text-sm tracking-[0.14em] uppercase text-[#11110F]">
                  PINGIN
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D7FF3F] border border-[#11110F]" />
              </div>

              {/* Primary Headline */}
              <div className="my-1.5 text-center w-full">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-[#11110F] uppercase tracking-tight leading-[1.14]">
                  NEED TO CONTACT<br />
                  THE OWNER?<br />
                  SCAN HERE
                </h3>
              </div>

              {/* Scannable QR Code */}
              <div ref={qrSvgRef} className="my-1.5 flex items-center justify-center w-full">
                <QRCodeSVG
                  value={publicUrl}
                  size={175}
                  level="H"
                  fgColor="#11110F"
                  bgColor="#F4F3EE"
                  includeMargin={true}
                  className="w-full max-w-[165px] sm:max-w-[185px] h-auto"
                />
              </div>

              {/* Textual URL under QR */}
              <div className="w-full text-center mt-0.5 mb-1">
                <span className="text-[10px] sm:text-[11px] font-sans font-medium text-[#8C897F] tracking-wide block truncate">
                  {displayUrl}
                </span>
              </div>

              {/* Short Centered Horizontal Divider */}
              <div className="w-16 h-[1.2px] bg-[#D8D5CC] my-1 mx-auto" />

              {/* Footer Text */}
              <div className="w-full text-center">
                <span className="text-[10px] font-sans font-medium text-[#8C897F] tracking-wide block">
                  {footerText}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Informative Micro-Summary Chip */}
        <div className="flex items-center justify-between w-full text-[10px] font-sans text-muted tracking-wider uppercase px-1">
          <span>Physical 4:5 Sticker</span>
        </div>

        {/* Mobile-Concise Action Grid: 2 columns instead of long vertical row stack */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button
            variant="primary"
            onClick={handleDownloadPrintablePng}
            isLoading={isGeneratingPng}
            leftIcon={<Download className="h-3.5 w-3.5 text-accent" />}
            className="!h-10 text-xs tracking-wider uppercase font-semibold"
          >
            Download PNG
          </Button>

          <Button
            variant="secondary"
            onClick={handleShare}
            isLoading={isSharing}
            leftIcon={<Share2 className="h-3.5 w-3.5 text-ink" />}
            className="!h-10 text-xs tracking-wider uppercase font-semibold"
          >
            Share Link
          </Button>
        </div>

        {/* Compact Public URL Bar with inline Copy & Print */}
        <div className="flex items-center gap-1.5 w-full bg-bg border border-border rounded-sm p-1">
          <span className="font-sans text-[11px] text-muted px-2 truncate select-all flex-1">
            {publicUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-surface hover:bg-surface-elevated border border-border text-[11px] font-sans font-semibold text-ink uppercase tracking-wider transition-colors cursor-pointer shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-success" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            title="Print sticker"
            className="p-1.5 rounded-sm bg-surface hover:bg-surface-elevated border border-border text-muted hover:text-ink transition-colors cursor-pointer shrink-0"
            aria-label="Print sticker"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Footer info & close */}
        <div className="flex w-full justify-between items-center pt-2 border-t border-border">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-sans font-semibold text-ink hover:text-muted underline"
          >
            <span>Preview Page</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-sm border border-border hover:border-ink font-sans text-xs font-semibold text-muted hover:text-ink uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default QrCodeModal;
