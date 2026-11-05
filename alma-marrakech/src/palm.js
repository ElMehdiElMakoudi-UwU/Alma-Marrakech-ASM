// Palm-frond shadows, drawn from code on a small canvas.
// The low resolution plus a CSS blur is what makes them soft and cheap to run.

const FRONDS = [
  { x: 1.04, y: -0.08, length: 0.95, angle: 2.25, droop: 0.55, phase: 0 },
  { x: 0.92, y: -0.16, length: 0.8, angle: 1.8, droop: 0.4, phase: 1.9 },
  { x: 1.1, y: 0.16, length: 0.72, angle: 2.75, droop: -0.35, phase: 3.4 },
  { x: -0.06, y: 0.62, length: 0.55, angle: 0.3, droop: -0.4, phase: 5.1 },
];

// Three layered sines with unrelated periods, so the wind never visibly loops.
const wind = (t, period, phase) =>
  Math.sin((t * 6.283) / period + phase) * 0.6 +
  Math.sin((t * 6.283) / (period * 1.618) + phase * 2.1) * 0.3 +
  Math.sin((t * 6.283) / (period * 0.53) + phase * 0.7) * 0.1;

function drawFrond(ctx, frond, t, w, h) {
  const size = Math.max(w, h * 1.1) * frond.length;
  const sway = wind(t, 9, frond.phase) * 0.045;
  const angle = frond.angle + sway;
  const ox = frond.x * w;
  const oy = frond.y * h;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const bend = frond.droop + wind(t, 6, frond.phase + 2) * 0.05;

  // The stem is a simple curve in the frond's own coordinates.
  const point = (u) => {
    const along = u * size;
    const off = u * u * size * bend * 0.45;
    return [ox + cos * along - sin * off, oy + sin * along + cos * off];
  };

  ctx.beginPath();
  const count = 34;
  for (let i = 2; i <= count; i++) {
    const u = i / count;
    const [px, py] = point(u);
    const [qx, qy] = point(Math.min(1, u + 0.012));
    const dir = Math.atan2(qy - py, qx - px);
    const leaf = size * 0.3 * Math.sin(Math.PI * u ** 0.62) + size * 0.015;
    const flutter = wind(t, 2.6 + (i % 4) * 0.5, i * 1.3 + frond.phase) * 0.05;
    const base = size * 0.009;
    for (const side of [-1, 1]) {
      const a = dir + side * (1.15 - u * 0.62 + flutter);
      const tipX = px + Math.cos(a) * leaf;
      const tipY = py + Math.sin(a) * leaf;
      ctx.moveTo(px - Math.cos(dir) * base, py - Math.sin(dir) * base);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(px + Math.cos(dir) * base, py + Math.sin(dir) * base);
      ctx.closePath();
    }
  }
  ctx.fill();

  ctx.beginPath();
  ctx.lineWidth = size * 0.006;
  const [sx, sy] = point(0);
  ctx.moveTo(sx, sy);
  for (let i = 1; i <= 16; i++) ctx.lineTo(...point(i / 16));
  ctx.stroke();
}

export function palmShadow(canvas, { animate }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let w = 1;
  let h = 1;
  let visible = false;
  let raf = 0;
  const start = performance.now();

  const paint = (now) => {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = ctx.strokeStyle = '#2d1e14';
    // Only the top of the section is used: tall sections would stretch the fronds.
    const areaH = Math.min(h, w * 0.9);
    for (const frond of FRONDS) drawFrond(ctx, frond, t, w, areaH);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    w = canvas.width = Math.max(1, Math.round(rect.width / 3));
    h = canvas.height = Math.max(1, Math.round(rect.height / 3));
    paint(performance.now());
  };

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    paint(now);
  };

  const sync = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (animate && visible && !document.hidden) raf = requestAnimationFrame(loop);
  };

  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    sync();
  }).observe(canvas);
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  resize();
}
