import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AIR } from './plant.js';

// A 3D cutaway of the air handling unit. The front is removed so every section shows.
// x runs along the unit, y is up, z runs front to back. Metres.
const L = 5.4;
const H = 2.1;
const Dp = 1.15;
const MID = 1.05;
const LOW = 0.54; // centre of the supply deck
const UP = 1.56; // centre of the extract deck
const ZC = Dp / 2;

// Where each value tag's leader line lands.
export const TAGS = {
  top: [
    ['damperEx', 'Clapetă evac.', [0.32, UP, ZC]],
    ['wheel', 'Recuperator', [2.02, 1.72, ZC + 0.1]],
    ['fanEx', 'Vent. extract', [3.15, UP, ZC]],
    ['filterEx', 'Filtru extras', [4.3, UP, ZC]],
    ['air', 'Calitate aer', [4.9, 1.8, ZC]],
    ['tempEx', 'Temp. extras', [5.2, 1.3, ZC]],
  ],
  bottom: [
    ['tempOut', 'Temp. exterior', [0.12, 0.2, ZC]],
    ['filterSup', 'Filtru exterior', [1.02, 0.3, ZC]],
    ['heat', 'Încălzire', [2.92, 0.3, ZC]],
    ['cool', 'Răcire', [3.3, 0.3, ZC]],
    ['fanSup', 'Vent. introd.', [4.2, 0.3, ZC]],
    ['flow', 'Debit', [4.9, 0.3, ZC]],
    ['tempSup', 'Temp. introd.', [5.25, 0.5, ZC]],
  ],
};

function pleats(g) {
  g.fillStyle = '#E2D4A8';
  g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    const grd = g.createLinearGradient(x, 0, x + 16, 0);
    grd.addColorStop(0, '#B7A673');
    grd.addColorStop(0.5, '#F0E5BF');
    grd.addColorStop(1, '#B7A673');
    g.fillStyle = grd;
    g.fillRect(x, 0, 16, 256);
  }
}

function honeycomb(g) {
  g.fillStyle = '#A8B1B7';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#6E777D';
  g.lineWidth = 1.2;
  const r = 7;
  for (let row = 0; row < 44; row++) {
    for (let col = 0; col < 40; col++) {
      const x = col * r * 1.8 + (row % 2) * r * 0.9;
      const y = row * r * 1.56;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.closePath();
      g.stroke();
    }
  }
}

