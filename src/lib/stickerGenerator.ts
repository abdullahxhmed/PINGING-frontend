export const STICKER_WIDTH = 1033;
export const STICKER_HEIGHT = 1447;

// Coordinates for #edece6 QR box on 1033x1447 canvas
export const QR_BOX_X = 179;
export const QR_BOX_Y = 624;
export const QR_BOX_SIZE = 675;
export const QR_BOX_RADIUS = 28;

// Tag number typography & placement
// Position: Top-right, right edge at X=978, baseline at Y=103
export const TAG_RIGHT_X = 978;
export const TAG_BASELINE_Y = 103;
export const TAG_COLOR = '#737373';
export const TAG_FONT_SIZE = 51; // 7.9pt equivalent on 1447px canvas
export const TAG_TRACKING = 0.025; // 25 letter spacing (0.025em)

/**
 * Loads the Kauntact sticker template image.
 */
export function loadTemplateImage(src = '/kauntactStickerTemplate.png'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback to local asset path if public URL fails
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (e) => reject(new Error(`Failed to load sticker template: ${e}`));
      fallbackImg.src = '/src/assets/kauntactStickerTemplate.png';
    };
    img.src = src;
  });
}

/**
 * Draws text with explicit tracking / letter-spacing onto a 2D canvas context.
 */
function drawTrackedTextRightAligned(
  ctx: CanvasRenderingContext2D,
  text: string,
  rightX: number,
  baselineY: number,
  letterSpacingEm = 0.025
) {
  // If native canvas letterSpacing is supported
  if ('letterSpacing' in ctx && typeof (ctx as any).letterSpacing === 'string') {
    ctx.save();
    (ctx as any).letterSpacing = `${letterSpacingEm}em`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, rightX, baselineY);
    ctx.restore();
    return;
  }

  // Fallback: manual character spacing calculation
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const chars = text.split('');
  const extraSpacing = TAG_FONT_SIZE * letterSpacingEm;
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth = widths.reduce((sum, w) => sum + w, 0) + (chars.length - 1) * extraSpacing;

  let currentX = rightX - totalWidth;
  chars.forEach((c, idx) => {
    ctx.fillText(c, currentX, baselineY);
    currentX += widths[idx] + extraSpacing;
  });
  ctx.restore();
}

export interface RenderStickerOptions {
  tagNumber: string;
  qrUrl?: string;
  qrSource?: CanvasImageSource | null;
  qrSourceCanvas?: HTMLCanvasElement | null; // deprecated alias
  templateImage?: HTMLImageElement | null;
}

/**
 * Renders the production Kauntact Sticker onto the target canvas (1033x1447).
 */
export async function renderKauntactSticker(
  canvas: HTMLCanvasElement,
  options: RenderStickerOptions
): Promise<void> {
  const { tagNumber } = options;
  const qrSource = options.qrSource || options.qrSourceCanvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Ensure canvas dimensions
  canvas.width = STICKER_WIDTH;
  canvas.height = STICKER_HEIGHT;

  // 1. Load and draw the base template
  const template = options.templateImage || (await loadTemplateImage());
  ctx.drawImage(template, 0, 0, STICKER_WIDTH, STICKER_HEIGHT);

  // 2. Draw Transparent QR code inside #edece6 box filling to edges
  if (qrSource) {
    ctx.save();
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(QR_BOX_X, QR_BOX_Y, QR_BOX_SIZE, QR_BOX_SIZE, QR_BOX_RADIUS);
    } else {
      ctx.rect(QR_BOX_X, QR_BOX_Y, QR_BOX_SIZE, QR_BOX_SIZE);
    }
    ctx.clip();

    // Draw transparent QR scaled to fill the entire box
    ctx.imageSmoothingEnabled = false; // keep QR edges ultra-crisp
    ctx.drawImage(qrSource, QR_BOX_X, QR_BOX_Y, QR_BOX_SIZE, QR_BOX_SIZE);
    ctx.restore();
  }

  // 3. Draw Tag Number at top-right
  const cleanTag = (tagNumber || '').trim().toUpperCase();
  if (cleanTag) {
    // Wait for fonts to be ready
    if (document.fonts) {
      try {
        await document.fonts.load(`500 ${TAG_FONT_SIZE}px "Satoshi"`);
        await document.fonts.ready;
      } catch {
        // Ignored
      }
    }

    ctx.save();
    ctx.fillStyle = TAG_COLOR;
    ctx.font = `500 ${TAG_FONT_SIZE}px "Satoshi", "General Sans", sans-serif`;

    drawTrackedTextRightAligned(
      ctx,
      cleanTag,
      TAG_RIGHT_X,
      TAG_BASELINE_Y,
      TAG_TRACKING
    );
    ctx.restore();
  }
}

/**
 * Triggers a direct browser download of the sticker as a high-resolution PNG.
 */
export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens a print dialog with the sticker formatted for high-resolution printing.
 */
export function printStickerFromDataUrl(dataUrl: string, tagNumber: string): void {
  const printWindow = window.open('', '_blank', 'width=850,height=1100');
  if (!printWindow) {
    alert('Please allow popups to print stickers.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Sticker #${tagNumber}</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #edece6;
            font-family: sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .sticker-img {
            max-width: 100%;
            width: 480px;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          }
          @media print {
            body {
              background: none;
              padding: 0;
            }
            .sticker-img {
              width: 100%;
              max-width: none;
              border-radius: 0;
              box-shadow: none;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" class="sticker-img" alt="Kauntact Sticker #${tagNumber}" />
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
