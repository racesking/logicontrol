// usage: node shot.mjs <width> <height> <prefix> <u...>   (scroll positions in screens)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [w, h, prefix, ...us] = process.argv.slice(2);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const prof = mkdtempSync(join(tmpdir(), 'lc-'));
const proc = spawn(chrome, ['--headless=new', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${prof}`, `--window-size=${w},${h}`, 'about:blank']);
const ws = await new Promise((res, rej) => {
  let buf = '';
  proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/ws:\/\/[^\s]+/); if (m) res(m[0]); });
  setTimeout(() => rej(new Error('no devtools url')), 15000);
});
const port = new URL(ws).port;
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find((t) => t.type === 'page');
const sock = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => { sock.onopen = r; });
let id = 0;
const pending = new Map();
const logs = [];
sock.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(m.params.type + ' ' + m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: Number(process.env.DSF || 1), mobile: false });
await send('Page.navigate', { url: 'http://localhost:8137/' });
for (let i = 0; i < 60; i++) { await sleep(250); if (await ev('window.__frames > 3')) break; }
console.log('renderer:', await ev(`(()=>{const c=document.createElement('canvas').getContext('webgl2');const e=c.getExtension('WEBGL_debug_renderer_info');return e?c.getParameter(e.UNMASKED_RENDERER_WEBGL):'?'})()`));

for (const u of us) {
  await ev(`window.scrollTo({top:${u}*innerHeight,behavior:'instant'})`);
  await sleep(1700);
  const f0 = await ev('window.__frames');
  await sleep(1000);
  const fps = (await ev('window.__frames')) - f0;
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  writeFileSync(join(here, `${prefix}-${u}.jpg`), Buffer.from(shot.result.data, 'base64'));
  console.log(`u=${u} fps~${fps}`);
}
console.log(logs.length ? [...new Set(logs)].slice(0, 12).join('\n') : 'console: clean');
sock.close();
proc.kill();
process.exit(0);
