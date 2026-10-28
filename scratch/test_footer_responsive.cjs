const fs = require('fs');

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const targets = await res.json();
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('localhost'));
  if (!pageTarget) return;

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let id = 1;

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  // Test 1: Desktop 1200px
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:5173/shop' });
  await new Promise(r => setTimeout(r, 1000));
  await send('Runtime.evaluate', { expression: `document.querySelector('footer').scrollIntoView({ block: 'end' });` });
  await new Promise(r => setTimeout(r, 400));
  const shotDesktop = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/abdullah/.gemini/antigravity/brain/7ced62eb-1041-4414-8280-cee8858c8f92/footer_aligned_desktop.png', Buffer.from(shotDesktop.data, 'base64'));
  console.log('Saved footer_aligned_desktop.png');

  // Test 2: Tablet 768px
  await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 800, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 400));
  const shotTablet = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/abdullah/.gemini/antigravity/brain/7ced62eb-1041-4414-8280-cee8858c8f92/footer_aligned_tablet.png', Buffer.from(shotTablet.data, 'base64'));
  console.log('Saved footer_aligned_tablet.png');

  // Test 3: Mobile 390px
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await new Promise(r => setTimeout(r, 400));
  const shotMobile = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/abdullah/.gemini/antigravity/brain/7ced62eb-1041-4414-8280-cee8858c8f92/footer_aligned_mobile.png', Buffer.from(shotMobile.data, 'base64'));
  console.log('Saved footer_aligned_mobile.png');

  // Reset back to desktop default
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  ws.close();
}

main().catch(console.error);
