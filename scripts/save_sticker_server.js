import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3333;
const rootDir = process.cwd();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { pngData } = JSON.parse(body);
        const base64 = pngData.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');

        const destinations = [
          path.join(rootDir, 'public', 'pingin-sticker.png'),
          path.join(rootDir, 'pingin-sticker.png'),
          path.join(rootDir, 'public', 'PingIn-Sticker-pingin.co.in.png'),
          path.join('C:\\Users\\abdullah\\.gemini\\antigravity-ide\\brain\\299f7fdd-e0da-4663-a33f-b82c5d860293', 'pingin-sticker.png'),
          path.join('C:\\Users\\abdullah\\.gemini\\antigravity-ide\\brain\\299f7fdd-e0da-4663-a33f-b82c5d860293', 'PingIn-Sticker-pingin.co.in.png'),
        ];

        for (const dest of destinations) {
          try {
            fs.writeFileSync(dest, buffer);
            console.log(`Saved: ${dest} (${(buffer.length / 1024).toFixed(1)} KB)`);
          } catch (e) {
            console.error(`Could not write to ${dest}:`, e.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('SAVED_OK');

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 300);
      } catch (err) {
        console.error('Error saving PNG:', err);
        res.writeHead(500);
        res.end('ERROR');
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Sticker receiver listening on http://127.0.0.1:${PORT}`);
});
