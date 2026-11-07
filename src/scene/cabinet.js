import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { contactTexture, faceTexture, grainTexture, liveCanvas, rng, spangleTexture } from './textures.js';

// Metres, true to scale. Origin: floor, centre of the enclosure. +z faces the viewer.
export const W = 1.6;
export const H = 2.0;
export const D = 0.42;
export const PLINTH = 0.1;
export const ROOF_Y = H + PLINTH;
export const GLAND = new THREE.Vector3(0.3, ROOF_Y, 0.02);

const LEFT = -W / 2;
const RIGHT = W / 2;
const SPLIT = -0.2; // between the closed bay and the open bay
const PLATE_Z = -D / 2 + 0.05;

/** Collects parts by material and merges them, so the whole cabinet is a handful of draw calls. */
export class Batch {
  constructor() {
    this.parts = new Map();
    this.m = new THREE.Matrix4();
  }

  add(geo, material, x = 0, y = 0, z = 0, rot = null) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    this.m.identity();
    if (rot) this.m.makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    this.m.setPosition(x, y, z);
    g.applyMatrix4(this.m);
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(g);
  }

  box(w, h, d, material, x, y, z, radius = 0) {
    const geo = radius > 0
      ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, Math.min(w, h, d) * 0.49))
      : new THREE.BoxGeometry(w, h, d);
    this.add(geo, material, x, y, z);
  }

  /** A box whose texture repeats by its real size. */
  tiled(w, h, d, material, x, y, z, perMetre) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
      const a = nx > 0.5 ? pos.getZ(i) : pos.getX(i);
      const b = ny > 0.5 ? pos.getZ(i) : pos.getY(i);
      uv.setXY(i, a * perMetre, b * perMetre);
    }
    this.add(geo, material, x, y, z);
  }

  face(w, h, material, x, y, z) {
    this.add(new THREE.PlaneGeometry(w, h), material, x, y, z);
  }

  cyl(r, len, material, x, y, z, axis = 'z', seg = 20) {
    const rot = axis === 'z' ? [Math.PI / 2, 0, 0] : axis === 'x' ? [0, 0, Math.PI / 2] : null;
    this.add(new THREE.CylinderGeometry(r, r, len, seg), material, x, y, z, rot);
  }

  tube(points, radius, material, seg = 14, sides = 5) {
    const curve = new THREE.CatmullRomCurve3(points);
    this.add(new THREE.TubeGeometry(curve, seg, radius, sides, false), material);
  }

  commit(group, { cast = true, receive = true } = {}) {
    for (const [material, list] of this.parts) {
      for (const g of list) {
        for (const name of Object.keys(g.attributes)) {
          if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
        }
      }
      const mesh = new THREE.Mesh(mergeGeometries(list, false), material);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      group.add(mesh);
      list.forEach((g) => g.dispose());
    }
    this.parts.clear();
  }
}

function materials() {
  const peel = grainTexture({ size: 256, seed: 21, spread: 30, blobs: 340 });
  peel.repeat.set(5, 5);
  const moulded = grainTexture({ size: 128, seed: 22, spread: 26 });
  moulded.repeat.set(30, 30);
  const spangle = spangleTexture();
  spangle.repeat.set(1.4, 2.6);

  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    // RAL 7016 anthracite powder coat.
    shell: std({ color: '#4a5259', roughness: 0.42, metalness: 0.32, bumpMap: peel, bumpScale: 0.3 }),
    shellInner: std({ color: '#8f9396', roughness: 0.56, metalness: 0.1, bumpMap: peel, bumpScale: 0.2 }),
    plinth: std({ color: '#17191b', roughness: 0.7, metalness: 0.3 }),
    plate: std({ map: spangle, roughness: 0.42, metalness: 0.78 }),
    steel: std({ color: '#a7abae', roughness: 0.36, metalness: 0.95 }),
    darkSteel: std({ color: '#31353a', roughness: 0.4, metalness: 0.85 }),
    copper: std({ color: '#b5713a', roughness: 0.32, metalness: 1 }),
    gasket: std({ color: '#0d0e0f', roughness: 0.82 }),
    ductBody: std({ color: '#5d6266', roughness: 0.62, bumpMap: moulded, bumpScale: 0.1 }),
    ductLid: std({ color: '#6c7176', roughness: 0.55, bumpMap: moulded, bumpScale: 0.1 }),
    white: std({ color: '#dfe0dd', roughness: 0.5, bumpMap: moulded, bumpScale: 0.08 }),
    lightGrey: std({ color: '#b4b7b6', roughness: 0.52, bumpMap: moulded, bumpScale: 0.08 }),
    midGrey: std({ color: '#5f6468', roughness: 0.5, bumpMap: moulded, bumpScale: 0.08 }),
    anthracite: std({ color: '#26292d', roughness: 0.46, bumpMap: moulded, bumpScale: 0.08 }),
    black: std({ color: '#111214', roughness: 0.42 }),
    termGrey: std({ color: '#9ca0a1', roughness: 0.5 }),
    termBlue: std({ color: '#2a6fb4', roughness: 0.5 }),
    termEarth: std({ color: '#3a9a50', roughness: 0.5 }),
    wireBlue: std({ color: '#1c4f96', roughness: 0.5 }),
    wireBrown: std({ color: '#5a3722', roughness: 0.5 }),
    wireBlack: std({ color: '#141517', roughness: 0.48 }),
    wireGrey: std({ color: '#777b7e', roughness: 0.5 }),
    wireDc: std({ color: '#8fb4d8', roughness: 0.5 }),
    wireEarth: std({ color: '#2e8b44', roughness: 0.5 }),
    patchBlue: std({ color: '#1f7fc4', roughness: 0.45 }),
    patchYellow: std({ color: '#d7a22a', roughness: 0.45 }),
    red: std({ color: '#b1231c', roughness: 0.35 }),
    yellow: std({ color: '#e0b020', roughness: 0.4 }),
    bluePush: std({ color: '#1d4f96', roughness: 0.35 }),
  };
}

