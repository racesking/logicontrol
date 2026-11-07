import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch } from './cabinet.js';
import { BOUNDS, tileTexture } from './house.js';
import { faceTexture, grainTexture, rng } from './textures.js';

// The plot around the house, at dusk. Trees and hedges are lumpy blobs, instanced so the
// whole garden stays a handful of draw calls. Metres.
const GROUND = -0.05;
const CENTRE = { x: 1, z: 6 };
const SIZE = { w: 76, d: 68 };

const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

function lawnTexture() {
  const r = rng(77);
  const t = faceTexture(3000, 3000, (g) => {
    g.fillStyle = '#3B5A2A';
    g.fillRect(0, 0, 3000, 3000);
    for (let i = 0; i < 90; i++) {
      const x = r() * 3000;
      const y = r() * 3000;
      const rad = 180 + r() * 420;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const c = r() > 0.5 ? '70,104,50' : '36,56,28';
      grd.addColorStop(0, `rgba(${c},.34)`);
      grd.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const tones = ['#4C7236', '#3F6230', '#2F4D25', '#5A8040', '#35552A'];
    g.lineWidth = 3;
    for (let i = 0; i < 26000; i++) {
      const x = r() * 3000;
      const y = r() * 3000;
      g.strokeStyle = tones[Math.floor(r() * tones.length)];
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 16, y - 12 - r() * 16);
      g.stroke();
    }
  }, 0.34);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** The plot fades into the dark rather than ending at an edge. */
function fadeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(256, 256, 120, 256, 256, 256);
  grd.addColorStop(0, '#fff');
  grd.addColorStop(0.72, '#fff');
  grd.addColorStop(1, '#000');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(c);
}

function poolTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,.34)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** A rough ball: the same lumps at every scale read as foliage. */
function foliage() {
  // Welded first: an icosahedron's faces are separate, which would shade as flat facets.
  let geo = new THREE.IcosahedronGeometry(1, 4);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-4);
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    uv[i * 2] = Math.atan2(v.z, v.x) / (Math.PI * 2) + 0.5;
    uv[i * 2 + 1] = Math.asin(Math.max(-1, Math.min(1, v.y))) / Math.PI + 0.5;
    const n = Math.sin(v.x * 5.1 + 1.3) * Math.sin(v.y * 4.3 + 0.7) * Math.sin(v.z * 4.7 + 2.1)
      + 0.5 * Math.sin(v.x * 11 + v.y * 9) * Math.sin(v.z * 12 + 1)
      + 0.22 * Math.sin(v.x * 23 + 2) * Math.sin(v.y * 21) * Math.sin(v.z * 25 + 1);
    v.multiplyScalar(1 + n * 0.13);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

