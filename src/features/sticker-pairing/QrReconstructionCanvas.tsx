import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildTagQrUrl } from '../../lib/qr';
import type { QrScanCapture, QrPoint } from './types';

interface QrReconstructionCanvasProps {
  capture: QrScanCapture;
  onAnimationComplete: () => void;
}

// Apple-standard cubic-bezier(0.16, 1, 0.3, 1) easeOut
function easeOutApple(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getBilinear(p0: QrPoint, p1: QrPoint, p2: QrPoint, p3: QrPoint, u: number, v: number): QrPoint {
  const topX = lerp(p0.x, p1.x, u);
  const topY = lerp(p0.y, p1.y, u);
  const botX = lerp(p3.x, p2.x, u);
  const botY = lerp(p3.y, p2.y, u);
  return {
    x: lerp(topX, botX, v),
    y: lerp(topY, botY, v),
  };
}

/**
 * Maps and renders a single triangular fragment of an image onto canvas
 * using exact 3-point affine transformation matrix.
 */
function renderTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  u0: number, v0: number,
  u1: number, v1: number,
  u2: number, v2: number
) {
  const cp = (u0 - u2) * (v1 - v2) - (u1 - u2) * (v0 - v2);
  if (Math.abs(cp) < 1e-5) return;

  const a = ((x0 - x2) * (v1 - v2) - (x1 - x2) * (v0 - v2)) / cp;
  const b = ((y0 - y2) * (v1 - v2) - (y1 - y2) * (v0 - v2)) / cp;
  const c = ((x1 - x2) * (u0 - u2) - (x0 - x2) * (u1 - u2)) / cp;
  const d = ((y1 - y2) * (u0 - u2) - (y0 - y2) * (u1 - u2)) / cp;
  const e = x0 - a * u0 - c * v0;
  const f = y0 - b * u0 - d * v0;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/**
 * Renders an image quadrilateral onto an arbitrary target quadrilateral
 * using an N x N affine triangle mesh (perspective approximation without WebGL).
 */
function drawWarpedQuad(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s0: QrPoint, s1: QrPoint, s2: QrPoint, s3: QrPoint,
  d0: QrPoint, d1: QrPoint, d2: QrPoint, d3: QrPoint,
  divisions = 8
) {
  for (let r = 0; r < divisions; r++) {
    const vA = r / divisions;
    const vB = (r + 1) / divisions;
    for (let c = 0; c < divisions; c++) {
      const uA = c / divisions;
      const uB = (c + 1) / divisions;

      const sTL = getBilinear(s0, s1, s2, s3, uA, vA);
      const sTR = getBilinear(s0, s1, s2, s3, uB, vA);
      const sBR = getBilinear(s0, s1, s2, s3, uB, vB);
      const sBL = getBilinear(s0, s1, s2, s3, uA, vB);

      const dTL = getBilinear(d0, d1, d2, d3, uA, vA);
      const dTR = getBilinear(d0, d1, d2, d3, uB, vA);
      const dBR = getBilinear(d0, d1, d2, d3, uB, vB);
      const dBL = getBilinear(d0, d1, d2, d3, uA, vB);

      renderTriangle(ctx, img, dTL.x, dTL.y, dTR.x, dTR.y, dBL.x, dBL.y, sTL.x, sTL.y, sTR.x, sTR.y, sBL.x, sBL.y);
      renderTriangle(ctx, img, dTR.x, dTR.y, dBR.x, dBR.y, dBL.x, dBL.y, sTR.x, sTR.y, sBR.x, sBR.y, sBL.x, sBL.y);
    }
  }
}

/**
 * 1D separable box blur on Float32Array grayscale raster for high-performance O(N) local stats.
 */
function boxBlurGrayscale(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const temp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);
  const windowSize = 2 * r + 1;

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    let sum = 0;
    const firstVal = src[rowOffset];
    const lastVal = src[rowOffset + w - 1];

    for (let x = -r; x <= r; x++) {
      const px = Math.min(Math.max(x, 0), w - 1);
      sum += src[rowOffset + px];
    }

    for (let x = 0; x < w; x++) {
      temp[rowOffset + x] = sum / windowSize;
      const xRemove = x - r;
      const xAdd = x + r + 1;
      const valRemove = xRemove >= 0 ? src[rowOffset + xRemove] : firstVal;
      const valAdd = xAdd < w ? src[rowOffset + xAdd] : lastVal;
      sum += valAdd - valRemove;
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    const firstVal = temp[x];
    const lastVal = temp[(h - 1) * w + x];

    for (let y = -r; y <= r; y++) {
      const py = Math.min(Math.max(y, 0), h - 1);
      sum += temp[py * w + x];
    }

    for (let y = 0; y < h; y++) {
      dst[y * w + x] = sum / windowSize;
      const yRemove = y - r;
      const yAdd = y + r + 1;
      const valRemove = yRemove >= 0 ? temp[yRemove * w + x] : firstVal;
      const valAdd = yAdd < h ? temp[yAdd * w + x] : lastVal;
      sum += valAdd - valRemove;
    }
  }

  return dst;
}

