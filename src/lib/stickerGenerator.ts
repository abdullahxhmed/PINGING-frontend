export type StickerTheme = 'light' | 'dark';

export const STICKER_WIDTH = 1033;
export const STICKER_HEIGHT = 1447;

// Coordinates for QR box on 1033x1447 canvas
export const QR_BOX_X = 179;
export const QR_BOX_Y = 624;
export const QR_BOX_SIZE = 675;
export const QR_BOX_RADIUS = 28;

// Tag number typography & placement
// Position: Top-right, moved away from corners equally in both X and Y
// Right edge at X=968 (10px away from right edge), baseline at Y=113 (10px away from top edge)
export const TAG_RIGHT_X = 968;
export const TAG_BASELINE_Y = 113;
export const TAG_FONT_SIZE = 52; // 8pt equivalent on 1447px canvas (increased from 7.9pt / 51px)

// Light Theme Specs
export const LIGHT_TAG_COLOR = '#737373';
export const LIGHT_TAG_TRACKING = 0.025; // 25 letter spacing (0.025em)
export const LIGHT_QR_FG_COLOR = '#11110F';
export const LIGHT_QR_BOX_COLOR = '#edece6';

// Dark Theme Specs
export const DARK_TAG_COLOR = '#6b6961';
export const DARK_TAG_TRACKING = 0; // text spacing: 0
export const DARK_QR_FG_COLOR = '#f5f4ee';
export const DARK_QR_BOX_COLOR = '#262621';

// Backward compatibility defaults
export const TAG_COLOR = LIGHT_TAG_COLOR;
export const TAG_TRACKING = LIGHT_TAG_TRACKING;

/**
 * Loads the Kauntact Light sticker template image.
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
      fallbackImg.onerror = (e) => reject(new Error(`Failed to load light sticker template: ${e}`));
      fallbackImg.src = '/src/assets/kauntactStickerTemplate.png';
    };
    img.src = src;
  });
}

/**
 * Loads the Kauntact Dark sticker template image.
 */
export function loadDarkTemplateImage(src = '/darkKauntactSticker.png'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback 1: darkKauntactStickerTemplate.png
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => {
        // Fallback 2: local asset path
        const localImg = new Image();
        localImg.crossOrigin = 'anonymous';
        localImg.onload = () => resolve(localImg);
        localImg.onerror = (e) => reject(new Error(`Failed to load dark sticker template: ${e}`));
        localImg.src = '/src/assets/darkKauntactSticker.png';
      };
      fallbackImg.src = '/darkKauntactStickerTemplate.png';
    };
    img.src = src;
  });
}

/**
 * Loads the appropriate sticker template based on theme.
 */
export function loadStickerTemplate(theme: StickerTheme = 'light'): Promise<HTMLImageElement> {
  return theme === 'dark' ? loadDarkTemplateImage() : loadTemplateImage();
}

/**
 * Draws text with explicit tracking / letter-spacing onto a 2D canvas context.
 */
function drawTrackedTextRightAligned(
  ctx: CanvasRenderingContext2D,
  text: string,
  rightX: number,
  baselineY: number,
  letterSpacingEm = 0
) {
  // If letterSpacing is 0, standard right-aligned fill is fastest and cleanest
  if (letterSpacingEm === 0) {
    ctx.save();
    if ('letterSpacing' in ctx) {
      (ctx as any).letterSpacing = '0px';
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, rightX, baselineY);
    ctx.restore();
    return;
  }

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
  theme?: StickerTheme;
  qrUrl?: string;
  qrSource?: CanvasImageSource | null;
  qrSourceCanvas?: HTMLCanvasElement | null; // deprecated alias
  templateImage?: HTMLImageElement | null;
}

/**
 * Renders the production Kauntact Sticker (Light or Dark) onto the target canvas (1033x1447).
 */
export async function renderKauntactSticker(
  canvas: HTMLCanvasElement,
  options: RenderStickerOptions
): Promise<void> {
  const { tagNumber } = options;
  const theme: StickerTheme = options.theme || 'light';
  const qrSource = options.qrSource || options.qrSourceCanvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Ensure canvas dimensions
  canvas.width = STICKER_WIDTH;
  canvas.height = STICKER_HEIGHT;

  // 1. Load and draw the base template (Light or Dark)
  const template = options.templateImage || (await loadStickerTemplate(theme));
  ctx.drawImage(template, 0, 0, STICKER_WIDTH, STICKER_HEIGHT);

  // 2. Draw QR code inside the rounded square box (fills to edges with clean radius clipping)
  // Light: #edece6 square. Dark: #262621 square.
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
    // Wait for Satoshi fonts to be ready
    if (document.fonts) {
      try {
        await document.fonts.load(`500 ${TAG_FONT_SIZE}px "Satoshi"`);
        await document.fonts.ready;
      } catch {
        // Ignored
      }
    }

    const tagColor = theme === 'dark' ? DARK_TAG_COLOR : LIGHT_TAG_COLOR;
    const tracking = theme === 'dark' ? DARK_TAG_TRACKING : LIGHT_TAG_TRACKING;

    ctx.save();
    ctx.fillStyle = tagColor;
    ctx.font = `500 ${TAG_FONT_SIZE}px "Satoshi", "General Sans", sans-serif`;

    drawTrackedTextRightAligned(
      ctx,
      cleanTag,
      TAG_RIGHT_X,
      TAG_BASELINE_Y,
      tracking
    );
    ctx.restore();
  }
}

/**
 * Dedicated builder for the Dark Kauntact QR Sticker.
 * Overlays #6b6961 tag number in Satoshi Medium (spacing 0) and #f5f4ee QR code inside the #262621 rounded square.
 */
export async function renderDarkKauntactSticker(
  canvas: HTMLCanvasElement,
  options: Omit<RenderStickerOptions, 'theme'>
): Promise<void> {
  return renderKauntactSticker(canvas, { ...options, theme: 'dark' });
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

// Re-export mini sticker builder functions, types, and constants
export * from './miniStickerGenerator';
