import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildTagQrUrl } from '../../lib/qr';
import { QrCode as QrCodeIcon } from 'lucide-react';

export interface PingInQrCodeProps {
  /**
   * The tag token, tag number, or target URL.
   * Will be strictly normalized into `${baseUrl}/t/${identifier}` unless directUrl is true.
   */
  value?: string | null;

  /**
   * If true, encodes the exact value string directly without tag normalization.
   */
  directUrl?: boolean;

  /**
   * Size in pixels (width and height). Default: 150
   */
  size?: number;

  /**
   * Foreground color of QR dots. Default: #11110F
   */
  fgColor?: string;

  /**
   * Background color of QR canvas. Default: #FFFFFF
   */
  bgColor?: string;

  /**
   * Error correction level ('L', 'M', 'Q', 'H'). Default: 'H'
   */
  level?: 'L' | 'M' | 'Q' | 'H';

  /**
   * Whether to include safe margins around the QR code. Default: true
   */
  includeMargin?: boolean;

  /**
   * Optional id for the rendered SVG element (useful for PNG export).
   */
  id?: string;

  /**
   * Additional wrapper class names.
   */
  className?: string;

  /**
   * Optional custom fallback element if no tag/value is provided.
   */
  fallback?: React.ReactNode;
}

/**
 * Canonical Single QR Builder Component for PingIn.
 *
 * Guarantees that every QR code rendered across the app:
 * 1. Strictly encodes `https://.../t/:identifier` unless directUrl is explicitly set.
 * 2. Never accidentally embeds direct contact URLs (/c/:token).
 * 3. Gracefully disables display if no QR tag is provided.
 */
export const PingInQrCode: React.FC<PingInQrCodeProps> = ({
  value,
  directUrl = false,
  size = 150,
  fgColor = '#11110F',
  bgColor = '#FFFFFF',
  level = 'H',
  includeMargin = true,
  id,
  className = '',
  fallback,
}) => {
  const finalUrl = directUrl && value ? value : buildTagQrUrl(value);

  // If no valid tag or URL could be constructed, do not render a QR code
  if (!finalUrl) {
    if (fallback) return <>{fallback}</>;

    return (
      <div
        className={`flex flex-col items-center justify-center border border-dashed border-border/80 rounded-sm text-center p-4 text-muted select-none ${className}`}
        style={{ width: size, height: size }}
      >
        <QrCodeIcon className="h-8 w-8 text-muted/40 mb-1" />
        <span className="text-[10px] font-mono uppercase tracking-wider">
          No QR Tag
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <QRCodeSVG
        id={id}
        value={finalUrl}
        size={size}
        fgColor={fgColor}
        bgColor={bgColor}
        level={level}
        includeMargin={includeMargin}
        className={className.includes('w-full') ? 'w-full h-full max-w-full max-h-full block' : undefined}
      />
    </div>
  );
};
