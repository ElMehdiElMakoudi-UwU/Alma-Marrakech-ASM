// Building blocks for the villa. Footprints are written in pixels of the
// 1800 px plan sheets (public/img/plan-t1-*-1800.webp), so any wall can be
// checked against the drawing. Heights are in metres.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const PX_PER_M = 56.45;
const ORIGIN_X = 826.5; // Centre of the upper floor on the sheet
const ORIGIN_Z = 392.5;

export const X = (px) => (px - ORIGIN_X) / PX_PER_M;
export const Z = (py) => (py - ORIGIN_Z) / PX_PER_M;

// UVs in metres, so textures keep their real scale on any face.
function worldUVs(geo) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, pos.getX(i), pos.getZ(i));
    else if (nx >= nz) uv.setXY(i, pos.getZ(i), pos.getY(i));
    else uv.setXY(i, pos.getX(i), pos.getY(i));
  }
  return geo;
}

export class Builder {
  constructor() {
    this.buckets = new Map(); // "layer|material" -> geometries
  }

  add(layer, mat, geo) {
    const key = `${layer}|${mat}`;
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(geo.index ? geo.toNonIndexed() : geo);
  }

  /** Box from a sheet footprint [x0, y0, x1, y1], between two heights. */
  box(layer, mat, [x0, y0, x1, y1], yb, yt) {
    const w = Math.abs(x1 - x0) / PX_PER_M;
    const d = Math.abs(y1 - y0) / PX_PER_M;
    const g = new THREE.BoxGeometry(w, yt - yb, d);
    g.translate(X((x0 + x1) / 2), (yb + yt) / 2, Z((y0 + y1) / 2));
    this.add(layer, mat, worldUVs(g));
  }

  /** Straight wall between two sheet points, for the angled walls. */
  diagonal(layer, mat, [x0, y0], [x1, y1], thickness, yb, yt) {
    const dx = X(x1) - X(x0);
    const dz = Z(y1) - Z(y0);
    const g = new THREE.BoxGeometry(Math.hypot(dx, dz), yt - yb, thickness);
    g.rotateY(-Math.atan2(dz, dx));
    g.translate(X((x0 + x1) / 2), (yb + yt) / 2, Z((y0 + y1) / 2));
    this.add(layer, mat, worldUVs(g));
  }

  cylinder(layer, mat, [px, py], radiusPx, yb, yt, sides = 20, radiusTopPx = radiusPx) {
    const g = new THREE.CylinderGeometry(radiusTopPx / PX_PER_M, radiusPx / PX_PER_M, yt - yb, sides);
    g.translate(X(px), (yb + yt) / 2, Z(py));
    this.add(layer, mat, g);
  }

  /**
   * Wall with openings. Each opening is { a, b, sill, head, n }: start and end
   * along the wall in sheet pixels, sill and head above the floor in metres,
   * and the number of glass panels.
   */
  wall(layer, mat, rect, { yb, yt, floor = yb, ops = [] }) {
    const [x0, y0, x1, y1] = rect;
    const alongX = x1 - x0 >= y1 - y0;
    const start = alongX ? x0 : y0;
    const end = alongX ? x1 : y1;
    const piece = (a, b) => (alongX ? [a, y0, b, y1] : [x0, a, x1, b]);

    let cursor = start;
    for (const op of [...ops].sort((p, q) => p.a - q.a)) {
      if (op.a > cursor) this.box(layer, mat, piece(cursor, op.a), yb, yt);
      const sill = floor + (op.sill ?? 0);
      const head = floor + (op.head ?? 2.35);
      if (sill > yb) this.box(layer, mat, piece(op.a, op.b), yb, sill);
      if (head < yt) this.box(layer, mat, piece(op.a, op.b), head, yt);
      this.glazing(layer, rect, alongX, op.a, op.b, sill, head, op.n ?? 2);
      cursor = op.b;
    }
    if (cursor < end) this.box(layer, mat, piece(cursor, end), yb, yt);
  }

  glazing(layer, [x0, y0, x1, y1], alongX, a, b, sill, head, panels) {
    const bar = 2.6; // About 45 mm
    const piece = (p, q) => (alongX ? [p, y0, q, y1] : [x0, p, x1, q]);
    const mid = alongX ? (y0 + y1) / 2 : (x0 + x1) / 2;
    const pane = alongX ? [a, mid - 0.5, b, mid + 0.5] : [mid - 0.5, a, mid + 0.5, b];

    this.box(layer, 'glass', pane, sill, head);
    this.box(layer, 'dark', piece(a, b), head - 0.05, head);
    this.box(layer, 'dark', piece(a, b), sill, sill + 0.05);
    const step = (b - a) / panels;
    for (let i = 0; i <= panels; i++) {
      const c = Math.min(b - bar / 2, Math.max(a + bar / 2, a + step * i));
      this.box(layer, 'dark', piece(c - bar / 2, c + bar / 2), sill, head);
    }
  }

  /** One mesh per layer and material, which keeps draw calls low. */
  build(materialsForLayer) {
    const groups = {};
    const mats = {};
    for (const [key, geos] of this.buckets) {
      const [layer, name] = key.split('|');
      if (!groups[layer]) {
        groups[layer] = new THREE.Group();
        groups[layer].name = layer;
        mats[layer] = materialsForLayer(layer);
      }
      const merged = mergeGeometries(geos);
      geos.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, mats[layer][name]);
      mesh.name = `${layer}-${name}`;
      mesh.castShadow = name !== 'glass' && name !== 'water';
      mesh.receiveShadow = name !== 'glass' && name !== 'leaf';
      groups[layer].add(mesh);
    }
    return { groups, mats };
  }
}
