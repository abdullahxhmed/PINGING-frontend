import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  CameraOff,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

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

interface WarehouseQrScannerProps {
  enabled: boolean;
  onScan: (cleanTagId: string) => Promise<void> | void;
  isProcessing: boolean;
  feedbackMessage: {
    text: string;
    type: 'success' | 'error' | 'duplicate';
  } | null;
  onManualSubmit: (code: string) => void;
  isComplete?: boolean;
  mobileChecklistSlot?: React.ReactNode;
}

export const WarehouseQrScanner: React.FC<WarehouseQrScannerProps> = ({
  enabled,
  onScan,
  isProcessing,
  feedbackMessage,
  onManualSubmit,
  isComplete = false,
  mobileChecklistSlot,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);

  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'denied' | 'unavailable'>('starting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [canSwitchCamera, setCanSwitchCamera] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Manual input state
  const [manualCode, setManualCode] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  // Debouncing and prop refs to prevent repeated continuous scans and unnecessary restarts
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const isCompleteRef = useRef(isComplete);
  isCompleteRef.current = isComplete;
  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  // Initialize native BarcodeDetector if available on device
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ['qr_code'],
        });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  // Check camera switching capability
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setCanSwitchCamera(videoInputs.length > 1);
        })
        .catch(() => setCanSwitchCamera(false));
    }
  }, []);

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
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
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  // Handle detection from camera (stable, zero churn)
  const handleDetectedRaw = useCallback((decodedString: string) => {
    if (isProcessingRef.current || isCompleteRef.current) return;

    const cleanTag = extractCleanTagId(decodedString);
    if (!cleanTag || cleanTag.length < 3) return;

    const now = performance.now();
    // Debounce: if same tag was scanned within 3000ms, ignore repeated detection
    if (lastScannedCodeRef.current === cleanTag && now - lastScannedTimeRef.current < 3000) {
      return;
    }

    lastScannedCodeRef.current = cleanTag;
    lastScannedTimeRef.current = now;

    onScanRef.current(cleanTag);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraState('starting');
    setErrorMessage('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      setErrorMessage('Camera access is not supported by this browser.');
      return;
    }

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false,
          });
        } catch {
          // Fallback to any video device (e.g. desktop webcam without environment facingMode)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('No media stream available');
      }

      streamRef.current = stream;

      // Check capabilities (Torch & continuous focus)
      try {
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const caps: any = track.getCapabilities();
          setTorchSupported(Boolean(caps?.torch));

          const advanced: any = {};
          if (caps.focusMode && caps.focusMode.includes('continuous')) {
            advanced.focusMode = 'continuous';
          }
          if (caps.exposureMode && caps.exposureMode.includes('continuous')) {
            advanced.exposureMode = 'continuous';
          }
          if (Object.keys(advanced).length > 0 && typeof track.applyConstraints === 'function') {
            await track.applyConstraints({ advanced: [advanced] });
          }
        }
      } catch {
        // Advanced constraints non-fatal
      }

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        try {
          await video.play();
        } catch (playErr) {
          console.warn('[WarehouseQrScanner] video play error:', playErr);
        }
      }

      setCameraState('active');

      // Dedicated canvas for high-performance frame sampling
      const scanCanvas = document.createElement('canvas');
      const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

      let lastScanTime = 0;
      const scanIntervalMs = 60; // ~16 fps for optimal barcode recognition without CPU lag

      const scanTick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        const v = videoRef.current;
        const now = performance.now();

        if (now - lastScanTime >= scanIntervalMs) {
          lastScanTime = now;

          if (
            v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            v.videoWidth > 0 &&
            v.videoHeight > 0
          ) {
            const vw = v.videoWidth;
            const vh = v.videoHeight;
            let detected = false;

            // 1. Hardware BarcodeDetector (Chrome / Android / Safari WebKit)
            if (barcodeDetectorRef.current && !isProcessingRef.current) {
              try {
                const barcodes = await barcodeDetectorRef.current.detect(v);
                if (barcodes && barcodes.length > 0) {
                  const first = barcodes[0];
                  if (first.rawValue) {
                    detected = true;
                    handleDetectedRaw(first.rawValue);
                  }
                }
              } catch {
                // Fall back to jsQR
              }
            }

            // 2. High-speed jsQR fallback
            if (!detected && !isProcessingRef.current && scanCtx) {
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

              if (code && code.data) {
                handleDetectedRaw(code.data);
              }
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(scanTick);
      };

      animFrameRef.current = requestAnimationFrame(scanTick);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setErrorMessage('Camera access was denied. Please allow camera permissions or enter tag manually.');
      } else {
        setCameraState('unavailable');
        setErrorMessage('Unable to access camera. Please check your device or use manual entry.');
      }
    }
  }, [facingMode, handleDetectedRaw, stopStream]);

  // Toggle Torch (flashlight)
  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchOn(nextState);
      } catch {
        // Torch constraint rejected
      }
    }
  };

  // Switch between front and back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Mount/unmount lifecycle: start when enabled, stop when disabled or complete
  useEffect(() => {
    if (enabled && !isComplete) {
      startCamera();
    } else {
      stopStream();
      setCameraState('starting');
    }
    return () => {
      stopStream();
    };
  }, [enabled, isComplete, startCamera, stopStream]);

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = extractCleanTagId(manualCode);
    if (!clean) return;
    onManualSubmit(clean);
    setManualCode('');
  };

  return (
    <div className="space-y-2.5 w-full max-w-full">
      {/* ── Live Camera Preview: Full-Area Zoomed Square Viewport ── */}
      <div className="relative w-full max-w-[380px] md:max-w-none aspect-square bg-neutral-950 rounded-xl overflow-hidden border-2 border-border flex items-center justify-center mx-auto shadow-inner">
        {/* ── Continuous Live Video Element (always mounted to receive stream) ── */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            cameraState === 'active' ? 'opacity-100' : 'opacity-0'
          }`}
          playsInline
          muted
          autoPlay
        />

        {/* ── Scanning Frame Overlay with Crisp Corner Brackets ── */}
        {cameraState === 'active' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
            {/* Square target reticle utilizing the central area */}
            <div className="relative w-4/5 aspect-square max-w-[280px] border border-white/50 rounded-xl shadow-2xl">
              {/* Top-left corner */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-sm" />
              {/* Top-right corner */}
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-sm" />
              {/* Bottom-left corner */}
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-sm" />
              {/* Bottom-right corner */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-sm" />

              {/* Scanning guide horizontal laser line */}
              <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_rgba(52,211,153,0.8)] opacity-75" />

              {/* Processing Spinner Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-2xs flex flex-col items-center justify-center gap-1.5 text-white text-xs font-mono rounded-xl">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Checking tag...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Camera State Overlays: Starting, Denied, or Unavailable ── */}
        {cameraState === 'starting' && (
          <div className="text-center p-4 text-neutral-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-neutral-300" />
            <p className="text-xs font-satoshi">Starting warehouse camera...</p>
          </div>
        )}

        {(cameraState === 'denied' || cameraState === 'unavailable') && (
          <div className="p-4 text-center max-w-xs space-y-2.5 text-neutral-300">
            <CameraOff className="w-7 h-7 mx-auto text-neutral-400" />
            <p className="text-xs font-satoshi leading-relaxed">{errorMessage}</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => startCamera()}
                className="px-3 py-1 rounded bg-surface border border-border text-xs text-ink font-medium cursor-pointer hover:bg-neutral-100"
              >
                Retry camera
              </button>
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="px-3 py-1 rounded bg-ink text-surface text-xs font-medium cursor-pointer hover:opacity-90"
              >
                Enter manually
              </button>
            </div>
          </div>
        )}

        {/* ── Top-Right Camera Controls: Flashlight & Switch Camera ── */}
        {cameraState === 'active' && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-1.5 rounded-full border transition-colors cursor-pointer ${
                  torchOn
                    ? 'bg-amber-400 border-amber-300 text-neutral-950'
                    : 'bg-neutral-900/80 border-neutral-700 text-white hover:bg-neutral-800'
                }`}
                title={torchOn ? 'Turn off light' : 'Turn on light'}
                aria-label="Flashlight"
              >
                {torchOn ? <Flashlight className="w-3.5 h-3.5" /> : <FlashlightOff className="w-3.5 h-3.5" />}
              </button>
            )}

            {canSwitchCamera && (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-1.5 rounded-full bg-neutral-900/80 border border-neutral-700 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Switch camera"
                aria-label="Switch camera"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Instruction Beneath Frame ── */}
      <p className="text-[11px] text-muted text-center font-satoshi">
        Align the QR code inside the frame.
      </p>

      {/* ── 6: Scan Feedback Alert ── */}
      {feedbackMessage && (
        <div
          className={`p-2.5 rounded border text-xs flex items-center gap-2 font-mono transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50/70 text-emerald-950 border-emerald-200'
              : feedbackMessage.type === 'duplicate'
              ? 'bg-amber-50/80 text-amber-950 border-amber-300'
              : 'bg-red-50/80 text-red-950 border-red-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle
              className={`w-3.5 h-3.5 shrink-0 ${
                feedbackMessage.type === 'duplicate' ? 'text-amber-600' : 'text-red-600'
              }`}
            />
          )}
          <span className="flex-1 break-words">{feedbackMessage.text}</span>
        </div>
      )}

      {/* ── 7: Mobile-Only Product Checklist Slot ── */}
      {mobileChecklistSlot && (
        <div className="md:hidden pt-1">
          {mobileChecklistSlot}
        </div>
      )}

      {/* ── 8: Secondary Controls: Flashlight, Camera Switch, or Manual Tag Entry ── */}
      <div className="pt-1 space-y-2">
        {!showManualInput ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              className="text-[11px] text-muted hover:text-ink font-mono underline cursor-pointer"
            >
              Or enter QR tag serial manually →
            </button>

            {/* Quick secondary toggles for torch / camera if supported */}
            {cameraState === 'active' && (torchSupported || canSwitchCamera) && (
              <div className="flex items-center gap-2 text-[11px] text-muted font-mono">
                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className="hover:text-ink cursor-pointer inline-flex items-center gap-1"
                  >
                    {torchOn ? <Flashlight className="w-3 h-3 text-amber-500" /> : <FlashlightOff className="w-3 h-3" />}
                    <span>{torchOn ? 'Torch On' : 'Torch Off'}</span>
                  </button>
                )}
                {canSwitchCamera && (
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="hover:text-ink cursor-pointer inline-flex items-center gap-1"
                  >
                    <SwitchCamera className="w-3 h-3" />
                    <span>Flip</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleManualFormSubmit} className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="manual-tag-input" className="font-medium text-ink">
                Manual QR Tag / Barcode Entry
              </label>
              <button
                type="button"
                onClick={() => setShowManualInput(false)}
                className="text-[10px] text-muted hover:text-ink cursor-pointer"
              >
                Hide manual entry
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="manual-tag-input"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. JZV37NP or https://kauntact.com/t/..."
                disabled={isProcessing || isComplete}
                className="flex-1 min-w-0 px-3 py-1.5 rounded border border-border bg-surface text-ink font-mono text-xs focus:outline-none focus:border-ink"
              />
              <button
                type="submit"
                disabled={isProcessing || !manualCode.trim() || isComplete}
                className="px-3.5 py-1.5 rounded bg-ink text-surface font-medium text-xs disabled:opacity-40 cursor-pointer shrink-0 hover:opacity-90 transition-opacity"
              >
                {isProcessing ? 'Binding...' : 'Scan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
