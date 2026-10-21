import React, { useState, useCallback, useRef } from 'react';
import type { StickerPairingProps, QrScanCapture, ScannerViewMode } from './types';
import type { QrTagLookupResponse } from '../../types/api';
import { qrApi } from '../../lib/api';
import { useQrScanner } from './useQrScanner';
import { CameraScanner } from './CameraScanner';
import { QrReconstructionCanvas } from './QrReconstructionCanvas';
import { ManualTagInput } from './ManualTagInput';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import './pairing.css';

export const StickerPairing: React.FC<StickerPairingProps> = ({
  onResolved,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<ScannerViewMode>('camera');
  const [activeCapture, setActiveCapture] = useState<QrScanCapture | null>(null);

  // Validation / Synchronization state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Track animation completion & API response
  const animCompletedRef = useRef<boolean>(false);
  const lookupResultRef = useRef<QrTagLookupResponse | null>(null);
  const pendingCodeRef = useRef<string>('');

  const finishResolutionIfReady = useCallback(
    (code: string) => {
      if (animCompletedRef.current && lookupResultRef.current) {
        // Both animation and API check complete
        onResolved(code, lookupResultRef.current);
      }
    },
    [onResolved]
  );

  const startServerVerification = useCallback(
    async (code: string) => {
      setIsVerifying(true);
      setValidationError(null);
      pendingCodeRef.current = code;
      lookupResultRef.current = null;

      try {
        const lookup = await qrApi.lookup(code);
        lookupResultRef.current = lookup;
        finishResolutionIfReady(code);
      } catch (err: any) {
        console.warn('Tag lookup error:', err);
        setValidationError(
          err.message || `Unable to recognize code "${code}". Please verify the tag is valid.`
        );
      } finally {
        setIsVerifying(false);
      }
    },
    [finishResolutionIfReady]
  );

  // Triggered when camera captures a valid QR
  const handleCameraCapture = useCallback(
    (capture: QrScanCapture) => {
      setActiveCapture(capture);
      animCompletedRef.current = false;
      setViewMode('reconstructing');

      // Concurrently kick off API validation while canvas 60fps animation runs
      startServerVerification(capture.tagCode);
    },
    [startServerVerification]
  );

  // Hook for camera & decoder
  const { videoRef, cameraState, errorMessage, startCamera, stopStream } = useQrScanner({
    onCapture: handleCameraCapture,
    enabled: viewMode === 'camera',
  });

  // Called when QrReconstructionCanvas completes its animation sequence (~950ms)
  const handleAnimationComplete = useCallback(() => {
    animCompletedRef.current = true;
    if (activeCapture) {
      finishResolutionIfReady(activeCapture.tagCode);
    }
  }, [activeCapture, finishResolutionIfReady]);

  // Handle manual code entry
  const handleManualCodeSubmit = useCallback(
    async (code: string) => {
      pendingCodeRef.current = code;
      setIsVerifying(true);
      setValidationError(null);
      try {
        const lookup = await qrApi.lookup(code);
        onResolved(code, lookup);
      } catch (err: any) {
        setValidationError(
          err.message || `Unable to recognize code "${code}". Please check the printed 7 characters.`
        );
      } finally {
        setIsVerifying(false);
      }
    },
    [onResolved]
  );

  const handleRetry = () => {
    setActiveCapture(null);
    setValidationError(null);
    animCompletedRef.current = false;
    lookupResultRef.current = null;
    setViewMode('camera');
    startCamera();
  };

  return (
    <div className="w-full max-w-sm mx-auto font-sans space-y-4">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between pb-1 border-b border-border text-xs">
        <button
          type="button"
          onClick={() => {
            stopStream();
            onClose();
          }}
          className="inline-flex items-center gap-1.5 text-muted hover:text-ink font-medium transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to options</span>
        </button>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
          STEP 1 OF 3 &bull; IDENTIFY
        </span>
      </div>

      {/* Validation Failure Card (if server returned error after scan) */}
      {validationError && (
        <div className="p-4 bg-surface border border-rose-300 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-ink block">
                Verification Failed
              </span>
              <p className="text-xs text-muted leading-relaxed">
                {validationError}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRetry}
              className="flex-1 h-9 bg-ink text-surface text-xs font-medium rounded-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Scan Again</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setValidationError(null);
                setViewMode('manual');
              }}
              className="h-9 px-3 border border-border text-xs text-muted hover:text-ink rounded-xs transition-colors cursor-pointer"
            >
              Enter Manually
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: Live Camera Scanner */}
      {!validationError && viewMode === 'camera' && (
        <CameraScanner
          videoRef={videoRef}
          cameraState={cameraState}
          errorMessage={errorMessage}
          onRetry={startCamera}
          onSwitchToManual={() => {
            stopStream();
            setViewMode('manual');
          }}
        />
      )}

      {/* VIEW 2: Frame Freeze & Canvas 2D Perspective Reconstruction */}
      {!validationError && viewMode === 'reconstructing' && activeCapture && (
        <div className="space-y-3">
          <QrReconstructionCanvas
            capture={activeCapture}
            onAnimationComplete={handleAnimationComplete}
          />

          {/* Validation Status Indicator */}
          <div className="text-center pt-1 flex items-center justify-center gap-2 text-xs text-muted">
            {isVerifying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-ink" />
                <span>Checking tag identity with Kauntact network…</span>
              </>
            ) : (
              <span className="text-success font-medium">Tag verified. Preparing belonging options…</span>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Manual Code Entry Mode */}
      {!validationError && viewMode === 'manual' && (
        <ManualTagInput
          onSubmitCode={handleManualCodeSubmit}
          onSwitchToCamera={() => {
            setViewMode('camera');
            startCamera();
          }}
        />
      )}
    </div>
  );
};

export default StickerPairing;
