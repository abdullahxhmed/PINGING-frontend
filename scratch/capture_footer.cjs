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

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

  await send('Page.navigate', { url: 'http://localhost:5173/shop' });
  await new Promise(r => setTimeout(r, 1500));

  await send('Runtime.evaluate', {
    expression: `
      window.scrollTo(0, 100000);
      document.documentElement.scrollTop = 100000;
      document.body.scrollTop = 100000;
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/abdullah/.gemini/antigravity/brain/7ced62eb-1041-4414-8280-cee8858c8f92/footer_just_logos_mobile.png', Buffer.from(shot.data, 'base64'));

  // Reset back to desktop
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  ws.close();
}

main().catch(console.error);
