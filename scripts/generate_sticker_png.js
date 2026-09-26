import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

const TARGET_URL = 'https://pingin.co.in';
const DISPLAY_URL = 'pingin.co.in';
const FOOTER_TEXT = 'visit pingin.co.in to get yours!';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const clashFontPath = path.join(publicDir, 'fonts', 'ClashDisplay-Variable.woff2');
const generalFontPath = path.join(publicDir, 'fonts', 'GeneralSans-Variable.woff2');
const logoSvgPath = path.join(publicDir, 'pingin_logo.svg');

// 1. Generate QR Code SVG string
const qrSvgString = ReactDOMServer.renderToString(
  React.createElement(QRCodeSVG, {
    value: TARGET_URL,
    size: 1680,
    level: 'H',
    fgColor: '#11110F',
    bgColor: '#F4F3EE',
  })
);

const logoSvgContent = fs.readFileSync(logoSvgPath, 'utf8');

// HTML that will render the exact high-res 2400 x 2960 sticker canvas
const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PingIn Sticker Generator</title>
  <style>
    @font-face {
      font-family: 'Clash Display';
      src: url('/fonts/ClashDisplay-Variable.woff2') format('woff2');
      font-weight: 200 900;
    }
    @font-face {
      font-family: 'General Sans';
      src: url('/fonts/GeneralSans-Variable.woff2') format('woff2');
      font-weight: 200 900;
    }
    body {
      margin: 0;
      padding: 0;
      background: #111;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    canvas {
      display: block;
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <canvas id="sticker" width="2400" height="2960"></canvas>
  <script>
    function drawRoundedRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arcTo(x + width, y, x + width, y + radius, radius);
      ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
      ctx.arcTo(x, y + height, x, y + height - radius, radius);
      ctx.arcTo(x, y + radius, x, y, radius);
      ctx.closePath();
    }

    async function generate() {
      await document.fonts.ready;

      const canvas = document.getElementById('sticker');
      const ctx = canvas.getContext('2d');

      const SCALE = 4;
      const LOGICAL_WIDTH = 600;
      const LOGICAL_HEIGHT = 740;
      const QR_LOGICAL_SIZE = 400;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(SCALE, SCALE);

      // Load Logo SVG and QR Code Image
      const logoImg = new Image();
      const qrImg = new Image();

      const qrSvgBlob = new Blob([\`${qrSvgString}\`], { type: 'image/svg+xml;charset=utf-8' });
      const qrUrl = URL.createObjectURL(qrSvgBlob);

      const logoSvgBlob = new Blob([\`${logoSvgContent}\`], { type: 'image/svg+xml;charset=utf-8' });
      const logoUrl = URL.createObjectURL(logoSvgBlob);

      await Promise.all([
        new Promise((res) => { qrImg.onload = res; qrImg.src = qrUrl; }),
        new Promise((res) => { logoImg.onload = res; logoImg.src = logoUrl; })
      ]);

      // 1. Solid sticker surface (#F4F3EE)
      ctx.fillStyle = '#F4F3EE';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // 2. Crisp outer boundary sticker border (#D8D5CC)
      drawRoundedRect(ctx, 4, 4, LOGICAL_WIDTH - 8, LOGICAL_HEIGHT - 8, 20);
      ctx.strokeStyle = '#D8D5CC';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Top Header: Logo SVG + Circular Green Ring
      const logoHeight = 26;
      const logoWidth = Math.round(logoHeight * (514 / 138));
      ctx.drawImage(logoImg, 36, 24, logoWidth, logoHeight);

      // Circular ring on right
      ctx.beginPath();
      ctx.arc(LOGICAL_WIDTH - 42, 37, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#D7FF3F';
      ctx.fill();
      ctx.strokeStyle = '#11110F';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 4. Headline: NEED TO CONTACT THE OWNER? SCAN HERE
      ctx.fillStyle = '#11110F';
      ctx.font = '800 36px "Clash Display", sans-serif';
      ctx.textAlign = 'center';
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '1.2px';
      }
      if ('wordSpacing' in ctx) {
        ctx.wordSpacing = '3px';
      }
      ctx.fillText('NEED TO CONTACT', LOGICAL_WIDTH / 2, 94);
      ctx.fillText('THE OWNER?', LOGICAL_WIDTH / 2, 137);
      ctx.fillText('SCAN HERE', LOGICAL_WIDTH / 2, 180);
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '0px';
      }
      if ('wordSpacing' in ctx) {
        ctx.wordSpacing = '0px';
      }

      // 5. Scannable QR Code: disable smoothing for pixel-perfect 1:1 vector sharpness
      const qrX = (LOGICAL_WIDTH - QR_LOGICAL_SIZE) / 2;
      const qrY = 202;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrImg, qrX, qrY, QR_LOGICAL_SIZE, QR_LOGICAL_SIZE);
      ctx.imageSmoothingEnabled = true;

      // 6. Textual URL under QR
      ctx.fillStyle = '#6E6B62';
      ctx.font = '600 21px "General Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('${DISPLAY_URL}', LOGICAL_WIDTH / 2, 638);

      // 7. Short Centered Horizontal Divider
      const ruleWidth = 150;
      const ruleX = (LOGICAL_WIDTH - ruleWidth) / 2;
      ctx.beginPath();
      ctx.strokeStyle = '#D8D5CC';
      ctx.lineWidth = 1.4;
      ctx.moveTo(ruleX, 664);
      ctx.lineTo(ruleX + ruleWidth, 664);
      ctx.stroke();

      // 8. Footer: visit pingin.co.in to get yours!
      ctx.fillStyle = '#6E6B62';
      ctx.font = '600 20px "General Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('${FOOTER_TEXT}', LOGICAL_WIDTH / 2, 698);

      // Send generated PNG data to local server to save to disk
      const pngData = canvas.toDataURL('image/png');
      fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pngData })
      });
    }

    window.addEventListener('load', generate);
  </script>
</body>
</html>`;

const PORT = 45892;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
  } else if (req.url === '/fonts/ClashDisplay-Variable.woff2') {
    res.writeHead(200, { 'Content-Type': 'font/woff2' });
    fs.createReadStream(clashFontPath).pipe(res);
  } else if (req.url === '/fonts/GeneralSans-Variable.woff2') {
    res.writeHead(200, { 'Content-Type': 'font/woff2' });
    fs.createReadStream(generalFontPath).pipe(res);
  } else if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { pngData } = JSON.parse(body);
        const base64Content = pngData.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Content, 'base64');

        const outPaths = [
          path.join(rootDir, 'public', 'pingin-sticker.png'),
          path.join(rootDir, 'pingin-sticker.png'),
          path.join('C:\\Users\\abdullah\\.gemini\\antigravity-ide\\brain\\299f7fdd-e0da-4663-a33f-b82c5d860293', 'pingin-sticker.png'),
        ];

        for (const outPath of outPaths) {
          try {
            fs.writeFileSync(outPath, buffer);
            console.log(`Saved: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
          } catch (e) {
            console.error(`Could not write to ${outPath}:`, e.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 500);
      } catch (err) {
        console.error('Failed to save PNG:', err);
        res.writeHead(500);
        res.end('Error');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);

  // Find Chrome or Edge
  const candidates = [
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  let browserPath = candidates.find((p) => fs.existsSync(p));
  if (!browserPath) {
    console.error('No supported browser executable found.');
    process.exit(1);
  }

  console.log(`Launching headless browser: ${browserPath}`);
  const browserProc = spawn(browserPath, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--virtual-time-budget=5000',
    `http://127.0.0.1:${PORT}/`,
  ]);

  browserProc.on('exit', () => {
    // If browser exited before server handled /save, allow brief timeout
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 3000);
  });
});
