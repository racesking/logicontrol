import * as THREE from 'three';
import { grainTexture, jacketTexture, rng } from './textures.js';
import { GLAND } from './cabinet.js';
import { TRAY, WALL_Z } from './wall.js';

const CP = 9; // control points per cable
const SEG = 300; // samples along a cable
const RAD = 14; // sides of the tube
const TAU = Math.PI * 2;

const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// Real installation colours. Amber stays reserved for light and status.
const JACKETS = [
  { key: 'black', color: '#23252A', print: 'CYY-F 5×2,5 mm²  0,6/1 kV  ', ink: '#C9C6BE', radius: 0.021 },
  { key: 'grey', color: '#7C8084', print: 'CYY-F 3×1,5 mm²  300/500 V  ', ink: '#1B1C1E', radius: 0.0175 },
  { key: 'blue', color: '#2A6CC8', radius: 0.0125 },
  { key: 'brown', color: '#8A5230', radius: 0.0125 },
  { key: 'earth', color: '#27984A', stripe: '#D9B51C', radius: 0.0125 },
  { key: 'lightgrey', color: '#A3A5A2', print: 'LiYCY 4×0,75 mm²  ', ink: '#26282A', radius: 0.0145 },
];

const ORDER = ['black', 'grey', 'brown', 'blue', 'earth', 'black', 'lightgrey', 'grey', 'brown', 'blue', 'black', 'earth', 'grey', 'lightgrey', 'brown', 'blue'];

