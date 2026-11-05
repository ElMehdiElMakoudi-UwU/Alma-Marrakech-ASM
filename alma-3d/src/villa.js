// Villa type 01, from the September 2026 dossier.
//
// Footprints: read from plan-t1-rdc-1800.webp and plan-t1-etage-1800.webp.
// Heights: not dimensioned in the dossier, so they are measured from the
// elevations against the known widths (14.57 m and 11.00 m). They are close,
// not exact, and the architect should check them.
import * as THREE from 'three';
import { Builder, PX_PER_M, X, Z } from './kit.js';
import { createMaterialFactory } from './materials.js';

export const FLOOR_1 = 3.15; // Top of the upper floor slab
const SLAB_UNDER = 2.85;
const ROOF_UNDER = 6.45;
const ROOF_TOP = 6.72;
const TOP = 6.92;

function site(b) {
  const L = 'site';
  b.box(L, 'base', [40, -40, 1660, 1120], -0.7, -0.02);
  b.box(L, 'paving', [189, 82, 1450, 928], -0.02, 0);

  // Gardens, drive and terrace
  b.box(L, 'grass', [200, 731, 1450, 918], 0, 0.03);
  b.box(L, 'grass', [1235, 290, 1450, 646], 0, 0.03);
  b.box(L, 'grass', [1178, 93, 1450, 122], 0, 0.03);
  b.box(L, 'concrete', [1178, 122, 1450, 290], 0, 0.015);
  b.box(L, 'deck', [200, 93, 415, 233], 0, 0.04);

  // Pool, 3.10 × 8.17 m, with its stone edge
  b.box(L, 'water', [200, 259, 375, 720], 0, 0.012);
  b.box(L, 'stone', [187, 247, 387, 259], 0, 0.05);
  b.box(L, 'stone', [187, 720, 387, 731], 0, 0.05);
  b.box(L, 'stone', [187, 259, 200, 720], 0, 0.05);
  b.box(L, 'stone', [375, 259, 387, 720], 0, 0.05);

  // Boundary walls, 1.5 m on the elevations
  const h = 1.5;
  b.box(L, 'plaster', [175, 82, 189, 928], 0, h);
  b.box(L, 'plaster', [175, 918, 1460, 928], 0, h);
  b.box(L, 'plaster', [175, 74, 1460, 82], 0, h);
  b.box(L, 'plaster', [1450, 82, 1460, 122], 0, h);
  b.box(L, 'plaster', [1450, 290, 1460, 675], 0, h);
  b.box(L, 'plaster', [1450, 702, 1460, 918], 0, h);

  // Brick panels on the street side
  for (const [a, c] of [[345, 430], [505, 590]]) b.box(L, 'brick', [1460, a, 1464, c], 0.1, h - 0.1);
  for (const [a, c] of [[320, 450], [620, 750], [920, 1050], [1220, 1350]]) {
    b.box(L, 'brick', [a, 928, c, 932], 0.1, h - 0.1);
  }

  // Sliding gate at the drive, in dark slats
  for (let y = 124; y < 288; y += 7.5) b.box(L, 'dark', [1452, y, 1457, y + 4.5], 0.05, 1.6);
  b.box(L, 'plaster', [1447, 110, 1463, 124], 0, 1.95);
  b.box(L, 'plaster', [1447, 288, 1463, 302], 0, 1.95);

  // Outdoor furniture, placed as on the plan
  b.cylinder(L, 'dark', [285, 165], 1.4, 0.04, 2.3, 8);
  b.cylinder(L, 'fabric', [285, 165], 55, 2.1, 2.5, 8, 2);
  b.box(L, 'wood', [340, 138, 412, 184], 0.72, 0.78);
  b.box(L, 'dark', [372, 150, 380, 172], 0.04, 0.72);
  for (const x of [344, 378]) {
    b.box(L, 'fabric', [x, 118, x + 22, 135], 0.04, 0.48);
    b.box(L, 'fabric', [x, 188, x + 22, 205], 0.04, 0.48);
  }
  for (const x of [232, 326]) {
    b.box(L, 'white', [x, 770, x + 34, 884], 0.03, 0.34);
    b.box(L, 'white', [x, 770, x + 34, 790], 0.34, 0.58);
  }
}

