import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { D } from './cabinet.js';
import { faceTexture, spangleTexture } from './textures.js';

// The plant room wall. Everything is true to scale, in metres.
export const WALL_Z = -D / 2 - 0.03;
export const TRAY = {
  y: 2.56, // centre line of the tray on the wall
  width: 0.46,
  flange: 0.06,
  z: WALL_Z + 0.05, // base of the tray, on its stand-offs
  left: -0.5, // the organised run stops 3/4 of the way to the cabinet,
  right: 1.05, // and the last quarter of each cable drops free into the gland
};

const QUAD_VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';

// Cast concrete: 8 m by 4 m of formwork panels. x and y are in metres.
const CONCRETE = `
  varying vec2 vUv;
  uniform float outputHeight;
  float h1(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float a=.5,s=0.; mat2 m=mat2(.8,.6,-.6,.8); for(int i=0;i<6;i++){ s+=a*vn(p); p=m*p*2.03+7.1; a*=.5; } return s; }
  float voids(vec2 p,float keep){
    vec2 i=floor(p),f=fract(p); float best=0.;
    for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
      vec2 c=vec2(float(x),float(y));
      vec2 id=i+c;
      float live=step(1.-keep,h1(id+17.));
      vec2 o=vec2(h1(id),h1(id+5.));
      float r=.08+.3*h1(id+9.)*h1(id+9.);
      best=max(best,live*(1.-smoothstep(r*.55,r,length(c+o-f))));
    }
    return best;
  }
  void main(){
    vec2 p=vUv*vec2(8.,4.);
    vec2 panel=vec2(2.,1.);
    vec2 id=floor(p/panel);
    vec2 q=mod(p,panel);
    float tone=(h1(id+3.)-.5)*.09;
    float mottling=fbm(p*1.1)*.2+fbm(p*6.)*.08;
    float streak=fbm(vec2(p.x*11.,p.y*.55))*.14;
    float fine=fbm(p*46.)*.05;
    float base=.3+mottling+streak*.6+fine+tone;
    // Board marks run along each panel.
    float board=smoothstep(.0,.006,abs(fract(q.y*6.)-.5)-.492);
    // Bug holes: the small air voids of cast concrete.
    float zone=smoothstep(.42,.62,fbm(p*2.3));
    float void1=voids(p*34.,.3)*zone;
    float void2=voids(p*88.,.22)*smoothstep(.36,.6,fbm(p*4.+9.));
    float seam=1.-smoothstep(.002,.007,min(min(q.x,panel.x-q.x),min(q.y,panel.y-q.y)));
    float hole=0.;
    for(int i=0;i<2;i++){ vec2 c=vec2(i==0?.34:1.66,.5); hole=max(hole,1.-smoothstep(.012,.016,length(q-c))); }
    float rust=0.;
    for(int i=0;i<2;i++){ vec2 c=vec2(i==0?.34:1.66,.5); vec2 d=q-c; rust=max(rust,smoothstep(.03,.0,abs(d.x)+.0)*smoothstep(-.42,-.02,d.y)*step(d.y,0.)*fbm(p*vec2(30.,3.))); }
    if(outputHeight>.5){
      float hgt=.55+fbm(p*22.)*.24+fbm(p*70.)*.1-void1*.42-void2*.3-seam*.5-hole*.9-board*.06;
      gl_FragColor=vec4(hgt,.62+fbm(p*4.)*.3-seam*.1,0.,1.);
      return;
    }
    vec3 col=vec3(.5,.51,.52)*base;
    col*=1.-void1*.6-void2*.4-seam*.6-hole*.85-board*.1;
    col=mix(col,vec3(.17,.11,.08),rust*.3);
    gl_FragColor=vec4(col,1.);
  }`;

function bakeConcrete(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: { outputHeight: { value: 0 } },
    vertexShader: QUAD_VS,
    fragmentShader: CONCRETE,
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  const bake = (w, h, height) => {
    const rt = new THREE.WebGLRenderTarget(w, h, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      depthBuffer: false,
    });
    rt.texture.anisotropy = 16;
    material.uniforms.outputHeight.value = height;
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    return rt.texture;
  };
  const map = bake(4096, 2048, 0);
  const relief = bake(2048, 1024, 1);
  material.dispose();
  return { map, relief };
}

