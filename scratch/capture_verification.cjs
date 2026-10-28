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

  await send('Page.navigate', { url: 'http://localhost:5173/shop' });
  await new Promise(r => setTimeout(r, 1200));

  // Find the packs container
  await send('Runtime.evaluate', {
    expression: `
      const el = document.querySelector('[data-product-id=\"curated-kit\"]') || Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Curated Kit'));
      if (el) el.scrollIntoView({ block: 'center' });
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/abdullah/.gemini/antigravity/brain/7ced62eb-1041-4414-8280-cee8858c8f92/curated_kit_recommended_verified.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved curated_kit_recommended_verified.png');

  ws.close();
}

main().catch(console.error);