export class Yard {
  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;
    const plane = (x, z) => new THREE.Plane(new THREE.Vector3(x, 0, z), 0);
    // Reveal: the garden opens outward from the house.
    this.clip = [plane(1, 0), plane(-1, 0), plane(0, 1), plane(0, -1)];
    this.r = rng(2026);
    this.pools = [];
    this.buildGround();
    this.buildHard();
    this.buildPlanting();
    this.buildLamps();
    this.group.traverse((o) => {
      if (o.material && o.material !== this.poolMat) {
        o.material.clippingPlanes = this.clip;
        o.material.clipShadows = true;
      }
    });
  }

  buildGround() {
    const map = lawnTexture();
    map.repeat.set(SIZE.w / 3, SIZE.d / 3);
    const bump = grainTexture({ size: 256, seed: 33, spread: 90, blobs: 80 });
    bump.repeat.set(SIZE.w / 2, SIZE.d / 2);
    this.lawn = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: 0.95, alphaMap: fadeTexture(), transparent: true });
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(SIZE.w, SIZE.d), this.lawn);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(CENTRE.x, GROUND, CENTRE.z);
    lawn.receiveShadow = true;
    lawn.renderOrder = -1;
    this.group.add(lawn);
  }

  buildHard() {
    const b = new Batch();
    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, ...o });
    const pavers = tileTexture('#8C8880', 'rgba(30,28,26,.85)', 300, 19);
    const deck = tileTexture('#6B4C33', 'rgba(20,12,6,.8)', 150, 23);
    const stone = std({ map: pavers, roughness: 0.82 });
    const decking = std({ map: deck, roughness: 0.6 });
    const steel = std({ color: '#4A5057', metalness: 0.7, roughness: 0.4 });
    const dark = std({ color: '#1A1C1F', roughness: 0.5 });
    const cushion = std({ color: '#B8AD97', roughness: 0.9 });
    const unit = std({ color: '#C4C7C8', roughness: 0.5 });

    const flat = (w, d, x, z, mat, y = 0.012) => {
      const g = new THREE.BoxGeometry(w, 0.06, d);
      const uv = g.attributes.uv;
      const p = g.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * 0.5, p.getZ(i) * 0.5);
      b.add(g, mat, x, y - 0.03, z);
    };

    // Terrace off the living room, path to the side door, drive to the road
    flat(5.9, 2.6, -3.3, 10.55, decking);
    flat(2.2, 1.2, 7.7, 3.7, stone);
    flat(3.4, 25, 10.1, 9, stone);
    const r = this.r;
    for (let i = 0; i < 9; i++) {
      const s = 0.62 + r() * 0.1;
      flat(s, s * 0.8, -0.2 + i * 1.04, 12.3 + Math.sin(i * 0.8) * 0.5, stone);
    }

    // Terrace furniture
    b.box(1.1, 0.04, 0.7, dark, -3.2, 0.42, 10.6, 0.01);
    for (const x of [-4.3, -2.1]) {
      b.box(0.7, 0.12, 0.72, cushion, x, 0.32, 10.6, 0.03);
      b.box(0.12, 0.42, 0.72, dark, x + (x < -3 ? -0.34 : 0.34), 0.42, 10.6, 0.02);
      b.box(0.62, 0.2, 0.62, dark, x, 0.13, 10.6, 0.01);
    }

    // Outdoor heat pump unit, on the side wall by the technical room
    b.box(0.46, 0.96, 1.05, unit, 7.0, 0.5, 1.4, 0.02);
    b.cyl(0.36, 0.02, dark, 7.24, 0.54, 1.4, 'x', 32);
    for (const y of [-0.24, -0.12, 0, 0.12, 0.24]) b.box(0.01, 0.012, 0.74, steel, 7.26, 0.54 + y, 1.4);
    b.box(0.5, 0.05, 1.1, steel, 7.0, 0.02, 1.4);
    b.commit(this.group);
  }

  buildPlanting() {
    const r = this.r;
    const geo = foliage();
    const leaf = faceTexture(600, 600, (g) => {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, 600, 600);
      const q = rng(5);
      for (let i = 0; i < 2600; i++) {
        const v = 110 + Math.floor(q() * 145);
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.beginPath();
        g.ellipse(q() * 600, q() * 600, 5 + q() * 9, 3 + q() * 5, q() * 3, 0, 7);
        g.fill();
      }
    }, 1);
    leaf.wrapS = leaf.wrapT = THREE.RepeatWrapping;
    leaf.repeat.set(4, 4);
    const material = new THREE.MeshStandardMaterial({ map: leaf, roughness: 0.82 });

    const blobs = [];
    const blob = (x, y, z, sx, sy, sz, tone) => blobs.push({ x, y, z, sx, sy, sz, tone });

    // Clipped hedge around the plot
    const hedge = (x0, z0, x1, z1) => {
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.62);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const s = 0.52 + r() * 0.1;
        blob(mix(x0, x1, t), 0.68, mix(z0, z1, t), s, 0.78 + r() * 0.1, s, 0.5 + r() * 0.2);
      }
    };
    hedge(-15, -6, 8, -6);
    hedge(12.6, -6, 17, -6);
    hedge(-15, -6, -15, 23);
    hedge(17, -6, 17, 23);

    // Trees: positions keep the crowns clear of the house from this camera
    const trunks = new Batch();
    const bark = new THREE.MeshStandardMaterial({ color: '#3B2C20', roughness: 0.9 });
    const tree = (x, z, h, spread) => {
      trunks.add(new THREE.CylinderGeometry(0.1, 0.2, h * 0.62, 10), bark, x, h * 0.31, z);
      const count = 9;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + r();
        const d = spread * (0.2 + r() * 0.5);
        const s = spread * (0.5 + r() * 0.34);
        blob(x + Math.cos(a) * d, h * (0.62 + r() * 0.3), z + Math.sin(a) * d, s, s * 0.86, s, 0.32 + r() * 0.3);
      }
    };
    tree(-11.6, -2.6, 7.4, 2.5);
    tree(-4.2, -4, 6.4, 2.1);
    tree(4.4, -3.9, 7, 2.3);
    tree(13.6, -2.6, 6.8, 2.2);
    tree(-12.4, 6.2, 6.6, 2.3);
    tree(-11.4, 15.2, 7.2, 2.5);
    tree(14.6, 13.6, 6.4, 2.2);

    // Low planting along the terrace and the front of the house
    for (let i = 0; i < 11; i++) blob(0.6 + i * 0.5, 0.2, 9.75 + (i % 2) * 0.16, 0.34, 0.28, 0.32, 0.6 + r() * 0.3);
    for (let i = 0; i < 7; i++) blob(-7 + r() * 0.5, 0.26, 2 + i * 1.1, 0.42, 0.36, 0.42, 0.55 + r() * 0.3);

    const mesh = new THREE.InstancedMesh(geo, material, blobs.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const dark = new THREE.Color('#1F3A1E');
    const light = new THREE.Color('#5C8A3C');
    const c = new THREE.Color();
    blobs.forEach((o, i) => {
      e.set(r() * 3, r() * 3, r() * 3);
      q.setFromEuler(e);
      m.compose(pos.set(o.x, o.y, o.z), q, scale.set(o.sx, o.sy, o.sz));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.copy(dark).lerp(light, o.tone));
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    trunks.commit(this.group);
  }

  buildLamps() {
    const b = new Batch();
    const post = new THREE.MeshStandardMaterial({ color: '#23262A', metalness: 0.6, roughness: 0.4 });
    const glow = new THREE.MeshStandardMaterial({ color: '#2a2622', emissive: '#FFB765', emissiveIntensity: 3 });
    this.poolMat = new THREE.MeshBasicMaterial({ map: poolTexture(), color: '#E8A25A', transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });
    const spots = [[8.1, 2.6], [8.1, 5.2], [8.1, 9.2], [8.1, 13.2], [12.2, 7.2], [12.2, 11.2], [-6.5, 12.1], [-0.2, 12.1], [3.6, 12.8]];
    for (const [x, z] of spots) {
      b.cyl(0.035, 0.62, post, x, 0.31, z, 'y', 10);
      b.cyl(0.05, 0.1, glow, x, 0.66, z, 'y', 12);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), this.poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x, 0.03, z);
      pool.userData.noAO = true;
      pool.renderOrder = 1;
      this.group.add(pool);
    }
    b.commit(this.group);
  }

  /** p: 0 is the house alone, 1 is the whole garden. */
  setReveal(p) {
    const e = ease(p);
    const { x0, x1, z0, z1 } = BOUNDS;
    this.clip[0].constant = -mix(x0 - 0.4, -45, e);
    this.clip[1].constant = mix(x1 + 0.4, 46, e);
    this.clip[2].constant = -mix(z0 - 0.4, -45, e);
    this.clip[3].constant = mix(z1 + 0.4, 50, e);
    this.lawn.opacity = Math.min(1, p * 2.2);
    this.poolMat.opacity = 0.3 * p;
  }
}