function groundFloor(b) {
  const L = 'rdc';
  const P = 'plaster';
  const opts = { yb: 0, yt: SLAB_UNDER };
  b.box(L, 'stone', [472, 82, 1178, 646], 0, 0.06);
  b.box(L, 'stone', [742, 610, 906, 660], 0, 0.04); // Entry step

  // Outer walls, corners first
  b.box(L, P, [472, 82, 1178, 96], 0, SLAB_UNDER);
  b.box(L, P, [472, 96, 486, 122], 0, SLAB_UNDER);
  b.box(L, P, [472, 605, 486, 646], 0, SLAB_UNDER);
  b.box(L, P, [1164, 96, 1178, 140], 0, SLAB_UNDER);
  b.box(L, P, [1164, 600, 1178, 646], 0, SLAB_UNDER);
  b.box(L, P, [486, 632, 516, 646], 0, SLAB_UNDER);
  b.box(L, P, [1132, 632, 1164, 646], 0, SLAB_UNDER);

  // West side: kitchen, shower room, living room
  b.wall(L, P, [478, 122, 486, 605], {
    ...opts,
    floor: 0.06,
    ops: [
      { a: 124, b: 247, sill: 0.95, n: 3 },
      { a: 247, b: 295, n: 1 },
      { a: 425, b: 605, n: 3 },
    ],
  });

  // South side: living room, entrance, reception
  b.wall(L, P, [516, 636, 695, 646], { ...opts, floor: 0.06, ops: [{ a: 516, b: 695, n: 3 }] });
  b.box(L, P, [695, 632, 742, 646], 0, SLAB_UNDER);
  b.box(L, P, [742, 604, 770, 610], 0, SLAB_UNDER);
  b.wall(L, 'dark', [770, 604, 900, 610], { ...opts, floor: 0.06, ops: [{ a: 842, b: 900, n: 1 }] });
  b.box(L, P, [900, 604, 920, 632], 0, SLAB_UNDER);
  b.box(L, P, [906, 632, 960, 646], 0, SLAB_UNDER);
  b.wall(L, P, [960, 636, 1132, 646], { ...opts, floor: 0.06, ops: [{ a: 960, b: 1132, n: 3 }] });

  // East side: Moroccan and European reception rooms
  b.wall(L, P, [1164, 140, 1172, 600], {
    ...opts,
    floor: 0.06,
    ops: [
      { a: 142, b: 365, sill: 1.06, n: 3 },
      { a: 430, b: 600, n: 3 },
    ],
  });
  for (const y of [172, 176, 180, 184, 256, 260, 264, 268, 340, 344, 348, 352]) {
    b.box(L, 'dark', [1173, y, 1178, y + 2.4], 1.06, 2.41);
  }

  // Brick, on the elevations
  b.box(L, 'brick', [1172, 365, 1176, 430], 0.06, SLAB_UNDER);
  b.box(L, 'brick', [1172, 140, 1176, 365], 0.06, 1.06);
  b.box(L, 'brick', [474, 295, 478, 425], 0.06, SLAB_UNDER);
  b.box(L, 'brick', [474, 122, 478, 247], 0.06, 1.0);
  b.box(L, 'brick', [695, 646, 742, 650], 0.06, SLAB_UNDER);
  b.box(L, 'brick', [906, 646, 960, 650], 0.06, SLAB_UNDER);

  // Inside
  b.box(L, P, [728, 96, 742, 322], 0, SLAB_UNDER);
  b.box(L, P, [906, 96, 920, 322], 0, SLAB_UNDER);
  b.box(L, P, [486, 310, 668, 316], 0, SLAB_UNDER);
  b.box(L, P, [715, 310, 728, 316], 0, SLAB_UNDER);
  b.box(L, P, [486, 410, 668, 418], 0, SLAB_UNDER);
  b.box(L, P, [715, 410, 742, 418], 0, SLAB_UNDER);
  b.box(L, P, [636, 366, 642, 410], 0, SLAB_UNDER);
  b.box(L, P, [735, 418, 742, 632], 0, SLAB_UNDER);
  for (let y = 490; y < 604; y += 9) b.box(L, 'wood', [906, y, 912, y + 4], 0.06, 2.6); // Entrance screen

  // Stairs: up to the landing, then back to the upper floor
  const treads = 9;
  const riser = (FLOOR_1 - 0.06) / (treads * 2);
  const run = 154 / treads;
  for (let i = 0; i < treads; i++) {
    const yTop = 0.06 + riser * (i + 1);
    b.box(L, 'wood', [742, 322 - run * (i + 1), 820, 322 - run * i], yTop - 0.07, yTop);
    const yTop2 = 0.06 + riser * (treads + 1 + i);
    b.box(L, 'wood', [826, 168 + run * i, 906, 168 + run * (i + 1)], yTop2 - 0.07, yTop2);
  }
  const landing = 0.06 + riser * treads;
  b.box(L, 'wood', [742, 96, 906, 168], landing - 0.1, landing);
  b.box(L, 'dark', [820, 168, 826, 322], 0.06, FLOOR_1);

  const f = 0.06;
  // Living room
  b.box(L, 'fabric', [496, 575, 728, 622], f, f + 0.42);
  b.box(L, 'fabric', [684, 490, 728, 575], f, f + 0.42);
  b.box(L, 'fabric', [496, 533, 540, 575], f, f + 0.42);
  b.box(L, 'accent', [570, 584, 596, 600], f + 0.42, f + 0.62);
  b.box(L, 'wood', [580, 516, 642, 556], f, f + 0.36);
  // European reception room
  b.box(L, 'fabric', [930, 575, 1148, 620], f, f + 0.42);
  b.box(L, 'fabric', [938, 490, 978, 575], f, f + 0.42);
  b.box(L, 'accent', [1060, 584, 1086, 600], f + 0.42, f + 0.62);
  b.box(L, 'wood', [1020, 516, 1084, 556], f, f + 0.36);
  // Moroccan reception room
  b.cylinder(L, 'wood', [1042, 236], 45, f, f + 0.42, 32);
  for (const [x, y] of [[997, 175], [1086, 175], [997, 295], [1086, 295]]) {
    b.cylinder(L, 'accent', [x, y], 14, f, f + 0.42, 16);
  }
  b.box(L, 'fabric', [925, 130, 945, 310], f, f + 0.42);
  b.box(L, 'fabric', [1128, 100, 1148, 365], f, f + 0.42);
  // Kitchen
  b.box(L, 'stone', [486, 100, 690, 135], f, f + 0.9);
  b.box(L, 'dark', [486, 205, 622, 232], f, f + 0.9);
  for (const x of [500, 533, 565, 597]) b.cylinder(L, 'fabric', [x, 195], 9, f, f + 0.65, 12);
  // Shower room
  b.box(L, 'white', [490, 345, 530, 410], f, f + 0.12);
  b.box(L, 'white', [550, 386, 570, 410], f, f + 0.42);
  b.box(L, 'white', [592, 382, 632, 410], f, f + 0.82);
}

