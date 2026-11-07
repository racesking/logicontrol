import * as THREE from 'three';
import { SIZE, tempColor } from './model.js';

// The building as an ink X-ray: every floor readable through the ones above it.
// It sits on a light panel, so depth comes from line weight and tone, not glow.

const INK = '#143E5F';

function outline(points, y, out) {
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    out.push(a[0], y, a[1], b[0], y, b[1]);
  }
}

export class XrayBuilding {
  constructor(canvas, labelLayer, model, onPick) {
    this.canvas = canvas;
    this.labelLayer = labelLayer;
    this.model = model;
    this.onPick = onPick;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.azimuth = -0.72;
    this.elevation = 0.62;
    this.pivot = new THREE.Vector3(SIZE.width / 2, SIZE.storey * 2, SIZE.depth / 2);
    this.floors = new Map();
    this.discs = new Map();
    this.labels = new Map();
    this.gap = 0;
    this.gapGoal = 0;
    this.selectedFloor = null;
    this.selectedRoom = null;
    this.dirty = true;
    model.floors.forEach((f) => this.buildFloor(f));
    this.bindDrag();
  }

  buildFloor(floor) {
    const group = new THREE.Group();
    group.userData.level = floor.level;
    const { width: W, depth: Dp, storey: S, core } = SIZE;

    // Linework: the slab, every room, columns, windows, stairs.
    const lines = [];
    const slab = [[0, 0], [W, 0], [W, Dp], [0, Dp]];
    outline(slab, 0, lines);
    outline(slab, S, lines);
    for (const [x, z] of slab) lines.push(x, 0, z, x, S, z);
    for (const r of floor.rooms) {
      const q = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
      outline(q, 0.02, lines);
      outline(q, S * 0.82, lines);
      for (const [x, z] of q) lines.push(x, 0, z, x, S * 0.82, z);
    }
    // Structural grid
    for (let x = 0; x <= W; x += 6) {
      for (let z = 0; z <= Dp; z += 7) {
        lines.push(x, 0, z, x, S, z);
      }
    }
    // Facade: window bays along the long sides
    for (let x = 1; x < W - 1; x += 2) {
      for (const z of [0, Dp]) {
        lines.push(x, 1, z, x + 1.3, 1, z, x, 2.5, z, x + 1.3, 2.5, z, x, 1, z, x, 2.5, z, x + 1.3, 1, z, x + 1.3, 2.5, z);
      }
    }
    // Stair core
    const cx = core.x;
    const cw = core.w;
    outline([[cx, 0], [cx + cw, 0], [cx + cw, Dp], [cx, Dp]], 0.02, lines);
    for (let i = 0; i < 14; i++) {
      const t = i / 14;
      lines.push(cx + 0.2, t * S, 3 + t * 4, cx + cw / 2 - 0.1, t * S, 3 + t * 4);
      lines.push(cx + cw / 2 + 0.1, S - t * S, 3 + t * 4, cx + cw - 0.2, S - t * S, 3 + t * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.5 });
    group.add(new THREE.LineSegments(g, lineMat));

    // A faint tone in the slab gives the floors weight on a light ground.
    const slabMat = new THREE.MeshBasicMaterial({ color: '#7FA6C2', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp), slabMat);
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(W / 2, 0, Dp / 2);
    group.add(plate);

    // A temperature disc per room
    for (const r of floor.rooms) {
      const radius = Math.min(r.w, r.h) * 0.3;
      const mat = new THREE.MeshBasicMaterial({ color: tempColor(r.temp), transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), mat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(r.x + r.w / 2, 0.06, r.y + r.h / 2);
      disc.userData.room = r;
      group.add(disc);
      const ringMat = new THREE.MeshBasicMaterial({ color: tempColor(r.temp), transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 1.16, radius * 1.36, 40), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(disc.position);
      group.add(ring);
      this.discs.set(r.id, { disc, ring, mat, ringMat });

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'room-chip';
      chip.tabIndex = -1;
      chip.setAttribute('aria-hidden', 'true');
      chip.addEventListener('click', () => this.onPick(r));
      this.labelLayer.append(chip);
      this.labels.set(r.id, { chip, room: r, anchor: new THREE.Vector3(r.x + r.w / 2, 0.1, r.y + r.h / 2), group });
    }

    this.scene.add(group);
    this.floors.set(floor.id, { group, lineMat, slabMat, floor });
  }

  bindDrag() {
    let last = null;
    const el = this.canvas;
    el.addEventListener('pointerdown', (e) => {
      last = [e.clientX, e.clientY];
      this.movedBy = 0;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!last) return;
      const dx = e.clientX - last[0];
      const dy = e.clientY - last[1];
      last = [e.clientX, e.clientY];
      this.movedBy += Math.abs(dx) + Math.abs(dy);
      this.azimuth -= dx * 0.008;
      this.elevation = Math.max(0.22, Math.min(1.25, this.elevation + dy * 0.005));
      this.dirty = true;
    });
    el.addEventListener('pointerup', (e) => {
      last = null;
      if (this.movedBy < 5) this.pick(e);
    });
  }

  pick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(p, this.camera);
    const targets = [...this.discs.values()].map((d) => d.disc).filter((d) => d.parent.visible);
    const hit = ray.intersectObjects(targets, false).find((h) => h.object.material.opacity > 0.3);
    if (hit) this.onPick(hit.object.userData.room);
  }

