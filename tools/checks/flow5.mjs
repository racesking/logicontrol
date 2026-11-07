// Captures the hero cabinet plate, then tests the service index and assistant with real input.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const plate = process.argv[2];
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
const shot = async (name, quality = 90, out = join(here, name)) => { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality }); writeFileSync(out, Buffer.from(s.result.data, 'base64')); };
const at = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
const move = async (sel) => { const b = await at(sel); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b[0], y: b[1] }); };
const click = async (sel) => {
  const b = await at(sel);
  if (!b) { console.log('NOT FOUND', sel); return; }
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b[0], y: b[1], button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b[0], y: b[1], button: 'left', clickCount: 1 });
};
const txt = (s) => ev(`document.querySelector(${JSON.stringify(s)})?.textContent.replace(/\\s+/g,' ').trim()`);
const on = () => ev(`document.querySelector('.hero-photo.is-on').dataset.photo`);
await send('Page.enable'); await send('Runtime.enable');
const load = async (w, h, dsf = 1) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dsf, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8137/' });
  await sleep(600);
  for (let i = 0; i < 80; i++) { await sleep(200); if (await ev('window.__frames > 3')) break; }
};

if (plate) {
  await load(1920, 1080, 1.5);
  await ev(`(()=>{const s=document.createElement('style');s.textContent='.preview-bar,.site-header,main{visibility:hidden!important}';document.head.append(s);window.scrollTo({top:3.4*innerHeight,behavior:'instant'})})()`);
  await sleep(7000);
  await shot('', 84, plate);
  console.log('plate written');
}

await load(1440, 900);
await sleep(1200);
for (const r of ['ducts', 'cabinet', 'servers', 'electrical', 'pipes']) {
  await move(`.svc[data-photo="${r}"]`);
  await sleep(1000);
  console.log('hover', r, '->', await on(), '| bg set', await ev(`getComputedStyle(document.querySelector('.hero-photo.is-on')).backgroundImage.slice(-22)`), '| row on', await txt('.svc.is-on .svc-name'));
  await shot(`h-${r}.jpg`);
}
await ev(`document.querySelector('.svc[data-photo="servers"]').focus()`);
await sleep(100);
console.log('focus selects:', await on());
await click('.svc[data-photo="ducts"]');
for (let i = 0; i < 40; i++) { await sleep(300); if ((await ev(`parseFloat(getComputedStyle(document.getElementById('bms')).getPropertyValue('--show'))`)) > 0.98) break; }
await sleep(1600);
console.log('click HVAC -> view:', await txt('#s3-title'), '| scrollY', await ev('Math.round(scrollY)'), '| focus', await ev(`document.activeElement.getAttribute('aria-label')`));
await ev(`window.scrollTo({top:0,behavior:'instant'})`);
await sleep(1500);
await click('.svc[data-photo="cabinet"]');
await sleep(3500);
console.log('click Tablouri -> u', await ev('(scrollY/innerHeight).toFixed(2)'), '| power', await ev(`window.__stage.cabinet.power.toFixed(2)`));
await shot('h-landed.jpg');
await ev(`window.scrollTo({top:0,behavior:'instant'})`);
await sleep(1200);
await click('#assistant-toggle');
await sleep(300);
const style = await ev(`(()=>{const c=getComputedStyle(document.getElementById('assistant-toggle'));const r=document.getElementById('assistant-toggle').getBoundingClientRect();return [c.borderRadius,Math.round(r.width),Math.round(r.height)].join(' ')})()`);
console.log('assistant button:', style, '| open', await ev(`!document.getElementById('assistant').hidden`));
await send('Input.insertText', { text: 'Ce faceți?' });
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
await sleep(700);
await shot('h-chat.jpg');
console.log('overflow:', await ev('document.documentElement.scrollWidth-document.documentElement.clientWidth'));
console.log(errs.length ? 'errors: ' + errs.slice(0, 4).join(' | ') : 'no exceptions');
sock.close(); proc.kill(); process.exit(0);
