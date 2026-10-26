// Lightweight, zero-dependency canvas confetti for celebration events

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  shape: 'rect' | 'circle';
  opacity: number;
  decay: number;
}

export function triggerConfetti(durationMs: number = 3200): () => void {
  // Guard against SSR or missing document
  if (typeof window === 'undefined' || !document.body) {
    return () => {};
  }

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  const resize = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };
  resize();
  window.addEventListener('resize', resize);

  const colors = [
    '#d7ff3f', // signature neon lime
    '#11110f', // deep ink
    '#315f43', // pine green
    '#f59e0b', // amber
    '#3b82f6', // electric blue
    '#ec4899', // rose
    '#8b5cf6', // purple
    '#ffffff', // crisp white
  ];

  const particles: Particle[] = [];
  const particleCount = 140;

  // Burst from left and right corners towards center-upward
  for (let i = 0; i < particleCount; i++) {
    const fromLeft = i % 2 === 0;
    const startX = fromLeft ? window.innerWidth * 0.15 : window.innerWidth * 0.85;
    const startY = window.innerHeight * 0.45;
    const angle = fromLeft
      ? -Math.PI / 4 + (Math.random() - 0.5) * 0.6
      : (-3 * Math.PI) / 4 + (Math.random() - 0.5) * 0.6;
    const speed = 9 + Math.random() * 14;

    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 5 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      shape: Math.random() > 0.35 ? 'rect' : 'circle',
      opacity: 1,
      decay: 0.006 + Math.random() * 0.008,
    });
  }

  let animId: number;
  const startTime = performance.now();

  const render = (time: number) => {
    const elapsed = time - startTime;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let activeParticles = 0;
    const gravity = 0.32;
    const drag = 0.985;

    for (const p of particles) {
      if (p.opacity <= 0) continue;
      activeParticles++;

      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRot;

      if (elapsed > 1200) {
        p.opacity = Math.max(0, p.opacity - p.decay);
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);

      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    if (activeParticles > 0 && elapsed < durationMs + 2000) {
      animId = requestAnimationFrame(render);
    } else {
      cleanup();
    }
  };

  animId = requestAnimationFrame(render);

  const cleanup = () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
    if (canvas.parentNode) {
      canvas.remove();
    }
  };

  return cleanup;
}