class Tube {
  constructor(radius, material) {
    this.radius = radius;
    const verts = (SEG + 1) * (RAD + 1);
    this.pos = new Float32Array(verts * 3);
    this.nor = new Float32Array(verts * 3);
    this.uv = new Float32Array(verts * 2);
    const idx = new Uint32Array(SEG * RAD * 6);
    let k = 0;
    for (let i = 0; i < SEG; i++) {
      for (let j = 0; j < RAD; j++) {
        const a = i * (RAD + 1) + j;
        const b = a + RAD + 1;
        idx[k++] = a; idx[k++] = a + 1; idx[k++] = b;
        idx[k++] = b; idx[k++] = a + 1; idx[k++] = b + 1;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  /** pts holds SEG+1 centres. The texture is measured from the cabinet end, so it feeds in. */
  build(pts) {
    const { pos, nor, uv, radius } = this;
    let tx, ty, tz;
    let nx = 0.31, ny = 0.87, nz = 0.38; // transported frame seed
    let along = 0;
    const lengths = this._lengths || (this._lengths = new Float32Array(SEG + 1));
    lengths[SEG] = 0;
    for (let i = SEG - 1; i >= 0; i--) {
      const p = i * 3;
      along += Math.hypot(pts[p + 3] - pts[p], pts[p + 4] - pts[p + 1], pts[p + 5] - pts[p + 2]);
      lengths[i] = along;
    }
    for (let i = 0; i <= SEG; i++) {
      const a = Math.max(0, i - 1) * 3;
      const b = Math.min(SEG, i + 1) * 3;
      tx = pts[b] - pts[a]; ty = pts[b + 1] - pts[a + 1]; tz = pts[b + 2] - pts[a + 2];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      const dot = nx * tx + ny * ty + nz * tz;
      nx -= dot * tx; ny -= dot * ty; nz -= dot * tz;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      const bx = ty * nz - tz * ny;
      const by = tz * nx - tx * nz;
      const bz = tx * ny - ty * nx;
      const cx = pts[i * 3], cy = pts[i * 3 + 1], cz = pts[i * 3 + 2];
      const u = lengths[i] / 0.62;
      for (let j = 0; j <= RAD; j++) {
        const ang = (j / RAD) * TAU;
        const c = Math.cos(ang), s = Math.sin(ang);
        const ox = nx * c + bx * s, oy = ny * c + by * s, oz = nz * c + bz * s;
        const v = (i * (RAD + 1) + j);
        pos[v * 3] = cx + ox * radius;
        pos[v * 3 + 1] = cy + oy * radius;
        pos[v * 3 + 2] = cz + oz * radius;
        nor[v * 3] = ox; nor[v * 3 + 1] = oy; nor[v * 3 + 2] = oz;
        uv[v * 2] = u;
        uv[v * 2 + 1] = j / RAD;
      }
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.uv.needsUpdate = true;
  }
}

/** Two passes of a moving average. Ends stay put; tight folds open up to a bend radius. */
function relax(pts, tmp) {
  const half = 6;
  for (let pass = 0; pass < 2; pass++) {
    tmp.set(pts);
    for (let i = half; i <= SEG - half; i++) {
      for (let a = 0; a < 3; a++) {
        let sum = 0;
        for (let k = -half; k <= half; k++) sum += tmp[(i + k) * 3 + a];
        pts[i * 3 + a] = sum / (half * 2 + 1);
      }
    }
  }
}

export class CableField {
  constructor() {
    this.group = new THREE.Group();
    const bump = grainTexture({ size: 256, seed: 11, spread: 46, blobs: 60 });
    bump.repeat.set(6, 1);
    const mats = {};
    for (const j of JACKETS) {
      const map = jacketTexture({ color: j.color, stripe: j.stripe, print: j.print, ink: j.ink, seed: j.key.length * 7 });
      mats[j.key] = new THREE.MeshPhysicalMaterial({
        map,
        bumpMap: bump,
        bumpScale: 0.4,
        roughness: 0.44,
        metalness: 0,
        sheen: 0.3,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color('#8d8f92'),
        clearcoat: 0.22,
        clearcoatRoughness: 0.42,
      });
    }

    this.materials = Object.values(mats);

    const r = rng(20261106);
    this.cables = ORDER.map((key, i) => {
      const spec = JACKETS.find((j) => j.key === key);
      const tube = new Tube(spec.radius, mats[key]);
      this.group.add(tube.mesh);

      return {
        tube,
        sortDelay: r(),
        ph1: r() * TAU,
        ph3: r() * TAU,
        f1: 0.55 + r() * 0.5,
        pts: new Float32Array((SEG + 1) * 3),
        cps: new Float32Array(CP * 3),
      };
    });

    const r2 = rng(61106);

    // Tidy layout. Each side packs its cables in one layer across the tray, then each
    // cable leaves the tray's end and drops free to its own place in the gland.
    this.cables.forEach((c, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      c.gland = [(col - 1.5) * 0.05, (row - 1.5) * 0.05];
      c.side = col < 2 ? -1 : 1;
      c.tier = (col === 1 || col === 2 ? 1 : 0) * 4 + row; // inner columns ride higher
    });
    for (const side of [-1, 1]) {
      const group = this.cables.filter((c) => c.side === side).sort((a, b) => a.tier - b.tier);
      const total = group.reduce((n, c) => n + c.tube.radius * 2, 0);
      // Packed along the lower flange, leaving the punched plate visible above.
      const gap = 0.0035;
      let y = TRAY.y - TRAY.width / 2 + 0.012;
      void total;
      for (const c of group) {
        const r = c.tube.radius;
        const cy = y + r;
        y += r * 2 + gap;
        const cz = TRAY.z + 0.003 + r;
        const end = side < 0 ? TRAY.left : TRAY.right;
        const gx = GLAND.x + c.gland[0];
        const gz = GLAND.z + c.gland[1];
        c.route = [
          [end + side * 9, cy, cz],
          [end + side * 4, cy, cz],
          [end + side * 1.4, cy, cz],
          [end + side * 0.02, cy, cz],
          [gx + side * 0.13, cy, gz],
        ];
        c.bendY = cy - 0.13;

        // Loose state: the same route, slackened. A cable stays on its own side from
        // start to finish, so it can drape and tighten but never fold back or cross.
        const sag = 0.3 + r2() * 1.45;
        const spread = 0.3 + r2() * 1.75;
        const lift = (r2() - 0.5) * 0.5;
        // Laid out so x only ever moves toward the middle: wide, soft corners, no hooks.
        const corner = gx + side * spread;
        const at = (reach, routeX) => corner + side * reach - routeX;
        c.loose = [
          [0, lift * 1.6, 0.05],
          [0, lift - sag * 0.3, 0.07],
          [at(1.75, end + side * 1.4), -sag * 0.72, 0.1],
          [at(1.05, end + side * 0.02), -sag * 0.94, 0.12],
          [at(0.5, gx + side * 0.13), -sag * 1.0, 0.14],
          [side * spread, -sag - 0.5, 0.14],
          [side * spread * 0.96, -sag - 1.1, 0.12],
          [side * spread * 0.9, -sag - 1.1, 0.11],
          [side * spread * 0.86, -sag - 1.1, 0.1],
        ];
        // The deepest few are already there, faint, in the dark band under the photograph.
        c.startShift = sag > 1.15 && c.tier % 2 === 0 ? 0 : 6;
        c.entry = c.startShift ? 0.08 + r2() * 0.4 : 0;
      }
    }

    this.scratch = new Float32Array((SEG + 1) * 3);

    // Hermite weights never change, so work them out once. Tangents are chord-length
    // scaled each frame, which is what stops short segments looping over themselves.
    this.seg = new Int16Array(SEG + 1);
    this.w = new Float32Array((SEG + 1) * 4);
    for (let i = 0; i <= SEG; i++) {
      const s = (i / SEG) * (CP - 1);
      const k = Math.min(CP - 2, Math.floor(s));
      const t = s - k;
      const t2 = t * t, t3 = t2 * t;
      this.seg[i] = k;
      this.w[i * 4] = 2 * t3 - 3 * t2 + 1;
      this.w[i * 4 + 1] = t3 - 2 * t2 + t;
      this.w[i * 4 + 2] = -2 * t3 + 3 * t2;
      this.w[i * 4 + 3] = t3 - t2;
    }
    this.chord = new Float32Array(CP);
    this.tan = new Float32Array(CP * 3);
  }

  /**
   * view: { target, right, up, back, halfW, halfH } for the current camera.
   * s: { enter, order, flow, roof: Vector3, finalRoof: Vector3 }. The camera only sets the snake's axes.
   */
  update(view, s) {
    const { right, up, back } = view;
    const gx = s.roof.x, gy = s.roof.y, gz = s.roof.z;

    for (const c of this.cables) {
      const a = sm(c.entry, c.entry + 0.5, s.enter);
      const o = sm(c.sortDelay * 0.22, 0.78 + c.sortDelay * 0.22, s.order);
      const cps = c.cps;

      // Each cable sweeps in sideways from its own side, one after another.
      const shift = (1 - a) * (1 - o) * c.side * c.startShift;

      const loomX = s.finalRoof.x + c.gland[0];
      const loomZ = s.finalRoof.z + c.gland[1];
      const loomY = c.bendY;

      for (let k = 0; k < CP; k++) {
        // The tidy route: along the tray, off its end, and down into the gland.
        let ox, oy, oz;
        if (k <= 4) {
          [ox, oy, oz] = c.route[k];
        } else {
          const v = (k - 5) / (CP - 6);
          ox = mix(loomX, gx + c.gland[0], v);
          oy = mix(loomY, gy - 0.03, v);
          oz = mix(loomZ, gz + c.gland[1], v);
        }
        const slack = c.loose[k];
        const free = k >= 4 ? 1 - sm(0, 0.72, o) : 1 - o;
        cps[k * 3] = ox + slack[0] * free + shift;
        cps[k * 3 + 1] = oy + slack[1] * free;
        cps[k * 3 + 2] = oz + slack[2] * free;
      }

      // Tangents from neighbouring points, weighted by real distance.
      const { chord, tan } = this;
      for (let k = 0; k < CP - 1; k++) {
        chord[k] = Math.hypot(cps[k * 3 + 3] - cps[k * 3], cps[k * 3 + 4] - cps[k * 3 + 1], cps[k * 3 + 5] - cps[k * 3 + 2]) || 1e-4;
      }
      for (let k = 0; k < CP; k++) {
        const a0 = Math.max(0, k - 1), a1 = Math.min(CP - 1, k + 1);
        const span = (k > 0 ? chord[k - 1] : 0) + (k < CP - 1 ? chord[k] : 0);
        for (let d = 0; d < 3; d++) tan[k * 3 + d] = (cps[a1 * 3 + d] - cps[a0 * 3 + d]) / span;
      }

      // Sample the spline, then let the cable snake with the scroll.
      const pts = c.pts;
      const amp = mix(0.1, 0, o);
      const flow = s.flow;
      for (let i = 0; i <= SEG; i++) {
        const k = this.seg[i];
        const i1 = k * 3, i2 = (k + 1) * 3, len = chord[k];
        const w0 = this.w[i * 4], w1 = this.w[i * 4 + 1] * len, w2 = this.w[i * 4 + 2], w3 = this.w[i * 4 + 3] * len;
        const q = i / SEG;
        const pin = 1 - sm(0.6, 0.86, q) * o; // held still where it enters the cabinet
        const s1 = Math.sin(q * TAU * c.f1 + c.ph1 + flow * 1.1);
        const s3 = Math.sin(q * TAU * c.f1 * 0.8 + c.ph3 - flow * 0.8);
        const dr = s1 * amp * pin;
        const du = s3 * amp * 0.7 * pin;
        const db = 0;
        pts[i * 3] = w0 * cps[i1] + w1 * tan[i1] + w2 * cps[i2] + w3 * tan[i2] + right.x * dr + up.x * du + back.x * db;
        pts[i * 3 + 1] = w0 * cps[i1 + 1] + w1 * tan[i1 + 1] + w2 * cps[i2 + 1] + w3 * tan[i2 + 1] + right.y * dr + up.y * du + back.y * db;
        pts[i * 3 + 2] = w0 * cps[i1 + 2] + w1 * tan[i1 + 2] + w2 * cps[i2 + 2] + w3 * tan[i2 + 2] + right.z * dr + up.z * du + back.z * db;
      }
      // Anything loose rests against the wall, and rides over the tray rather than through it.
      const r = c.tube.radius;
      for (let i = 0; i <= SEG; i++) {
        const x = pts[i * 3], y = pts[i * 3 + 1];
        const overTray = (x < TRAY.left || x > TRAY.right) && Math.abs(y - TRAY.y) < TRAY.width / 2 + 0.05;
        const limit = (overTray && o < 0.98 ? TRAY.z + TRAY.flange + 0.012 : WALL_Z + 0.012) + r;
        if (pts[i * 3 + 2] < limit) pts[i * 3 + 2] = limit;
      }
      relax(pts, this.scratch);
      c.tube.build(pts);
    }
  }
}