/**
 * Creates an offscreen square texture of the captured QR warped into canonical perspective.
 */
function createRectifiedTexture(
  sourceCanvas: HTMLCanvasElement,
  s0: QrPoint,
  s1: QrPoint,
  s2: QrPoint,
  s3: QrPoint,
  size = 512
): HTMLCanvasElement {
  const rectCanvas = document.createElement('canvas');
  rectCanvas.width = size;
  rectCanvas.height = size;
  const ctx = rectCanvas.getContext('2d');
  if (ctx) {
    drawWarpedQuad(
      ctx,
      sourceCanvas,
      s0,
      s1,
      s2,
      s3,
      { x: 0, y: 0 },
      { x: size, y: 0 },
      { x: size, y: size },
      { x: 0, y: size },
      12
    );
  }
  return rectCanvas;
}

/**
 * Deterministic local contrast normalization & illumination correction pipeline:
 * N(x, y) = (I(x, y) - mu(x, y)) / (sigma(x, y) + epsilon)
 * Uses a smooth sigmoidal curve to cleanly separate dark and light modules without clipping.
 */
function createContrastNormalizedTexture(
  rectifiedCanvas: HTMLCanvasElement,
  size = 512
): HTMLCanvasElement {
  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const ctx = normCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return rectifiedCanvas;

  ctx.drawImage(rectifiedCanvas, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  const numPixels = size * size;

  const gray = new Float32Array(numPixels);
  for (let i = 0, p = 0; i < numPixels; i++, p += 4) {
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  // Radius 16 covers approximately one QR module width in a 512px raster
  const r = 16;
  const mu = boxBlurGrayscale(gray, size, size, r);

  const graySq = new Float32Array(numPixels);
  for (let i = 0; i < numPixels; i++) {
    graySq[i] = gray[i] * gray[i];
  }
  const muSq = boxBlurGrayscale(graySq, size, size, r);

  // Target palette: Ink #11110F (17, 17, 15), Substrate #F4F3EE (244, 243, 238)
  const epsilon = 8.0;

  for (let i = 0, p = 0; i < numPixels; i++, p += 4) {
    const variance = Math.max(0, muSq[i] - mu[i] * mu[i]);
    const sigma = Math.sqrt(variance);

    // Local normalized deviation
    const normDiff = (gray[i] - mu[i]) / (Math.max(sigma, 12) + epsilon);
    // Global luminance reference (keeps quiet zone white and solid dark modules black)
    const globalBias = (gray[i] - 128) / 128;
    const blend = Math.min(sigma / 22, 1);
    const signal = blend * (normDiff * 2.2) + (1 - blend) * (globalBias * 2.6);

    // Smooth sigmoidal response avoids harsh boundary clipping
    const weight = 0.5 + 0.5 * Math.tanh(signal);

    data[p] = Math.round(17 + (244 - 17) * weight);
    data[p + 1] = Math.round(17 + (243 - 17) * weight);
    data[p + 2] = Math.round(15 + (238 - 15) * weight);
    data[p + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return normCanvas;
}

export const QrReconstructionCanvas: React.FC<QrReconstructionCanvasProps> = ({
  capture,
  onAnimationComplete,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenSvgRef = useRef<HTMLDivElement | null>(null);
  const digitalImageRef = useRef<HTMLImageElement | null>(null);

  const canonicalQrUrl = buildTagQrUrl(capture.tagCode || capture.rawData);

  // Pre-load the exact vector digital QR corresponding to the canonical QR url (level H)
  useEffect(() => {
    const container = hiddenSvgRef.current;
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      digitalImageRef.current = img;
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [canonicalQrUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height) || 320;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.scale(dpr, dpr);

    // Compute base coordinate mapping from video space to square viewport (raw 1.0x camera scale)
    const vw = capture.videoWidth || 640;
    const vh = capture.videoHeight || 480;
    const baseScale = Math.max(size / vw, size / vh);

    // 1. Physical QR corner points from camera detection
    const raw0 = capture.cornerPoints?.[0] || { x: vw * 0.25, y: vh * 0.25 };
    const raw1 = capture.cornerPoints?.[1] || { x: vw * 0.75, y: vh * 0.25 };
    const raw2 = capture.cornerPoints?.[2] || { x: vw * 0.75, y: vh * 0.75 };
    const raw3 = capture.cornerPoints?.[3] || { x: vw * 0.25, y: vh * 0.75 };

    // Expand outward slightly (~15%) to encompass the physical sticker substrate/quiet zone
    const center = {
      x: (raw0.x + raw1.x + raw2.x + raw3.x) / 4,
      y: (raw0.y + raw1.y + raw2.y + raw3.y) / 4,
    };
    const expand = 1.15;
    const expandPoint = (p: QrPoint): QrPoint => ({
      x: Math.max(0, Math.min(vw, center.x + (p.x - center.x) * expand)),
      y: Math.max(0, Math.min(vh, center.y + (p.y - center.y) * expand)),
    });

    const s0 = expandPoint(raw0);
    const s1 = expandPoint(raw1);
    const s2 = expandPoint(raw2);
    const s3 = expandPoint(raw3);

    // 2. Target digital card layout (centered, straight, enlarged right in front of the screen)
    const targetSize = Math.round(size * 0.72);
    const targetMargin = Math.round((size - targetSize) / 2);
    const target0: QrPoint = { x: targetMargin, y: targetMargin };
    const target1: QrPoint = { x: targetMargin + targetSize, y: targetMargin };
    const target2: QrPoint = { x: targetMargin + targetSize, y: targetMargin + targetSize };
    const target3: QrPoint = { x: targetMargin, y: targetMargin + targetSize };

    // 02 & 03: Build Rectified & Contrast-Normalized Textures Deterministically
    const BUFFER_SIZE = 512;
    const rectifiedCanvas = createRectifiedTexture(
      capture.capturedCanvas,
      s0,
      s1,
      s2,
      s3,
      BUFFER_SIZE
    );
    const normalizedCanvas = createContrastNormalizedTexture(
      rectifiedCanvas,
      BUFFER_SIZE
    );

    // Quad bounds for 512x512 textures
    const quad0: QrPoint = { x: 0, y: 0 };
    const quad1: QrPoint = { x: BUFFER_SIZE, y: 0 };
    const quad2: QrPoint = { x: BUFFER_SIZE, y: BUFFER_SIZE };
    const quad3: QrPoint = { x: 0, y: BUFFER_SIZE };

    // 3. Animation Timing:
    // 0ms - 500ms: Zoom slightly into the frozen frame
    // 500ms - 2500ms (2 seconds): Convert to digital & bring QR code towards the screen
    // 2500ms - 3600ms (1.1s hold): Hold the digital QR code on screen, then move to next section
    const totalDuration = prefersReducedMotion ? 250 : 3600;
    const startTime = performance.now();
    let animId: number;

    const renderFrame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      ctx.clearRect(0, 0, size, size);

      if (prefersReducedMotion) {
        // Direct crossfade for reduced motion preference
        const fade = progress;
        ctx.fillStyle = '#0F0E0D';
        ctx.fillRect(0, 0, size, size);

        // Draw card backing
        ctx.fillStyle = '#F4F3EE';
        ctx.strokeStyle = '#D8D5CC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(targetMargin - 12, targetMargin - 12, targetSize + 24, targetSize + 24, 12);
        ctx.fill();
        ctx.stroke();

        if (digitalImageRef.current) {
          ctx.globalAlpha = fade;
          ctx.drawImage(digitalImageRef.current, targetMargin, targetMargin, targetSize, targetSize);
          ctx.globalAlpha = 1;
        }

        if (progress >= 1) {
          onAnimationComplete();
          return;
        }
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      // =======================================================================
      // STEP 1: Zoom slightly into the frozen frame (0ms to 500ms)
      // =======================================================================
      const freezeZoomP = easeOutApple(Math.min(elapsed / 500, 1));
      const freezeZoom = 1.0 + 0.12 * freezeZoomP; // 12% slight zoom into frozen frame

      const currentScale = baseScale * freezeZoom;
      const currentOffsetX = (size - vw * currentScale) / 2;
      const currentOffsetY = (size - vh * currentScale) / 2;

      const toScreen = (p: QrPoint): QrPoint => ({
        x: currentOffsetX + p.x * currentScale,
        y: currentOffsetY + p.y * currentScale,
      });

      const start0 = toScreen(s0);
      const start1 = toScreen(s1);
      const start2 = toScreen(s2);
      const start3 = toScreen(s3);

      // =======================================================================
      // STEP 2: Convert to digital & bring QR code towards the screen (500ms - 2500ms, 2s)
      // =======================================================================
      const bringRaw = Math.min(Math.max((elapsed - 500) / 2000, 0), 1);
      const bringEase = easeOutApple(bringRaw);

      // Corners fly forward from physical perspective into centered digital card
      const D0 = {
        x: lerp(start0.x, target0.x, bringEase),
        y: lerp(start0.y, target0.y, bringEase),
      };
      const D1 = {
        x: lerp(start1.x, target1.x, bringEase),
        y: lerp(start1.y, target1.y, bringEase),
      };
      const D2 = {
        x: lerp(start2.x, target2.x, bringEase),
        y: lerp(start2.y, target2.y, bringEase),
      };
      const D3 = {
        x: lerp(start3.x, target3.x, bringEase),
        y: lerp(start3.y, target3.y, bringEase),
      };

      // 1. Draw base canvas background
      ctx.fillStyle = '#0F0E0D';
      ctx.fillRect(0, 0, size, size);

      // 2. Draw frozen camera snapshot (zoomed slightly, dims gently as card lifts toward screen)
      const bgAlpha = Math.max(0.18, 1 - bringEase * 0.82);
      ctx.save();
      ctx.globalAlpha = bgAlpha;
      ctx.drawImage(capture.capturedCanvas, currentOffsetX, currentOffsetY, vw * currentScale, vh * currentScale);
      ctx.restore();

      // 3. Initial reticles on raw corners (Phase 1: 0ms to 550ms)
      if (elapsed < 550) {
        const reticleAlpha = elapsed < 60 ? elapsed / 60 : elapsed > 440 ? 1 - (elapsed - 440) / 110 : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, reticleAlpha);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.0;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 6;

        const drawReticleCorner = (p: QrPoint, towardA: QrPoint, towardB: QrPoint) => {
          const arm = 18;
          const dAx = towardA.x - p.x;
          const dAy = towardA.y - p.y;
          const lenA = Math.hypot(dAx, dAy) || 1;
          const dBx = towardB.x - p.x;
          const dBy = towardB.y - p.y;
          const lenB = Math.hypot(dBx, dBy) || 1;

          ctx.beginPath();
          ctx.moveTo(p.x + (dAx / lenA) * arm, p.y + (dAy / lenA) * arm);
          ctx.lineTo(p.x, p.y);
          ctx.lineTo(p.x + (dBx / lenB) * arm, p.y + (dBy / lenB) * arm);
          ctx.stroke();
        };

        drawReticleCorner(start0, start1, start3);
        drawReticleCorner(start1, start2, start0);
        drawReticleCorner(start2, start3, start1);
        drawReticleCorner(start3, start0, start2);
        ctx.restore();
      }

      // 4. Draw emergence drop shadow expanding underneath the flying card
      if (bringEase > 0.02) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 30 * bringEase;
        ctx.shadowOffsetY = 16 * bringEase;
        ctx.fillStyle = '#F4F3EE';
        ctx.beginPath();
        ctx.moveTo(D0.x, D0.y);
        ctx.lineTo(D1.x, D1.y);
        ctx.lineTo(D2.x, D2.y);
        ctx.lineTo(D3.x, D3.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 5. Draw warm cream card substrate backing
      ctx.save();
      ctx.fillStyle = '#F4F3EE';
      ctx.strokeStyle = '#D8D5CC';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(D0.x - 2, D0.y - 2);
      ctx.lineTo(D1.x + 2, D1.y - 2);
      ctx.lineTo(D2.x + 2, D2.y + 2);
      ctx.lineTo(D3.x - 2, D3.y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 6. Draw Rectified Physical Photo in place (0ms to 1500ms)
      if (elapsed < 1500) {
        ctx.save();
        ctx.globalAlpha = 1;
        drawWarpedQuad(
          ctx,
          rectifiedCanvas,
          quad0, quad1, quad2, quad3,
          D0, D1, D2, D3,
          8
        );
        ctx.restore();
      }

      // 7. Morph in Contrast-Normalized Texture (900ms to 2100ms)
      if (elapsed >= 900 && elapsed < 2100) {
        const normAlpha = easeOutApple(Math.min(Math.max((elapsed - 900) / 800, 0), 1));
        ctx.save();
        ctx.globalAlpha = normAlpha;
        drawWarpedQuad(
          ctx,
          normalizedCanvas,
          quad0, quad1, quad2, quad3,
          D0, D1, D2, D3,
          8
        );
        ctx.restore();
      }

      // 8. Register and transition into Canonical Vector Digital QR (1400ms to 3600ms)
      // Completely locks in by 2500ms as card reaches front of the screen
      if (elapsed >= 1400 && digitalImageRef.current) {
        const canonAlpha = easeOutApple(Math.min(Math.max((elapsed - 1400) / 950, 0), 1));
        ctx.save();
        ctx.globalAlpha = canonAlpha;
        drawWarpedQuad(
          ctx,
          digitalImageRef.current,
          quad0, quad1, quad2, quad3,
          D0, D1, D2, D3,
          8
        );
        ctx.restore();
      }

      // 9. STEP 3: Hold on screen with lime progressive confirmation trace (2500ms to 3400ms)
      if (elapsed >= 2500 && elapsed <= 3400) {
        const traceP = Math.min((elapsed - 2500) / 500, 1);
        const fadeP = elapsed > 3200 ? 1 - (elapsed - 3200) / 200 : 1;

        const L01 = Math.hypot(D1.x - D0.x, D1.y - D0.y);
        const L12 = Math.hypot(D2.x - D1.x, D2.y - D1.y);
        const L23 = Math.hypot(D3.x - D2.x, D3.y - D2.y);
        const L30 = Math.hypot(D0.x - D3.x, D0.y - D3.y);
        const perimeter = L01 + L12 + L23 + L30;

        ctx.save();
        ctx.globalAlpha = Math.max(0, fadeP);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 8;
        ctx.setLineDash([perimeter * traceP, perimeter]);
        ctx.beginPath();
        ctx.moveTo(D0.x, D0.y);
        ctx.lineTo(D1.x, D1.y);
        ctx.lineTo(D2.x, D2.y);
        ctx.lineTo(D3.x, D3.y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // 10. Completed hold period -> move to the next section!
      if (progress >= 1) {
        onAnimationComplete();
        return;
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [capture, onAnimationComplete]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#0F0E0D] flex items-center justify-center border border-border shadow-md"
    >
      {/* Hidden pre-render of the mathematical digital QR for canonical URL (strictly level H) */}
      <div ref={hiddenSvgRef} className="hidden" aria-hidden="true">
        <QRCodeSVG
          value={canonicalQrUrl}
          size={512}
          level="H"
          bgColor="#F4F3EE"
          fgColor="#11110F"
          includeMargin={true}
        />
      </div>

      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default QrReconstructionCanvas;
