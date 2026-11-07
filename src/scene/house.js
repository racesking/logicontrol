import * as THREE from 'three';
import { Batch, GLAND } from './cabinet.js';
import { WALL_Z } from './wall.js';
import { faceTexture, rng } from './textures.js';

// The house around the technical room. The concrete wall of the plant room is its back
// wall, and the cabinet stays exactly where it is. Metres, true to scale. An invented plan.
const H = 3;
const T = 0.14;
const SILL = 0.85;
const HEAD = 2.25;
const DOOR = 2.1;

export const BOUNDS = { x0: -6.2, x1: 6.6, z0: WALL_Z, z1: 9.2 };
export const TECH = { x0: -1.6, x1: 2.8, z1: 3.2 };

export const ROOMS = [
  { id: 'living', name: 'Living', x0: -6.2, x1: 1.6, z0: 4.2, z1: 9.2, floor: 'wood', lamp: [-2.6, 6.7] },
  { id: 'kitchen', name: 'Bucătărie', x0: 1.6, x1: 6.6, z0: 4.2, z1: 9.2, floor: 'tile', lamp: [3.9, 6.9] },
  { id: 'bedroom', name: 'Dormitor', x0: -6.2, x1: -1.6, z0: WALL_Z, z1: 4.2, floor: 'wood', lamp: [-3.9, 2.1] },
  { id: 'bath', name: 'Baie', x0: 2.8, x1: 6.6, z0: WALL_Z, z1: 3.2, floor: 'stone', lamp: [4.7, 1.5] },
  { id: 'hall', name: 'Hol', x0: -1.6, x1: 6.6, z0: 3.2, z1: 4.2, floor: 'wood', lamp: [1.4, 3.7] },
  { id: 'tech', name: 'Tehnic', x0: -1.6, x1: 2.8, z0: WALL_Z, z1: 3.2, floor: null, lamp: [1.6, 2.2] },
];

// Control cable runs: from the cabinet, up to the tray, through the walls, to the room.
const Y = 2.68;
const ROUTES = {
  bedroom: [[-1.6, Y, 0], [-3.9, Y, 0], [-3.9, Y, 2.1], [-3.9, 2.42, 2.1]],
  living: [[-1.5, Y, 0.1], [-1.5, Y, 6.7], [-2.6, Y, 6.7], [-2.6, 2.42, 6.7]],
  kitchen: [[2.7, Y, 0.1], [2.7, Y, 6.9], [3.9, Y, 6.9], [3.9, 2.42, 6.9]],
  bath: [[2.8, Y, 0], [4.7, Y, 0], [4.7, Y, 1.5], [4.7, 2.42, 1.5]],
  hall: [[1.4, Y, 0.1], [1.4, Y, 3.7], [1.4, 2.42, 3.7]],
  tech: [[1.6, Y, 0.1], [1.6, Y, 2.2], [1.6, 2.42, 2.2]],
};

const WINDOWS = {
  left: [{ a: 0.9, b: 2.9, room: 'bedroom' }, { a: 5.2, b: 8.2, room: 'living' }],
  front: [{ a: -5.2, b: -1.4, room: 'living' }, { a: -1.1, b: -0.1, door: true }, { a: 2.8, b: 5.2, room: 'kitchen' }],
  right: [{ a: 0.6, b: 2.0, room: 'bath' }, { a: 3.3, b: 4.1, door: true }, { a: 5.4, b: 7.8, room: 'kitchen' }],
};

const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