/** A box with its texture tiled at real size. */
function tiledBox(w, h, d, perU, perV) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) * perU, pos.getY(i) * perV + 0.5);
  return g.toNonIndexed();
}

function slottedPlate() {
  // One 100 mm repeat of the punched base: staggered oblong slots, as on real tray.
  const tex = faceTexture(100, 100, (g) => {
    g.fillStyle = '#b9bdbf';
    g.fillRect(0, 0, 100, 100);
    const slot = (x, y) => {
      g.fillStyle = '#0c0d0e';
      g.beginPath();
      g.roundRect(x - 7, y - 3.4, 14, 6.8, 3.4);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 0.5;
      g.beginPath();
      g.moveTo(x - 4, y + 3.7);
      g.lineTo(x + 4, y + 3.7);
      g.stroke();
    };
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        slot(16.67 + c * 33.33 + (r % 2 ? 16.67 : 0), 12.5 + r * 25);
        if (r % 2 && c === 2) slot(0, 12.5 + r * 25);
      }
    }
  }, 10);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function flangeStrip() {
  const tex = faceTexture(100, 50, (g) => {
    g.fillStyle = '#b4b8ba';
    g.fillRect(0, 0, 100, 50);
    g.fillStyle = '#0c0d0e';
    for (let x = 0; x < 2; x++) {
      g.beginPath();
      g.roundRect(14 + x * 50, 20, 22, 9, 4.5);
      g.fill();
    }
  }, 10);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class Room {
  constructor(renderer) {
    this.group = new THREE.Group();
    const plane = (x, y, z) => new THREE.Plane(new THREE.Vector3(x, y, z), 100);
    // At home the endless wall, floor and tray shrink to the house. Far away until then.
    this.wallClip = [plane(1, 0, 0), plane(-1, 0, 0), plane(0, -1, 0), plane(0, 1, 0)];
    this.floorClip = [plane(1, 0, 0), plane(-1, 0, 0), plane(0, 0, -1)];
    this.runClip = [plane(1, 0, 0), plane(-1, 0, 0)];
    const { map, relief } = bakeConcrete(renderer);
    this.concrete = { map, relief };

    this.wallMat = new THREE.MeshStandardMaterial({
      map,
      bumpMap: relief,
      bumpScale: 1.6,
      roughnessMap: relief,
      roughness: 1,
      metalness: 0,
      clippingPlanes: this.wallClip,
    });
    const wallW = 24;
    const wallH = 12;
    const wallGeo = new THREE.PlaneGeometry(wallW, wallH);
    const uv = wallGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * wallW) / 8, (uv.getY(i) * wallH) / 4);
    const wall = new THREE.Mesh(wallGeo, this.wallMat);
    wall.position.set(2, 0.6, WALL_Z);
    wall.receiveShadow = true;
    this.group.add(wall);

    this.buildTray();
  }

  /** The floor rises with the cabinet, so it is added to the cabinet's group. */
  buildFloor(parent) {
    const { map, relief } = this.concrete;
    this.floorMat = new THREE.MeshStandardMaterial({ map, bumpMap: relief, bumpScale: 0.6, roughnessMap: relief, roughness: 0.62, color: '#6d7074', clippingPlanes: this.floorClip });
    const w = 28;
    const d = 16;
    const geo = new THREE.PlaneGeometry(w, d);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 8, (uv.getY(i) * d) / 4);
    const floor = new THREE.Mesh(geo, this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(2, 0, WALL_Z + d / 2);
    floor.receiveShadow = true;
    parent.add(floor);
  }

  buildTray() {
    const spangle = spangleTexture(9);
    spangle.repeat.set(3, 3);
    const base = new THREE.MeshStandardMaterial({ map: slottedPlate(), metalness: 0.82, roughness: 0.4 });
    const flange = new THREE.MeshStandardMaterial({ map: flangeStrip(), metalness: 0.82, roughness: 0.38 });
    const steel = new THREE.MeshStandardMaterial({ map: spangle, metalness: 0.9, roughness: 0.34 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2d30', metalness: 0.8, roughness: 0.42 });
    const strap = new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.5 });

    this.tray = new THREE.Group();
    const parts = new Map();
    const push = (mat, geo, x, y, z) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      g.translate(x, y, z);
      if (!parts.has(mat)) parts.set(mat, []);
      parts.get(mat).push(g);
    };

    const { y, width, flange: fl, z } = TRAY;
    const t = 0.0025;
    const run = (x0, x1, capEnd) => {
      const len = x1 - x0;
      const xc = (x0 + x1) / 2;
      push(base, tiledBox(len, width, t, 10, 10), xc, y, z);
      for (const sy of [-1, 1]) {
        const g = new THREE.BoxGeometry(len, t, fl);
        // Flange texture runs along the length, on the visible faces.
        const uv = g.attributes.uv;
        const p = g.attributes.position;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * 10, p.getZ(i) / fl + 0.5);
        push(flange, g, xc, y + sy * (width / 2), z + fl / 2);
        // Rolled lip along the open edge
        push(steel, new THREE.BoxGeometry(len, 0.007, 0.004), xc, y + sy * (width / 2 - 0.0025), z + fl);
      }
      // Stand-off brackets into the wall
      for (let x = Math.ceil(x0 / 1.2) * 1.2; x < x1; x += 1.2) {
        push(dark, new THREE.BoxGeometry(0.05, width + 0.05, 0.004), x, y, z - 0.012);
        for (const sy of [-1, 1]) {
          push(dark, new THREE.BoxGeometry(0.04, 0.03, 0.05), x, y + sy * (width / 2 + 0.008), WALL_Z + 0.025);
          push(steel, new THREE.CylinderGeometry(0.008, 0.008, 0.006, 12).rotateX(Math.PI / 2), x, y + sy * (width / 2 + 0.008), WALL_Z + 0.053);
        }
      }
      // Straps holding the cables to the tray
      for (let x = Math.ceil(x0 / 0.6) * 0.6 + 0.08; x < x1 - 0.05; x += 0.6) {
        push(strap, new THREE.BoxGeometry(0.014, width - 0.02, 0.003), x, y, z + 0.052);
        for (const sy of [-1, 1]) push(strap, new THREE.BoxGeometry(0.014, 0.004, 0.05), x, y + sy * (width / 2 - 0.012), z + 0.027);
      }
      // End cap: a cut, deburred end
      push(steel, new THREE.BoxGeometry(0.003, width, 0.012), capEnd, y, z + 0.006);
    };
    run(-11, TRAY.left, TRAY.left);
    run(TRAY.right, 13, TRAY.right);

    for (const [mat, list] of parts) {
      const clean = list.map((g) => {
        for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
        return g;
      });
      const mesh = new THREE.Mesh(mergeGeometries(clean, false), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mat.clippingPlanes = this.runClip;
      mat.clipShadows = true;
      this.tray.add(mesh);
    }
    this.group.add(this.tray);
  }

  /** e: 0 is the endless plant room, 1 is the back wall of the house. */
  setHome(e, house, tech) {
    const far = 60;
    const near = (a, b) => a + (b - a) * e;
    this.wallClip[0].constant = -near(-far, house.x0);
    this.wallClip[1].constant = near(far, house.x1);
    this.wallClip[2].constant = near(far, 3);
    this.wallClip[3].constant = near(far, 0.4);
    this.floorClip[0].constant = -near(-far, house.x0);
    this.floorClip[1].constant = near(far, house.x1);
    this.floorClip[2].constant = near(far, house.z1);
    this.runClip[0].constant = -near(-far, tech.x0);
    this.runClip[1].constant = near(far, tech.x1);
  }

  /** lit: the room coming up in section 3. dim: the room stepping back behind the panel. */
  update(lit, dim) {
    const g = 0.15 + lit * 0.24 - dim * 0.2;
    this.wallMat.color.setRGB(g, g, g);
  }
}
