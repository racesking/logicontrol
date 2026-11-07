// usage: node perf.mjs <w> <h> : settled and scrolling frame rates at several positions
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [w, h] = process.argv.slice(2).map(Number);
const prof = mkdtempSync(join(tmpdir(), 'lc-'));
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${prof}`, `--window-size=${w},${h}`, 'about:blank']);
const ws = await new Promise((res) => { let b = ''; proc.stderr.on('data', (d) => { b += d; const m = b.match(/ws:\/\/[^\s]+/); if (m) res(m[0]); }); });
const page = (await (await fetch(`http://127.0.0.1:${new URL(ws).port}/json`)).json()).find((t) => t.type === 'page');
const sock = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => { sock.onopen = r; });
let id = 0; const pend = new Map();
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: Number(process.env.DSF || 1), mobile: false });
await send('Page.navigate', { url: 'http://localhost:8137/' });
for (let i = 0; i < 80; i++) { await sleep(200); if (await ev('window.__frames > 3')) break; }
const fps = async (ms = 1500) => { const a = await ev('window.__frames'); await sleep(ms); return Math.round(((await ev('window.__frames')) - a) * 1000 / ms); };
for (const u of [1.5, 5.5, 6.8, 7.85]) {
  await ev(`window.scrollTo({top:${u}*innerHeight,behavior:'instant'})`);
  await sleep(6000);
  const settled = await fps();
  const a = await ev('window.__frames');
  for (let i = 0; i < 24; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 300, y: 450, deltaX: 0, deltaY: i % 2 ? -40 : 40 }); await sleep(50); }
  const moving = Math.round(((await ev('window.__frames')) - a) / 1.3);
  console.log(`u=${u} settled ${settled} fps, moving ~${moving} fps`);
}
sock.close(); proc.kill(); process.exit(0);