function woodTexture() {
  const r = rng(41);
  const t = faceTexture(2000, 2000, (g) => {
    const tones = ['#7A5433', '#84603C', '#6E4A2C', '#8E6840', '#755030'];
    for (let y = 0, row = 0; y < 2000; y += 142.86, row++) {
      let x = -((row * 620) % 1400);
      while (x < 2000) {
        const len = 900 + r() * 700;
        g.fillStyle = tones[Math.floor(r() * tones.length)];
        g.fillRect(x, y, len, 143);
        g.strokeStyle = 'rgba(30,18,8,.16)';
        g.lineWidth = 1.2;
        for (let i = 0; i < 7; i++) {
          const gy = y + 10 + r() * 122;
          g.beginPath();
          g.moveTo(x, gy);
          g.bezierCurveTo(x + len * 0.3, gy + r() * 9 - 4, x + len * 0.7, gy + r() * 9 - 4, x + len, gy);
          g.stroke();
        }
        g.fillStyle = 'rgba(15,9,4,.75)';
        g.fillRect(x, y, 3, 143);
        x += len;
      }
      g.fillStyle = 'rgba(15,9,4,.75)';
      g.fillRect(0, y, 2000, 3);
    }
  }, 0.5);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function tileTexture(base, joint, size, seed) {
  const r = rng(seed);
  const t = faceTexture(1200, 1200, (g) => {
    for (let y = 0; y < 1200; y += size) {
      for (let x = 0; x < 1200; x += size) {
        const v = (r() - 0.5) * 14;
        g.fillStyle = base;
        g.fillRect(x, y, size, size);
        g.fillStyle = v > 0 ? `rgba(255,255,255,${v / 240})` : `rgba(0,0,0,${-v / 200})`;
        g.fillRect(x, y, size, size);
      }
    }
    g.strokeStyle = joint;
    g.lineWidth = 5;
    for (let p = 0; p <= 1200; p += size) {
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 1200); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(1200, p); g.stroke();
    }
  }, 0.7);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function rugTexture() {
  return faceTexture(3000, 2000, (g) => {
    g.fillStyle = '#5A3A34';
    g.fillRect(0, 0, 3000, 2000);
    g.strokeStyle = '#C9B48E';
    g.lineWidth = 34;
    g.strokeRect(90, 90, 2820, 1820);
    g.strokeStyle = '#2E3B47';
    g.lineWidth = 60;
    g.strokeRect(190, 190, 2620, 1620);
    g.fillStyle = '#7C5145';
    g.fillRect(320, 320, 2360, 1360);
    g.strokeStyle = 'rgba(201,180,142,.5)';
    g.lineWidth = 14;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 5; j++) {
        const x = 500 + i * 250;
        const y = 540 + j * 230;
        g.beginPath();
        g.moveTo(x, y - 80); g.lineTo(x + 80, y); g.lineTo(x, y + 80); g.lineTo(x - 80, y); g.closePath();
        g.stroke();
      }
    }
  }, 0.34);
}

function poolTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 6, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.45, 'rgba(255,255,255,.42)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function blindTexture() {
  const t = faceTexture(200, 200, (g) => {
    g.fillStyle = '#D8D4CA';
    g.fillRect(0, 0, 200, 200);
    g.fillStyle = 'rgba(40,36,30,.5)';
    for (let y = 0; y < 200; y += 25) g.fillRect(0, y, 200, 4);
  }, 1);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const flat = (w, d, per) => {
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * per, uv.getY(i) * d * per);
  return g;
};
const DOWN = [-Math.PI / 2, 0, 0];