// Drawn device faces. Generic marks only: no real manufacturer names.
function drawFaces() {
  const std = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.5, ...o });
  const ink = '#1a1b1d';
  const mono = (g, size, weight = 500) => { g.font = `${weight} ${size}px "Geist Mono", monospace`; };

  const mcb = (rating) => std(faceTexture(18, 85, (g, w, h) => {
    g.fillStyle = '#e3e4e1'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c6c8c6'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    g.fillStyle = '#34373b'; g.fillRect(2.5, 1.5, 13, 6); g.fillRect(2.5, h - 7.5, 13, 6);
    g.fillStyle = ink; mono(g, 4.6); g.textAlign = 'center';
    g.fillText(rating, w / 2, 62);
    mono(g, 2.4); g.fillText('6000', w / 2, 67); g.fillText('230/400V', w / 2, 70.5);
    g.fillStyle = '#b6201b'; g.fillRect(w / 2 - 2.5, 26, 5, 2.4);
  }, 14));

  const plcCpu = std(faceTexture(120, 135, (g, w, h) => {
    g.fillStyle = '#2b2f33'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3f44'; g.fillRect(0, 0, w, 16); g.fillRect(0, h - 14, w, 14);
    g.fillStyle = '#0e1012'; g.fillRect(8, 22, 62, 40);
    g.fillStyle = '#7fd4a8'; mono(g, 4.4); g.fillText('RUN   01:42', 12, 32);
    g.fillStyle = '#6ea8c8'; g.fillText('AI 24  AO 12', 12, 40); g.fillText('DI 48  DO 32', 12, 47);
    g.fillStyle = '#a8adb2'; mono(g, 4); g.fillText('CPU 1215', 8, 73);
    g.fillStyle = '#16181a';
    g.fillRect(78, 24, 16, 13); g.fillRect(98, 24, 16, 13); g.fillRect(78, 46, 36, 8);
    g.fillStyle = '#8a8f94'; mono(g, 3); g.fillText('X1', 80, 42); g.fillText('X2', 100, 42);
    g.fillStyle = '#42474c';
    for (let i = 0; i < 4; i++) g.fillRect(8 + i * 27, 86, 22, 30);
  }));

  const ioModule = (kind) => std(faceTexture(35, 135, (g, w, h) => {
    g.fillStyle = '#2b2f33'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3f44'; g.fillRect(0, 0, w, 14);
    g.fillStyle = '#c9ccce'; mono(g, 3.6); g.fillText(kind, 4, 9);
    g.fillStyle = '#141618'; g.fillRect(4, 19, 27, 40);
    g.fillStyle = '#4b5056';
    for (let i = 0; i < 8; i++) { g.fillRect(6, 63 + i * 8, 23, 6); }
    g.fillStyle = '#797e83'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(17.5, 66 + i * 8, 1.6, 0, 7); g.fill(); }
  }));

  const psu = std(faceTexture(90, 125, (g, w, h) => {
    g.fillStyle = '#9ea2a5'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7f8387'; g.lineWidth = 0.4;
    for (let y = 8; y < 34; y += 3.4) { g.beginPath(); g.moveTo(6, y); g.lineTo(w - 6, y); g.stroke(); }
    g.fillStyle = '#1c1e20'; mono(g, 5.4, 600); g.fillText('24 V DC', 8, 48);
    mono(g, 3.6); g.fillText('20 A  480 W', 8, 55);
    g.fillStyle = '#2b2d30'; g.fillRect(8, 64, w - 16, 16); g.fillRect(8, 98, w - 16, 16);
    g.fillStyle = '#b8bcbf'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(15 + i * 12.5, 72, 2.4, 0, 7); g.arc(15 + i * 12.5, 106, 2.4, 0, 7); g.fill(); }
  }));

  const vfd = std(faceTexture(130, 260, (g, w, h) => {
    g.fillStyle = '#2a2d31'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8dad8'; g.fillRect(0, 0, w, 74);
    g.fillStyle = '#0f1214'; g.fillRect(16, 12, 62, 34);
    g.fillStyle = '#5fd0ff'; mono(g, 7, 600); g.fillText('38.5 Hz', 21, 28);
    g.fillStyle = '#8ab8d0'; mono(g, 4); g.fillText('6.2 A  3.1 kW', 21, 38);
    g.fillStyle = '#5a5e62';
    [[92, 14], [108, 14], [92, 30], [108, 30]].forEach(([x, y]) => g.fillRect(x, y, 13, 12));
    g.fillStyle = '#3e4246';
    for (let y = 92; y < 220; y += 5.5) g.fillRect(14, y, w - 28, 3);
    g.fillStyle = '#1a1c1e'; g.fillRect(14, 228, w - 28, 22);
    g.fillStyle = '#c8ccce'; mono(g, 3.8); g.fillText('VFD 7,5 kW  3~400V', 16, 84);
  }));

  const contactor = std(faceTexture(45, 85, (g, w, h) => {
    g.fillStyle = '#d6d7d4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3d41'; g.fillRect(4, 3, w - 8, 12); g.fillRect(4, h - 15, w - 8, 12);
    g.fillStyle = '#b4b6b5'; g.fillRect(8, 26, w - 16, 28);
    g.fillStyle = '#1f2123'; mono(g, 3.6); g.fillText('K1  AC-3', 11, 37); g.fillText('18,5 kW', 11, 44);
    g.fillStyle = '#6d7276'; g.fillRect(14, 58, w - 28, 7);
  }));

  const meter = std(faceTexture(72, 90, (g, w, h) => {
    g.fillStyle = '#dcddda'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16211a'; g.fillRect(8, 18, w - 16, 34);
    g.fillStyle = '#9fe0a6'; mono(g, 7.4, 600); g.fillText('231.4 V', 11, 31);
    mono(g, 5); g.fillText('12.6 A', 11, 39); g.fillText('2.91 kW', 11, 46);
    g.fillStyle = '#44484c'; for (let i = 0; i < 4; i++) g.fillRect(9 + i * 14, 60, 10, 7);
  }));

  const spd = std(faceTexture(72, 90, (g, w, h) => {
    g.fillStyle = '#d9dad7'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#2e3134'; g.fillRect(i * 18 + 2, 6, 14, 78);
      g.fillStyle = '#3ca35a'; g.fillRect(i * 18 + 5, 22, 8, 12);
      g.fillStyle = '#c8cbcd'; mono(g, 3); g.fillText(['L1', 'L2', 'L3', 'N'][i], i * 18 + 5, 48);
    }
  }));

  const net = std(faceTexture(50, 120, (g, w, h) => {
    g.fillStyle = '#2b2f33'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9ccce'; mono(g, 3.4); g.fillText('ETH SW', 6, 11);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = '#131517'; g.fillRect(10, 18 + i * 19, 28, 15);
      g.fillStyle = '#a58a2e'; g.fillRect(13, 19 + i * 19, 22, 1.4);
    }
  }));

  const relay = std(faceTexture(16, 80, (g, w, h) => {
    g.fillStyle = '#2f3236'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(190,200,210,.55)'; g.fillRect(2, 18, w - 4, 34);
    g.fillStyle = '#b8853a'; g.fillRect(4, 26, w - 8, 12);
    g.fillStyle = '#c9ccce'; mono(g, 2.6); g.fillText('24V', 3, 60);
  }));

  const mainSwitch = std(faceTexture(100, 160, (g, w, h) => {
    g.fillStyle = '#25282b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d3b43a'; g.fillRect(14, 30, w - 28, w - 28);
    g.fillStyle = '#16181a'; mono(g, 6, 600); g.fillText('0', 26, 50); g.fillText('I', w - 32, 50);
    g.fillStyle = '#c9ccce'; mono(g, 4); g.fillText('Q0  125 A', 14, 22);
  }));

  const labelPlate = (text) => std(faceTexture(44, 9, (g, w, h) => {
    g.fillStyle = '#17191b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e6e3dc'; mono(g, 4.2); g.textAlign = 'center'; g.fillText(text, w / 2, 6);
  }, 16), { roughness: 0.4 });

  const nameplate = std(faceTexture(180, 46, (g, w, h) => {
    g.fillStyle = '#c9ccce'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#17191b';
    g.font = '600 15px "Geist", sans-serif'; g.fillText('Logicontrol', 8, 20);
    mono(g, 6); g.fillText('TA-01  Tablou automatizare', 8, 32);
    mono(g, 4.8); g.fillText('400 V 3~ 50 Hz · IP54 · 125 A', 8, 40);
  }, 12), { metalness: 0.7, roughness: 0.34 });

  const schematic = std(faceTexture(210, 297, (g, w, h) => {
    g.fillStyle = '#efece3'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#30343a'; g.lineWidth = 0.5;
    g.strokeRect(6, 6, w - 12, h - 12);
    const r = rng(7);
    for (let i = 0; i < 26; i++) {
      const y = 22 + i * 9.4;
      g.beginPath(); g.moveTo(12, y);
      let x = 12;
      while (x < w - 18) {
        const step = 14 + r() * 30;
        x += step;
        g.lineTo(x, y);
        if (r() > 0.55) { g.strokeRect(x, y - 2.4, 8, 4.8); x += 8; g.moveTo(x, y); }
      }
      g.stroke();
    }
    g.fillStyle = '#30343a'; mono(g, 6); g.fillText('Schemă TA-01 · foaia 7/32', 12, h - 12);
  }, 6), { roughness: 0.85 });

  return { mcb, plcCpu, ioModule, psu, vfd, contactor, meter, spd, net, relay, mainSwitch, labelPlate, nameplate, schematic };
}

