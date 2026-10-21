import type { QrTagLookupResponse, Resource } from '../../types/api';

export interface QrPoint {
  x: number;
  y: number;
}

export interface QrScanCapture {
  rawData: string;
  tagCode: string;
  cornerPoints: QrPoint[];
  capturedCanvas: HTMLCanvasElement;
  videoWidth: number;
  videoHeight: number;
}

export interface StickerPairingProps {
  onResolved: (tagCode: string, lookup?: QrTagLookupResponse) => void;
  onClose: () => void;
  ownedResources?: Resource[];
}

export type ScannerViewMode = 'camera' | 'reconstructing' | 'validating' | 'manual';
export type CameraStatus = 'starting' | 'active' | 'denied' | 'unavailable';
