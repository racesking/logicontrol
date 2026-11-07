import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { CableField } from './cables.js';
import { Cabinet, GLAND } from './cabinet.js';
import { Room } from './wall.js';
import { House, BOUNDS, TECH } from './house.js';
import { Yard } from './yard.js';

const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 3;

const FOV = 17;
// Long-lens isometric pose the journey settles into.
const REST = { azimuth: -27, elevation: 20, distance: 11.5, target: new THREE.Vector3(0.14, 1.5, 0) };
const CLOSE = { azimuth: -20, elevation: 12, distance: 8.6, target: new THREE.Vector3(0.1, 2.15, 0) };
// Section 3: the cabinet holds the left of the frame, the panel takes the rest.
const WALL = { azimuth: -15, elevation: 9, distance: 12.5, target: new THREE.Vector3(1.98, 1.44, 0) };
// Section 4: the whole house, with room on the right for the phone.
const HOME = { azimuth: -24, elevation: 42, distance: 60, target: new THREE.Vector3(0.2, 0.7, 4.3) };

/** Everything the journey does, as functions of scroll measured in screens. */
export function timeline(u) {
  return {
    // The room starts dark under the hero, and the light comes up as you leave it.
    reveal: sm(0.1, 1.2, u),
    enter: sm(0, 1.3, u),
    order: sm(1.0, 2.2, u),
    dolly: sm(0.7, 3.0, u),
    rise: easeOut(sm(1.27, 2.62, u)),
    joined: sm(2.5, 2.8, u),
    power: sm(2.75, 3.3, u),
    slide: sm(3.7, 4.7, u),
    dash: sm(4.35, 4.85, u),
    morph: sm(6.3, 7.1, u),
    home: sm(6.35, 7.45, u),
  };
}

