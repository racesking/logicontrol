// Drives the AHU view with real clicks.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const prof = mkdtempSync(join(tmpdir(), 'lc-'));
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--window-size=1440,900', 'about:blank']);
const ws = await new Promise((res) => { let b = ''; proc.stderr.on('data', (d) => { b += d; const m = b.match(/ws:\/\/[^\s]+/); if (m) res(m[0]); }); });
const page = (await (await fetch(`http://127.0.0.1:${new URL(ws).port}/json`)).json()).find((t) => t.type === 'page');
const sock = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => { sock.onopen = r; });
let id = 0; const pend = new Map(); const errs = [];
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 }); writeFileSync(join(here, name), Buffer.from(s.result.data, 'base64')); };
const click = async (sel) => {
  const box = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
  if (!box) { console.log('NOT FOUND', sel); return; }
  const [x, y] = box;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};
const txt = (s) => ev(`document.querySelector(${JSON.stringify(s)})?.textContent.replace(/\\s+/g,' ').trim()`);
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8137/' });
for (let i = 0; i < 60; i++) { await sleep(200); if (await ev('window.__frames > 3')) break; }
await ev(`window.scrollTo({top:5.2*innerHeight,behavior:'instant'})`);
for (let i = 0; i < 100; i++) { await sleep(300); if ((await ev(`parseFloat(getComputedStyle(document.getElementById('bms')).getPropertyValue('--show'))`)) > 0.98) break; }
console.log('panel ready, inert:', await ev(`document.getElementById('bms').hasAttribute('inert')`));
await click('.bms-rail [data-view="ahu"]');
await sleep(1800);
await shot('w-ahu.jpg');
console.log('title:', await txt('#s3-title'), '| flow tag:', await txt('[data-tag="flow"] b'), '| fan:', await txt('[data-tag="fanSup"] b'));
await click('[data-plant="f-up"]');
await sleep(300);
console.log('asked:', await ev(`[...document.querySelectorAll('#plant .bms-set strong')].map(e=>e.textContent).join(' / ')`), '| measured flow:', await txt('[data-tag="flow"] b'), '| chain', await ev(`document.querySelectorAll('#plant .bms-chain .is-done').length`));
await sleep(5000);
console.log('after ramp flow:', await txt('[data-tag="flow"] b'), '| chain', await ev(`document.querySelectorAll('#plant .bms-chain .is-done').length`));
await click('[data-plant="power"]');
await sleep(14000);
await shot('w-off.jpg');
console.log('off: flow', await txt('[data-tag="flow"] b'), '| fan', await txt('[data-tag="fanSup"] b'), '| damper', await txt('[data-tag="damperEx"] b'), '| toggle', await txt('[data-plant="power"] em'));
await click('[data-plant="power"]');
await sleep(9000);
console.log('back on: flow', await txt('[data-tag="flow"] b'), '| damper', await txt('[data-tag="damperEx"] b'));
await click('[data-plant="hp-up"]');
await sleep(2500);
console.log('hp:', await ev(`[...document.querySelectorAll('#plant .bms-set strong')].map(e=>e.textContent).join(' / ')`));
await click('.bms-rail [data-view="building"]');
await sleep(900);
console.log('back to building:', await txt('#s3-title'), '| canvas shown', await ev(`!document.querySelector('.bms-body').hidden`));
console.log('overflow:', await ev('document.documentElement.scrollWidth-document.documentElement.clientWidth'));
console.log(errs.length ? 'errors: ' + errs.slice(0, 4).join(' | ') : 'no exceptions');
sock.close(); proc.kill(); process.exit(0);
