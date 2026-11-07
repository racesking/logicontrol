// Sweeps the whole scroll and measures every cable: any end inside the frame, the tightest bend.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8137/' });
for (let i = 0; i < 60; i++) { await sleep(200); if (await ev('window.__frames > 3')) break; }
const out = await ev(`(() => {
  const st = window.__stage, cam = st.camera, rows = [];
  const P = (pts, i) => { const v = cam.position.clone().set(pts[i*3],pts[i*3+1],pts[i*3+2]).project(cam); return v; };
  for (let u = 0; u <= 3.4001; u += 0.1) {
    st._u = -9; st.update(u, u, 0);
    cam.updateMatrixWorld();
    let endsIn = 0, worst = 0, inFrame = 0;
    for (const c of st.cables.cables) {
      const n = c.pts.length / 3 - 1;
      for (const i of [0, n]) { const v = P(c.pts, i); if (Math.abs(v.x) < 1 && Math.abs(v.y) < 1) endsIn++; }
      const step = 10;
      for (let i = step; i <= n - step; i += 3) {
        const v = P(c.pts, i);
        if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
        inFrame = 1;
        const a = [c.pts[i*3]-c.pts[(i-step)*3], c.pts[i*3+1]-c.pts[(i-step)*3+1], c.pts[i*3+2]-c.pts[(i-step)*3+2]];
        const b = [c.pts[(i+step)*3]-c.pts[i*3], c.pts[(i+step)*3+1]-c.pts[i*3+1], c.pts[(i+step)*3+2]-c.pts[i*3+2]];
        const la = Math.hypot(...a), lb = Math.hypot(...b);
        if (la < 1e-4 || lb < 1e-4) continue;
        const d = (a[0]*b[0]+a[1]*b[1]+a[2]*b[2])/(la*lb);
        worst = Math.max(worst, Math.acos(Math.max(-1, Math.min(1, d))) * 57.3);
      }
    }
    rows.push(u.toFixed(1) + ':' + endsIn + '/' + Math.round(worst));
  }
  return rows.join('  ');
})()`);
const land = await ev(`(() => { const st = window.__stage; st._u = -9; st.update(4, 4, 0); const g = st.finalRoof; let worst = 0, fromVertical = 0; for (const c of st.cables.cables) { const p = c.pts, n = p.length/3-1; const dx = p[n*3]-(g.x+c.gland[0]), dz = p[n*3+2]-(g.z+c.gland[1]); worst = Math.max(worst, Math.hypot(dx,dz)); const m = n-14; const t=[p[n*3]-p[m*3],p[n*3+1]-p[m*3+1],p[n*3+2]-p[m*3+2]]; fromVertical = Math.max(fromVertical, Math.acos(Math.min(1,Math.abs(t[1])/Math.hypot(...t)))*57.3); } return 'at rest: worst miss from gland ' + (worst*1000).toFixed(1) + ' mm, worst entry angle off vertical ' + fromVertical.toFixed(1) + ' deg'; })()`);
console.log(land);
console.log('u:endsInFrame/worstBendDeg');
console.log(out);
sock.close(); proc.kill(); process.exit(0);
