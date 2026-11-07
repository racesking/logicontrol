import * as THREE from 'three';

// All surface detail is generated at start-up, so the prototype ships no texture files.

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function finish(c, { srgb = true, repeat = false, aniso = 16 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Fine grain for bump maps: rubber, powder coat, moulded plastic. */
export function grainTexture({ size = 256, seed = 1, base = 128, spread = 60, blobs = 0 } = {}) {
  const c = canvas(size, size);
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const r = rng(seed);
  for (let i = 0; i < size * size; i++) {
    const v = base + (r() - 0.5) * spread;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < blobs; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 2 + r() * 7;
    const v = r() > 0.5 ? 255 : 0;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${v},${v},${v},0.16)`);
    grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return finish(c, { srgb: false, repeat: true });
}

/** Hot-dip galvanised plate: faint crystalline spangle. */
export function spangleTexture(seed = 3) {
  const size = 512;
  const c = canvas(size, size);
  const g = c.getContext('2d');
  g.fillStyle = '#b6babc';
  g.fillRect(0, 0, size, size);
  const r = rng(seed);
  for (let i = 0; i < 900; i++) {
    const x = r() * size;
    const y = r() * size;
    const n = 5 + Math.floor(r() * 3);
    const rad = 8 + r() * 26;
    const shade = 168 + r() * 44;
    g.fillStyle = `rgba(${shade},${shade + 2},${shade + 4},0.5)`;
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r() * 0.6;
      const rr = rad * (0.6 + r() * 0.6);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
  }
  return finish(c, { repeat: true });
}

/**
 * Cable jacket, wrapped so u runs along the cable and v around it.
 * Sheathed cables carry a printed marking, as real CYY-F does.
 */
export function jacketTexture({ color, stripe = null, print = null, ink = '#D8D6CF', seed = 5 }) {
  const w = 2048;
  const h = 256;
  const c = canvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  if (stripe) {
    g.fillStyle = stripe;
    g.fillRect(0, h * 0.08, w, h * 0.3);
    g.fillRect(0, h * 0.58, w, h * 0.3);
  }
  // Extrusion leaves faint lengthwise tone changes.
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.012 + r() * 0.02})`;
    g.fillRect(0, r() * h, w, 1 + r() * 4);
  }
  if (print) {
    g.fillStyle = ink;
    g.globalAlpha = 0.72;
    g.font = '500 60px "Geist Mono", monospace';
    g.textBaseline = 'middle';
    g.save();
    g.scale(1, 0.72);
    g.fillText(print, 36, (h * 0.5) / 0.72);
    g.fillText(print, w * 0.52, (h * 0.5) / 0.72);
    g.restore();
    g.globalAlpha = 1;
  }
  return finish(c, { repeat: true, aniso: 16 });
}

/** A drawn face for a device, sized in millimetres at a fixed pixel density. */
export function faceTexture(wMm, hMm, draw, density = 10) {
  const w = Math.max(16, Math.round(wMm * density));
  const h = Math.max(16, Math.round(hMm * density));
  const c = canvas(w, h);
  const g = c.getContext('2d');
  g.scale(density, density);
  draw(g, wMm, hMm);
  return finish(c);
}

/** A live canvas, for screens that redraw. */
export function liveCanvas(w, h) {
  const c = canvas(w, h);
  return { canvas: c, ctx: c.getContext('2d'), texture: finish(c) };
}

/** Soft circular falloff, for a floor patch that fades into the page. */
export function radialAlpha(size = 512) {
  const c = canvas(size, size);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size / 2);
  grd.addColorStop(0, '#fff');
  grd.addColorStop(0.55, '#8a8a8a');
  grd.addColorStop(1, '#000');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return finish(c, { srgb: false });
}

/** A rectangular falloff for the shadow where the enclosure meets the floor. */
export function contactTexture(size = 256) {
  const c = canvas(size, size);
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  g.filter = `blur(${size * 0.07}px)`;
  g.fillStyle = '#fff';
  g.fillRect(size * 0.2, size * 0.3, size * 0.6, size * 0.4);
  g.filter = 'none';
  return finish(c, { srgb: false });
}
