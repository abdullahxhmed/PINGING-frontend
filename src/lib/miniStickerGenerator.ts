import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { buildTagQrUrl } from './qr';

export type MiniStickerTheme = 'dark' | 'white' | 'light' | 'miniDark' | 'miniWhite';

export interface MiniBoxSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  boxColor: string;
  qrFgColor: string;
}

// miniDark native specs (880 x 1172)
export const MINI_DARK_WIDTH = 880;
export const MINI_DARK_HEIGHT = 1172;
export const MINI_DARK_BOX: MiniBoxSpec = {
  x: 93,
  y: 266,
  width: 704,
  height: 710,
  radius: 55,
  boxColor: '#2D2D2A',
  qrFgColor: '#F5F4EE', // Light QR
};

// miniWhite native specs (886 x 1181)
export const MINI_WHITE_WIDTH = 886;
export const MINI_WHITE_HEIGHT = 1181;
export const MINI_WHITE_BOX: MiniBoxSpec = {
  x: 80,
  y: 243,
  width: 726,
  height: 746,
  radius: 55,
  boxColor: '#F5F4EE',
  qrFgColor: '#11110F', // Dark QR
};

/**
 * Normalizes theme input into 'dark' | 'white'.
 */
export function normalizeMiniTheme(theme?: MiniStickerTheme): 'dark' | 'white' {
  if (!theme) return 'dark';
  const t = theme.toLowerCase();
  if (t === 'white' || t === 'light' || t === 'miniwhite') return 'white';
  return 'dark';
}

/**
 * Gets the box specifications for a given theme.
 */
export function getMiniBoxSpec(theme?: MiniStickerTheme): MiniBoxSpec {
  return normalizeMiniTheme(theme) === 'white' ? MINI_WHITE_BOX : MINI_DARK_BOX;
}

/**
 * Loads the miniDark template image.
 */
export function loadMiniDarkTemplate(src = '/miniDark.PNG'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (e) => reject(new Error(`Failed to load miniDark template: ${e}`));
      fallbackImg.src = '/src/assets/miniDark.PNG';
    };
    img.src = src;
  });
}

/**
 * Loads the miniWhite template image.
 */
export function loadMiniWhiteTemplate(src = '/miniWhite.PNG'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (e) => reject(new Error(`Failed to load miniWhite template: ${e}`));
      fallbackImg.src = '/src/assets/miniWhite.PNG';
    };
    img.src = src;
  });
}

/**
 * Loads the appropriate mini template image by theme.
 */
export function loadMiniTemplate(theme?: MiniStickerTheme): Promise<HTMLImageElement> {
  return normalizeMiniTheme(theme) === 'white'
    ? loadMiniWhiteTemplate()
    : loadMiniDarkTemplate();
}

/**
 * Generates the QR SVG string using the canonical universal QR builder (buildTagQrUrl + QRCodeSVG).
 */
export function generateUniversalQrSvg(
  tagOrUrl: string,
  fgColor: string,
  bgColor = 'transparent',
  size = 720
): string {
  const finalUrl = buildTagQrUrl(tagOrUrl) || tagOrUrl || 'PINGIN';
  return renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: finalUrl,
      size,
      fgColor,
      bgColor,
      level: 'H',
      includeMargin: false,
    })
  );
}

/**
 * Converts an SVG string into an HTMLImageElement for canvas drawing.
 */
