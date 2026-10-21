import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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

function lerpPoint(pA: QrPoint, pB: QrPoint, t: number): QrPoint {
  return {
    x: lerp(pA.x, pB.x, t),
    y: lerp(pA.y, pB.y, t),
  };
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
  const [isDone, setIsDone] = useState(false);
  const [phaseText, setPhaseText] = useState<'DETECTED' | 'RECTIFYING' | 'NORMALIZING' | 'REGISTERING' | 'RESOLVED'>('DETECTED');
  const currentPhaseRef = useRef<string>('DETECTED');

  // Pre-load the exact vector digital QR corresponding to the decoded token
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
  }, [capture.rawData]);

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

    // Compute coordinate mapping from video space to square viewport
    const vw = capture.videoWidth || 640;
    const vh = capture.videoHeight || 480;
    const scale = Math.max(size / vw, size / vh);
    const offsetX = (size - vw * scale) / 2;
    const offsetY = (size - vh * scale) / 2;

    const toScreen = (p: QrPoint): QrPoint => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    });

    // 1. Physical QR corner points from camera detection
    const raw0 = capture.cornerPoints?.[0] || { x: vw * 0.25, y: vh * 0.25 };
    const raw1 = capture.cornerPoints?.[1] || { x: vw * 0.75, y: vh * 0.25 };
    const raw2 = capture.cornerPoints?.[2] || { x: vw * 0.75, y: vh * 0.75 };
    const raw3 = capture.cornerPoints?.[3] || { x: vw * 0.25, y: vh * 0.75 };

    // Expand outward slightly (~16%) to encompass the physical sticker substrate/quiet zone
    const center = {
      x: (raw0.x + raw1.x + raw2.x + raw3.x) / 4,
      y: (raw0.y + raw1.y + raw2.y + raw3.y) / 4,
    };
    const expand = 1.16;
    const expandPoint = (p: QrPoint): QrPoint => ({
      x: Math.max(0, Math.min(vw, center.x + (p.x - center.x) * expand)),
      y: Math.max(0, Math.min(vh, center.y + (p.y - center.y) * expand)),
    });

    const s0 = expandPoint(raw0);
    const s1 = expandPoint(raw1);
    const s2 = expandPoint(raw2);
    const s3 = expandPoint(raw3);

    // Initial position on screen where user photographed the sticker
    const start0 = toScreen(s0);
    const start1 = toScreen(s1);
    const start2 = toScreen(s2);
    const start3 = toScreen(s3);

    // 2. Target digital card layout (centered square with generous breathing room)
    const targetSize = Math.round(size * 0.65);
    const targetLeft = Math.round((size - targetSize) / 2);
    const targetTop = Math.round((size - targetSize) / 2);

    const target0 = { x: targetLeft, y: targetTop };
    const target1 = { x: targetLeft + targetSize, y: targetTop };
    const target2 = { x: targetLeft + targetSize, y: targetTop + targetSize };
    const target3 = { x: targetLeft, y: targetTop + targetSize };

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

    // 3. Animation Timing: Deliberate 3.2s (3200ms) cinematic sequence for full appreciation
    const totalDuration = prefersReducedMotion ? 250 : 3200;
    const startTime = performance.now();
    let animId: number;

    const renderFrame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      ctx.clearRect(0, 0, size, size);

      if (prefersReducedMotion) {
        // Direct, quiet crossfade for reduced motion preference
        const fade = progress;
        ctx.fillStyle = '#0F0E0D';
        ctx.fillRect(0, 0, size, size);

        // Draw card backing
        ctx.fillStyle = '#F4F3EE';
        ctx.strokeStyle = '#D8D5CC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(targetLeft - 12, targetTop - 12, targetSize + 24, targetSize + 24, 12);
        ctx.fill();
        ctx.stroke();

        if (digitalImageRef.current) {
          ctx.globalAlpha = fade;
          ctx.drawImage(digitalImageRef.current, targetLeft, targetTop, targetSize, targetSize);
          ctx.globalAlpha = 1;
        }

        if (progress >= 1) {
          setIsDone(true);
          onAnimationComplete();
          return;
        }
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      // =======================================================================
      // DETERMINISTIC CAMERA-IMAGE-TO-DIGITAL-QR MORPH PIPELINE (3.2s)
      // =======================================================================

      // Straightening & Perspective Rectification Phase: 450ms to 2000ms
      const straightenRaw = Math.min(Math.max((elapsed - 450) / 1550, 0), 1);
      const straightenP = easeOutApple(straightenRaw);

      // Current 4 moving corners registered from camera position to centered square
      const D0 = lerpPoint(start0, target0, straightenP);
      const D1 = lerpPoint(start1, target1, straightenP);
      const D2 = lerpPoint(start2, target2, straightenP);
      const D3 = lerpPoint(start3, target3, straightenP);

      // Phase milestones for telemetry badge
      let nextPhase: 'DETECTED' | 'RECTIFYING' | 'NORMALIZING' | 'REGISTERING' | 'RESOLVED' = 'DETECTED';
      if (elapsed >= 2700) {
        nextPhase = 'RESOLVED';
      } else if (elapsed >= 2050) {
        nextPhase = 'REGISTERING';
      } else if (elapsed >= 1200) {
        nextPhase = 'NORMALIZING';
      } else if (elapsed >= 450) {
        nextPhase = 'RECTIFYING';
      }

      if (currentPhaseRef.current !== nextPhase) {
        currentPhaseRef.current = nextPhase;
        setPhaseText(nextPhase);
      }

      // 1. Draw base dark canvas background
      ctx.fillStyle = '#0F0E0D';
      ctx.fillRect(0, 0, size, size);

      // 2. Draw frozen camera background (smoothly dimming after initial 450ms hold)
      const bgDim = Math.min(Math.max((elapsed - 450) / 1150, 0), 1);
      const bgAlpha = Math.max(0, 1 - bgDim * 0.90);
      if (bgAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = bgAlpha;
        ctx.drawImage(capture.capturedCanvas, offsetX, offsetY, vw * scale, vh * scale);
        ctx.restore();
      }

      // 3. Corner lock reticles (Phase 1: 0ms to 600ms)
      if (elapsed < 620) {
        const reticleAlpha = elapsed < 80 ? elapsed / 80 : elapsed > 480 ? 1 - (elapsed - 480) / 140 : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, reticleAlpha);
        ctx.strokeStyle = '#D7FF3F';
        ctx.lineWidth = 2.5;

        const drawReticleCorner = (p: QrPoint, dx: number, dy: number) => {
          const arm = 18;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + dy * arm);
          ctx.lineTo(p.x, p.y);
          ctx.lineTo(p.x + dx * arm, p.y);
          ctx.stroke();
        };

        drawReticleCorner(start0, 1, 1);
        drawReticleCorner(start1, -1, 1);
        drawReticleCorner(start2, -1, -1);
        drawReticleCorner(start3, 1, -1);
        ctx.restore();
      }

      // 4. Draw physical lift drop shadow under the extracting sticker
      if (straightenP > 0.02) {
        const shadowAlpha = straightenP * 0.40;
        const shadowY = straightenP * 16;
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.moveTo(D0.x, D0.y + shadowY);
        ctx.lineTo(D1.x, D1.y + shadowY);
        ctx.lineTo(D2.x, D2.y + shadowY);
        ctx.lineTo(D3.x, D3.y + shadowY);
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
      ctx.moveTo(D0.x - 4, D0.y - 4);
      ctx.lineTo(D1.x + 4, D1.y - 4);
      ctx.lineTo(D2.x + 4, D2.y + 4);
      ctx.lineTo(D3.x - 4, D3.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 6. Draw Rectified Physical Photo (0ms to 2100ms)
      if (elapsed < 2100) {
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

      // 7. Morph in Local Contrast-Normalized Texture (1100ms to 2750ms)
      // Deterministically eliminates lighting variations, glare and shadows without clipping
      if (elapsed >= 1100 && elapsed < 2750) {
        const normAlpha = easeOutApple(Math.min(Math.max((elapsed - 1100) / 950, 0), 1));
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

      // 8. Register and transition into Canonical Vector Digital QR (1950ms to 3200ms)
      // Both images share exact 512x512 bounds, converging with zero module blur
      if (elapsed >= 1950 && digitalImageRef.current) {
        const canonAlpha = easeOutApple(Math.min(Math.max((elapsed - 1950) / 750, 0), 1));
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

      // 9. Restrained lime perimeter progressive trace (2650ms to 3150ms)
      if (elapsed > 2650 && elapsed <= 3150) {
        const traceP = Math.min((elapsed - 2650) / 400, 1);
        const fadeP = elapsed > 3000 ? 1 - (elapsed - 3000) / 150 : 1;
        const cardW = targetSize + 22;
        const cardH = targetSize + 22;
        const perimeter = 2 * (cardW + cardH);

        ctx.save();
        ctx.globalAlpha = Math.max(0, fadeP);
        ctx.strokeStyle = '#D7FF3F';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([perimeter * traceP, perimeter]);
        ctx.beginPath();
        ctx.roundRect(targetLeft - 11, targetTop - 11, cardW, cardH, 12);
        ctx.stroke();
        ctx.restore();
      }

      if (progress >= 1) {
        setIsDone(true);
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
      {/* Hidden pre-render of the mathematical digital QR for capture.rawData */}
      <div ref={hiddenSvgRef} className="hidden" aria-hidden="true">
        <QRCodeSVG
          value={capture.rawData}
          size={512}
          bgColor="#F4F3EE"
          fgColor="#11110F"
          includeMargin={true}
        />
      </div>

      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Restrained bottom telemetry tag */}
      <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
        <span
          className={`font-mono text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full transition-all duration-300 ${
            phaseText === 'RESOLVED' || isDone
              ? 'bg-[#D7FF3F] text-black font-semibold shadow-xs'
              : 'bg-black/75 text-white/80 border border-white/15'
          }`}
        >
          {phaseText === 'RESOLVED' || isDone
            ? `TAG #${capture.tagCode}`
            : phaseText === 'REGISTERING'
            ? 'REGISTERING CANONICAL QR'
            : phaseText === 'NORMALIZING'
            ? 'NORMALIZING CONTRAST'
            : phaseText === 'RECTIFYING'
            ? 'RECTIFYING PERSPECTIVE'
            : 'STICKER DETECTED'}
        </span>
      </div>
    </div>
  );
};

export default QrReconstructionCanvas;
