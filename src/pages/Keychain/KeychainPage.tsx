import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  RotateCw,
  Sparkles,
  ArrowLeft,
  Check,
  QrCode,
  Type,
  Layers,
  CircleDot,
  FolderDown,
} from 'lucide-react';
import { PingInLogo, PingInSvgLogo } from '../../components/brand/PingInLogo';

const FIND_SVG_PATH =
  'm 171.50961,578.26388 v -72.384 h 29.76 v -23.808 h -30.912 c -0.768,-9.408 5.184,-11.52 17.856,-11.52 h 13.056 v -20.928 h -8.448 c -29.568,0 -46.464,13.056 -49.536,32.448 h -14.208 v 23.808 h 13.632 v 72.384 z m 68.16,-105.984 v -22.656 h -28.8 v 22.656 z m 0,105.984 v -96.192 h -28.8 v 96.192 z m 43.9681,0 v -48.576 c 0,-16.32 6.528,-23.616 24.768,-23.616 17.664,0 24,6.528 24,21.888 v 50.304 h 28.8 v -59.904 c 0,-21.312 -12.48,-38.208 -38.784,-38.208 -25.152,0 -36.672,15.36 -39.168,31.488 h -1.728 v -29.568 h -26.688 v 96.192 z m 135.16784,1.92 c 22.08,0 34.752,-9.6 38.4,-28.608 h 1.536 v 26.688 h 26.88 v -128.64 h -28.8 v 57.984 h -1.728 c -3.264,-16.128 -14.976,-27.456 -37.824,-27.456 -28.608,0 -44.928,19.392 -44.928,50.112 0,30.336 16.512,49.92 46.464,49.92 z m -17.28,-49.92 c 0,-17.664 8.64,-23.808 27.072,-23.808 18.432,0 24.60596,4.2873 24.60596,20.9913 v 7.57029 c 0,10.35437 -6.36596,18.86241 -24.60596,18.86241 -18.432,0 -27.072,-6.144 -27.072,-23.616 z';

const AT_SVG_PATH =
  'm 185.53097,153.18947 h -6.15118 c -5.6338,0 -9.25552,-2.08281 -9.25552,-7.9756 v -14.02079 h -5.05891 v -3.0988 h 5.05891 v -5.99439 h 4.13912 v 5.99439 h 11.26758 v 3.0988 h -11.26758 v 14.22399 c 0,3.5052 1.95457,4.4704 6.09369,4.4704 h 5.17389 z m -43.11753,-5.90117 c 0.1635,2.90612 2.20674,3.46511 2.64615,3.61517 2.76185,0.94318 12.35986,-2.6924 12.35986,-8.73759 v -0.2032 l -12.24488,1.21919 c -1.52284,0.10997 -2.89295,1.76356 -2.76113,4.10643 z m 1.72636,6.40916 c -5.57631,0 -9.3705,-2.33679 -9.3705,-6.40079 0,-4.1148 3.85168,-5.89279 9.14054,-6.40079 l 13.50961,-1.3208 v -1.9304 c 0,-4.87679 -2.41448,-6.8072 -8.62316,-6.8072 -6.09369,0 -4.053,6.03746 -5.98799,6.22719 l -3.32501,0.32601 h -4.08163 v -0.2032 c 0,-5.2832 4.94394,-9.60119 13.68208,-9.60119 8.62315,0 12.30236,4.36879 12.30236,9.90599 v 15.69719 h -3.67921 v -6.7564 h -0.28744 c -1.66715,4.6228 -6.66857,7.26439 -13.27965,7.26439 z';

const MAX_CHAR_LIMIT = 40;
const CANVAS_SIZE = 1800; // Ultra high-definition 1800 x 1800 px (300 DPI ready)

