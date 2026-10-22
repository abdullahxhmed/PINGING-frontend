/**
 * Kauntact QR Sticker Generator Runner
 *
 * Generates production-spec Dark and Light Kauntact QR Stickers:
 * - Base templates: 1033x1447 PNGs (Light & Dark)
 * - Tag number: Satoshi Medium (500), 52px (8pt equivalent), right-aligned at X=968, baseline Y=113
 * - Dark Tag specs: color #6b6961, text spacing 0
 * - Light Tag specs: color #737373, text spacing 0.025em
 * - QR code:
 *     - Dark: #f5f4ee dots inside #262621 rounded square (radius 28, box 179,624, 675x675)
 *     - Light: #11110F dots inside #edece6 rounded square (radius 28, box 179,624, 675x675)
 *     - Level: 'H' (Nayuki engine matching qrcode.react)
 * - Outputs directly to C:\Users\abdullah\Downloads\
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DOWNLOADS_DIR = path.join(process.env.USERPROFILE || 'C:\\Users\\abdullah', 'Downloads');
const PORT = 5892;

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Read assets
const darkTemplateBuf = fs.readFileSync(path.join(REPO_ROOT, 'public', 'darkKauntactSticker.png'));
const lightTemplateBuf = fs.readFileSync(path.join(REPO_ROOT, 'public', 'kauntactStickerTemplate.png'));
const fontBuf = fs.readFileSync(path.join(REPO_ROOT, 'public', 'fonts', 'Satoshi-Variable.woff2'));

// Extract Nayuki QR generator from qrcode.react
const qrcodeSrc = fs.readFileSync(path.join(REPO_ROOT, 'node_modules', 'qrcode.react', 'lib', 'esm', 'index.js'), 'utf8');
const qrcodegenChunk = qrcodeSrc.substring(
  qrcodeSrc.indexOf('var qrcodegen;'),
  qrcodeSrc.indexOf('var qrcodegen_default = qrcodegen;')
);

// Define tasks to render
const TASKS = [
  // Canonical tag URL format (https://kauntact.in/t/:tag)
  { tag: 'KT0M3YR', theme: 'dark', url: 'https://kauntact.in/t/KT0M3YR', filename: 'kauntact_dark_sticker_KT0M3YR.png' },
  { tag: 'KT0M3YR', theme: 'light', url: 'https://kauntact.in/t/KT0M3YR', filename: 'kauntact_light_sticker_KT0M3YR.png' },
  { tag: 'CTK5G2H', theme: 'dark', url: 'https://kauntact.in/t/CTK5G2H', filename: 'kauntact_dark_sticker_CTK5G2H.png' },
  { tag: 'CTK5G2H', theme: 'light', url: 'https://kauntact.in/t/CTK5G2H', filename: 'kauntact_light_sticker_CTK5G2H.png' },

  // Direct root URL format (https://kauntact.in)
  { tag: 'KT0M3YR', theme: 'dark', url: 'https://kauntact.in', filename: 'kauntact_dark_sticker_KT0M3YR_root_url.png' },
  { tag: 'KT0M3YR', theme: 'light', url: 'https://kauntact.in', filename: 'kauntact_light_sticker_KT0M3YR_root_url.png' },
  { tag: 'CTK5G2H', theme: 'dark', url: 'https://kauntact.in', filename: 'kauntact_dark_sticker_CTK5G2H_root_url.png' },
  { tag: 'CTK5G2H', theme: 'light', url: 'https://kauntact.in', filename: 'kauntact_light_sticker_CTK5G2H_root_url.png' },
];

const savedFiles = [];

const htmlPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Kauntact Sticker Batch Renderer</title>
  <style>
    body { font-family: sans-serif; background: #111; color: #eee; padding: 20px; }
    #log { font-family: monospace; white-space: pre-wrap; font-size: 13px; line-height: 1.5; }
  </style>
</head>
<body>
  <h2>Generating Kauntact QR Stickers...</h2>
  <div id="log"></div>
  <canvas id="canvas" width="1033" height="1447" style="display:none;"></canvas>

  <script>
    const logEl = document.getElementById('log');
    function log(msg) {
      logEl.textContent += msg + '\\n';
      console.log(msg);
    }

    // Embed Nayuki QR code engine
    ${qrcodegenChunk}

    const tasks = ${JSON.stringify(TASKS)};

    async function run() {
      try {
        log('Loading Satoshi font...');
        const font = new FontFace('Satoshi', 'url(/fonts/Satoshi-Variable.woff2)', { weight: '300 900' });
        await font.load();
        document.fonts.add(font);
        await document.fonts.ready;
        log('Satoshi font ready.');

        // Preload template images
        log('Loading sticker templates...');
        const darkImg = new Image();
        darkImg.src = '/darkKauntactSticker.png';
        await new Promise((res, rej) => { darkImg.onload = res; darkImg.onerror = rej; });

        const lightImg = new Image();
        lightImg.src = '/kauntactStickerTemplate.png';
        await new Promise((res, rej) => { lightImg.onload = res; lightImg.onerror = rej; });
        log('Sticker templates loaded.');

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        const STICKER_WIDTH = 1033;
        const STICKER_HEIGHT = 1447;
        const QR_BOX_X = 179;
        const QR_BOX_Y = 624;
        const QR_BOX_SIZE = 675;
        const QR_BOX_RADIUS = 28;
        const TAG_RIGHT_X = 968;
        const TAG_BASELINE_Y = 113;
        const TAG_FONT_SIZE = 52; // 8pt equivalent

        for (const task of tasks) {
          log('Rendering: ' + task.filename + ' (Theme: ' + task.theme + ', Tag: ' + task.tag + ', URL: ' + task.url + ')');
          
          canvas.width = STICKER_WIDTH;
          canvas.height = STICKER_HEIGHT;
          ctx.clearRect(0, 0, STICKER_WIDTH, STICKER_HEIGHT);

          // 1. Draw Template
          const template = task.theme === 'dark' ? darkImg : lightImg;
          ctx.drawImage(template, 0, 0, STICKER_WIDTH, STICKER_HEIGHT);

          // 2. Generate QR code matrix using Nayuki engine at Level H
          const qr = qrcodegen.QrCode.encodeText(task.url, qrcodegen.QrCode.Ecc.HIGH);
          const numCells = qr.size;
          const cellSize = QR_BOX_SIZE / numCells;

          // 3. Draw QR in rounded clipped box
          ctx.save();
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(QR_BOX_X, QR_BOX_Y, QR_BOX_SIZE, QR_BOX_SIZE, QR_BOX_RADIUS);
          } else {
            ctx.rect(QR_BOX_X, QR_BOX_Y, QR_BOX_SIZE, QR_BOX_SIZE);
          }
          ctx.clip();

          const fgColor = task.theme === 'dark' ? '#f5f4ee' : '#11110F';
          ctx.fillStyle = fgColor;

          for (let y = 0; y < numCells; y++) {
            for (let x = 0; x < numCells; x++) {
              if (qr.getModule(x, y)) {
                // Draw module with clean edges
                const rx = QR_BOX_X + x * cellSize;
                const ry = QR_BOX_Y + y * cellSize;
                // Add slight 0.05px overlap to eliminate micro gaps at float boundaries
                ctx.fillRect(rx, ry, cellSize + 0.05, cellSize + 0.05);
              }
            }
          }
          ctx.restore();

          // 4. Draw Tag Number at top-right
          ctx.save();
          const tagColor = task.theme === 'dark' ? '#6b6961' : '#737373';
          const tracking = task.theme === 'dark' ? 0 : 0.025;

          ctx.fillStyle = tagColor;
          ctx.font = '500 ' + TAG_FONT_SIZE + 'px "Satoshi", sans-serif';

          if (tracking === 0) {
            ctx.textAlign = 'right';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(task.tag, TAG_RIGHT_X, TAG_BASELINE_Y);
          } else {
            // Draw tracked text
            const chars = task.tag.split('');
            const extraSpacing = TAG_FONT_SIZE * tracking;
            const widths = chars.map(c => ctx.measureText(c).width);
            const totalWidth = widths.reduce((sum, w) => sum + w, 0) + (chars.length - 1) * extraSpacing;

            let curX = TAG_RIGHT_X - totalWidth;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            chars.forEach((c, idx) => {
              ctx.fillText(c, curX, TAG_BASELINE_Y);
              curX += widths[idx] + extraSpacing;
            });
          }
          ctx.restore();

          // 5. Export to PNG and send to server
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: task.filename, dataUrl })
          });
          log('Saved: ' + task.filename);
        }

        log('All tasks completed!');
        await fetch('/done', { method: 'POST' });
      } catch (err) {
        log('Error: ' + err.message);
        console.error(err);
      }
    }

    window.addEventListener('load', run);
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET') {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlPage);
      return;
    }
    if (req.url === '/fonts/Satoshi-Variable.woff2') {
      res.writeHead(200, { 'Content-Type': 'font/woff2' });
      res.end(fontBuf);
      return;
    }
    if (req.url === '/darkKauntactSticker.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(darkTemplateBuf);
      return;
    }
    if (req.url === '/kauntactStickerTemplate.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(lightTemplateBuf);
      return;
    }
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (req.url === '/save') {
        try {
          const { filename, dataUrl } = JSON.parse(body);
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          const filePath = path.join(DOWNLOADS_DIR, filename);
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          const stats = fs.statSync(filePath);
          savedFiles.push({ filename, filePath, size: stats.size });
          console.log(`[Saved] ${filename} (${stats.size.toLocaleString()} bytes) -> ${filePath}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          console.error('[Error saving file]', e);
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      if (req.url === '/done') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        console.log('\\nAll stickers successfully rendered and saved!');
        cleanupAndExit(0);
        return;
      }

      res.writeHead(404);
      res.end();
    });
  }
});

let browserProcess = null;

function cleanupAndExit(code = 0) {
  if (browserProcess) {
    try {
      browserProcess.kill();
    } catch {}
  }
  server.close(() => {
    console.log('\\nSummary of Generated Stickers in Downloads:');
    savedFiles.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.filename} [${f.size.toLocaleString()} bytes] -> ${f.filePath}`);
    });
    process.exit(code);
  });
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Sticker generation server listening on http://127.0.0.1:${PORT}`);
  console.log(`Launching headless Edge to render pixel-perfect sticker canvas...`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    `http://127.0.0.1:${PORT}/`
  ];

  browserProcess = spawn(edgePath, edgeArgs, { stdio: 'inherit' });

  browserProcess.on('error', (err) => {
    console.error('Failed to spawn Edge process:', err);
    console.log(`You can also open http://127.0.0.1:${PORT}/ in your regular browser to generate.`);
  });

  // Safety timeout: 30 seconds
  setTimeout(() => {
    if (savedFiles.length < TASKS.length) {
      console.warn('Timed out waiting for all tasks to complete.');
      cleanupAndExit(1);
    }
  }, 30000);
});