export class House {
  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;
    // Reveal: the house unfolds outward from the technical room.
    this.clip = [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), 100),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), 100),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), 100),
    ];
    this.rooms = new Map(ROOMS.map((r) => [r.id, { ...r, k: 0, goal: 0, mats: [], blinds: [], blind: 0, blindGoal: 0 }]));
    this.pulses = [];
    this.textures = {
      wood: woodTexture(),
      tile: tileTexture('#C9C5BB', 'rgba(70,66,60,.75)', 300, 5),
      stone: tileTexture('#6E7276', 'rgba(25,27,30,.8)', 400, 9),
    };
    this.buildShell();
    this.buildRooms();
    this.buildWalls();
    this.buildRoutes();
    this.buildSelection();
    this.spills = [];
    this.group.traverse((o) => {
      if (o.material && !o.material.isShaderMaterial) {
        o.material.clippingPlanes = this.clip;
        o.material.clipShadows = true;
      }
    });
    this.buildSpill();
  }

  buildSpill() {
    const map = this.poolMap;
    this.outdoor = new THREE.Group();
    for (const [side, list] of Object.entries(WINDOWS)) {
      for (const w of list) {
        if (w.door) continue;
        const mid = (w.a + w.b) / 2;
        const len = (w.b - w.a) * 1.7;
        const material = new THREE.MeshBasicMaterial({ map, color: '#E8A25A', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(side === 'front' ? len : 4.4, side === 'front' ? 4.4 : len), material);
        m.rotation.x = -Math.PI / 2;
        if (side === 'front') m.position.set(mid, 0.06, BOUNDS.z1 + 1.3);
        else m.position.set(side === 'left' ? BOUNDS.x0 - 1.3 : BOUNDS.x1 + 1.3, 0.06, mid);
        m.userData.noAO = true;
        m.renderOrder = 1;
        this.outdoor.add(m);
        this.spills.push({ room: this.rooms.get(w.room), material });
      }
    }
    this.group.add(this.outdoor);
    this.spillFade = 0;
  }

  drawSpill() {
    for (const { room, material } of this.spills) {
      material.opacity = 0.2 * room.k * (1 - room.blind * 0.9) * this.spillFade;
    }
  }

  setOutdoor(p) {
    this.spillFade = p;
    this.drawSpill();
  }

  buildShell() {
    const b = new Batch();
    const slab = new THREE.MeshStandardMaterial({ color: '#17191c', roughness: 0.8 });
    const { x0, x1, z0, z1 } = BOUNDS;
    b.box(x1 - x0 + 0.5, 0.4, z1 - z0 + 0.5, slab, (x0 + x1) / 2, -0.2, (z0 + z1) / 2);
    b.commit(this.group, { cast: false });
  }

  /** Materials are per room, so a room can be lit or dark on its own. */
  roomMaterial(room, o) {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.6, ...o });
    room.mats.push({ mat: m, base: m.color.clone() });
    return m;
  }

  buildRooms() {
    for (const room of this.rooms.values()) {
      const b = new Batch();
      const mk = (o) => this.roomMaterial(room, o);
      const w = room.x1 - room.x0;
      const d = room.z1 - room.z0;
      const cx = (room.x0 + room.x1) / 2;
      const cz = (room.z0 + room.z1) / 2;
      if (room.floor) {
        const per = room.floor === 'wood' ? 0.5 : 0.5;
        const floor = mk({ map: this.textures[room.floor], roughness: room.floor === 'wood' ? 0.46 : 0.3 });
        b.add(flat(w, d, per), floor, cx, 0.012, cz, DOWN);
      }
      this[`furnish_${room.id}`](b, mk);

      // Pendant
      const [lx, lz] = room.lamp;
      const cord = mk({ color: '#14161a' });
      b.cyl(0.006, H - 2.42, cord, lx, (H + 2.42) / 2, lz, 'y', 6);
      b.commit(this.group);

      room.bulb = new THREE.MeshStandardMaterial({ color: '#2a2622', emissive: '#FFB765', emissiveIntensity: 0, roughness: 0.4 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12), room.bulb);
      bulb.position.set(lx, 2.36, lz);
      this.group.add(bulb);

      // Light on the floor. Additive, so it costs nothing while the room is dark.
      room.pool = new THREE.MeshBasicMaterial({ map: this.poolMap ||= poolTexture(), color: '#E8A25A', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, d - 0.1), room.pool);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(cx, 0.05, cz);
      pool.userData.noAO = true;
      this.group.add(pool);
    }
  }

  furnish_living(b, mk) {
    const fabric = mk({ color: '#5E6670', roughness: 0.9 });
    const cushion = mk({ color: '#B98A4A', roughness: 0.9 });
    const dark = mk({ color: '#1E2124', roughness: 0.5 });
    const oak = mk({ map: this.textures.wood, roughness: 0.5 });
    const white = mk({ color: '#D9D6CF', roughness: 0.5 });
    const leaf = mk({ color: '#3E6B47', roughness: 0.7 });
    const screen = mk({ color: '#0B0D10', roughness: 0.18, metalness: 0.4 });
    b.add(flat(3.9, 2.7, 0.333), mk({ map: rugTexture(), roughness: 0.95 }), -2.7, 0.03, 6.75, DOWN);
    // Sofa, facing the screen on the back wall
    b.box(2.7, 0.3, 0.96, fabric, -2.7, 0.24, 7.95, 0.06);
    b.box(2.7, 0.56, 0.22, fabric, -2.7, 0.56, 8.34, 0.08);
    for (const x of [-4.1, -1.3]) b.box(0.22, 0.46, 0.96, fabric, x, 0.32, 7.95, 0.07);
    for (const x of [-3.4, -2.0]) b.box(1.26, 0.14, 0.72, fabric, x, 0.46, 7.86, 0.05);
    for (const x of [-3.7, -1.7]) b.box(0.44, 0.34, 0.14, cushion, x, 0.67, 8.14, 0.06);
    // Low table, screen wall
    b.box(1.2, 0.05, 0.62, oak, -2.7, 0.36, 6.65, 0.012);
    for (const [x, z] of [[-3.2, 6.42], [-2.2, 6.42], [-3.2, 6.88], [-2.2, 6.88]]) b.cyl(0.018, 0.34, dark, x, 0.17, z, 'y', 8);
    b.box(2.4, 0.4, 0.42, oak, -2.7, 0.24, 4.52, 0.01);
    b.box(1.6, 0.92, 0.05, screen, -2.7, 1.3, 4.34, 0.01);
    // Armchair and plant
    b.box(0.82, 0.3, 0.82, cushion, -5.1, 0.28, 6.3, 0.08);
    b.box(0.18, 0.56, 0.82, cushion, -5.42, 0.56, 6.3, 0.07);
    b.cyl(0.17, 0.34, white, -5.6, 0.17, 4.8, 'y', 18);
    b.add(new THREE.IcosahedronGeometry(0.42, 1), leaf, -5.6, 0.82, 4.8);
    // Dining table
    b.box(1.7, 0.05, 0.9, oak, -0.1, 0.74, 7.8, 0.012);
    for (const [x, z] of [[-0.85, 7.42], [0.65, 7.42], [-0.85, 8.18], [0.65, 8.18]]) b.cyl(0.024, 0.72, dark, x, 0.36, z, 'y', 8);
    for (const [x, z] of [[-0.5, 7.14], [0.3, 7.14], [-0.5, 8.46], [0.3, 8.46]]) {
      b.box(0.42, 0.05, 0.42, white, x, 0.46, z, 0.012);
      b.box(0.42, 0.42, 0.04, white, x, 0.68, z + (z < 7.8 ? -0.2 : 0.2), 0.01);
      for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) b.cyl(0.012, 0.44, dark, x + dx, 0.22, z + dz, 'y', 6);
    }
  }

  furnish_kitchen(b, mk) {
    const unit = mk({ color: '#59616A', roughness: 0.42 });
    const top = mk({ color: '#D5D1C8', roughness: 0.28 });
    const steel = mk({ color: '#A9ADB0', metalness: 0.85, roughness: 0.32 });
    const dark = mk({ color: '#14161A', roughness: 0.22 });
    const oak = mk({ map: this.textures.wood, roughness: 0.5 });
    // Run along the back and the right wall
    b.box(3.4, 0.86, 0.6, unit, 3.9, 0.43, 4.58, 0.01);
    b.box(3.44, 0.04, 0.64, top, 3.9, 0.88, 4.58, 0.006);
    b.box(0.6, 0.86, 3.0, unit, 6.22, 0.43, 6.3, 0.01);
    b.box(0.64, 0.04, 3.04, top, 6.22, 0.88, 6.3, 0.006);
    b.box(3.4, 0.7, 0.34, unit, 3.9, 1.95, 4.46, 0.01);
    b.box(0.72, 2.05, 0.66, steel, 1.98, 1.03, 4.6, 0.012);
    b.box(0.62, 0.012, 0.5, dark, 4.6, 0.905, 4.58, 0.004);
    b.box(0.5, 0.02, 0.4, steel, 6.2, 0.905, 6.8, 0.004);
    b.cyl(0.012, 0.3, steel, 6.42, 1.05, 6.8, 'y', 8);
    // Island and stools
    b.box(2.2, 0.86, 0.92, oak, 3.9, 0.43, 6.95, 0.012);
    b.box(2.3, 0.05, 1.02, top, 3.9, 0.885, 6.95, 0.008);
    for (const x of [3.1, 3.9, 4.7]) {
      b.cyl(0.17, 0.05, dark, x, 0.66, 7.72, 'y', 18);
      b.cyl(0.02, 0.64, steel, x, 0.32, 7.72, 'y', 8);
      b.cyl(0.16, 0.012, steel, x, 0.01, 7.72, 'y', 16);
    }
  }

  furnish_bedroom(b, mk) {
    const linen = mk({ color: '#DAD6CD', roughness: 0.95 });
    const throwM = mk({ color: '#4E6A7C', roughness: 0.95 });
    const oak = mk({ map: this.textures.wood, roughness: 0.5 });
    const wardrobe = mk({ color: '#BFBAB0', roughness: 0.46 });
    const dark = mk({ color: '#1E2124', roughness: 0.5 });
    const rug = mk({ color: '#7C7468', roughness: 0.98 });
    b.add(flat(3.0, 2.3, 1), rug, -3.9, 0.026, 1.5, DOWN);
    b.box(1.84, 0.3, 2.14, oak, -3.9, 0.17, 1.02, 0.02);
    b.box(1.76, 0.2, 2.06, linen, -3.9, 0.41, 1.02, 0.07);
    b.box(1.8, 0.1, 0.92, throwM, -3.9, 0.5, 1.56, 0.04);
    b.box(1.96, 0.96, 0.08, oak, -3.9, 0.54, -0.08, 0.015);
    for (const x of [-4.34, -3.46]) b.box(0.74, 0.14, 0.46, linen, x, 0.57, 0.28, 0.06);
    for (const x of [-5.15, -2.65]) {
      b.box(0.46, 0.46, 0.4, oak, x, 0.25, 0.04, 0.012);
      b.cyl(0.07, 0.2, dark, x, 0.58, 0.04, 'y', 12);
    }
    b.box(0.62, 2.3, 2.4, wardrobe, -1.98, 1.16, 2.0, 0.012);
    for (const z of [1.2, 2.0, 2.8]) b.box(0.012, 2.2, 0.012, dark, -2.3, 1.16, z);
  }

  furnish_bath(b, mk) {
    const ceramic = mk({ color: '#E4E2DC', roughness: 0.2 });
    const unit = mk({ color: '#3A3F45', roughness: 0.42 });
    const steel = mk({ color: '#AEB2B5', metalness: 0.9, roughness: 0.24 });
    const water = mk({ color: '#87A8B8', roughness: 0.12 });
    const mirror = mk({ color: '#9AA6AE', metalness: 1, roughness: 0.08 });
    b.box(1.74, 0.56, 0.82, ceramic, 5.56, 0.29, 0.28, 0.08);
    b.box(1.5, 0.02, 0.6, water, 5.56, 0.56, 0.28, 0.008);
    b.box(1.3, 0.52, 0.5, unit, 3.72, 0.54, 0.06, 0.012);
    b.box(1.34, 0.05, 0.54, ceramic, 3.72, 0.83, 0.06, 0.012);
    b.box(0.9, 1.0, 0.03, mirror, 3.72, 1.55, -0.16, 0.008);
    b.cyl(0.012, 0.18, steel, 3.72, 0.94, -0.08, 'y', 8);
    b.box(0.4, 0.42, 0.54, ceramic, 6.2, 0.22, 2.4, 0.09);
    b.box(0.42, 0.34, 0.16, ceramic, 6.42, 0.56, 2.4, 0.04);
  }

  furnish_hall(b, mk) {
    const oak = mk({ map: this.textures.wood, roughness: 0.5 });
    const rug = mk({ color: '#43505A', roughness: 0.98 });
    b.add(flat(3.2, 0.7, 1), rug, 3.4, 0.026, 3.7, DOWN);
    b.box(0.9, 0.05, 0.3, oak, -1.0, 0.8, 3.38, 0.01);
  }

  furnish_tech(b, mk) {
    const tank = mk({ color: '#C9CCCC', metalness: 0.2, roughness: 0.4 });
    const unit = mk({ color: '#D9DAD8', roughness: 0.45 });
    const dark = mk({ color: '#23262A', roughness: 0.45 });
    const copper = mk({ color: '#B5713A', metalness: 1, roughness: 0.34 });
    b.cyl(0.3, 1.7, tank, 2.32, 0.9, 0.42, 'y', 28);
    b.cyl(0.31, 0.04, dark, 2.32, 0.06, 0.42, 'y', 28);
    b.box(0.62, 1.1, 0.42, unit, 2.34, 0.58, 1.3, 0.02);
    b.box(0.3, 0.14, 0.01, dark, 2.34, 0.92, 1.52);
    for (const [y, z] of [[1.5, 0.76], [1.3, 0.76]]) {
      b.tube([new THREE.Vector3(2.34, y, 0.62), new THREE.Vector3(2.34, y, z), new THREE.Vector3(2.34, 1.13, 1.1)], 0.016, copper, 10, 8);
    }
  }

  buildWalls() {
    const glass = this.glass = new THREE.MeshPhysicalMaterial({
      color: '#D4DEE6', transparent: true, opacity: 0.13, roughness: 0.24, metalness: 0, depthWrite: false, side: THREE.DoubleSide,
    });
    const cap = new THREE.MeshStandardMaterial({ color: '#E2E0DA', roughness: 0.62 });
    const pane = new THREE.MeshStandardMaterial({ color: '#7FA4BC', transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0.4, depthWrite: false });
    const frame = new THREE.MeshStandardMaterial({ color: '#7C858C', roughness: 0.4, metalness: 0.5 });
    const wb = new Batch();
    const cb = new Batch();
    const pb = new Batch();
    const lines = [];

    const edge = (x, y, z, w, h, d) => {
      const c = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) c.push([x + (sx * w) / 2, y + (sy * h) / 2, z + (sz * d) / 2]);
      for (const [a, b2] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) lines.push(...c[a], ...c[b2]);
    };
    const wall = (axis, c, from, to, openings = []) => {
      const place = (s, e, y0, y1, solid) => {
        if (e - s < 0.01) return;
        const m = (s + e) / 2;
        const [x, z, w, d] = axis === 'x' ? [m, c, e - s, T] : [c, m, T, e - s];
        wb.box(w, y1 - y0, d, glass, x, (y0 + y1) / 2, z);
        edge(x, (y0 + y1) / 2, z, w, y1 - y0, d);
        if (solid) cb.box(w, 0.1, d, cap, x, 0.05, z);
      };
      let at = from;
      for (const o of [...openings].sort((p, q) => p.a - q.a)) {
        place(at, o.a, 0, H, true);
        const mid = (o.a + o.b) / 2;
        const len = o.b - o.a;
        if (o.door) {
          place(o.a, o.b, DOOR, H, false);
        } else {
          place(o.a, o.b, 0, SILL, true);
          place(o.a, o.b, HEAD, H, false);
          const [x, z, w, d] = axis === 'x' ? [mid, c, len, 0.03] : [c, mid, 0.03, len];
          pb.box(w, HEAD - SILL, d, pane, x, (SILL + HEAD) / 2, z);
          for (const y of [SILL, HEAD]) cb.box(axis === 'x' ? len : 0.05, 0.03, axis === 'x' ? 0.05 : len, frame, x, y, z);
          this.addBlind(axis, c, mid, len, o.room);
        }
        at = o.b;
      }
      place(at, to, 0, H, true);
      const m = (from + to) / 2;
      const [x, z, w, d] = axis === 'x' ? [m, c, to - from + T, T] : [c, m, T, to - from + T];
      cb.box(w, 0.05, d, cap, x, H + 0.025, z);
    };

    const { x0, x1, z0, z1 } = BOUNDS;
    wall('z', x0, z0, z1, WINDOWS.left);
    wall('x', z1, x0, x1, WINDOWS.front);
    wall('z', x1, z0, z1, WINDOWS.right);
    wall('z', -1.6, z0, 4.2, [{ a: 3.3, b: 4.1, door: true }]);
    wall('z', 2.8, z0, 3.2);
    wall('x', 3.2, -1.6, x1, [{ a: 0.9, b: 1.8, door: true }, { a: 4.3, b: 5.2, door: true }]);
    wall('x', 4.2, x0, x1, [{ a: -0.9, b: 0.9, door: true }, { a: 2.5, b: 3.6, door: true }]);
    wall('z', 1.6, 4.2, z1, [{ a: 5.8, b: 7.9, door: true }]);
    // The plant-room wall becomes the back of the house; it only needs its top edge.
    cb.box(x1 - x0 + T, 0.05, T, cap, (x0 + x1) / 2, H + 0.025, z0 - 0.02);

    const see = new THREE.Group();
    wb.commit(see, { cast: false, receive: false });
    pb.commit(see, { cast: false, receive: false });
    see.traverse((o) => { o.userData.noAO = true; });
    this.group.add(see);
    cb.commit(this.group);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    this.ink = new THREE.LineBasicMaterial({ color: '#E8EEF2', transparent: true, opacity: 0 });
    const ink = new THREE.LineSegments(g, this.ink);
    this.group.add(ink);
  }

  addBlind(axis, c, mid, len, roomId) {
    const room = this.rooms.get(roomId);
    const h = HEAD - SILL;
    this.blindMat ||= new THREE.MeshStandardMaterial({ map: blindTexture(), roughness: 0.7 });
    const geo = new THREE.BoxGeometry(axis === 'x' ? len : 0.03, h, axis === 'x' ? 0.03 : len);
    geo.translate(0, -h / 2, 0);
    const m = new THREE.Mesh(geo, this.blindMat);
    m.position.set(axis === 'x' ? mid : c + (c < 0 ? 0.1 : -0.1), HEAD, axis === 'x' ? c - 0.1 : mid);
    m.scale.y = 0.001;
    m.visible = false;
    m.castShadow = true;
    this.group.add(m);
    room.blinds.push(m);
  }

  buildRoutes() {
    this.routes = new Map();
    for (const [id, pts] of Object.entries(ROUTES)) {
      const v = pts.map((p) => new THREE.Vector3(...p));
      const path = new THREE.CurvePath();
      const start = new THREE.Vector3(GLAND.x, GLAND.y + 0.2, GLAND.z);
      const up = new THREE.Vector3(GLAND.x, Y, GLAND.z);
      const chain = [start, up, v[0], ...v.slice(1)];
      for (let i = 0; i < chain.length - 1; i++) path.add(new THREE.LineCurve3(chain[i], chain[i + 1]));
      const material = new THREE.ShaderMaterial({
        uniforms: { head: { value: -1 }, alpha: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: 'varying float a; void main(){ a=uv.x; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `uniform float head; uniform float alpha; varying float a;
          void main(){
            float d=head-a;
            float pulse=smoothstep(.2,0.,d)*step(0.,d)*1.7+smoothstep(.012,0.,abs(d))*2.6;
            gl_FragColor=vec4(vec3(1.,.66,.26)*(.2+pulse),alpha);
          }`,
      });
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 180, 0.024, 6, false), material);
      mesh.userData.noAO = true;
      this.group.add(mesh);
      this.routes.set(id, material);
    }
  }

  buildSelection() {
    const m = new THREE.MeshBasicMaterial({ color: '#F2B24C' });
    this.frame = new THREE.Group();
    this.frameBars = Array.from({ length: 4 }, () => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, 1), m);
      bar.userData.noAO = true;
      this.frame.add(bar);
      return bar;
    });
    this.group.add(this.frame);
  }

  select(id) {
    const r = this.rooms.get(id);
    const t = 0.05;
    const inset = 0.11;
    const [x0, x1, z0, z1] = [r.x0 + inset, r.x1 - inset, r.z0 + inset, r.z1 - inset];
    const place = (bar, x, z, w, d) => {
      bar.position.set(x, 0.06, z);
      bar.scale.set(w, 1, d);
    };
    place(this.frameBars[0], (x0 + x1) / 2, z0, x1 - x0, t);
    place(this.frameBars[1], (x0 + x1) / 2, z1, x1 - x0, t);
    place(this.frameBars[2], x0, (z0 + z1) / 2, t, z1 - z0);
    place(this.frameBars[3], x1, (z0 + z1) / 2, t, z1 - z0);
  }

  setLight(id, on, instant = false) {
    const r = this.rooms.get(id);
    r.goal = on ? 1 : 0;
    if (instant) r.k = r.goal;
    this.applyRoom(r);
  }

  setBlind(id, amount, instant = false) {
    const r = this.rooms.get(id);
    r.blindGoal = amount;
    if (instant) r.blind = amount;
    this.applyBlind(r);
  }

  applyRoom(r) {
    const k = r.k;
    const tone = 0.4 + 0.6 * k;
    for (const { mat, base } of r.mats) {
      mat.color.copy(base).multiplyScalar(tone);
      mat.emissive.copy(base).multiplyScalar(0.07 * k);
    }
    r.bulb.emissiveIntensity = k * 3.2;
    r.pool.opacity = k * 0.17;
    if (this.spills.length) this.drawSpill();
  }

  applyBlind(r) {
    for (const m of r.blinds) {
      m.visible = r.blind > 0.01;
      m.scale.y = Math.max(0.001, r.blind);
    }
    if (this.spills.length) this.drawSpill();
  }

  /** Sends a pulse from the cabinet down the room's cable. onArrive fires at the far end. */
  pulse(id, onArrive) {
    this.pulses = this.pulses.filter((p) => p.id !== id);
    this.pulses.push({ id, t: 0, onArrive });
  }

  get busy() {
    if (this.pulses.length) return true;
    for (const r of this.rooms.values()) {
      if (Math.abs(r.k - r.goal) > 0.004 || Math.abs(r.blind - r.blindGoal) > 0.004) return true;
    }
    return false;
  }

  setReveal(p) {
    const e = ease(p);
    const { x0, x1, z1 } = BOUNDS;
    this.clip[0].constant = -mix(TECH.x0 - 0.1, x0 - 0.4, e);
    this.clip[1].constant = mix(TECH.x1 + 0.1, x1 + 0.4, e);
    this.clip[2].constant = mix(TECH.z1 - 0.3, z1 + 0.4, e);
    const veil = Math.min(1, Math.max(0, (p - 0.3) / 0.5));
    this.glass.opacity = 0.13 * veil;
    this.ink.opacity = 0.42 * veil;
    const alpha = Math.max(0, (p - 0.75) / 0.25);
    for (const m of this.routes.values()) m.uniforms.alpha.value = alpha;
    this.frame.visible = p > 0.9;
  }

  update(dt) {
    for (const r of this.rooms.values()) {
      if (Math.abs(r.k - r.goal) > 0.001) {
        r.k += (r.goal - r.k) * (1 - Math.exp(-dt * 6));
        this.applyRoom(r);
      }
      if (Math.abs(r.blind - r.blindGoal) > 0.001) {
        r.blind += (r.blindGoal - r.blind) * (1 - Math.exp(-dt * 3.2));
        this.applyBlind(r);
      }
    }
    for (const p of this.pulses) {
      p.t += dt / 0.95;
      const m = this.routes.get(p.id);
      m.uniforms.head.value = p.t * 1.2;
      if (p.t >= 0.84 && p.onArrive) {
        p.onArrive();
        p.onArrive = null;
      }
    }
    this.pulses = this.pulses.filter((p) => {
      if (p.t < 1.2) return true;
      this.routes.get(p.id).uniforms.head.value = -1;
      return false;
    });
  }
}