function upperFloor(b) {
  const L = 'etage';
  const P = 'plaster';
  const F = FLOOR_1;
  const opts = { yb: F, yt: ROOF_UNDER, floor: F };
  const parapet = F + 1.0;

  // Slab, with openings for the stairs and the void
  const slab = (r) => b.box(L, P, r, SLAB_UNDER, F);
  slab([415, 82, 735, 703]);
  slab([906, 82, 1238, 703]);
  slab([735, 82, 906, 96]);
  slab([735, 322, 906, 392]);
  slab([735, 530, 906, 703]);

  // Floor finishes
  b.box(L, 'stone', [421, 200, 720, 697], F, F + 0.012);
  b.box(L, 'stone', [720, 675, 1150, 697], F, F + 0.012);
  const finish = (r) => b.box(L, 'oak', r, F, F + 0.02);
  finish([486, 97, 728, 316]);
  finish([550, 316, 728, 495]);
  finish([921, 97, 1165, 316]);
  finish([735, 322, 985, 392]);
  finish([918, 392, 985, 425]);
  finish([918, 425, 1165, 632]);

  // Outer walls and the angled walls that open the terraces
  b.box(L, P, [415, 82, 1238, 97], F, ROOF_UNDER);
  b.diagonal(L, P, [421, 112], [480, 203], 0.2, F, ROOF_UNDER);
  b.box(L, P, [478, 97, 486, 205], F, ROOF_UNDER);
  b.diagonal(L, P, [1028, 645], [1150, 703], 0.2, F, ROOF_UNDER);
  b.box(L, P, [1230, 640, 1238, 703], F, ROOF_UNDER);
  b.box(L, P, [1150, 697, 1230, 703], F, ROOF_UNDER);

  // Parapets and balconies
  b.box(L, P, [415, 97, 421, 703], F, parapet);
  b.box(L, P, [421, 697, 1150, 703], F, parapet);
  b.box(L, P, [1222, 107, 1238, 305], F, parapet);
  b.box(L, P, [1222, 485, 1238, 632], F, parapet);
  b.box(L, P, [735, 390, 905, 394], F, parapet); // Guard at the void

  // Master suite, shower room and dressing room
  b.wall(L, P, [482, 205, 488, 316], { ...opts, ops: [{ a: 205, b: 312, head: 2.4, n: 2 }] });
  b.box(L, P, [443, 316, 548, 330], F, ROOF_UNDER);
  b.box(L, P, [443, 330, 460, 510], F, ROOF_UNDER);
  b.box(L, P, [543, 376, 550, 495], F, ROOF_UNDER);
  b.box(L, P, [460, 495, 583, 510], F, ROOF_UNDER);
  b.wall(L, P, [583, 495, 695, 501], { ...opts, ops: [{ a: 583, b: 695, head: 2.4, n: 2 }] });
  b.box(L, P, [695, 495, 735, 510], F, ROOF_UNDER);

  // Stairs and corridor
  b.box(L, P, [728, 97, 743, 320], F, ROOF_UNDER);
  b.box(L, P, [906, 97, 921, 320], F, ROOF_UNDER);
  b.box(L, P, [728, 320, 735, 325], F, ROOF_UNDER);
  b.box(L, P, [728, 375, 735, 495], F, ROOF_UNDER);

  // Void over the ground floor, and the bathroom below it
  b.box(L, P, [905, 392, 918, 420], F, ROOF_UNDER);
  b.box(L, P, [905, 450, 918, 568], F, ROOF_UNDER);
  b.box(L, P, [735, 530, 905, 535], F, ROOF_UNDER);
  b.box(L, P, [720, 510, 735, 675], F, ROOF_UNDER);
  b.box(L, P, [735, 662, 885, 675], F, ROOF_UNDER);
  b.box(L, P, [870, 632, 885, 662], F, ROOF_UNDER);
  b.box(L, P, [885, 632, 912, 640], F, ROOF_UNDER);
  b.box(L, P, [905, 620, 912, 632], F, ROOF_UNDER);

  // North-east bedroom
  b.wall(L, P, [1165, 107, 1171, 305], { ...opts, ops: [{ a: 110, b: 305, head: 2.4, n: 2 }] });
  b.box(L, P, [1165, 97, 1238, 107], F, ROOF_UNDER);
  b.box(L, P, [1165, 305, 1238, 322], F, ROOF_UNDER);

  // East shower room and the service shaft
  b.box(L, P, [985, 316, 1165, 322], F, ROOF_UNDER);
  b.box(L, P, [985, 316, 992, 325], F, ROOF_UNDER);
  b.box(L, P, [985, 370, 992, 418], F, ROOF_UNDER);
  b.box(L, P, [985, 418, 1165, 425], F, ROOF_UNDER);
  b.box(L, P, [1222, 322, 1238, 425], F, ROOF_UNDER);
  b.box(L, P, [1165, 418, 1238, 485], F, ROOF_UNDER);
  b.box(L, P, [918, 420, 955, 425], F, ROOF_UNDER);

  // South-east bedroom
  b.wall(L, P, [1165, 485, 1171, 632], { ...opts, ops: [{ a: 485, b: 625, head: 2.4, n: 2 }] });
  b.wall(L, P, [915, 630, 1025, 636], { ...opts, ops: [{ a: 915, b: 1025, head: 2.4, n: 2 }] });
  b.box(L, P, [1025, 632, 1076, 645], F, ROOF_UNDER);
  b.wall(L, P, [1076, 632, 1120, 640], { ...opts, ops: [{ a: 1076, b: 1120, head: 2.4, n: 1 }] });
  b.box(L, P, [1120, 632, 1230, 640], F, ROOF_UNDER);

  // Brick volumes, from below the slab to the roof, with their tall slit windows
  b.box(L, 'brick', [1238, 320, 1243, 485], 2.6, ROOF_TOP);
  b.box(L, 'dark', [1243, 325, 1244.5, 355], F + 0.75, F + 2.4);
  b.box(L, 'brick', [438, 316, 443, 510], 2.6, ROOF_UNDER);
  b.box(L, 'dark', [436.5, 333, 438, 370], F + 0.75, F + 2.4);
  b.box(L, 'brick', [720, 675, 885, 680], 2.6, ROOF_UNDER);
  b.box(L, 'dark', [735, 680, 770, 681.5], F + 0.75, F + 2.4);

  const f = F + 0.02;
  // Beds
  for (const [x0, y0, x1, y1] of [[553, 97, 660, 207], [1007, 97, 1115, 207], [1025, 440, 1130, 548]]) {
    b.box(L, 'fabric', [x0, y0, x1, y1], f, f + 0.46);
    const pillow = y0 + 8;
    b.box(L, 'white', [x0 + 6, pillow, (x0 + x1) / 2 - 2, pillow + 20], f + 0.46, f + 0.58);
    b.box(L, 'white', [(x0 + x1) / 2 + 2, pillow, x1 - 6, pillow + 20], f + 0.46, f + 0.58);
    b.box(L, 'accent', [x0, y1 - 26, x1, y1 - 4], f + 0.46, f + 0.5);
  }
  b.box(L, 'wood', [572, 222, 630, 247], f, f + 0.42);
  b.box(L, 'wood', [1024, 222, 1082, 247], f, f + 0.42);
  b.box(L, 'wood', [1048, 552, 1105, 577], f, f + 0.42);
  // Wardrobes
  b.box(L, 'wood', [553, 385, 580, 495], f, f + 2.2);
  b.box(L, 'wood', [695, 385, 728, 495], f, f + 2.2);
  b.box(L, 'wood', [921, 112, 952, 248], f, f + 2.2);
  b.box(L, 'wood', [918, 452, 945, 568], f, f + 2.2);
  // Bathrooms
  b.box(L, 'white', [460, 452, 540, 490], f, f + 0.12);
  b.box(L, 'white', [735, 535, 785, 618], f, f + 0.12);
  b.box(L, 'white', [1132, 357, 1220, 410], f, f + 0.12);
  b.box(L, 'white', [503, 410, 523, 434], f, f + 0.42);
  b.box(L, 'white', [808, 640, 828, 662], f, f + 0.42);
  b.box(L, 'white', [1088, 325, 1108, 349], f, f + 0.42);
  // Terrace table
  b.cylinder(L, 'white', [550, 577], 22, f + 0.7, f + 0.74, 24);
  b.cylinder(L, 'dark', [550, 577], 2, f, f + 0.7, 8);
  b.box(L, 'fabric', [500, 566, 522, 590], f, f + 0.46);
  b.box(L, 'fabric', [578, 566, 600, 590], f, f + 0.46);
}

