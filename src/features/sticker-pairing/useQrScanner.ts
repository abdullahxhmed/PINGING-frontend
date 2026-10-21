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
  return raw.replace(/^(\/?(t|qr|c|contact)\/)+/i, '').replace(/^\/+/, '').trim().toUpperCase();
}

interface UseQrScannerOptions {
  onCapture: (capture: QrScanCapture) => void;
  enabled: boolean;
}

export function useQrScanner({ onCapture, enabled }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerInstanceRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const capturedRef = useRef<boolean>(false);

  const [cameraState, setCameraState] = useState<CameraStatus>('starting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const stopStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (scannerInstanceRef.current) {
      try {
        scannerInstanceRef.current.stop();
        scannerInstanceRef.current.destroy();
      } catch (err) {
        console.warn('Error destroying qr-scanner:', err);
      }
      scannerInstanceRef.current = null;
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
        // Fallback: estimate corners near center if decoder didn't provide them
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

  const startCamera = useCallback(async () => {
    stopStream();
    capturedRef.current = false;
    setCameraState('starting');
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unavailable');
      setErrorMessage('Camera access is not supported by this browser.');
      return;
    }

    try {
      // Step A: Dynamically import qr-scanner inside the hook
      let QrScanner: any = null;
      try {
        const mod = await import('qr-scanner');
        QrScanner = mod.default || mod;
      } catch (importErr) {
        console.warn('qr-scanner dynamic import failed, falling back to jsQR', importErr);
      }

      // Step B: Acquire camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraState('active');

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play().catch((playErr) => console.warn('Video play error:', playErr));

      // Step C: Initialize QrScanner if available
      if (QrScanner) {
        const scanner = new QrScanner(
          video,
          (result: any) => {
            if (capturedRef.current) return;
            const data = typeof result === 'string' ? result : result?.data;
            const corners = result?.cornerPoints;
            if (data) {
              handleSuccessfulDetection(data, corners);
            }
          },
          {
            preferredCamera: 'environment',
            highlightScanRegion: false,
            highlightCodeOutline: false,
            returnDetailedScanResult: true,
            maxScansPerSecond: 25,
          }
        );

        scannerInstanceRef.current = scanner;
        await scanner.start().catch((startErr: any) => {
          console.warn('QrScanner start error, continuing with fallback:', startErr);
        });
      } else {
        // Step D: Fallback to frame polling via jsQR
        const pollFrame = () => {
          if (capturedRef.current || !videoRef.current) return;
          const v = videoRef.current;
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = v.videoWidth;
            tempCanvas.height = v.videoHeight;
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(v, 0, 0);
              const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
              const code = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'dontInvert',
              });
              if (code && code.data) {
                const loc = code.location;
                const corners: QrPoint[] = [
                  { x: loc.topLeftCorner.x, y: loc.topLeftCorner.y },
                  { x: loc.topRightCorner.x, y: loc.topRightCorner.y },
                  { x: loc.bottomRightCorner.x, y: loc.bottomRightCorner.y },
                  { x: loc.bottomLeftCorner.x, y: loc.bottomLeftCorner.y },
                ];
                handleSuccessfulDetection(code.data, corners);
                return;
              }
            }
          }
          animFrameRef.current = requestAnimationFrame(pollFrame);
        };
        animFrameRef.current = requestAnimationFrame(pollFrame);
      }
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