function studioEnvironment(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0b0c');
  const panel = (w, h, color, strength, x, y, z) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(9, 5, '#fff1dd', 6, -5, 7, 5); // warm overhead softbox
  panel(3, 9, '#cfe2f2', 3.2, 9, 2, 3); // cool strip, right
  panel(8, 2, '#ffffff', 1.6, 0, -3, 9); // low fill
  panel(12, 3, '#ffd7a0', 0.8, -9, 1, -5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.035).texture;
  pmrem.dispose();
  return env;
}

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    this.scene = new THREE.Scene();
    this.scene.environment = studioEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.8;

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 170);

    const key = new THREE.DirectionalLight('#fff2e0', 2.75);
    this.key = key;
    key.position.set(-3.6, 7.2, 5.6);
    key.target.position.set(0.2, 1, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.camera.left = -4.5;
    key.shadow.camera.right = 5.5;
    key.shadow.camera.top = 4.2;
    key.shadow.camera.bottom = -3;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 80;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.012;
    key.shadow.radius = 2.5;
    this.scene.add(key, key.target);

    const rim = new THREE.DirectionalLight('#a9c6e6', 0.9);
    rim.position.set(5, 3, -3);
    this.scene.add(rim);

    // Raking light across the wall, so the concrete reads as a surface.
    this.wash = new THREE.SpotLight('#ffd9a8', 0, 18, 0.62, 0.8, 1.2);
    this.wash.position.set(-6.5, 6, 1.5);
    this.wash.target.position.set(1.2, 2, -0.2);
    this.scene.add(this.wash, this.wash.target);

    this.room = new Room(this.renderer);
    this.scene.add(this.room.group);

    this.cabinet = new Cabinet();
    this.scene.add(this.cabinet.group);
    this.room.buildFloor(this.cabinet.group);

    this.cables = new CableField();
    for (const m of this.cables.materials) {
      m.clippingPlanes = this.room.runClip;
      m.clipShadows = true;
    }
    this.scene.add(this.cables.group);

    this.house = new House();
    this.scene.add(this.house.group);
    this.yard = new Yard();
    this.scene.add(this.yard.group);

    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.gtao = new GTAOPass(this.scene, this.camera, 1, 1);
    this.gtao.blendIntensity = 1;
    // Ambient occlusion ignores clipping and transparency, so those objects sit it out.
    const hideFromAO = this.gtao._overrideVisibility.bind(this.gtao);
    this.gtao._overrideVisibility = () => {
      hideFromAO();
      this.scene.traverseVisible((o) => {
        if (o.userData.noAO) this.gtao._visibilityCache.push(o);
      });
      for (const o of this.gtao._visibilityCache) o.visible = false;
    };
    this.gtao.updateGtaoMaterial({ radius: 0.16, distanceExponent: 1.4, thickness: 1.2, scale: 1.25, samples: 8, distanceFallOff: 1, screenSpaceRadius: false });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 8 });
    this.composer.addPass(this.gtao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.09, 0.32, 1);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    // Last pass: an unsharp mask for crisp edges, and fine grain against banding.
    this.grain = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, seed: { value: 0 }, texel: { value: new THREE.Vector2() } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float seed; uniform vec2 texel; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+seed)*43758.5453); }
        void main(){
          vec3 c=texture2D(tDiffuse,vUv).rgb;
          vec3 b=(texture2D(tDiffuse,vUv+vec2(texel.x,0.)).rgb+texture2D(tDiffuse,vUv-vec2(texel.x,0.)).rgb
            +texture2D(tDiffuse,vUv+vec2(0.,texel.y)).rgb+texture2D(tDiffuse,vUv-vec2(0.,texel.y)).rgb)*.25;
          vec3 s=clamp(c+(c-b)*.5,0.,1.);
          float n=h(gl_FragCoord.xy)-.5+h(gl_FragCoord.yx+7.)-.5;
          gl_FragColor=vec4(s+n*(2./255.),1.);
        }`,
    });
    this.composer.addPass(this.grain);
    this.homeTarget = new THREE.Vector3();
    this.homeShift = 0.2;
    this.keyFrom = key.position.clone();
    this.keyTo = new THREE.Vector3(-9, 18, 16);
    this.keyAim = new THREE.Vector3(0.2, 1, 0);
    this.keyAimHome = new THREE.Vector3(0.2, 0, 4.4);
    this.keyTint = new THREE.Color('#fff2e0');
    this.keyTintHome = new THREE.Color('#C8D8EE');
    this.scene.background = new THREE.Color('#0b0c0d');

    this.view = { target: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), back: new THREE.Vector3(), halfW: 1, halfH: 1 };
    this.roof = new THREE.Vector3();
    this.finalRoof = GLAND.clone();
    this.pointer = { x: 0, y: 0 };
    this.gl = this.renderer.getContext();
    this.probe = new Uint8Array(4);
    this.stillGap = 120;
    this.fullEffects = true;
    this.motionScale = 1;
    this.sharp = false;
    this.dpr = 0;
    this.lastMove = 0;
    this.screenClock = -10;
    this._u = -99;
    this._flow = -99;
    this.resize();
  }

  /** Pixels per CSS pixel while the camera moves: the screen's own density, at most 2. */
  motionRatio() {
    const device = Math.min(window.devicePixelRatio || 1, 2);
    return Math.max(1, device * this.motionScale);
  }

  /** Pixels per CSS pixel at rest. A normal screen gets 2x supersampling, within a budget. */
  stillRatio() {
    const device = window.devicePixelRatio || 1;
    const budget = Math.sqrt(9.5e6 / Math.max(1, window.innerWidth * window.innerHeight));
    return Math.max(Math.min(device, 2), Math.min(2, budget));
  }

  applyRatio(ratio) {
    if (Math.abs(ratio - this.dpr) < 0.01) return;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.dpr = ratio;
    this.setEffects(this.sharp || !this.level);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(w, h);
    // The sharpening kernel is one screen pixel wide, whatever the render size.
    const device = window.devicePixelRatio || 1;
    this.grain.uniforms.texel.value.set(1 / (w * Math.min(ratio, device)), 1 / (h * Math.min(ratio, device)));
    this.forceRender = true;
  }

  /** Full effects at rest. A GPU that struggles gets a lighter set while moving only. */
  setEffects(full) {
    if (full === this.fullEffects) return;
    this.fullEffects = full;
    const samples = full ? 4 : 2;
    for (const rt of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      rt.samples = samples;
      rt.dispose();
    }
    this.gtao.updateGtaoMaterial({ samples: full ? 8 : 4 });
    this.gtao.updatePdMaterial({ samples: full ? 8 : 4 });
    this.bloom.enabled = full;
  }

  resize() {
    this.camera.aspect = Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight);
    this.camera.updateProjectionMatrix();
    this.dpr = 0;
    this.applyRatio(this.sharp ? this.stillRatio() : this.motionRatio());
  }

  /** Called when scrolling cannot hold its frame rate. This only ever affects motion. */
  degrade() {
    this.level = (this.level || 0) + 1;
    if (this.level === 1) {
      this.shadowEvery = 3;
      this.setEffects(this.sharp);
      this.composer.setSize(window.innerWidth, window.innerHeight);
      return;
    }
    this.motionScale = Math.max(0.6, this.motionScale * 0.82);
  }

  /** Where a room sits on screen, in CSS pixels. */
  projectRoom(id) {
    const r = this.house.rooms.get(id);
    this._p ||= new THREE.Vector3();
    this._p.set((r.x0 + r.x1) / 2, 3.1, (r.z0 + r.z1) / 2).project(this.camera);
    return [((this._p.x + 1) / 2) * window.innerWidth, ((1 - this._p.y) / 2) * window.innerHeight];
  }

  /** Compiles the house now, so nothing stalls when it first comes into view. */
  warm() {
    this.house.group.visible = true;
    this.yard.group.visible = true;
    this.renderer.compile(this.scene, this.camera);
    this.house.group.visible = false;
    this.yard.group.visible = false;
  }

  pose(view, azimuth, elevation, distance, target) {
    const az = THREE.MathUtils.degToRad(azimuth);
    const el = THREE.MathUtils.degToRad(elevation);
    view.back.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    view.target.copy(target);
    view.right.set(0, 1, 0).cross(view.back).normalize();
    view.up.copy(view.back).cross(view.right).normalize();
    view.halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * distance;
    view.halfW = view.halfH * this.camera.aspect;
  }

  /** u is scroll in screens, flow is the damped scroll that drives the snaking. */
  update(u, flow, time, homeOverride = null) {
    const s = timeline(u);
    const home = homeOverride ?? s.home;

    const target = this._t || (this._t = new THREE.Vector3());
    target.lerpVectors(CLOSE.target, REST.target, s.dolly);
    target.lerp(WALL.target, s.slide);
    // A narrow window keeps the whole cabinet in frame by standing further back.
    const fit = Math.max(1, 1.55 / this.camera.aspect);
    const rest = REST.distance * fit;
    const distance = mix(mix(CLOSE.distance, rest, s.dolly), WALL.distance * fit, s.slide);
    const sway = s.power * (1 - s.dash);
    const azimuth = mix(mix(CLOSE.azimuth, REST.azimuth, s.dolly), WALL.azimuth, s.slide) + this.pointer.x * 3.2 * sway;
    const elevation = mix(mix(CLOSE.elevation, REST.elevation, s.dolly), WALL.elevation, s.slide) + this.pointer.y * 1.8 * sway;
    // Pulling back to the whole house.
    const homeFit = Math.max(1, 1.6 / this.camera.aspect);
    const homeDistance = HOME.distance * homeFit;
    const az = THREE.MathUtils.degToRad(HOME.azimuth);
    const halfW = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * homeDistance * this.camera.aspect;
    this.homeTarget.copy(HOME.target);
    this.homeTarget.x += Math.cos(az) * halfW * this.homeShift;
    this.homeTarget.z -= Math.sin(az) * halfW * this.homeShift;
    target.lerp(this.homeTarget, home);
    const away = home * home;
    this.pose(this.view, mix(azimuth, HOME.azimuth, home), mix(elevation, HOME.elevation, home), mix(distance, homeDistance, away), target);
    const camDistance = mix(distance, homeDistance, away);

    this.camera.position.copy(this.view.back).multiplyScalar(camDistance).add(target);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(target);

    const lift = mix(-3.6, 0, s.rise);
    this.cabinet.group.position.y = lift;
    this.cabinet.group.visible = s.rise > 0.001;
    this.room.update(s.slide, s.dash * (1 - home));
    this.room.setHome(sm(0, 0.72, home), BOUNDS, TECH);
    this.house.group.visible = home > 0.002;
    this.house.group.userData.noAO = home < 0.98;
    this.yard.group.visible = home > 0.45;
    this.yard.group.userData.noAO = home < 0.98;
    this.cables.group.userData.noAO = home > 0.001;
    this.room.tray.userData.noAO = home > 0.001;
    if (home > 0.002) {
      this.house.setReveal(sm(0.3, 0.95, home));
      this.house.update(this.frameDt || 0.016);
      const garden = sm(0.5, 1, home);
      this.yard.setReveal(garden);
      this.house.setOutdoor(garden);
    }
    if (home !== this._home) {
      this._home = home;
      const c = this.key.shadow.camera;
      c.left = mix(-4.5, -24, home);
      c.right = mix(5.5, 24, home);
      c.top = mix(4.2, 24, home);
      c.bottom = mix(-3, -22, home);
      c.updateProjectionMatrix();
      this.key.position.lerpVectors(this.keyFrom, this.keyTo, home);
      this.key.target.position.lerpVectors(this.keyAim, this.keyAimHome, home);
      this.key.color.lerpColors(this.keyTint, this.keyTintHome, home);
    }
    this.wash.intensity = mix(mix(mix(30, 56, s.slide), 16, s.dash) * mix(0.1, 1, s.reveal), 16, home);
    this.scene.environmentIntensity = mix(mix(0.14, 0.8, s.reveal), 0.46, home);
    // Softer key while the tangle fills the frame, so the cables stay in the room.
    this.key.intensity = mix(mix(1.75, 2.75, s.order) * mix(0.12, 1, s.reveal), 1.25, home);
    this.roof.copy(GLAND);
    this.roof.y += lift;

    // Nothing moved, so the cable meshes and shadow maps can stay as they are.
    const pointerMoved = s.power > 0 && (this.pointer.x !== this._px || this.pointer.y !== this._py);
    const moved = Math.abs(u - this._u) > 1e-4 || Math.abs(flow - this._flow) > 1e-4 || (pointerMoved && sway > 0.02) || Math.abs(home - (this._h2 ?? -1)) > 1e-4;
    this._h2 = home;
    if (moved) {
      this._u = u;
      this._flow = flow;
      this._px = this.pointer.x;
      this._py = this.pointer.y;
      this.cables.update(this.view, {
        enter: s.enter,
        order: s.order,
        flow,
        roof: this.roof,
        finalRoof: this.finalRoof,
      });
      this.shadowTick = (this.shadowTick || 0) + 1;
      if (this.shadowTick % (this.shadowEvery || 1) === 0) this.renderer.shadowMap.needsUpdate = true;
    }
    this.moved = moved;

    this.cabinet.setPower(s.power);
    if (s.rise > 0.001) {
      this.cabinet.tick(time, s.power, this.dpr);
      const bootEnd = Math.floor(s.power * 40);
      const slot = s.power >= 0.5 ? Math.floor(time * 2) : bootEnd;
      if (slot !== this.screenClock || this.cabinet.screenDirty) {
        this.screenClock = slot;
        this.cabinet.screenDirty = false;
        this.cabinet.drawScreen(s.power, time);
      }
    }
  }

  /** A still scene only needs its LEDs and screens refreshed, so it runs at a low rate. */
  render(now) {
    // Speed only matters while moving. Once the camera rests, quality comes back in full.
    if (this.moved) this.lastMove = now;
    // Under the hero the room is dark and hidden, so it stays at the lighter setting.
    const sharp = !this.moved && this._u > 0.7 && now - this.lastMove > 170;
    if (sharp !== this.sharp) {
      this.sharp = sharp;
      this.costProbe = sharp ? 2 : 0;
    }
    this.applyRatio(sharp ? this.stillRatio() : this.motionRatio());
    const gap = this.house.group.visible && this.house.busy ? 60 : this.stillGap;
    if (!this.moved && !this.forceRender && now - (this.lastRender || 0) < gap) return;
    this.lastRender = now;
    this.forceRender = false;
    this.grain.uniforms.seed.value = (this.grain.uniforms.seed.value + 1.37) % 97;
    const started = performance.now();
    this.composer.render();
    // Once per stop, time a sharp frame on this GPU, and refresh rarely enough that
    // the LEDs and screen never take more than about a quarter of it.
    if (this.costProbe && --this.costProbe === 0) {
      this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.probe);
      this.stillGap = Math.min(1000, Math.max(120, (performance.now() - started) * 4));
    }
  }
}
