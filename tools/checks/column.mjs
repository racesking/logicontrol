// Measures the visible straight run of cable above the rising cabinet, in screen pixels.
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
console.log(await ev(`(() => {
  const st = window.__stage, cam = st.camera, rows = []; let max = 0, at = 0;
  const px = (x, y, z) => { const v = cam.position.clone().set(x, y, z).project(cam); return (1 - v.y) / 2 * 900; };
  for (let u = 1.7; u <= 2.4001; u += 0.05) {
    st._u = -9; st.update(u, u, 0); cam.updateMatrixWorld();
    const c = st.cables.cables[5];
    const top = Math.max(0, px(st.roof.x, c.bendY, st.roof.z));
    const bottom = Math.min(900, px(st.roof.x, st.roof.y, st.roof.z));
    const run = Math.max(0, Math.round(bottom - top));
    rows.push(u.toFixed(1) + ':' + run);
    if (run > max) { max = run; at = u; }
  }
  const cabinetVisibleRun = rows.join(' ');
  return 'longest run ' + max + ' px at u=' + at.toFixed(1) + '\\n' + cabinetVisibleRun;
})()`));
sock.close(); proc.kill(); process.exit(0);
