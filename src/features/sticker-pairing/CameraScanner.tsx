import React from 'react';
import type { CameraStatus } from './types';
import { Loader2, AlertCircle, RefreshCw, Keyboard } from 'lucide-react';
import './pairing.css';

interface CameraScannerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraState: CameraStatus;
  errorMessage: string;
  onRetry: () => void;
  onSwitchToManual: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  videoRef,
  cameraState,
  errorMessage,
  onRetry,
  onSwitchToManual,
}) => {
  return (
    <div className="space-y-3">
      {/* Viewfinder Card */}
      <div className="scanner-viewport relative aspect-square w-full rounded-xl overflow-hidden border border-border shadow-md flex items-center justify-center">
        {/* Live Camera Video Feed */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Starting Camera State */}
        {cameraState === 'starting' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 text-white/80 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#D7FF3F]" />
            <span className="text-xs font-mono">Initializing optical camera…</span>
          </div>
        )}

        {/* Permission Denied or Unavailable State */}
        {(cameraState === 'denied' || cameraState === 'unavailable') && (
          <div className="absolute inset-0 bg-black/95 p-5 flex flex-col items-center justify-center text-center space-y-3 z-10">
            <AlertCircle className="h-8 w-8 text-amber-400" />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-white block">
                {cameraState === 'denied' ? 'Camera Permission Needed' : 'Camera Unavailable'}
              </span>
              <p className="text-[11px] text-white/60 leading-relaxed max-w-xs">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full pt-1">
              {cameraState === 'denied' && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="w-full h-8 bg-[#D7FF3F] text-black text-xs font-bold uppercase tracking-wider rounded-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Grant Camera Permission</span>
                </button>
              )}
              <button
                type="button"
                onClick={onSwitchToManual}
                className="w-full h-8 border border-white/20 text-white text-xs font-medium rounded-xs hover:bg-white/10 transition-colors cursor-pointer"
              >
                Enter the printed tag code instead
              </button>
            </div>
          </div>
        )}

        {/* Reticle & Scanline when camera is active */}
        {cameraState === 'active' && (
          <div className="absolute inset-6 pointer-events-none">
            {/* 4 Crisp Lime Corner Brackets */}
            <div className="absolute top-0 left-0 w-5 h-5 border-t-[2px] border-l-[2px] border-[#D7FF3F]" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-[2px] border-r-[2px] border-[#D7FF3F]" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-[2px] border-l-[2px] border-[#D7FF3F]" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-[2px] border-r-[2px] border-[#D7FF3F]" />

            {/* Subtle Periodic Sweep Scanline */}
            <div className="w-full h-[1.5px] bg-[#D7FF3F]/80 scanner-scanline" />
          </div>
        )}
      </div>

      {/* Sub-viewfinder helper text */}
      <div className="text-center pt-0.5">
        <span className="text-xs text-muted">
          {cameraState === 'active'
            ? 'Align the sticker’s QR code inside the frame.'
            : cameraState === 'starting'
            ? 'Requesting camera access...'
            : 'Camera not connected.'}
        </span>
      </div>

      {/* Manual switch button */}
      <div className="text-center pt-2 border-t border-border">
        <button
          type="button"
          onClick={onSwitchToManual}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-medium transition-colors cursor-pointer"
        >
          <Keyboard className="h-3.5 w-3.5" />
          <span>Enter the printed tag code instead</span>
        </button>
      </div>
    </div>
  );
};

export default CameraScanner;