function roof(b) {
  const L = 'toit';
  b.box(L, 'plaster', [415, 82, 1238, 703], ROOF_UNDER, ROOF_TOP);
  b.box(L, 'plaster', [472, 82, 1178, 646], ROOF_TOP, TOP);
}

// Small repeatable random, so the trees are the same on every visit.
function randomiser(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function olive(b, [px, py], size, rand) {
  const L = 'site';
  const x = X(px);
  const z = Z(py);
  const h = 1.5 * size;
  const trunk = new THREE.CylinderGeometry(0.05 * size, 0.1 * size, h, 7);
  trunk.translate(x, h / 2, z);
  b.add(L, 'trunk', trunk);
  for (let i = 0; i < 7; i++) {
    const r = (0.42 + rand() * 0.4) * size;
    const blob = new THREE.IcosahedronGeometry(r, 2);
    const a = rand() * Math.PI * 2;
    const d = rand() * 0.72 * size;
    blob.scale(1, 0.78, 1);
    blob.translate(x + Math.cos(a) * d, h + 0.2 * size + rand() * 0.75 * size, z + Math.sin(a) * d);
    b.add(L, 'leaf', blob);
  }
}

function palm(b, [px, py], height, rand) {
  const L = 'site';
  const x = X(px);
  const z = Z(py);
  const trunk = new THREE.CylinderGeometry(0.13, 0.22, height, 9, 1);
  trunk.translate(x, height / 2, z);
  b.add(L, 'trunk', trunk);

  const fronds = 15;
  for (let i = 0; i < fronds; i++) {
    const az = (i / fronds) * Math.PI * 2 + rand() * 0.3;
    const lift = 0.5 + (i % 3) * 0.28 + rand() * 0.15;
    const len = 2.5 + rand() * 0.6;
    const segs = 6;
    const pos = [];
    const idx = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const out = t * len;
      const y = Math.sin(lift) * out - 0.42 * out * out * t;
      const w = 0.3 * Math.sin(Math.PI * (0.1 + t * 0.9)) + 0.02;
      pos.push(out, y, -w, out, y - 0.05, w);
      if (s < segs) {
        const k = s * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.rotateY(az);
    g.translate(x, height, z);
    b.add(L, 'palm', g);
  }
}

function planting(b) {
  const rand = randomiser(41);
  // Olive trees where the plan draws trees
  const big = [[484, 850], [745, 842], [1055, 840], [1380, 850], [1355, 425]];
  const small = [[556, 845], [696, 838], [850, 818], [880, 878], [1135, 840], [1305, 880], [1300, 500], [1400, 500]];
  big.forEach((p) => olive(b, p, 0.92, rand));
  small.forEach((p) => olive(b, p, 0.62, rand));
  // Palms line the streets in the renders; the plan doesn't place them.
  // They stand behind the villa, so they never block the main views.
  palm(b, [1560, 150], 9, rand);
  palm(b, [1560, 560], 7.5, rand);
  palm(b, [120, 20], 8.5, rand);
  palm(b, [760, -5], 10, rand);
}

export function buildVilla() {
  const b = new Builder();
  site(b);
  planting(b);
  groundFloor(b);
  upperFloor(b);
  roof(b);
  const { groups, mats } = b.build(createMaterialFactory());
  return { groups, mats };
}

/** Sheet position to world position. */
export function at(px, py, y = 0) {
  return new THREE.Vector3(X(px), y, Z(py));
}

export { PX_PER_M };