export function svgToImage(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to convert SVG to Image: ${e}`));
    };
    img.src = url;
  });
}

export interface RenderMiniStickerOptions {
  /**
   * The tag number, identifier, or target URL to encode using universal QR builder.
   */
  tag?: string;

  /**
   * Theme: 'dark' (Light QR inside #2D2D2A) or 'white' (Dark QR inside #F5F4EE).
   */
  theme?: MiniStickerTheme;

  /**
   * Optional preloaded base image (miniDark.PNG or miniWhite.PNG).
   * If omitted, will be automatically loaded based on theme.
   */
  baseImage?: HTMLImageElement | CanvasImageSource | null;

  /**
   * Optional pre-rendered QR canvas or image source.
   * If omitted, generated automatically using universal QR builder.
   */
  qrSource?: CanvasImageSource | null;

  /**
   * Optional custom box override.
   */
  box?: Partial<MiniBoxSpec>;
}

/**
 * Renders the mini sticker onto a target canvas:
 * 1. Draws the base image.
 * 2. Overlays the QR code using the universal QR builder inside the rounded box.
 *    - Light QR inside #2D2D2A dark (rounded corners) for miniDark.
 *    - Dark QR inside #F5F4EE light background for miniWhite.
 */
export async function renderMiniSticker(
  canvas: HTMLCanvasElement,
  options: RenderMiniStickerOptions
): Promise<void> {
  const theme = normalizeMiniTheme(options.theme);
  const spec = { ...getMiniBoxSpec(theme), ...(options.box || {}) };

  // 1. Resolve base image
  const baseImg = options.baseImage || (await loadMiniTemplate(theme));
  const imgWidth = (baseImg as any).naturalWidth || (baseImg as any).width || (theme === 'white' ? MINI_WHITE_WIDTH : MINI_DARK_WIDTH);
  const imgHeight = (baseImg as any).naturalHeight || (baseImg as any).height || (theme === 'white' ? MINI_WHITE_HEIGHT : MINI_DARK_HEIGHT);

  canvas.width = imgWidth;
  canvas.height = imgHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Draw the base image
  ctx.drawImage(baseImg, 0, 0, imgWidth, imgHeight);

  // 2. Resolve QR source
  let qrImg = options.qrSource;
  if (!qrImg) {
    const svgStr = generateUniversalQrSvg(
      options.tag || 'PINGIN',
      spec.qrFgColor,
      'transparent',
      Math.max(spec.width, spec.height)
    );
    qrImg = await svgToImage(svgStr);
  }

  // 3. Draw QR clipped to the rounded box
  ctx.save();
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(spec.x, spec.y, spec.width, spec.height, spec.radius);
  } else {
    // Fallback rounded rect path
    const { x, y, width: w, height: h, radius: r } = spec;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  ctx.clip();

  // Render QR scaled to fill the rounded box with crisp edges
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImg, spec.x, spec.y, spec.width, spec.height);
  ctx.restore();
}

export interface MiniStickerOutput {
  canvas: HTMLCanvasElement;
  toDataUrl: (format?: string, quality?: number) => string;
  toBlob: (format?: string, quality?: number) => Promise<Blob>;
  download: (filename?: string) => void;
  toImage: () => Promise<HTMLImageElement>;
}

/**
 * Builds a mini sticker and returns multiple output formats (canvas, data URL, blob, download).
 */
export async function buildMiniSticker(
  options: RenderMiniStickerOptions
): Promise<MiniStickerOutput> {
  const canvas = document.createElement('canvas');
  await renderMiniSticker(canvas, options);

  const theme = normalizeMiniTheme(options.theme);
  const cleanTag = (options.tag || 'PINGIN').trim().toUpperCase();

  return {
    canvas,
    toDataUrl: (format = 'image/png', quality = 1.0) => canvas.toDataURL(format, quality),
    toBlob: (format = 'image/png', quality = 1.0) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create Blob from canvas'));
          },
          format,
          quality
        );
      }),
    download: (filename) => {
      const defaultFilename = `kauntact_mini_${theme}_${cleanTag}.png`;
      downloadMiniStickerPng(canvas, filename || defaultFilename);
    },
    toImage: () =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error(`Failed to load output image: ${e}`));
        img.src = dataUrl;
      }),
  };
}

/**
 * Triggers direct browser download of the sticker PNG.
 */
export function downloadMiniStickerPng(
  canvas: HTMLCanvasElement,
  filename = 'mini_sticker.png'
): void {
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Mini sticker builder class providing a clean, chainable builder interface.
 */
export class MiniStickerBuilder {
  private theme: MiniStickerTheme = 'dark';
  private tag = '';
  private baseImage: HTMLImageElement | CanvasImageSource | null = null;
  private qrSource: CanvasImageSource | null = null;
  private box?: Partial<MiniBoxSpec>;

  constructor(options?: RenderMiniStickerOptions) {
    if (options) {
      if (options.theme) this.theme = options.theme;
      if (options.tag) this.tag = options.tag;
      if (options.baseImage) this.baseImage = options.baseImage;
      if (options.qrSource) this.qrSource = options.qrSource;
      if (options.box) this.box = options.box;
    }
  }

  setTheme(theme: MiniStickerTheme): this {
    this.theme = theme;
    return this;
  }

  setTag(tag: string): this {
    this.tag = tag;
    return this;
  }

  setBaseImage(baseImage: HTMLImageElement | CanvasImageSource | null): this {
    this.baseImage = baseImage;
    return this;
  }

  setQrSource(qrSource: CanvasImageSource | null): this {
    this.qrSource = qrSource;
    return this;
  }

  setBox(box: Partial<MiniBoxSpec>): this {
    this.box = box;
    return this;
  }

  async render(canvas?: HTMLCanvasElement): Promise<HTMLCanvasElement> {
    const target = canvas || document.createElement('canvas');
    await renderMiniSticker(target, {
      theme: this.theme,
      tag: this.tag,
      baseImage: this.baseImage,
      qrSource: this.qrSource,
      box: this.box,
    });
    return target;
  }

  async toDataUrl(format = 'image/png', quality = 1.0): Promise<string> {
    const canvas = await this.render();
    return canvas.toDataURL(format, quality);
  }

  async toBlob(format = 'image/png', quality = 1.0): Promise<Blob> {
    const canvas = await this.render();
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
        format,
        quality
      );
    });
  }

  async toImage(): Promise<HTMLImageElement> {
    const dataUrl = await this.toDataUrl();
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
      img.src = dataUrl;
    });
  }

  async download(filename?: string): Promise<void> {
    const canvas = await this.render();
    const cleanTag = (this.tag || 'PINGIN').trim().toUpperCase();
    const defaultName = `kauntact_mini_${normalizeMiniTheme(this.theme)}_${cleanTag}.png`;
    downloadMiniStickerPng(canvas, filename || defaultName);
  }
}