function fins(g) {
  g.fillStyle = '#D9D2C4';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#9E9788';
  g.lineWidth = 1;
  for (let x = 0; x < 256; x += 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
}

function texture(draw, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export class AhuView {
  constructor(canvas, overlay, plant) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.plant = plant;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environmentIntensity = 0.75;
    const sun = new THREE.DirectionalLight('#ffffff', 1.5);
    sun.position.set(-1.5, 8, 6.5);
    sun.target.position.set(L / 2, 0.8, ZC);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -4.2, right: 4.2, top: 3.2, bottom: -3.2, near: 1, far: 20 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.01;
    sun.shadow.radius = 3;
    this.scene.add(sun, sun.target);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
    this.spinners = [];
    this.dampers = [];
    this.build();
    this.scene.traverse((o) => {
      if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; }
    });
    this.buildAir();
    this.dirty = true;
  }

  mat(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3, ...o }); }

  add(geo, material, x, y, z, parent = this.scene) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  build() {
    const panel = this.mat('#C9CFD3', { metalness: 0.45, roughness: 0.42 });
    const inner = this.mat('#E6E9EB', { metalness: 0.2, roughness: 0.6 });
    const frame = this.mat('#59626A', { metalness: 0.75, roughness: 0.36 });
    const dark = this.mat('#2C3238', { metalness: 0.6, roughness: 0.45 });
    const glass = new THREE.MeshStandardMaterial({ color: '#B8CBD6', transparent: true, opacity: 0.1, roughness: 0.15, metalness: 0.1, depthWrite: false });

    // Casing: base, back wall, deck divider, roof glass
    this.add(new THREE.BoxGeometry(L, 0.06, Dp), panel, L / 2, 0.03, ZC);
    this.add(new THREE.BoxGeometry(L, H, 0.04), inner, L / 2, H / 2, 0.02);
    this.add(new THREE.BoxGeometry(L, 0.05, Dp), panel, L / 2, MID, ZC);
    this.add(new THREE.BoxGeometry(L, 0.03, Dp), glass, L / 2, H, ZC);
    // Base rail and feet
    this.add(new THREE.BoxGeometry(L + 0.1, 0.1, Dp + 0.1), dark, L / 2, -0.05, ZC);
    // Section posts along front and back
    for (const x of [0, 0.66, 1.42, 2.62, 3.6, 4.72, L]) {
      for (const z of [0.03, Dp - 0.03]) this.add(new THREE.BoxGeometry(0.05, H, 0.05), frame, x, H / 2, z);
      this.add(new THREE.BoxGeometry(0.05, 0.05, Dp), frame, x, H, ZC);
    }
    for (const y of [H, MID]) this.add(new THREE.BoxGeometry(L, 0.05, 0.05), frame, L / 2, y, Dp - 0.03);

    // Louvred inlet and outlet stubs, each banded in its air colour
    const band = { eha: '#B8602A', oda: '#2E9A55', eta: '#D39A1F', sup: '#2B72C4' };
    const stub = (x, y, colour, side) => {
      const s = new THREE.Group();
      s.position.set(x, y, ZC);
      this.add(new THREE.BoxGeometry(0.42, 0.86, Dp - 0.14), panel, 0, 0, 0, s);
      this.add(new THREE.BoxGeometry(0.05, 0.9, Dp - 0.1), this.mat(colour, { metalness: 0.1 }), side * -0.19, 0, 0, s);
      for (let i = 0; i < 8; i++) this.add(new THREE.BoxGeometry(0.03, 0.05, Dp - 0.2), dark, side * 0.22, -0.36 + i * 0.104, 0, s);
      this.scene.add(s);
    };
    stub(-0.21, UP, band.eha, -1);
    stub(-0.21, LOW, band.oda, -1);
    stub(L + 0.21, UP, band.eta, 1);
    stub(L + 0.21, LOW, band.sup, 1);

    // Dampers: real blades that turn
    const damper = (x, y) => {
      const g = new THREE.Group();
      g.position.set(x, y, ZC);
      const blades = [];
      for (let i = 0; i < 7; i++) {
        const b = this.add(new THREE.BoxGeometry(0.11, 0.012, Dp - 0.16), this.mat('#98A2A9', { metalness: 0.7, roughness: 0.34 }), 0, -0.36 + i * 0.12, 0, g);
        blades.push(b);
      }
      // A small actuator on the back wall
      this.add(new THREE.BoxGeometry(0.12, 0.16, 0.1), dark, 0, 0, -ZC + 0.12, g);
      this.scene.add(g);
      this.dampers.push(blades);
    };
    damper(0.32, UP);
    damper(0.32, LOW);
    damper(5.08, UP);
    damper(5.08, LOW);

    // Bag filters
    const filter = new THREE.MeshStandardMaterial({ map: texture(pleats), roughness: 0.9 });
    filter.map.wrapS = filter.map.wrapT = THREE.RepeatWrapping;
    filter.map.repeat.set(3, 1);
    const filterAt = (x, y) => {
      for (let i = 0; i < 3; i++) {
        const f = this.add(new THREE.BoxGeometry(0.34, 0.86, 0.3), filter, x, y, 0.22 + i * 0.355);
        f.rotation.y = i % 2 ? 0.12 : -0.12;
      }
    };
    filterAt(1.02, LOW);
    filterAt(4.28, UP);

    // Thermal wheel across both decks
    const honey = new THREE.MeshStandardMaterial({ map: texture(honeycomb, 512), metalness: 0.5, roughness: 0.42 });
    const rim = this.mat('#7A848B', { metalness: 0.85, roughness: 0.3 });
    const wheel = new THREE.Group();
    wheel.position.set(2.02, MID, ZC);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.2, 72), [rim, honey, honey]);
    disc.rotation.z = Math.PI / 2;
    wheel.add(disc);
    for (let i = 0; i < 6; i++) {
      const spoke = this.add(new THREE.BoxGeometry(0.21, 0.018, 1.8), rim, 0, 0, 0, wheel);
      spoke.rotation.x = (i * Math.PI) / 6;
    }
    this.add(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 24).rotateZ(Math.PI / 2), dark, 0, 0, 0, wheel);
    this.scene.add(wheel);
    this.wheel = wheel;
    this.add(new THREE.BoxGeometry(0.16, 0.22, 0.18), dark, 2.02, 0.2, 0.2); // drive motor

    // Coils with their flow and return pipes
    const finMap = texture(fins);
    finMap.wrapS = finMap.wrapT = THREE.RepeatWrapping;
    finMap.repeat.set(4, 1);
    const coil = (x, colour, tint) => {
      this.add(new THREE.BoxGeometry(0.16, 0.88, Dp - 0.14), new THREE.MeshStandardMaterial({ map: finMap, color: tint, metalness: 0.6, roughness: 0.4 }), x, LOW, ZC);
      const pipe = this.mat(colour, { metalness: 0.35, roughness: 0.3 });
      const zf = Dp - 0.06;
      for (const dy of [0, 0.09]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(x - 0.02 + dy * 0.3, 0.14 + dy, zf - 0.08), new THREE.Vector3(x - 0.02 + dy * 0.3, 0.2 + dy, zf),
          new THREE.Vector3(x - 0.02 + dy * 0.3, 0.86 - dy, zf), new THREE.Vector3(x - 0.02 + dy * 0.3, 0.94 - dy, zf - 0.08),
        ]);
        this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.024, 10), pipe));
      }
      this.add(new THREE.BoxGeometry(0.1, 0.09, 0.1), dark, x, 0.46, zf);
    };
    coil(2.92, '#D0392B', '#E9B9A6');
    coil(3.3, '#2B72C4', '#AFC9E6');

    // Plug fans: impeller, motor and mounting
    const fan = (x, y) => {
      const impeller = new THREE.Group();
      impeller.position.set(x, y, ZC);
      const blade = this.mat('#E1E5E8', { metalness: 0.55, roughness: 0.34 });
      this.add(new THREE.CylinderGeometry(0.37, 0.37, 0.02, 48).rotateZ(Math.PI / 2), blade, -0.13, 0, 0, impeller);
      this.add(new THREE.CylinderGeometry(0.37, 0.27, 0.05, 48, 1, true).rotateZ(Math.PI / 2), blade, 0.14, 0, 0, impeller);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const b = this.add(new THREE.BoxGeometry(0.26, 0.012, 0.15), blade, 0, Math.cos(a) * 0.29, Math.sin(a) * 0.29, impeller);
        b.rotation.x = a + 0.6;
      }
      this.scene.add(impeller);
      this.spinners.push(impeller);
      const motorX = x - 0.34;
      this.add(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 28).rotateZ(Math.PI / 2), this.mat('#3F6B86', { metalness: 0.55, roughness: 0.4 }), motorX, y, ZC);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.add(new THREE.BoxGeometry(0.3, 0.012, 0.03), this.mat('#2F566E'), motorX, y + Math.cos(a) * 0.155, ZC + Math.sin(a) * 0.155).rotation.x = a;
      }
      this.add(new THREE.BoxGeometry(0.1, y - (y > MID ? MID : 0.06), 0.34), frame, motorX, (y + (y > MID ? MID : 0.06)) / 2, ZC);
    };
    fan(4.22, LOW);
    fan(3.1, UP);
  }

  /** Air made visible: light specks along each deck, moving with the real flow. */
  buildAir() {
    const n = 150;
    const make = (y, from, to, cold, warm) => {
      const pos = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      const seed = [];
      const a = new THREE.Color(cold);
      const b = new THREE.Color(warm);
      for (let i = 0; i < n; i++) {
        seed.push({ t: Math.random(), yy: y + (Math.random() - 0.5) * 0.72, zz: 0.16 + Math.random() * (Dp - 0.3) });
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false });
      const points = new THREE.Points(g, mat);
      points.frustumCulled = false;
      this.scene.add(points);
      return { points, seed, pos, col, from, to, a, b };
    };
    this.air = [
      make(LOW, 0.02, L + 0.2, '#2E9A55', '#2B72C4'),
      make(UP, L - 0.02, -0.2, '#D39A1F', '#B8602A'),
    ];
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(rect.width, rect.height, false);
    this.w = rect.width;
    this.h = rect.height;

    const aspect = this.w / this.h;
    const halfH = Math.max(1.72, 3.28 / aspect);
    this.camera.left = -halfH * aspect;
    this.camera.right = halfH * aspect;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    const az = -0.42;
    const el = 0.3;
    const c = new THREE.Vector3(L / 2, 1.0, ZC);
    this.camera.position.set(c.x + Math.sin(az) * Math.cos(el) * 20, c.y + Math.sin(el) * 20, c.z + Math.cos(az) * Math.cos(el) * 20);
    this.camera.lookAt(c);
    this.camera.updateMatrixWorld();
    this.dirty = true;
    this.layoutLeaders();
  }

  project(p) {
    const v = new THREE.Vector3(...p).project(this.camera);
    return [((v.x + 1) / 2) * this.w, ((1 - v.y) / 2) * this.h];
  }

  /** Draws each leader from its tag to the part it describes. */
  layoutLeaders() {
    const svg = this.overlay.querySelector('svg');
    const box = this.overlay.getBoundingClientRect();
    if (!box.width) return;
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    let lines = '';
    for (const side of ['top', 'bottom']) {
      for (const [id, , anchor] of TAGS[side]) {
        const tag = this.overlay.querySelector(`[data-tag="${id}"]`);
        if (!tag) continue;
        const r = tag.getBoundingClientRect();
        const x = r.left - box.left + r.width / 2;
        const y = side === 'top' ? r.bottom - box.top : r.top - box.top;
        const [ax, ay] = this.project(anchor);
        lines += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.6"/>`;
      }
    }
    svg.innerHTML = lines;
    const place = (name, p) => {
      const el = this.overlay.querySelector(`[data-air="${name}"]`);
      if (!el) return;
      const [x, y] = this.project(p);
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    };
    place('eha', [-0.42, UP, ZC]);
    place('oda', [-0.42, LOW, ZC]);
    place('eta', [L + 0.42, UP, ZC]);
    place('sup', [L + 0.42, LOW, ZC]);
  }

  frame(dt) {
    if (!this.w) this.resize();
    if (!this.w) return;
    const a = this.plant.ahu;
    const speed = a.flow / 3200;
    if (speed <= 0.001 && !this.dirty && this.lastDamper === a.damper) return;
    this.dirty = false;
    this.lastDamper = a.damper;

    for (const s of this.spinners) s.rotation.x += dt * speed * 15;
    this.wheel.rotation.x += dt * (a.wheel / 100) * 0.8;
    const angle = (1 - a.damper / 100) * 1.45;
    for (const blades of this.dampers) for (const b of blades) b.rotation.z = angle;

    for (const s of this.air) {
      const span = s.to - s.from;
      const { seed, pos, col } = s;
      const tmp = new THREE.Color();
      for (let i = 0; i < seed.length; i++) {
        const p = seed[i];
        p.t = (p.t + dt * speed * 0.2) % 1;
        pos[i * 3] = s.from + span * p.t;
        pos[i * 3 + 1] = p.yy;
        pos[i * 3 + 2] = p.zz;
        tmp.copy(s.a).lerp(s.b, p.t);
        const fade = speed > 0.02 ? 1 : 0;
        col[i * 3] = tmp.r * fade; col[i * 3 + 1] = tmp.g * fade; col[i * 3 + 2] = tmp.b * fade;
      }
      s.points.material.opacity = Math.min(0.85, speed);
      s.points.geometry.attributes.position.needsUpdate = true;
      s.points.geometry.attributes.color.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  }
}

export { AIR };