/** Lengthwise comb slots of wire duct, for the duct sides. */
function ductSideMaterial() {
  const tex = faceTexture(40, 40, (g, w, h) => {
    g.fillStyle = '#5d6266'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#121416';
    for (let x = 2; x < w; x += 8) g.fillRect(x, 0, 4.4, h);
  }, 8);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62 });
}

export class Cabinet {
  constructor() {
    this.group = new THREE.Group();
    this.door = new THREE.Group();
    this.leds = [];
    this.outputs = [];
    this.contactors = [];
    this.mats = materials();
    this.faces = drawFaces();
    this.ductSide = ductSideMaterial();
    this.r = rng(7016);
    this.buildShell();
    this.buildOpenBay();
    this.buildClosedDoor();
    this.buildOpenDoor();
    this.buildFloor();
    this.buildLights();
    this.buildLeds();
    this.power = -1;
    this.setPower(0);
  }

  buildShell() {
    const b = new Batch();
    const m = this.mats;
    const t = 0.018;
    const top = ROOF_Y;
    const midY = PLINTH + H / 2;
    // Plinth
    b.box(W, PLINTH, D, m.plinth, 0, PLINTH / 2, 0, 0.004);
    // Back, sides, roof, base
    b.box(W, H, t, m.shell, 0, midY, -D / 2 + t / 2);
    b.box(t, H, D, m.shell, LEFT + t / 2, midY, 0, 0.003);
    b.box(t, H, D, m.shell, RIGHT - t / 2, midY, 0, 0.003);
    b.box(W + 0.006, t, D + 0.006, m.shell, 0, top - t / 2, 0, 0.004);
    b.box(W, t, D, m.shell, 0, PLINTH + t / 2, 0);
    // Light interior of the open bay, as real enclosures have
    b.box(RIGHT - SPLIT - 2 * t, H - 2 * t, 0.004, m.shellInner, (RIGHT + SPLIT) / 2, midY, -D / 2 + t + 0.003);
    b.box(0.004, H - 2 * t, D - 0.03, m.shellInner, RIGHT - t - 0.003, midY, 0.0);
    // Frame around the opening
    b.box(0.05, H, 0.03, m.shell, SPLIT, midY, D / 2 - 0.015, 0.003);
    b.box(0.03, H, D - 0.03, m.shell, SPLIT, midY, 0, 0.003);
    b.box(RIGHT - SPLIT, 0.05, 0.03, m.shell, (RIGHT + SPLIT) / 2, top - 0.04, D / 2 - 0.015, 0.003);
    b.box(RIGHT - SPLIT, 0.05, 0.03, m.shell, (RIGHT + SPLIT) / 2, PLINTH + 0.04, D / 2 - 0.015, 0.003);
    b.box(0.03, H, 0.03, m.shell, RIGHT - 0.015, midY, D / 2 - 0.015, 0.003);
    // Gland plate and grommet on the roof, where the cables come in
    b.box(0.34, 0.006, 0.3, m.steel, GLAND.x, top + 0.003, GLAND.z, 0.002);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      b.cyl(0.006, 0.006, m.darkSteel, GLAND.x + sx * 0.155, top + 0.008, GLAND.z + sz * 0.135, 'y', 10);
    }
    b.box(0.24, 0.016, 0.24, m.gasket, GLAND.x, top + 0.012, GLAND.z, 0.005);
    // Lifting eyes
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      b.add(new THREE.TorusGeometry(0.024, 0.0065, 8, 18), m.steel, sx * (W / 2 - 0.05), top + 0.022, sz * (D / 2 - 0.05), [0, Math.PI / 4, 0]);
    }
    b.commit(this.group);
  }

  rail(b, x0, x1, y) {
    b.box(x1 - x0, 0.035, 0.0075, this.mats.steel, (x0 + x1) / 2, y, PLATE_Z + 0.012);
  }

  duct(b, x, y, w, h) {
    const depth = 0.06;
    const z = PLATE_Z + depth / 2 + 0.002;
    b.tiled(w, h, depth, this.ductSide, x, y, z, 25);
    b.box(w + 0.002, h + 0.002, 0.008, this.mats.ductLid, x, y, z + depth / 2 + 0.003, 0.0015);
  }

  /** Places a DIN device with a drawn face. y is the device centre. */
  device(b, x, y, w, h, d, body, face) {
    const z = PLATE_Z + 0.016 + d / 2;
    b.box(w, h, d, body, x, y, z, 0.0025);
    if (face) b.face(w - 0.0012, h - 0.0012, face, x, y, z + d / 2 + 0.0006);
    return z + d / 2;
  }

  wire(b, x0, y0, z0, x1, y1, material, radius = 0.0017) {
    const r = this.r;
    const zDuct = PLATE_Z + 0.04;
    const bow = 0.012 + r() * 0.018;
    b.tube([
      new THREE.Vector3(x0, y0, z0),
      new THREE.Vector3(x0 + (r() - 0.5) * 0.004, mixN(y0, y1, 0.4), z0 + bow),
      new THREE.Vector3(mixN(x0, x1, 0.8), mixN(y0, y1, 0.85), mixN(z0, zDuct, 0.6) + bow * 0.4),
      new THREE.Vector3(x1, y1, zDuct),
    ], radius, material, 10, 5);
  }

  led(x, y, z, color, mode = 'on', rate = 1) {
    this.leds.push({ x, y, z, color: new THREE.Color(color), mode, rate, phase: this.r() * 6.28 });
  }

  buildOpenBay() {
    const b = new Batch();
    const m = this.mats;
    const f = this.faces;
    const x0 = SPLIT + 0.03;
    const x1 = RIGHT - 0.03;
    const xc = (x0 + x1) / 2;
    const yTop = ROOF_Y - 0.08;
    const yBot = PLINTH + 0.1;

    // Mounting plate
    b.tiled(x1 - x0, yTop - yBot, 0.003, m.plate, xc, (yTop + yBot) / 2, PLATE_Z, 1);

    // Vertical ducts, then horizontal runs between the device rows
    const ductV = 0.06;
    this.duct(b, x0 + ductV / 2 + 0.008, (yTop + yBot) / 2, ductV, yTop - yBot - 0.02);
    this.duct(b, x1 - ductV / 2 - 0.008, (yTop + yBot) / 2, ductV, yTop - yBot - 0.02);
    const dx0 = x0 + ductV + 0.05;
    const dx1 = x1 - ductV - 0.012;
    const dxc = (dx0 + dx1) / 2;
    const dw = dx1 - dx0;
    const rows = [1.965, 1.655, 1.345, 0.985, 0.635, 0.285];
    rows.forEach((y) => this.duct(b, dxc, y, dw, 0.05));

    const colours = [m.wireBrown, m.wireBlack, m.wireGrey];
    const wireTo = (x, y, z, ductY, material) => this.wire(b, x, y, z, x + (this.r() - 0.5) * 0.012, ductY, material);

    // Row A: main switch, surge protection, meter, 24 V supply, copper bars
    let y = 1.81;
    this.rail(b, dx0, dx1, y);
    let x = dx0 + 0.06;
    let zf = this.device(b, x, y, 0.1, 0.16, 0.12, m.anthracite, f.mainSwitch);
    b.cyl(0.03, 0.03, m.red, x, y - 0.005, zf + 0.012, 'z', 24);
    b.box(0.014, 0.075, 0.018, m.red, x, y - 0.005, zf + 0.035, 0.004);
    for (let i = 0; i < 3; i++) {
      const wx = x - 0.03 + i * 0.03;
      b.tube([new THREE.Vector3(wx, y + 0.08, zf - 0.03), new THREE.Vector3(wx, y + 0.11, zf - 0.03), new THREE.Vector3(wx + 0.002, 1.965, PLATE_Z + 0.05)], 0.0052, m.wireBlack, 8, 6);
      b.tube([new THREE.Vector3(wx, y - 0.08, zf - 0.03), new THREE.Vector3(wx, y - 0.11, zf - 0.03), new THREE.Vector3(wx + 0.002, 1.655, PLATE_Z + 0.05)], 0.0042, m.wireBrown, 8, 6);
    }
    x += 0.115;
    zf = this.device(b, x, y, 0.072, 0.09, 0.07, m.white, f.spd);
    for (let i = 0; i < 4; i++) wireTo(x - 0.027 + i * 0.018, y - 0.045, zf - 0.02, 1.68, i === 3 ? m.wireBlue : colours[i % 3]);
    x += 0.086;
    zf = this.device(b, x, y, 0.072, 0.09, 0.07, m.white, f.meter);
    this.led(x + 0.03, y + 0.033, zf + 0.001, '#58e08c', 'blink', 0.7);
    x += 0.1;
    zf = this.device(b, x, y, 0.09, 0.125, 0.12, m.steel, f.psu);
    this.led(x + 0.03, y + 0.05, zf + 0.001, '#58e08c');
    for (let i = 0; i < 4; i++) wireTo(x - 0.03 + i * 0.022, y - 0.06, zf - 0.04, 1.68, i % 2 ? m.wireDc : m.wireBlue);
    // Copper busbars
    const busX = dx1 - 0.1;
    for (let i = 0; i < 3; i++) b.box(0.012, 0.2, 0.003, m.copper, busX + i * 0.03, y - 0.005, PLATE_Z + 0.036);
    b.box(0.1, 0.02, 0.02, m.black, busX + 0.03, y + 0.07, PLATE_Z + 0.03, 0.002);
    b.box(0.1, 0.02, 0.02, m.black, busX + 0.03, y - 0.08, PLATE_Z + 0.03, 0.002);

    // Row B: protection. Real 18 mm breaker modules.
    y = 1.5;
    this.rail(b, dx0, dx1, y);
    const ratings = ['C6', 'C10', 'C10', 'C16', 'C16', 'C16', 'C20', 'B16', 'B16', 'C6', 'C6', 'C10', 'C16', 'C16', 'C25', 'C25', 'C32', 'C10', 'C6', 'C6', 'C16', 'C16', 'C10', 'C6', 'C6'];
    const mcbFaces = {};
    x = dx0 + 0.016;
    ratings.forEach((rate, i) => {
      mcbFaces[rate] ||= f.mcb(rate);
      const off = i === 7 || i === 15;
      zf = this.device(b, x, y, 0.0176, 0.085, 0.068, m.white, mcbFaces[rate]);
      b.box(0.009, 0.019, 0.015, m.black, x, y + (off ? -0.006 : 0.006), zf + 0.006, 0.002);
      wireTo(x, y + 0.042, zf - 0.03, 1.63, colours[i % 3]);
      wireTo(x, y - 0.042, zf - 0.03, 1.37, i % 4 === 0 ? m.wireBlue : colours[(i + 1) % 3]);
      this.led(x, y + 0.03, zf + 0.0008, off ? '#e8574a' : '#58e08c', off ? 'dim' : 'on');
      x += 0.018 + (i % 6 === 5 ? 0.004 : 0);
    });

    x += 0.012;
    for (let i = 0; i < 4; i++) {
      zf = this.device(b, x + 0.018, y, 0.0354, 0.085, 0.072, m.white, mcbFaces.C16);
      b.box(0.009, 0.019, 0.015, m.bluePush, x + 0.01, y + 0.006, zf + 0.006, 0.002);
      b.box(0.009, 0.019, 0.015, m.black, x + 0.026, y + 0.006, zf + 0.006, 0.002);
      wireTo(x + 0.01, y + 0.042, zf - 0.03, 1.63, m.wireBlue);
      wireTo(x + 0.026, y - 0.042, zf - 0.03, 1.37, m.wireBrown);
      this.led(x + 0.018, y + 0.03, zf + 0.0008, '#58e08c');
      x += 0.0372;
    }

    // Row C: the controller and its I/O. This is where command becomes signal.
    y = 1.165;
    this.rail(b, dx0, dx1, y);
    x = dx0 + 0.068;
    zf = this.device(b, x, y, 0.12, 0.135, 0.1, m.anthracite, f.plcCpu);
    this.led(x - 0.05, y + 0.06, zf + 0.001, '#58e08c');
    this.led(x - 0.04, y + 0.06, zf + 0.001, '#58e08c', 'blink', 2.2);
    this.led(x - 0.03, y + 0.06, zf + 0.001, '#f2b24c', 'act', 7);
    x += 0.08;
    const kinds = ['DI 16', 'DI 16', 'DO 16', 'DO 16', 'AI 8', 'AI 8', 'AO 4', 'AO 4', 'RS485'];
    const ioFaces = {};
    kinds.forEach((kind) => {
      ioFaces[kind] ||= f.ioModule(kind);
      zf = this.device(b, x, y, 0.0345, 0.135, 0.1, m.anthracite, ioFaces[kind]);
      for (let r = 0; r < 8; r++) {
        this.led(x - 0.008 + (r % 2) * 0.014, y + 0.03 - Math.floor(r / 2) * 0.008, zf + 0.0008, '#58e08c', 'act', 0.6 + this.r() * 2.4);
        if (kind.startsWith('DO')) this.outputs.push(this.leds[this.leds.length - 1]);
      }
      for (let r = 0; r < 4; r++) wireTo(x - 0.012 + r * 0.008, y - 0.068, zf - 0.02, 1.01, r % 2 ? m.wireDc : m.wireBlue);
      x += 0.0355;
    });
    x += 0.034;
    zf = this.device(b, x, y, 0.05, 0.12, 0.09, m.anthracite, f.net);
    for (let p = 0; p < 5; p++) {
      const py = y + 0.038 - p * 0.019;
      this.led(x + 0.014, py, zf + 0.001, p < 3 ? '#f2b24c' : '#58e08c', 'act', 4 + this.r() * 6);
      if (p < 3) {
        b.tube([
          new THREE.Vector3(x - 0.002, py, zf + 0.002),
          new THREE.Vector3(x - 0.004, py - 0.01, zf + 0.04),
          new THREE.Vector3(x - 0.05 - p * 0.05, y - 0.075, zf + 0.03),
          new THREE.Vector3(x - 0.09 - p * 0.05, 1.01, PLATE_Z + 0.05),
        ], 0.0027, p === 1 ? m.patchYellow : m.patchBlue, 14, 6);
      }
    }

    x += 0.055;
    zf = this.device(b, x, y, 0.05, 0.12, 0.09, m.anthracite, f.net);
    for (let p = 0; p < 5; p++) this.led(x + 0.014, y + 0.038 - p * 0.019, zf + 0.001, '#58e08c', 'act', 2 + this.r() * 4);
    x += 0.058;
    zf = this.device(b, x, y, 0.05, 0.12, 0.09, m.anthracite, ioFaces.RS485);
    this.led(x, y + 0.03, zf + 0.001, '#f2b24c', 'act', 5);

    // Row D: motor circuits. Two drives and a run of contactors.
    y = 0.81;
    this.rail(b, dx0, dx1, 0.84);
    x = dx0 + 0.07;
    for (let i = 0; i < 2; i++) {
      zf = this.device(b, x, y, 0.13, 0.26, 0.15, m.anthracite, f.vfd);
      this.led(x + 0.05, y + 0.108, zf + 0.001, '#58e08c');
      for (let k = 0; k < 3; k++) {
        const wx = x - 0.03 + k * 0.03;
        b.tube([new THREE.Vector3(wx, y - 0.125, zf - 0.04), new THREE.Vector3(wx, y - 0.14, zf - 0.02), new THREE.Vector3(wx + 0.003, 0.635, PLATE_Z + 0.05)], 0.0036, k === 1 ? m.wireBlack : m.wireBrown, 6, 5);
      }
      x += 0.14;
    }
    x += 0.012;
    for (let i = 0; i < 5; i++) {
      zf = this.device(b, x, 0.84, 0.045, 0.085, 0.1, m.white, f.contactor);
      b.box(0.018, 0.012, 0.012, m.midGrey, x, 0.84 - 0.002, zf + 0.004, 0.002);
      this.led(x + 0.016, 0.84 + 0.027, zf + 0.001, '#f2b24c', i < 3 ? 'on' : 'dim');
      this.contactors.push(this.leds[this.leds.length - 1]);
      for (let k = 0; k < 3; k++) {
        wireTo(x - 0.014 + k * 0.014, 0.84 + 0.043, zf - 0.03, 0.96, colours[k]);
        wireTo(x - 0.014 + k * 0.014, 0.84 - 0.043, zf - 0.03, 0.66, colours[(k + i) % 3]);
      }
      x += 0.047;
    }

    // Row E: relays and the terminal row where field wiring lands
    y = 0.46;
    this.rail(b, dx0, dx1, y);
    x = dx0 + 0.012;
    for (let i = 0; i < 8; i++) {
      zf = this.device(b, x, y, 0.0158, 0.08, 0.075, m.anthracite, f.relay);
      this.led(x, y + 0.03, zf + 0.0008, '#e8574a', i % 3 === 0 ? 'on' : 'dim');
      wireTo(x, y + 0.04, zf - 0.03, 0.61, m.wireDc);
      wireTo(x, y - 0.04, zf - 0.03, 0.31, m.wireBlue);
      x += 0.0162;
    }
    x += 0.016;
    let n = 0;
    while (x < dx1 - 0.008) {
      const kind = n % 12 === 10 ? m.termEarth : n % 4 === 3 ? m.termBlue : m.termGrey;
      const z = PLATE_Z + 0.016 + 0.024;
      b.box(0.0058, 0.066, 0.048, kind, x, y, z);
      b.box(0.0052, 0.008, 0.0015, m.white, x, y + 0.012, z + 0.0245);
      const wire = kind === m.termEarth ? m.wireEarth : kind === m.termBlue ? m.wireBlue : colours[n % 3];
      this.wire(b, x, y + 0.03, z + 0.01, x, 0.61, wire, 0.0013);
      this.wire(b, x, y - 0.03, z + 0.01, x, 0.31, wire, 0.0013);
      x += 0.0062;
      n++;
    }

    // Cores from the roof gland, down into the top duct
    this.cableDrops(b);
    b.commit(this.group);

    // LED bar, the bay's own light
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.012, 0.03),
      new THREE.MeshStandardMaterial({ color: '#fff4e0', emissive: '#ffe9c8', emissiveIntensity: 0, roughness: 0.4 }),
    );
    bar.position.set(xc, ROOF_Y - 0.03, D / 2 - 0.12);
    this.group.add(bar);
    this.bar = bar;
  }

  cableDrops(b) {
    const m = this.mats;
    const list = [m.wireBlack, m.wireGrey, m.wireBrown, m.wireBlue, m.wireEarth];
    for (let i = 0; i < 16; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const gx = GLAND.x + (col - 1.5) * 0.05;
      const gz = GLAND.z + (row - 1.5) * 0.05;
      b.tube([
        new THREE.Vector3(gx, ROOF_Y - 0.02, gz),
        new THREE.Vector3(gx * 0.98, ROOF_Y - 0.07, gz * 0.7 - 0.02),
        new THREE.Vector3(GLAND.x + (col - 1.5) * 0.03, 2.0, PLATE_Z + 0.09),
        new THREE.Vector3(GLAND.x + (col - 1.5) * 0.03, 1.97, PLATE_Z + 0.05),
      ], 0.008, list[i % list.length], 10, 6);
    }
  }

  buildClosedDoor() {
    const b = new Batch();
    const m = this.mats;
    const f = this.faces;
    const zFace = D / 2 + 0.024;
    const cx = (LEFT + SPLIT) / 2 - 0.013;
    const dw = SPLIT - LEFT - 0.05;
    b.box(dw, H - 0.012, 0.024, m.shell, cx, PLINTH + H / 2, D / 2 + 0.012, 0.005);
    // Rain lip and hinges
    for (const hy of [0.42, 1.2, 1.9]) {
      b.box(0.024, 0.07, 0.022, m.darkSteel, LEFT + 0.008, hy, D / 2 + 0.016, 0.003);
    }

    // Nameplate
    b.box(0.182, 0.048, 0.002, m.steel, cx, 1.93, zFace + 0.001, 0.0006);
    b.face(0.18, 0.046, f.nameplate, cx, 1.93, zFace + 0.0024);

    // Touch panel: a 15 inch unit set into the door
    const hmiY = 1.6;
    b.box(0.37, 0.26, 0.012, m.black, cx, hmiY, zFace + 0.006, 0.006);
    const screen = liveCanvas(1024, 640);
    this.screen = screen;
    this.screenMat = new THREE.MeshStandardMaterial({
      color: '#050607',
      roughness: 0.22,
      metalness: 0.1,
      emissive: '#ffffff',
      emissiveMap: screen.texture,
      emissiveIntensity: 0,
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.335, 0.21), this.screenMat);
    glass.position.set(cx, hmiY, zFace + 0.0125);
    this.group.add(glass);

    // Pilot lights and selectors
    const rowY = 1.32;
    const lights = [
      { x: cx - 0.17, color: '#37d67a', name: 'Rețea' },
      { x: cx - 0.075, color: '#f2b24c', name: 'Avarie' },
      { x: cx + 0.02, color: '#e8392e', name: 'Defect' },
    ];
    this.pilots = lights.map((l) => {
      b.cyl(0.0165, 0.012, m.steel, l.x, rowY, zFace + 0.006, 'z', 28);
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(l.color).multiplyScalar(0.32), emissive: l.color, emissiveIntensity: 0, roughness: 0.25 });
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      lens.rotation.x = Math.PI / 2;
      lens.scale.y = 0.55;
      lens.position.set(l.x, rowY, zFace + 0.012);
      this.group.add(lens);
      b.face(0.074, 0.015, f.labelPlate(l.name), l.x, rowY - 0.042, zFace + 0.0008);
      return { mat, color: l.color, x: l.x, y: rowY, z: zFace + 0.024 };
    });
    // Selector switch
    const sx = cx + 0.13;
    b.cyl(0.0185, 0.012, m.steel, sx, rowY, zFace + 0.006, 'z', 28);
    b.cyl(0.0145, 0.016, m.black, sx, rowY, zFace + 0.016, 'z', 24);
    b.add(new THREE.BoxGeometry(0.006, 0.026, 0.012), m.black, sx, rowY, zFace + 0.027, [0, 0, -0.75]);
    b.face(0.074, 0.015, f.labelPlate('Man 0 Auto'), sx, rowY - 0.042, zFace + 0.0008);

    // E-stop on a yellow collar, reset, key switch
    const ey = 1.15;
    b.cyl(0.036, 0.003, m.yellow, cx - 0.14, ey, zFace + 0.0015, 'z', 36);
    b.cyl(0.0175, 0.018, m.steel, cx - 0.14, ey, zFace + 0.01, 'z', 24);
    const dome = new THREE.SphereGeometry(0.0235, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    b.add(dome, m.red, cx - 0.14, ey, zFace + 0.017, [Math.PI / 2, 0, 0]);
    b.face(0.074, 0.015, f.labelPlate('Oprire urgență'), cx - 0.14, ey - 0.054, zFace + 0.0008);
    b.cyl(0.0165, 0.012, m.steel, cx - 0.01, ey, zFace + 0.006, 'z', 28);
    b.cyl(0.0125, 0.012, m.bluePush, cx - 0.01, ey, zFace + 0.014, 'z', 24);
    b.face(0.074, 0.015, f.labelPlate('Resetare'), cx - 0.01, ey - 0.054, zFace + 0.0008);
    b.cyl(0.0165, 0.012, m.steel, cx + 0.12, ey, zFace + 0.006, 'z', 28);
    b.cyl(0.011, 0.01, m.darkSteel, cx + 0.12, ey, zFace + 0.014, 'z', 20);
    b.box(0.002, 0.012, 0.004, m.black, cx + 0.12, ey, zFace + 0.0195);
    b.face(0.074, 0.015, f.labelPlate('Acces'), cx + 0.12, ey - 0.054, zFace + 0.0008);

    // Swing handle
    b.box(0.03, 0.17, 0.014, m.darkSteel, SPLIT - 0.058, 0.98, zFace + 0.007, 0.004);
    b.box(0.018, 0.13, 0.016, m.black, SPLIT - 0.058, 0.975, zFace + 0.021, 0.006);

    // Filter fan with louvres
    const fy = 0.42;
    b.box(0.255, 0.255, 0.012, m.lightGrey, cx, fy, zFace + 0.006, 0.006);
    for (let i = 0; i < 13; i++) {
      b.box(0.214, 0.0092, 0.008, m.midGrey, cx, fy - 0.1 + i * 0.0168, zFace + 0.0135, 0.001);
    }
    b.commit(this.group);
  }

  buildOpenDoor() {
    const b = new Batch();
    const m = this.mats;
    const f = this.faces;
    const dw = RIGHT - SPLIT - 0.03;
    const dh = H - 0.012;
    // Local door space: hinge at x=0, door runs toward -x, inner face looks toward -z.
    b.box(dw, dh, 0.024, m.shell, -dw / 2, 0, 0, 0.005);
    // Pressed inner tray, gasket and stiffeners
    b.box(dw - 0.05, dh - 0.05, 0.003, m.shellInner, -dw / 2, 0, -0.0135);
    const g = 0.008;
    b.box(dw - 0.02, g, 0.006, m.gasket, -dw / 2, dh / 2 - 0.018, -0.015);
    b.box(dw - 0.02, g, 0.006, m.gasket, -dw / 2, -dh / 2 + 0.018, -0.015);
    b.box(g, dh - 0.04, 0.006, m.gasket, -0.018, 0, -0.015);
    b.box(g, dh - 0.04, 0.006, m.gasket, -dw + 0.018, 0, -0.015);
    for (const sy of [-0.48, 0.48]) b.box(dw - 0.1, 0.03, 0.016, m.shellInner, -dw / 2, sy, -0.021, 0.002);
    for (const sx of [0.22, 0.78]) b.box(0.03, dh - 0.12, 0.016, m.shellInner, -dw * sx, 0, -0.021, 0.002);
    // Drawing pocket with the panel's schematic
    b.box(0.25, 0.34, 0.005, m.black, -dw / 2, 0.08, -0.018, 0.002);
    const sheet = new THREE.PlaneGeometry(0.22, 0.31);
    b.add(sheet, f.schematic, -dw / 2, 0.09, -0.0212, [0, Math.PI, 0]);
    // Hinges and earth strap
    for (const hy of [-0.72, 0, 0.8]) b.box(0.026, 0.07, 0.022, m.darkSteel, 0.008, hy, 0.004, 0.003);
    b.commit(this.door);
    this.door.position.set(RIGHT, PLINTH + H / 2, D / 2 + 0.012);
    this.door.rotation.y = THREE.MathUtils.degToRad(97);
    this.group.add(this.door);
  }

  buildFloor() {
    // Soft contact shadow: the enclosure sits on the floor rather than above it.
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 0.9, D + 0.9),
      new THREE.MeshBasicMaterial({ color: '#000000', alphaMap: contactTexture(), transparent: true, opacity: 0.9, depthWrite: false }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.002;
    contact.renderOrder = 1;
    this.group.add(contact);
  }

  buildLights() {
    const bay = new THREE.SpotLight('#ffe7c6', 0, 3.2, 0.95, 0.75, 1.4);
    bay.position.set((SPLIT + RIGHT) / 2, ROOF_Y - 0.06, D / 2 + 0.05);
    bay.target.position.set((SPLIT + RIGHT) / 2, 0.75, PLATE_Z);
    bay.castShadow = true;
    bay.shadow.mapSize.set(2048, 2048);
    bay.shadow.bias = -0.0006;
    bay.shadow.radius = 2;
    this.group.add(bay, bay.target);
    this.bay = bay;
  }

  buildLeds() {
    const n = this.leds.length;
    const pos = new Float32Array(n * 3);
    this.ledColor = new Float32Array(n * 3);
    this.leds.forEach((l, i) => { pos[i * 3] = l.x; pos[i * 3 + 1] = l.y; pos[i * 3 + 2] = l.z; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.ledColor, 3).setUsage(THREE.DynamicDrawUsage));
    this.ledMat = new THREE.ShaderMaterial({
      uniforms: { size: { value: 7 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      vertexShader: 'uniform float size; varying vec3 vC; void main(){ vC=color; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_PointSize=size; }',
      fragmentShader: 'varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5)*2.; float core=smoothstep(.5,.16,d); float halo=pow(max(0.,1.-d),2.5)*.5; gl_FragColor=vec4(vC*(core*1.2+halo),core+halo); }',
    });
    this.ledPoints = new THREE.Points(g, this.ledMat);
    this.ledPoints.frustumCulled = false;
    this.group.add(this.ledPoints);
  }

  /** The touch panel. It wakes when the cables connect. */
  drawScreen(on, t) {
    const { ctx: g, canvas, texture } = this.screen;
    const w = canvas.width, h = canvas.height;
    g.fillStyle = '#0c1014';
    g.fillRect(0, 0, w, h);
    if (on < 0.5) {
      g.fillStyle = '#ece6dc';
      g.font = '500 44px "Geist", sans-serif';
      g.textAlign = 'center';
      g.fillText('Logicontrol', w / 2, h / 2 - 8);
      g.fillStyle = '#26303a';
      g.fillRect(w / 2 - 170, h / 2 + 28, 340, 8);
      g.fillStyle = '#f2b24c';
      g.fillRect(w / 2 - 170, h / 2 + 28, 340 * Math.min(1, on * 2), 8);
      g.textAlign = 'left';
      texture.needsUpdate = true;
      return;
    }
    g.fillStyle = '#131a21';
    g.fillRect(0, 0, w, 66);
    g.fillStyle = '#ece6dc';
    g.font = '500 28px "Geist", sans-serif';
    g.fillText('Clădire demonstrativă', 26, 43);
    g.fillStyle = '#58e08c';
    g.beginPath(); g.arc(w - 240, 34, 9, 0, 7); g.fill();
    g.fillStyle = '#b5afa5';
    g.font = '500 22px "Geist Mono", monospace';
    g.fillText('Funcționare normală', w - 222, 42);
    const p = this.plant || { average: 21.4, lights: 0, total: 18 };
    const tiles = [['Medie', `${p.average.toFixed(1)}°`, '#f2b24c'], ['Ventilație', '62 %', '#6fc0e8'], ['Răcire', 'Oprit', '#7f8a94'], ['Iluminat', `${p.lights}/${p.total}`, '#f2b24c']];
    tiles.forEach(([name, val, color], i) => {
      const x = 26 + (i % 2) * 250;
      const y = 90 + Math.floor(i / 2) * 170;
      g.fillStyle = '#161d24';
      g.fillRect(x, y, 234, 154);
      g.fillStyle = '#9aa4ad';
      g.font = '500 24px "Geist", sans-serif';
      g.fillText(name, x + 18, y + 40);
      g.fillStyle = color;
      g.font = '500 58px "Geist", sans-serif';
      g.fillText(val, x + 18, y + 112);
    });
    // Trend: a fixed illustrative curve, drifting slowly.
    const px = 530, py = 90, pw = 468, ph = 324;
    g.fillStyle = '#161d24';
    g.fillRect(px, py, pw, ph);
    g.strokeStyle = '#26303a';
    g.lineWidth = 2;
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(px, py + (ph / 5) * i); g.lineTo(px + pw, py + (ph / 5) * i); g.stroke(); }
    g.strokeStyle = '#f2b24c';
    g.lineWidth = 4;
    g.beginPath();
    for (let i = 0; i <= 80; i++) {
      const x = px + (pw / 80) * i;
      const y = py + ph * 0.52 + Math.sin(i * 0.16 + t * 0.4) * 46 + Math.sin(i * 0.05) * 30;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#131a21';
    g.fillRect(0, h - 190, w, 190);
    const names = ['Parter', 'Etaj 1', 'Etaj 2', 'CTA 1', 'Pompă căldură'];
    names.forEach((name, i) => {
      const x = 26 + i * 196;
      g.fillStyle = i === 0 ? '#f2b24c' : '#1d2630';
      g.fillRect(x, h - 164, 182, 76);
      g.fillStyle = i === 0 ? '#1a1306' : '#d9d4ca';
      g.font = '500 24px "Geist", sans-serif';
      g.fillText(name, x + 16, h - 118);
    });
    g.fillStyle = '#7f8a94';
    g.font = '500 20px "Geist Mono", monospace';
    g.fillText(this.lastCommand ? `Comandă: ${this.lastCommand}` : 'date simulate', 26, h - 40);
    texture.needsUpdate = true;
  }

  /** The live link: a dashboard command reaches a real output and contactor in the cabinet. */
  signal(room, change) {
    const what = change.set !== undefined ? `${change.set.toFixed(1)}°` : change.light !== undefined ? (change.light ? 'Lumină aprinsă' : 'Lumină stinsă') : (change.ac ? 'Răcire pornită' : 'Răcire oprită');
    this.signalText(room.id, `${room.floor.name} · ${room.name} · ${what}`);
  }

  signalText(key, text) {
    const index = [...key].reduce((n, c) => n + c.charCodeAt(0), 0) % this.outputs.length;
    this.outputs[index].hold = performance.now() + 1500;
    this.pilotFlash = performance.now() + 900;
    this.lastCommand = text;
    this.screenDirty = true;
  }

  /** An unseen alarm holds the amber pilot on the door. */
  setAlarm(on) { this.alarmOn = on; }

  setPlant(plant) {
    this.plant = plant;
    plant.floorLights.forEach((on, i) => {
      const c = this.contactors[i];
      if (c) c.mode = on ? 'on' : 'dim';
    });
    if (this.contactors[3]) this.contactors[3].mode = plant.ahuOn ? 'on' : 'dim';
    if (this.contactors[4]) this.contactors[4].mode = plant.hpOn ? 'on' : 'dim';
    this.screenDirty = true;
  }

  /** on: 0 is dark, 1 is fully powered. */
  setPower(on) {
    if (Math.abs(on - this.power) < 0.002) return;
    this.power = on;
    this.bay.intensity = on * 3.7;
    this.bar.material.emissiveIntensity = on * 4.5;
    this.screenMat.emissiveIntensity = Math.min(1, on * 1.6) * 1.15;
    this.pilots[0].mat.emissiveIntensity = on * 3.2;
    this.pilots[1].mat.emissiveIntensity = on * 0.05;
    this.pilots[2].mat.emissiveIntensity = 0;
  }

  /** Runs the LEDs. Patterns are fixed functions of time, not random telemetry. */
  tick(t, on, dpr) {
    this.ledMat.uniforms.size.value = 5.4 * dpr;
    const c = this.ledColor;
    this.pilots[1].mat.emissiveIntensity = this.pilotFlash > performance.now() ? 4 : on * (this.alarmOn ? 2.2 : 0.05);
    this.leds.forEach((l, i) => {
      let k = 1;
      if (l.hold > performance.now()) {
        c[i * 3] = 3.2; c[i * 3 + 1] = 2.1; c[i * 3 + 2] = 0.7;
        return;
      }
      if (l.mode === 'dim') k = 0.03;
      else if (l.mode === 'blink') k = Math.sin(t * l.rate * 3.14 + l.phase) > 0 ? 1 : 0.06;
      else if (l.mode === 'act') k = Math.sin(t * l.rate + l.phase) + Math.sin(t * l.rate * 2.3 + l.phase * 2) > 0.4 ? 1 : 0.08;
      k *= on * 1.5;
      c[i * 3] = l.color.r * k;
      c[i * 3 + 1] = l.color.g * k;
      c[i * 3 + 2] = l.color.b * k;
    });
    this.ledPoints.geometry.attributes.color.needsUpdate = true;
  }
}

function mixN(a, b, t) {
  return a + (b - a) * t;
}
