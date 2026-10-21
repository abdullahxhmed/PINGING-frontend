import { useEffect, useRef, useState, useCallback } from 'react';
import type { QrScanCapture, QrPoint, CameraStatus } from './types';
import jsQR from 'jsqr';

export function extractCleanTagId(input: string): string {
  let raw = input.trim();
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const parsed = new URL(raw);
      const segments = parsed.pathname.split('/').filter(Boolean);
      raw = segments[segments.length - 1] || '';
    }
  } catch {
    // Keep raw if not a valid URL
  }
  return raw
    .replace(/^(\/?(t|qr|c|contact)\/)+/i, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .trim()
    .toUpperCase();
}

interface UseQrScannerOptions {
  onCapture: (capture: QrScanCapture) => void;
  enabled: boolean;
}

export function useQrScanner({ onCapture, enabled }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const capturedRef = useRef<boolean>(false);
  const barcodeDetectorRef = useRef<any>(null);

  // Camera stabilization state: allows mobile autofocus & auto-exposure to settle before freezing frame
  const stabilizationRef = useRef<{
    firstDetectTime: number;
    lastTagCode: string;
    decodedString: string;
    stableHits: number;
    corners: QrPoint[];
  } | null>(null);

  const [cameraState, setCameraState] = useState<CameraStatus>('starting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Initialize native BarcodeDetector if available on device
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ['qr_code'],
        });
      } catch (err) {
        console.warn('Native BarcodeDetector not available, using jsQR engine:', err);
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  const stopStream = useCallback(() => {
    stabilizationRef.current = null;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
  }, []);

  const handleSuccessfulDetection = useCallback(
    (decodedString: string, cornerPoints?: QrPoint[]) => {
      if (capturedRef.current) return;
      const cleanTag = extractCleanTagId(decodedString);
      if (!cleanTag || cleanTag.length < 3) return;

      const video = videoRef.current;
      if (!video) return;

      capturedRef.current = true;

      // 1. Capture exact current video frame to an offscreen canvas
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
      }

      // 2. Normalize corner points
      let corners = cornerPoints || [];
      if (!corners || corners.length < 4) {
        const padX = width * 0.2;
        const padY = height * 0.2;
        corners = [
          { x: padX, y: padY },
          { x: width - padX, y: padY },
          { x: width - padX, y: height - padY },
          { x: padX, y: height - padY },
        ];
      }

      // 3. Immediately freeze and stop camera feed to save CPU/battery
      stopStream();

      // 4. Emit captured payload to transformation pipeline
      onCapture({
        rawData: decodedString,
        tagCode: cleanTag,
        cornerPoints: corners,
        capturedCanvas: offscreen,
        videoWidth: width,
        videoHeight: height,
      });
    },
    [onCapture, stopStream]
  );

  // Stabilize detection across ~220ms so camera auto-focus settles and hand tremor quiets down
  const queueStabilizedCapture = useCallback(
    (decodedString: string, cornerPoints?: QrPoint[]) => {
      if (capturedRef.current) return;
      const cleanTag = extractCleanTagId(decodedString);
      if (!cleanTag || cleanTag.length < 3) return;

      const now = performance.now();
      const stab = stabilizationRef.current;

      const STABILIZATION_DELAY_MS = 220; // ~220ms gives phone lens time to acquire crisp focus
      const MIN_STABLE_HITS = 2; // At least 2 consistent decodes

      if (!stab || stab.lastTagCode !== cleanTag) {
        stabilizationRef.current = {
          firstDetectTime: now,
          lastTagCode: cleanTag,
          decodedString,
          stableHits: 1,
          corners: cornerPoints || [],
        };
        return;
      }

      stab.stableHits++;
      if (cornerPoints && cornerPoints.length === 4) {
        stab.corners = cornerPoints;
      }
      stab.decodedString = decodedString;

      if (now - stab.firstDetectTime >= STABILIZATION_DELAY_MS && stab.stableHits >= MIN_STABLE_HITS) {
        stabilizationRef.current = null;
        handleSuccessfulDetection(stab.decodedString, stab.corners);
      }
    },
    [handleSuccessfulDetection]
  );

  const startCamera = useCallback(async () => {
    stopStream();
    capturedRef.current = false;
    stabilizationRef.current = null;
    setCameraState('starting');
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unavailable');
      setErrorMessage('Camera access is not supported by this browser.');
      return;
    }

    try {
      // Step A: Acquire camera stream (with resolution fallback)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraState('active');

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      await video.play().catch((playErr) => console.warn('Video play error:', playErr));

      // Step B: Dedicated canvas for frame decoding
      const scanCanvas = document.createElement('canvas');
      const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

      let lastScanTime = 0;
      const scanIntervalMs = 50; // ~20 checks/sec for immediate detection without overheating

      const scanTick = async () => {
        if (capturedRef.current || !videoRef.current) return;
        const v = videoRef.current;

        const now = performance.now();
        if (now - lastScanTime >= scanIntervalMs) {
          lastScanTime = now;

          if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && v.videoWidth > 0 && v.videoHeight > 0) {
            const vw = v.videoWidth;
            const vh = v.videoHeight;
            let detectedThisTick = false;

            // 1. Try Hardware BarcodeDetector first (Android Chrome / WebKit)
            if (barcodeDetectorRef.current) {
              try {
                const barcodes = await barcodeDetectorRef.current.detect(v);
                if (barcodes && barcodes.length > 0 && !capturedRef.current) {
                  const first = barcodes[0];
                  if (first.rawValue) {
                    const corners: QrPoint[] = (first.cornerPoints || []).map((p: any) => ({
                      x: p.x,
                      y: p.y,
                    }));
                    detectedThisTick = true;
                    queueStabilizedCapture(first.rawValue, corners);
                    return;
                  }
                }
              } catch {
                // Fall through to jsQR
              }
            }

            // 2. High-speed jsQR fallback with attemptBoth (handles dark, light & high contrast tags)
            if (!capturedRef.current && scanCtx) {
              const maxDim = 640;
              const scale = Math.min(1, maxDim / Math.max(vw, vh));
              const scanW = Math.round(vw * scale);
              const scanH = Math.round(vh * scale);

              if (scanCanvas.width !== scanW || scanCanvas.height !== scanH) {
                scanCanvas.width = scanW;
                scanCanvas.height = scanH;
              }

              scanCtx.drawImage(v, 0, 0, scanW, scanH);
              const imgData = scanCtx.getImageData(0, 0, scanW, scanH);
              const code = jsQR(imgData.data, scanW, scanH, {
                inversionAttempts: 'attemptBoth',
              });

              if (code && code.data && !capturedRef.current) {
                const loc = code.location;
                const invScale = 1 / scale;
                const corners: QrPoint[] = [
                  { x: loc.topLeftCorner.x * invScale, y: loc.topLeftCorner.y * invScale },
                  { x: loc.topRightCorner.x * invScale, y: loc.topRightCorner.y * invScale },
                  { x: loc.bottomRightCorner.x * invScale, y: loc.bottomRightCorner.y * invScale },
                  { x: loc.bottomLeftCorner.x * invScale, y: loc.bottomLeftCorner.y * invScale },
                ];
                detectedThisTick = true;
                queueStabilizedCapture(code.data, corners);
                return;
              }
            }

            // If tag was lost for > 400ms during stabilization, reset to avoid stale freeze
            if (!detectedThisTick && stabilizationRef.current && now - stabilizationRef.current.firstDetectTime > 400) {
              stabilizationRef.current = null;
            }
          }
        }

        if (!capturedRef.current) {
          animFrameRef.current = requestAnimationFrame(scanTick);
        }
      };

      animFrameRef.current = requestAnimationFrame(scanTick);
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setErrorMessage('Camera access was denied. You can allow access or enter the code manually.');
      } else {
        setCameraState('unavailable');
        setErrorMessage('Unable to connect to camera. You can enter the printed code manually.');
      }
    }
  }, [handleSuccessfulDetection, stopStream]);

  useEffect(() => {
    if (enabled) {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [enabled, startCamera, stopStream]);

  return {
    videoRef,
    cameraState,
    errorMessage,
    startCamera,
    stopStream,
  };
}
