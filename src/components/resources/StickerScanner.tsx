import React from 'react';
export { extractCleanTagId } from '../../features/sticker-pairing/useQrScanner';

const LazyStickerPairing = React.lazy(
  () => import('../../features/sticker-pairing/StickerPairing')
);

export interface StickerScannerProps {
  onTagDetected: (code: string) => void;
  onBack: () => void;
}

export const StickerScanner: React.FC<StickerScannerProps> = ({
  onTagDetected,
  onBack,
}) => {
  return (
    <React.Suspense
      fallback={
        <div className="h-64 flex items-center justify-center font-mono text-xs text-muted">
          Loading optical scanner…
        </div>
      }
    >
      <LazyStickerPairing
        onResolved={(code) => onTagDetected(code)}
        onClose={onBack}
      />
    </React.Suspense>
  );
};

export default StickerScanner;
