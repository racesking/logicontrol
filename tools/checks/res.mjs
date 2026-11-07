// usage: node res.mjs <prefix> [dsf...] : real wheel scroll to the cabinet, then report the render size,
// true GPU frame cost, and save a crop of the cabinet.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [prefix, ...dsfs] = process.argv.slice(2);
for (const dsf of (dsfs.length ? dsfs : ['1', '1.5', '2']).map(Number)) {
  const prof = mkdtempSync(join(tmpdir(), 'lc-'));
  const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--window-size=1440,900', 'about:blank']);
  const ws = await new Promise((res) => { let b = ''; proc.stderr.on('data', (d) => { b += d; const m = b.match(/ws:\/\/[^\s]+/); if (m) res(m[0]); }); });
  const page = (await (await fetch(`http://127.0.0.1:${new URL(ws).port}/json`)).json()).find((t) => t.type === 'page');
  const sock = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => { sock.onopen = r; });
  let id = 0; const pend = new Map();
  sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) console.log('EXC', r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: dsf, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8137/' });
  for (let i = 0; i < 80; i++) { await sleep(200); if (await ev('window.__frames > 3')) break; }
  // A real scroll down to the cabinet
  for (let i = 0; i < 62; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 300, y: 500, deltaX: 0, deltaY: 50 }); await sleep(45); }
  await sleep(4500);
  const info = await ev(`(()=>{const s=window.__stage,c=s.canvas;const gl=s.renderer.getContext();const px=new Uint8Array(4);
    const t=[];for(let i=0;i<4;i++){s.forceRender=true;const a=performance.now();s.render(performance.now()+1e6);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);t.push(performance.now()-a)}
    s.lastRender=0;return {u:(scrollY/innerHeight).toFixed(2),css:innerWidth+'x'+innerHeight,dpr:devicePixelRatio,buffer:c.width+'x'+c.height,perCssPx:(c.width/innerWidth).toFixed(2),perDevicePx:(c.width/innerWidth/devicePixelRatio).toFixed(2),motionScale:s.motionScale.toFixed(2),level:s.level||0,bloom:s.bloom.enabled,gpuMs:Math.round(t.slice(1).reduce((a,b)=>a+b)/3)}})()`);
  console.log(JSON.stringify(info));
  const grab = async (name) => {
    const y = await ev('Math.round(scrollY)');
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, clip: { x: 470, y: y + 300, width: 420, height: 530, scale: 1 } });
    writeFileSync(join(here, name), Buffer.from(shot.result.data, 'base64'));
  };
  await sleep(1500);
  await grab(`${prefix}-after-dsf${dsf}.png`);
  // Reproduce the old behaviour in the same frame: resolution halved, lighter effects.
  const old = dsf === 1 ? 1 : dsf === 1.5 ? 1 : 1.04;
  await ev(`(()=>{const s=window.__stage;s.level=3;s.sharp=false;s.setEffects(false);s.setEffects=()=>{};s.stillRatio=()=>${old};s.motionRatio=()=>${old};s.forceRender=true})()`);
  await sleep(2500);
  await grab(`${prefix}-before-dsf${dsf}.png`);
  sock.close(); proc.kill();
  await sleep(500);
}
process.exit(0);
