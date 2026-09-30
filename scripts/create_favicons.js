import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 4444;
const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const svgContent = fs.readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8');

function createIco(png16Buffer, png32Buffer) {
  // ICO header: 6 bytes
  // 2 bytes reserved (0)
  // 2 bytes type (1 for ICO)
  // 2 bytes count (2 images)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(2, 4);

  // Each directory entry: 16 bytes
  const dir16 = Buffer.alloc(16);
  dir16.writeUInt8(16, 0); // width
  dir16.writeUInt8(16, 1); // height
  dir16.writeUInt8(0, 2); // color palette count
  dir16.writeUInt8(0, 3); // reserved
  dir16.writeUInt16LE(1, 4); // color planes
  dir16.writeUInt16LE(32, 6); // bits per pixel
  dir16.writeUInt32LE(png16Buffer.length, 8); // image size

  const dir32 = Buffer.alloc(16);
  dir32.writeUInt8(32, 0); // width
  dir32.writeUInt8(32, 1); // height
  dir32.writeUInt8(0, 2); // color palette count
  dir32.writeUInt8(0, 3); // reserved
  dir32.writeUInt16LE(1, 4); // color planes
  dir32.writeUInt16LE(32, 6); // bits per pixel
  dir32.writeUInt32LE(png32Buffer.length, 8); // image size

  // Offsets: header (6) + 2 * dir (32) = 38
  const offset16 = 38;
  const offset32 = offset16 + png16Buffer.length;
  dir16.writeUInt32LE(offset16, 12);
  dir32.writeUInt32LE(offset32, 12);

  return Buffer.concat([header, dir16, dir32, png16Buffer, png32Buffer]);
}

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Favicon Generator</title></head>
<body>
<script>
async function run() {
  const svgText = ${JSON.stringify(svgContent)};
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();

  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });

  const sizes = [16, 32, 180, 512];
  const results = {};

  for (const size of sizes) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
    results[size] = canvas.toDataURL('image/png');
  }

  await fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(results)
  });
}
run().catch(console.error);
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const data = JSON.parse(body);

      const png16 = Buffer.from(data[16].replace(/^data:image\/png;base64,/, ''), 'base64');
      const png32 = Buffer.from(data[32].replace(/^data:image\/png;base64,/, ''), 'base64');
      const png180 = Buffer.from(data[180].replace(/^data:image\/png;base64,/, ''), 'base64');
      const png512 = Buffer.from(data[512].replace(/^data:image\/png;base64,/, ''), 'base64');

      fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), png16);
      fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32);
      fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
      fs.writeFileSync(path.join(publicDir, 'favicon-512x512.png'), png512);

      const icoBuffer = createIco(png16, png32);
      fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

      console.log('Successfully generated all favicon assets:');
      console.log(' - favicon.svg');
      console.log(' - favicon.ico (' + icoBuffer.length + ' bytes)');
      console.log(' - favicon-16x16.png (' + png16.length + ' bytes)');
      console.log(' - favicon-32x32.png (' + png32.length + ' bytes)');
      console.log(' - apple-touch-icon.png (' + png180.length + ' bytes)');
      console.log(' - favicon-512x512.png (' + png512.length + ' bytes)');

      res.writeHead(200);
      res.end('OK');

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 500);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
  const browserProc = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    `http://127.0.0.1:${PORT}`
  ]);
  browserProc.on('error', (err) => console.error('Browser launch error:', err));
});
