// Materials and small drawn textures. Nothing is downloaded: every texture is
// painted once on a canvas at start-up. UVs are in metres (see kit.js).
import * as THREE from 'three';

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function painted(size, metres, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.setScalar(1 / metres);
  return t;
}

function speckle(ctx, size, count, alpha, rand) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(40,25,15,${alpha})`;
    const r = 1 + rand() * 2;
    ctx.fillRect(rand() * size, rand() * size, r, r);
  }
}

function makeTextures() {
  const r = seeded(7);
  return {
    brick: painted(512, 1.2, (ctx, s) => {
      ctx.fillStyle = '#5f3a27';
      ctx.fillRect(0, 0, s, s);
      const rows = 16;
      const h = s / rows;
      const w = h * 3.4;
      for (let y = 0; y < rows; y++) {
        const off = y % 2 ? w / 2 : 0;
        for (let x = -w; x < s + w; x += w) {
          const l = 28 + r() * 6;
          ctx.fillStyle = `hsl(${17 + r() * 4}, ${44 + r() * 7}%, ${l}%)`;
          ctx.fillRect(x + off + 1, y * h + 1, w - 2, h - 2);
        }
      }
      speckle(ctx, s, 2500, 0.05, r);
    }),
    plaster: painted(256, 2, (ctx, s) => {
      ctx.fillStyle = '#f4eee3';
      ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, 3500, 0.018, r);
    }),
    paving: painted(256, 1.6, (ctx, s) => {
      ctx.fillStyle = '#d8c8ad';
      ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, 2000, 0.025, r);
      ctx.fillStyle = 'rgba(95,75,55,.22)';
      ctx.fillRect(0, 0, s, 2);
      ctx.fillRect(0, 0, 2, s);
    }),
    stone: painted(256, 1, (ctx, s) => {
      ctx.fillStyle = '#ece4d6';
      ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, 1000, 0.02, r);
      ctx.fillStyle = 'rgba(95,75,55,.13)';
      ctx.fillRect(0, 0, s, 2);
      ctx.fillRect(0, 0, 2, s);
    }),
    oak: painted(256, 1.2, (ctx, s) => {
      const n = 8;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = `hsl(32, 28%, ${58 + r() * 3}%)`;
        ctx.fillRect(0, (i * s) / n, s, s / n - 1);
      }
      speckle(ctx, s, 800, 0.03, r);
    }),
    deck: painted(256, 1, (ctx, s) => {
      const n = 7;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = `hsl(25, 34%, ${38 + r() * 7}%)`;
        ctx.fillRect((i * s) / n, 0, s / n - 3, s);
      }
    }),
    grass: painted(256, 2, (ctx, s) => {
      ctx.fillStyle = '#87936a';
      ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, 6000, 0.05, r);
    }),
    water: painted(256, 1.5, (ctx, s) => {
      ctx.fillStyle = '#4aa5b4';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(255,255,255,.17)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        let x = r() * s;
        let y = r() * s;
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          x += (r() - 0.5) * 80;
          y += (r() - 0.5) * 80;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }),
  };
}

export function createMaterialFactory() {
  const tex = makeTextures();
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });

  const master = {
    plaster: std({ map: tex.plaster, roughness: 0.92 }),
    brick: std({ map: tex.brick, roughness: 0.95 }),
    dark: std({ color: 0x2a2622, roughness: 0.5, metalness: 0.4 }),
    stone: std({ map: tex.stone, roughness: 0.42 }),
    oak: std({ map: tex.oak, roughness: 0.6 }),
    wood: std({ color: 0x8a5f3c, roughness: 0.6 }),
    fabric: std({ color: 0xd9cfbe, roughness: 1 }),
    accent: std({ color: 0x74282a, roughness: 0.8 }),
    white: std({ color: 0xf8f6f1, roughness: 0.3 }),
    base: std({ color: 0xe9dfcf, roughness: 1 }),
    paving: std({ map: tex.paving }),
    concrete: std({ color: 0xc9bda8 }),
    grass: std({ map: tex.grass, roughness: 1 }),
    deck: std({ map: tex.deck, roughness: 0.75 }),
    water: std({
      map: tex.water,
      roughness: 0.12,
      metalness: 0.1,
      emissive: 0x38c6cf,
      emissiveIntensity: 0,
    }),
    leaf: std({ color: 0x6f7d5c, roughness: 1 }),
    palm: std({ color: 0x64784a, roughness: 0.9, side: THREE.DoubleSide, flatShading: true }),
    trunk: std({ color: 0x7c6650, roughness: 1 }),
    glass: std({
      color: 0x8fa6ad,
      roughness: 0.06,
      metalness: 0.75,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      emissive: 0xffb45e,
      emissiveIntensity: 0,
    }),
  };

  // Each layer gets its own copies, so one layer can fade without the others.
  return (layer) => {
    const out = {};
    for (const [name, m] of Object.entries(master)) {
      out[name] = m.clone();
      out[name].userData.baseOpacity = m.opacity;
    }
    return out;
  };
}
