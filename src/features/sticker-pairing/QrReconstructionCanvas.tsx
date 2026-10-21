import React, { useEffect, useRef, useState } from 'react';
import type { QrScanCapture, QrPoint } from './types';

interface QrReconstructionCanvasProps {
  capture: QrScanCapture;
  onAnimationComplete: () => void;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function isFinderPattern(col: number, row: number, gridSize: number): boolean {
  // Top-left
  if (col < 7 && row < 7) {
    if (col === 0 || col === 6 || row === 0 || row === 6) return true;
    if (col >= 2 && col <= 4 && row >= 2 && row <= 4) return true;
    return false;
  }
  // Top-right
  if (col >= gridSize - 7 && row < 7) {
    const c = col - (gridSize - 7);
    if (c === 0 || c === 6 || row === 0 || row === 6) return true;
    if (c >= 2 && c <= 4 && row >= 2 && row <= 4) return true;
    return false;
  }
  // Bottom-left
  if (col < 7 && row >= gridSize - 7) {
    const r = row - (gridSize - 7);
    if (col === 0 || col === 6 || r === 0 || r === 6) return true;
    if (col >= 2 && col <= 4 && r >= 2 && r <= 4) return true;
    return false;
  }
  return false;
}

export const QrReconstructionCanvas: React.FC<QrReconstructionCanvasProps> = ({
  capture,
  onAnimationComplete,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDone, setIsDone] = useState(false);

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

    // Compute coordinate mapping from video to square container
    const vw = capture.videoWidth || 640;
    const vh = capture.videoHeight || 480;
    const scale = Math.max(size / vw, size / vh);
    const offsetX = (size - vw * scale) / 2;
    const offsetY = (size - vh * scale) / 2;

    const mapPoint = (p: QrPoint): QrPoint => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    });

    const c0 = mapPoint(capture.cornerPoints[0] || { x: 0, y: 0 });
    const c1 = mapPoint(capture.cornerPoints[1] || { x: vw, y: 0 });
    const c2 = mapPoint(capture.cornerPoints[2] || { x: vw, y: vh });
    const c3 = mapPoint(capture.cornerPoints[3] || { x: 0, y: vh });

    // Pre-sample brightness from captured canvas to reproduce QR modules
    const gridSize = 21; // Standard Version 1/2 QR grid
    const sampleCtx = capture.capturedCanvas.getContext('2d', { willReadFrequently: true });
    const moduleMap: boolean[][] = [];

    for (let r = 0; r < gridSize; r++) {
      moduleMap[r] = [];
      const v = r / (gridSize - 1);
      for (let c = 0; c < gridSize; c++) {
        const u = c / (gridSize - 1);
        if (isFinderPattern(c, r, gridSize)) {
          moduleMap[r][c] = true;
          continue;
        }
        if (r === 6 || c === 6) {
          // Timing bar
          moduleMap[r][c] = (r + c) % 2 === 0;
          continue;
        }

        // Sample video pixel in video coordinate space
        const origTopX = capture.cornerPoints[0].x * (1 - u) + capture.cornerPoints[1].x * u;
        const origTopY = capture.cornerPoints[0].y * (1 - u) + capture.cornerPoints[1].y * u;
        const origBotX = capture.cornerPoints[3].x * (1 - u) + capture.cornerPoints[2].x * u;
        const origBotY = capture.cornerPoints[3].y * (1 - u) + capture.cornerPoints[2].y * u;
        const origX = Math.round(origTopX * (1 - v) + origBotX * v);
        const origY = Math.round(origTopY * (1 - v) + origBotY * v);

        if (sampleCtx && origX >= 0 && origX < vw && origY >= 0 && origY < vh) {
          const pixel = sampleCtx.getImageData(origX, origY, 1, 1).data;
          const lum = pixel[0] * 0.299 + pixel[1] * 0.587 + pixel[2] * 0.114;
          moduleMap[r][c] = lum < 145;
        } else {
          // Deterministic hash based on tag code
          moduleMap[r][c] = ((capture.tagCode.charCodeAt((r + c) % capture.tagCode.length) + r * 3 + c) % 3) !== 0;
        }
      }
    }

    // Digital target layout
    const targetQrSize = size * 0.64;
    const targetLeft = (size - targetQrSize) / 2;
    const targetTop = (size - targetQrSize) / 2;
    const modSize = targetQrSize / gridSize;

    const totalDuration = prefersReducedMotion ? 250 : 960;
    const startTime = performance.now();
    let animId: number;

    const renderFrame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      ctx.clearRect(0, 0, size, size);

      if (prefersReducedMotion) {
        // Simple elegant crossfade for users requesting reduced motion
        const fade = elapsed / totalDuration;
        ctx.fillStyle = '#F4F3EE';
        ctx.fillRect(0, 0, size, size);

        // Draw card backing
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#D8D5CC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(targetLeft - 16, targetTop - 16, targetQrSize + 32, targetQrSize + 32, 12);
        ctx.fill();
        ctx.stroke();

        // Draw digital QR
        ctx.fillStyle = `rgba(17, 17, 15, ${fade})`;
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            if (moduleMap[r][c]) {
              ctx.beginPath();
              ctx.roundRect(targetLeft + c * modSize, targetTop + r * modSize, modSize - 0.5, modSize - 0.5, 1);
              ctx.fill();
            }
          }
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
      // 60FPS SIGNATURE RECONSTRUCTION EFFECT
      // =======================================================================

      // 1. Draw frozen video background with progressive dimming
      const bgOpacity = Math.max(0, 1 - progress * 1.5);
      if (bgOpacity > 0.01) {
        ctx.save();
        ctx.globalAlpha = bgOpacity;
        ctx.drawImage(capture.capturedCanvas, offsetX, offsetY, vw * scale, vh * scale);
        ctx.restore();
      }

      // 2. Fading in warm cream Kauntact card backing
      const cardAlpha = Math.min(1, Math.max(0, (progress - 0.25) / 0.5));
      if (cardAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = cardAlpha;
        ctx.fillStyle = '#0F0E0D'; // Dark backdrop base
        ctx.fillRect(0, 0, size, size);

        // Elegant cream paper substrate
        ctx.fillStyle = '#F4F3EE';
        ctx.strokeStyle = '#D8D5CC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(targetLeft - 18, targetTop - 18, targetQrSize + 36, targetQrSize + 36, 12);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 3. Corner lock reticles (Phase 1: 0ms to 240ms)
      const reticlePhase = Math.min(progress / 0.25, 1);
      if (progress < 0.5) {
        const reticleAlpha = progress < 0.2 ? reticlePhase : 1 - (progress - 0.2) / 0.3;
        ctx.save();
        ctx.globalAlpha = Math.max(0, reticleAlpha);
        ctx.strokeStyle = '#D7FF3F'; // Lime accent
        ctx.lineWidth = 2.5;

        const drawReticleCorner = (p: QrPoint, dx: number, dy: number) => {
          const arm = 14;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + dy * arm);
          ctx.lineTo(p.x, p.y);
          ctx.lineTo(p.x + dx * arm, p.y);
          ctx.stroke();
        };

        drawReticleCorner(c0, 1, 1);
        drawReticleCorner(c1, -1, 1);
        drawReticleCorner(c2, -1, -1);
        drawReticleCorner(c3, 1, -1);
        ctx.restore();
      }

      // 4. Module Flight & Alignment (Phase 2: 180ms to 750ms)
      const flightProgress = Math.max(0, (elapsed - 160) / 580);

      for (let r = 0; r < gridSize; r++) {
        const v = r / (gridSize - 1);
        for (let c = 0; c < gridSize; c++) {
          if (!moduleMap[r][c]) continue;

          const u = c / (gridSize - 1);

          // Physical perspective location in camera space
          const topX = c0.x * (1 - u) + c1.x * u;
          const topY = c0.y * (1 - u) + c1.y * u;
          const botX = c3.x * (1 - u) + c2.x * u;
          const botY = c3.y * (1 - u) + c2.y * u;
          const srcX = topX * (1 - v) + botX * v;
          const srcY = topY * (1 - v) + botY * v;

          // Crisp digital destination
          const destX = targetLeft + c * modSize;
          const destY = targetTop + r * modSize;

          // Staggered flight based on distance from center
          const distCenter = Math.hypot(c - 10, r - 10) / 14;
          const modP = Math.min(Math.max((flightProgress - distCenter * 0.18) / 0.82, 0), 1);
          const ease = easeOutCubic(modP);

          const curX = srcX + (destX - srcX) * ease;
          const curY = srcY + (destY - srcY) * ease;
          const curModSize = modSize * (0.85 + 0.15 * ease);

          // Color transition: from camera contrast to Kauntact near-black ink
          const isFinder = isFinderPattern(c, r, gridSize);
          ctx.fillStyle = isFinder && ease > 0.8 ? '#11110F' : '#11110F';

          ctx.beginPath();
          ctx.roundRect(curX, curY, curModSize - 0.4, curModSize - 0.4, ease > 0.8 ? 1 : 0.5);
          ctx.fill();
        }
      }

      // 5. Digital Lock-in Lime Beam Sweep (Phase 3: 720ms to 960ms)
      if (elapsed > 720) {
        const sweepProgress = (elapsed - 720) / 240;
        if (sweepProgress <= 1) {
          const beamY = targetTop + sweepProgress * targetQrSize;
          ctx.save();
          const grad = ctx.createLinearGradient(0, beamY - 18, 0, beamY + 4);
          grad.addColorStop(0, 'rgba(215, 255, 63, 0)');
          grad.addColorStop(0.7, 'rgba(215, 255, 63, 0.25)');
          grad.addColorStop(1, 'rgba(215, 255, 63, 0.85)');

          ctx.fillStyle = grad;
          ctx.fillRect(targetLeft - 10, beamY - 18, targetQrSize + 20, 22);

          // Intense thin front edge
          ctx.fillStyle = '#D7FF3F';
          ctx.fillRect(targetLeft - 10, beamY, targetQrSize + 20, 1.5);
          ctx.restore();
        }
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
      className="relative aspect-square w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-border shadow-md"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Subtle bottom telemetry label during/after animation */}
      <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
        <span
          className={`font-mono text-[11px] uppercase tracking-wider px-3 py-1 rounded-full transition-all duration-300 ${
            isDone
              ? 'bg-[#D7FF3F] text-black font-semibold shadow-sm'
              : 'bg-black/80 text-white/90 border border-white/20'
          }`}
        >
          {isDone ? `TAG IDENTIFIED: #${capture.tagCode}` : 'RECONSTRUCTING OPTICAL MATRIX…'}
        </span>
      </div>
    </div>
  );
};

export default QrReconstructionCanvas;