export const KeychainPage: React.FC = () => {
  const [customText, setCustomText] = useState('SCAN TO CONTACT OWNER');
  const [qrValue, setQrValue] = useState('https://findat.in');
  const [colorTheme, setColorTheme] = useState<'bone' | 'dark'>('bone');
  const [includeKeyhole, setIncludeKeyhole] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Hidden offscreen QR container for high-res canvas serialization
  const qrSvgWrapperRef = useRef<HTMLDivElement | null>(null);

  // Word-wrapping logic: up to 9 characters per line for balanced, large typography
  const formatTextLines = (text: string) => {
    const clean = text.trim().toUpperCase() || 'SCAN TO CONTACT OWNER';
    const words = clean.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= 9) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 4);
  };

  const textLines = formatTextLines(customText);

  // Screen preview font size (in pixels) scaled up to match QR footprint
  const getScreenFontSize = (lineCount: number) => {
    switch (lineCount) {
      case 1:
        return 56;
      case 2:
        return 48;
      case 3:
        return 42;
      case 4:
      default:
        return 34;
    }
  };

  const screenFontSize = getScreenFontSize(textLines.length);

  const isDark = colorTheme === 'dark';
  const bgColor = isDark ? '#151513' : '#F4F3EE';
  const borderColor = isDark ? '#2D2D2A' : '#D8D5CC';
  const textColor = isDark ? '#F5F4EE' : '#11110F';
  const fadedTextColor = isDark ? 'rgba(245, 244, 238, 0.65)' : 'rgba(17, 17, 15, 0.62)';

  // Native HTML5 Canvas 2D High-Resolution Render Engine (1800x1800 px)
  const renderCanvas = async (isFront: boolean): Promise<HTMLCanvasElement | null> => {
    await document.fonts.ready;

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw Rounded Square Plate
    const platePadding = 24;
    const plateSize = CANVAS_SIZE - platePadding * 2;
    const cornerRadius = 150;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(platePadding, platePadding, plateSize, plateSize, cornerRadius);
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 12;
    ctx.stroke();

    // 2. Optional Keyhole Punch at Top-Right
    if (includeKeyhole) {
      ctx.fillStyle = '#EDECE6';
      ctx.beginPath();
      ctx.arc(CANVAS_SIZE - 200, 200, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isDark ? '#3D3D39' : '#C5C1B6';
      ctx.lineWidth = 14;
      ctx.stroke();
    }

    if (isFront) {
      // ── FRONT SIDE ──────────────────────────────────────────
      // Authentic Vector Findat Brand Logo Wordmark at Top-Left
      ctx.save();
      const logoTargetHeight = 58;
      const logoScale = logoTargetHeight / 34.734486;
      ctx.translate(160, 140);
      ctx.scale(logoScale, logoScale);
      ctx.translate(-21.299147, -118.963);

      // "find" wordmark segment
      ctx.save();
      ctx.transform(0.3055025, 0, 0, 0.26458333, -18.134387, 0);
      ctx.fillStyle = textColor;
      ctx.fill(new Path2D(FIND_SVG_PATH));
      ctx.restore();

      // "at" wordmark segment
      ctx.save();
      ctx.transform(0.97947062, 0, 0, 1, 1.724624, 0);
      ctx.fillStyle = '#8f8f8f';
      ctx.fill(new Path2D(AT_SVG_PATH));
      ctx.restore();

      ctx.restore();

      // Scaled Clash Display Typography fitting the entirety of the QR footprint (1380px)
      // leaving comfortable padding for 1.5-inch physical tag printing
      const TARGET_TEXT_WIDTH = 1380;
      const MAX_TEXT_HEIGHT = 1000;

      let fontSize = 320;
      while (fontSize > 40) {
        ctx.font = `800 ${fontSize}px "Clash Display", "General Sans", sans-serif`;
        const maxLineWidth = Math.max(...textLines.map((l) => ctx.measureText(l).width));
        const totalHeight = textLines.length * (fontSize * 1.04);
        if (maxLineWidth <= TARGET_TEXT_WIDTH && totalHeight <= MAX_TEXT_HEIGHT) {
          break;
        }
        fontSize -= 2;
      }

      ctx.fillStyle = textColor;
      ctx.font = `800 ${fontSize}px "Clash Display", "General Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.letterSpacing = '-0.02em';

      const lineHeight = fontSize * 1.04;
      const totalHeight = textLines.length * lineHeight;
      const startY = 1010 - totalHeight / 2 + fontSize * 0.78;

      textLines.forEach((line, idx) => {
        ctx.fillText(line, CANVAS_SIZE / 2, startY + idx * lineHeight);
      });

      return canvas;

    } else {
      // ── BACK SIDE ───────────────────────────────────────────
      // White QR Container Card (Large, taking up 80% of canvas)
      const qrBoxSize = 1420;
      const qrBoxX = (CANVAS_SIZE - qrBoxSize) / 2;
      const qrBoxY = 100;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 80);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 8;
      ctx.stroke();

      // Render the QR code image into the white box
      if (qrSvgWrapperRef.current) {
        const svgEl = qrSvgWrapperRef.current.querySelector('svg');
        if (svgEl) {
          const svgData = new XMLSerializer().serializeToString(svgEl);
          const img = new Image();
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          await new Promise<void>((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, qrBoxX + 60, qrBoxY + 60, qrBoxSize - 120, qrBoxSize - 120);
              URL.revokeObjectURL(url);
              resolve();
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            img.src = url;
          });
        }
      }

      // Website link in a slightly faded colour directly below the QR code
      ctx.fillStyle = isDark ? 'rgba(245, 244, 238, 0.65)' : 'rgba(17, 17, 15, 0.65)';
      ctx.font = '700 95px "General Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '0.08em';
      ctx.fillText('findat.in', CANVAS_SIZE / 2, qrBoxY + qrBoxSize + 175);

      return canvas;
    }
  };

  // Safe file downloader:
  // 1. Shows native Windows "Save As" file picker dialog asking user for folder
  // 2. Falls back to standard anchor with clean filename and base64 data URL
  const saveCanvasAsPng = async (canvas: HTMLCanvasElement, defaultFilename: string): Promise<boolean> => {
    const filename = defaultFilename.toLowerCase().endsWith('.png') ? defaultFilename : `${defaultFilename}.png`;

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }

        // Method 1: Native Windows "Save As" File Picker Dialog
        if ('showSaveFilePicker' in window) {
          try {
            const handle = await (window as any).showSaveFilePicker({
              suggestedName: filename,
              types: [
                {
                  description: 'PNG Image (*.png)',
                  accept: { 'image/png': ['.png'] },
                },
              ],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            resolve(true);
            return;
          } catch (err: any) {
            // User cancelled the dialog
            if (err.name === 'AbortError') {
              resolve(false);
              return;
            }
          }
        }

        // Method 2: Standard anchor download fallback with base64 PNG data URL
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 1500);
        resolve(true);
      }, 'image/png');
    });
  };

  // Download Front PNG
  const handleDownloadFront = async () => {
    setIsGenerating(true);
    const canvas = await renderCanvas(true);
    if (canvas) {
      const ok = await saveCanvasAsPng(canvas, 'findat-keychain-front.png');
      if (ok) {
        setDownloadSuccess('Front Square PNG saved!');
        setTimeout(() => setDownloadSuccess(null), 3000);
      }
    }
    setIsGenerating(false);
  };

  // Download Back PNG
  const handleDownloadBack = async () => {
    setIsGenerating(true);
    const canvas = await renderCanvas(false);
    if (canvas) {
      const ok = await saveCanvasAsPng(canvas, 'findat-keychain-back.png');
      if (ok) {
        setDownloadSuccess('Back Square PNG saved!');
        setTimeout(() => setDownloadSuccess(null), 3000);
      }
    }
    setIsGenerating(false);
  };

  // Download Both PNGs
  const handleDownloadBoth = async () => {
    setIsGenerating(true);
    const frontCanvas = await renderCanvas(true);
    if (frontCanvas) {
      const okFront = await saveCanvasAsPng(frontCanvas, 'findat-keychain-front.png');
      if (okFront) {
        const backCanvas = await renderCanvas(false);
        if (backCanvas) {
          await saveCanvasAsPng(backCanvas, 'findat-keychain-back.png');
          setDownloadSuccess('Both Front & Back Square PNGs saved!');
          setTimeout(() => setDownloadSuccess(null), 3500);
        }
      }
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-ink pb-20 overflow-x-hidden">
      {/* ── Navigation Bar ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 -ml-2 text-muted hover:text-ink transition-colors flex items-center gap-1.5 text-xs font-mono uppercase"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
            <div className="h-4 w-[1px] bg-border" />
            <Link to="/" aria-label="Findat Home">
              <PingInLogo height={16} className="w-auto h-4 sm:h-[16px]" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tracking-widest uppercase text-muted hidden sm:inline-block">
              SQUARE KEYCHAIN STUDIO
            </span>
            <div className="w-2 h-2 rounded-full bg-accent" />
          </div>
        </div>
      </header>

      {/* ── Main Work Area ────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-8 sm:pt-12">
        
        {/* Title & Description */}
        <div className="max-w-2xl space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xs bg-surface border border-border text-[10px] font-mono tracking-widest text-ink uppercase font-semibold">
            <Sparkles className="w-3 h-3 text-accent" />
            PRINT-READY SQUARE MODEL
          </div>
          <h1 className="font-display font-medium text-3xl sm:text-4xl text-ink tracking-tight uppercase leading-tight">
            Square Keychain Studio.
          </h1>
          <p className="text-xs sm:text-sm font-sans text-muted leading-relaxed">
            Outputs two square PNGs: Front side with Findat logo top-left and bold centered text covering the plate; Back side with a large QR code and website link.
          </p>
        </div>

        {/* Studio Grid: Controls Left (4 cols), Live Keychain Preview Right (8 cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12 items-start w-full">
          
          {/* ── LEFT: Controls Deck ───────────────────────────────── */}
          <div className="xl:col-span-4 w-full space-y-6">
            <div className="p-6 bg-surface border border-border rounded-sm space-y-6 shadow-xs">
              
              {/* 1. Custom Text Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="custom-text"
                    className="text-[11px] font-mono font-semibold tracking-wider uppercase text-ink flex items-center gap-1.5"
                  >
                    <Type className="w-3.5 h-3.5 text-accent" />
                    Front Centered Text
                  </label>
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      customText.length >= MAX_CHAR_LIMIT ? 'text-danger font-semibold' : 'text-muted'
                    }`}
                  >
                    {customText.length} / {MAX_CHAR_LIMIT}
                  </span>
                </div>

                <textarea
                  id="custom-text"
                  rows={2}
                  maxLength={MAX_CHAR_LIMIT}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. SCAN TO CONTACT OWNER"
                  className="w-full p-3 bg-bg border border-border focus:border-ink rounded-xs text-sm font-display font-bold uppercase tracking-tight text-ink focus:outline-none transition-colors resize-none"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'SCAN TO CONTACT OWNER',
                    'SCAN IF FOUND',
                    'TAP OR SCAN TO CONNECT',
                    'PRIVATE CONTACT POINT',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomText(preset)}
                      className="px-2 py-1 text-[10px] font-mono uppercase bg-bg border border-border hover:border-ink rounded-xs text-muted hover:text-ink transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. QR Code Destination */}
              <div className="space-y-2 pt-4 border-t border-border">
                <label
                  htmlFor="qr-destination"
                  className="text-[11px] font-mono font-semibold tracking-wider uppercase text-ink flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-accent" />
                  QR Destination URL
                </label>
                <input
                  id="qr-destination"
                  type="text"
                  value={qrValue}
                  onChange={(e) => setQrValue(e.target.value)}
                  placeholder="https://findat.in"
                  className="w-full p-3 bg-bg border border-border focus:border-ink rounded-xs text-xs font-mono text-ink focus:outline-none transition-colors"
                />

                <p className="text-[11px] font-sans text-muted">
                  Scanned with any smartphone. Website displays as <strong>findat.in</strong> directly below the QR code.
                </p>
              </div>

              {/* 3. Keychain Material Finish & Keyhole Option */}
              <div className="space-y-3 pt-4 border-t border-border">
                <label className="text-[11px] font-mono font-semibold tracking-wider uppercase text-ink flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  Plate Colorway & Options
                </label>

                <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                  <button
                    type="button"
                    onClick={() => setColorTheme('bone')}
                    className={`p-2.5 rounded-xs border text-left flex items-center justify-between cursor-pointer transition-colors ${
                      colorTheme === 'bone'
                        ? 'bg-surface-dark text-white border-black font-medium'
                        : 'bg-bg border-border text-ink hover:border-border-strong'
                    }`}
                  >
                    <span>Signature Bone</span>
                    <span className="w-3 h-3 rounded-full bg-[#F4F3EE] border border-border" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setColorTheme('dark')}
                    className={`p-2.5 rounded-xs border text-left flex items-center justify-between cursor-pointer transition-colors ${
                      colorTheme === 'dark'
                        ? 'bg-surface-dark text-white border-black font-medium'
                        : 'bg-bg border-border text-ink hover:border-border-strong'
                    }`}
                  >
                    <span>Matte Obsidian</span>
                    <span className="w-3 h-3 rounded-full bg-[#151513] border border-white/20" />
                  </button>
                </div>

                {/* Optional Keyhole Cutout Toggle */}
                <label className="flex items-center justify-between p-2.5 bg-bg border border-border rounded-xs cursor-pointer hover:border-ink transition-colors">
                  <span className="text-xs font-sans text-ink flex items-center gap-2">
                    <CircleDot className="w-3.5 h-3.5 text-muted" />
                    <span>Include Top-Right Keychain Hole Punch</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={includeKeyhole}
                    onChange={(e) => setIncludeKeyhole(e.target.checked)}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                </label>
              </div>

              {/* 4. Download Action Buttons */}
              <div className="space-y-2.5 pt-4 border-t border-border">
                {downloadSuccess && (
                  <div className="p-3 bg-[#315f43]/10 border border-[#315f43]/30 rounded-xs text-xs font-mono text-[#315f43] flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{downloadSuccess}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleDownloadBoth}
                  className="w-full py-3.5 px-4 bg-accent hover:bg-accent-hover text-ink font-sans font-semibold text-xs tracking-widest uppercase rounded-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FolderDown className="w-4 h-4" />
                  <span>{isGenerating ? 'Rendering 1800×1800 PNGs...' : 'Save Both Square PNGs'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleDownloadFront}
                    className="py-2.5 px-3 bg-surface hover:bg-bg border border-border hover:border-ink text-ink font-sans font-medium text-[11px] tracking-wider uppercase rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Front PNG</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleDownloadBack}
                    className="py-2.5 px-3 bg-surface hover:bg-bg border border-border hover:border-ink text-ink font-sans font-medium text-[11px] tracking-wider uppercase rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Back PNG</span>
                  </button>
                </div>

                <p className="text-[10px] font-mono text-muted text-center pt-1 flex items-center justify-center gap-1.5">
                  <span>1800 × 1800 PX · NATIVE WINDOWS SAVE AS DIALOG</span>
                </p>
              </div>

            </div>
          </div>

          {/* ── RIGHT: Physical Live Square Keychain Preview ──────── */}
          <div className="xl:col-span-8 w-full flex flex-col items-center">
            
            {/* View Mode Toggle for Small Screens */}
            <div className="flex md:hidden items-center gap-2 mb-6 bg-surface border border-border p-1 rounded-xs text-xs font-mono">
              <button
                type="button"
                onClick={() => setIsFlipped(false)}
                className={`px-3 py-1.5 rounded-xs transition-colors cursor-pointer uppercase ${
                  !isFlipped
                    ? 'bg-surface-dark text-white font-semibold'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Front Side
              </button>
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                className={`px-3 py-1.5 rounded-xs transition-colors cursor-pointer uppercase ${
                  isFlipped
                    ? 'bg-surface-dark text-white font-semibold'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Back Side
              </button>
              <button
                type="button"
                onClick={() => setIsFlipped((prev) => !prev)}
                className="p-1.5 text-muted hover:text-ink border-l border-border pl-2.5 cursor-pointer"
                title="Flip Keychain"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Side-By-Side Preview with generous breathing room and zero overlapping */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 lg:gap-8 w-full max-w-full">
              
              {/* SIDE 1: FRONT SQUARE KEYCHAIN TAG */}
              <div className={`flex flex-col items-center space-y-3 w-full max-w-[340px] ${isFlipped ? 'hidden md:flex' : 'flex'}`}>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
                  SIDE 1 · FRONT (SQUARE)
                </span>

                {/* Outer shadow frame */}
                <div className="shadow-2xl rounded-[36px] w-full aspect-square bg-transparent">
                  {/* Square Keychain Tag Plate */}
                  <div
                    className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden"
                    style={{
                      backgroundColor: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '36px',
                      color: textColor,
                      padding: '24px 20px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Top Row: Findat Logo at Top-Left, Optional Keyhole Punch at Top-Right */}
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center">
                        <PingInSvgLogo height={16} className={isDark ? 'text-[#F5F4EE]' : 'text-[#11110F]'} />
                      </div>

                      {includeKeyhole && (
                        <div
                          className="w-6 h-6 rounded-full border-[2px]"
                          style={{
                            borderColor: isDark ? '#3D3D39' : '#C5C1B6',
                            backgroundColor: '#EDECE6',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
                          }}
                        />
                      )}
                    </div>

                    {/* Body: Prominent Centered Clash Display Typography covering most of the area */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center w-full px-1 my-auto">
                      {textLines.map((line, idx) => (
                        <p
                          key={idx}
                          className="font-display font-black text-center tracking-tight uppercase w-full"
                          style={{
                            fontSize: `${screenFontSize}px`,
                            lineHeight: 1.0,
                            color: textColor,
                            wordBreak: 'break-word',
                          }}
                        >
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Bottom balance spacing */}
                    <div className="w-full h-1" />
                  </div>
                </div>
              </div>

              {/* SIDE 2: BACK SQUARE KEYCHAIN TAG */}
              <div className={`flex flex-col items-center space-y-3 w-full max-w-[340px] ${!isFlipped ? 'hidden md:flex' : 'flex'}`}>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
                  SIDE 2 · BACK (SQUARE)
                </span>

                {/* Outer shadow frame */}
                <div className="shadow-2xl rounded-[36px] w-full aspect-square bg-transparent">
                  {/* Square Keychain Tag Plate */}
                  <div
                    className="relative w-full h-full flex flex-col justify-between items-center text-center select-none overflow-hidden"
                    style={{
                      backgroundColor: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '36px',
                      color: textColor,
                      padding: '20px 18px 14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Optional Keyhole punch indicator at Top-Right */}
                    {includeKeyhole && (
                      <div className="absolute top-5 right-5 z-10">
                        <div
                          className="w-6 h-6 rounded-full border-[2px]"
                          style={{
                            borderColor: isDark ? '#3D3D39' : '#C5C1B6',
                            backgroundColor: '#EDECE6',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
                          }}
                        />
                      </div>
                    )}

                    {/* Large QR Code Container covering most of the square plate */}
                    <div className="flex-1 w-full flex items-center justify-center">
                      <div className="p-3 bg-white rounded-2xl shadow-xs border border-current/10 flex items-center justify-center">
                        <QRCodeSVG
                          value={qrValue || 'https://findat.in'}
                          size={220}
                          level="M"
                          fgColor="#11110F"
                          bgColor="#FFFFFF"
                        />
                      </div>
                    </div>

                    {/* Website link: clearly readable with just enough breathing room directly below */}
                    <div className="w-full flex items-center justify-center pt-1 pb-0.5">
                      <p
                        className="font-sans font-bold text-sm tracking-wider"
                        style={{ color: fadedTextColor }}
                      >
                        findat.in
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Print Production Footnote */}
            <div className="mt-10 p-4 max-w-lg w-full bg-surface border border-border rounded-sm text-xs font-sans text-muted leading-relaxed space-y-1 text-center">
              <p className="font-semibold text-ink uppercase text-[11px] font-mono">
                Laser & UV Print Output:
              </p>
              <p>
                Square PNGs are rendered at 1800 × 1800 px with true typography formatting and high-contrast scannable QR. Opens native Windows Save As dialog.
              </p>
            </div>

          </div>

        </div>

        {/* ── HIDDEN HIGH-RES QR RENDER SOURCE ── */}
        <div
          ref={qrSvgWrapperRef}
          style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
          aria-hidden="true"
        >
          <QRCodeSVG
            value={qrValue || 'https://findat.in'}
            size={1300}
            level="M"
            fgColor="#11110F"
            bgColor="#FFFFFF"
          />
        </div>

      </main>
    </div>
  );
};

export default KeychainPage;
