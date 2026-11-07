// Real clicks through the new instrument, the three views and the assistant.
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
const at = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
const click = async (sel) => {
  const box = await at(sel);
  if (!box) { console.log('NOT FOUND', sel); return; }
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box[0], y: box[1], button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box[0], y: box[1], button: 'left', clickCount: 1 });
};
const txt = (s) => ev(`document.querySelector(${JSON.stringify(s)})?.textContent.replace(/\\s+/g,' ').trim()`);
const type = async (s) => { await send('Input.insertText', { text: s }); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); };
const lastBot = () => ev(`[...document.querySelectorAll('.msg--bot:not(.msg--typing)')].pop()?.textContent`);

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8137/' });
for (let i = 0; i < 60; i++) { await sleep(200); if (await ev('window.__frames > 3')) break; }
await sleep(900);
await shot('v-hero.jpg');

// Dashboard views
await ev(`window.scrollTo({top:5.2*innerHeight,behavior:'instant'})`);
for (let i = 0; i < 100; i++) { await sleep(300); if ((await ev(`parseFloat(getComputedStyle(document.getElementById('bms')).getPropertyValue('--show'))`)) > 0.98) break; }
console.log('pill:', await txt('#bms-pill'), '| badge:', await txt('#bell-badge'));
await click('.bms-rail [data-view="trend"]');
await sleep(600);
const plot = await at('[data-plot="temp"]');
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: plot[0] - 60, y: plot[1] });
await sleep(300);
console.log('trend title:', await txt('#s3-title'), '| tooltip:', await txt('.tr-tip'));
await shot('v-trend.jpg');
await click('[data-range="7z"]');
await sleep(300);
console.log('range pressed:', await ev(`document.querySelector('[data-range="7z"]').getAttribute('aria-pressed')`), '| lines', await ev(`document.querySelectorAll('.tr-line').length`));
await click('[data-series="outdoor"]');
await sleep(200);
console.log('after hiding one series, lines:', await ev(`document.querySelectorAll('.tr-line').length`));
await click('.bms-rail [data-view="settings"]');
await sleep(400);
await click('[data-cell="5-2"]');
await sleep(150);
console.log('cell toggled:', await ev(`document.querySelector('[data-cell="5-2"]').getAttribute('aria-pressed')`));
await click('[data-set="comfort-up"]');
await sleep(150);
console.log('comfort:', await txt('.set-card .set-step strong'));
await shot('v-settings.jpg');
await click('.bms-rail [data-view="alarms"]');
await sleep(300);
console.log('alarms head:', await txt('.al-head h3'), '| log first:', await txt('.al-log li'));
await click('[data-ack="filter"]');
await sleep(250);
console.log('after ack:', await txt('.al-seen'), '| badge hidden', await ev(`document.getElementById('bell-badge').hidden`), '| still active', await txt('.al-head h3'));
await shot('v-alarms.jpg');

// Assistant
await click('#assistant-toggle');
await sleep(300);
console.log('assistant open:', await ev(`!document.getElementById('assistant').hidden`), '| focus', await ev(`document.activeElement.id`));
for (const q of ['Câte alarme sunt?', 'Ce temperatură e în Cafenea?', 'Stinge lumina în Recepție', 'Oprește CTA', 'Cât costă?', 'Ce vreme e mâine?']) {
  await click('#assistant-input');
  await type(q);
  await sleep(650);
  console.log(' Q:', q, '\n  A:', await lastBot());
}
await sleep(1500);
console.log('recepție light:', await ev(`window.__dash.model.find('pa').light`), '| AHU on:', await ev(`window.__dash.plant.ahu.on`));
await sleep(1200);
console.log('alarm raised by chat stop:', await txt('#bms-pill'), '| badge', await txt('#bell-badge'));
await shot('v-chat.jpg');
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(150);
console.log('esc closes:', await ev(`document.getElementById('assistant').hidden`), '| focus back', await ev(`document.activeElement.id`));
console.log('overflow:', await ev('document.documentElement.scrollWidth-document.documentElement.clientWidth'));
console.log(errs.length ? 'errors: ' + errs.slice(0, 4).join(' | ') : 'no exceptions');
sock.close(); proc.kill(); process.exit(0);