  reset() {
    this.azimuth = -0.72;
    this.elevation = 0.62;
    this.dirty = true;
  }

  selectFloor(floor) {
    this.selectedFloor = floor;
    this.gapGoal = floor ? 2.6 : 0;
    this.dirty = true;
  }

  selectRoom(r) {
    this.selectedRoom = r;
    this.dirty = true;
  }

  /** Colours and labels follow the model; values are always printed beside the colour. */
  refresh() {
    for (const r of this.model.rooms) {
      const d = this.discs.get(r.id);
      const c = tempColor(r.temp);
      d.mat.color.set(c);
      d.ringMat.color.set(c);
      const l = this.labels.get(r.id);
      const focus = this.selectedFloor && r.floor === this.selectedFloor;
      l.chip.innerHTML = focus
        ? `<i style="background:${c}"></i><b>${r.temp.toFixed(1)}°</b><span>${r.name}</span>`
        : `<i style="background:${c}"></i><b>${r.temp.toFixed(1)}°</b>`;
      l.chip.classList.toggle('is-selected', r === this.selectedRoom);
      l.chip.classList.toggle('is-sent', r.status === 'sent' || r.status === 'acting');
    }
    this.dirty = true;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(rect.width, rect.height, false);
    this.w = rect.width;
    this.h = rect.height;
    this.dirty = true;
  }

  frame() {
    const moving = Math.abs(this.gapGoal - this.gap) > 0.01;
    if (!this.dirty && !moving) return;
    if (!this.w) this.resize();
    if (!this.w) return;
    this.gap += (this.gapGoal - this.gap) * 0.16;
    this.dirty = false;

    // Fit whichever is tighter: the building's height or its width.
    const aspect = this.w / this.h;
    const halfH = Math.max(13.6 + this.gap * 1.7, 15.2 / aspect);
    this.camera.left = -halfH * aspect;
    this.camera.right = halfH * aspect;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    const dist = 60;
    this.camera.position.set(
      this.pivot.x + Math.sin(this.azimuth) * Math.cos(this.elevation) * dist,
      this.pivot.y + Math.sin(this.elevation) * dist,
      this.pivot.z + Math.cos(this.azimuth) * Math.cos(this.elevation) * dist,
    );
    this.camera.lookAt(this.pivot);

    for (const { group, lineMat, slabMat, floor } of this.floors.values()) {
      const active = !this.selectedFloor || this.selectedFloor === floor;
      group.position.y = floor.level * (SIZE.storey + this.gap);
      lineMat.opacity = active ? 0.72 : 0.08;
      slabMat.opacity = active ? (this.selectedFloor ? 0.2 : 0.1) : 0.02;
      for (const r of floor.rooms) {
        const d = this.discs.get(r.id);
        d.mat.opacity = active ? 0.9 : 0.07;
        d.ringMat.opacity = r === this.selectedRoom ? 0.9 : active ? 0.3 : 0.04;
      }
    }
    this.renderer.render(this.scene, this.camera);

    // Chips sit on the projected room centres. Where two would collide, the one
    // further down the drawing gives way; every value stays in the room list.
    const v = new THREE.Vector3();
    const taken = [];
    const chips = [...this.labels.values()].map((l) => {
      v.copy(l.anchor).add(l.group.position).project(this.camera);
      return { ...l, x: ((v.x + 1) / 2) * this.w, y: ((1 - v.y) / 2) * this.h };
    }).sort((a, b) => (b.room === this.selectedRoom) - (a.room === this.selectedRoom) || a.y - b.y);
    for (const { chip, room, x, y } of chips) {
      const active = this.selectedFloor ? this.selectedFloor === room.floor : true;
      const w = this.selectedFloor ? 118 : 56;
      const clear = active && !taken.some((t) => Math.abs(t.x - x) < (t.w + w) / 2 && Math.abs(t.y - y) < 24);
      chip.hidden = !clear;
      if (clear) {
        taken.push({ x, y, w });
        chip.style.transform = `translate(${x}px, ${y}px) translate(-50%, -130%)`;
      }
    }
    this.scene.updateMatrixWorld();
  }
}
