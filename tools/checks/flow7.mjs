// Real-input test of the guidance layer, and the capture set for the review.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const prof = mkdtempSync(join(tmpdir(), 'lc-'));
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--window-size=1440,900', 'about:blank']);
const ws = await new Promise((res) => { let b = ''; proc.stderr.on('data', (d) => { b += d; const m = b.match(/ws:\/\/[^\s]+/); if (m) res(m[0]); }); });
const page = (await (await fetch(`http://127.0.0.1:${new URL(ws).port}/json`)).json()).find((t) => t.type === 'page');
const sock = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => { sock.onopen = r; });
let id = 0; const pend = new Map(); const errs = [];
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) console.log('EXC', r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 }); writeFileSync(join(out, name), Buffer.from(s.result.data, 'base64')); };
const at = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
const click = async (sel) => { const b = await at(sel); if (!b) { console.log('NOT FOUND', sel); return; } await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b[0], y: b[1], button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b[0], y: b[1], button: 'left', clickCount: 1 }); };
const state = () => ev(`(()=>{const n=document.getElementById('next-cue');return {u:(scrollY/innerHeight).toFixed(2),chapter:document.querySelector('#journey [aria-current] span')?.textContent,rail:document.getElementById('journey').classList.contains('is-on'),cue:n.hidden?null:n.textContent.trim()}})()`);
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8137/' });
for (let i = 0; i < 80; i++) { await sleep(200); if (await ev('window.__frames > 3')) break; }
await sleep(1500);
await shot('01-hero.jpg');
console.log('hero', JSON.stringify(await state()));
for (const [u, n] of [[1.2, '02-tangle'], [1.85, '03-converge'], [3.4, '04-cabinet'], [5.5, '05-dashboard'], [6.65, '06-morph'], [7.1, '07-rise'], [7.85, '08-home']]) {
  await ev(`window.scrollTo({top:${u}*innerHeight,behavior:'instant'})`);
  await sleep(3000);
  await shot(`${n}.jpg`);
  console.log(n, JSON.stringify(await state()));
}
// Stopped at the dashboard: the cue names what is next, and following it reaches the phone
await ev(`window.scrollTo({top:5.5*innerHeight,behavior:'instant'})`);
await sleep(2500);
console.log('prompt:', await ev(`document.querySelector('.bms-try')?.textContent`), '| hint on +', await ev(`document.querySelector('#room [data-act="up"]').classList.contains('is-hint')`), '| cue before command', JSON.stringify((await state()).cue));
await click('#room [data-act="up"]');
await sleep(1500);
console.log('after +: prompt', await ev(`document.querySelector('.bms-try')?.textContent ?? null`), '| hint', await ev(`document.querySelector('#room [data-act="up"]').classList.contains('is-hint')`), '| cue', JSON.stringify((await state()).cue), '| side', await ev(`document.getElementById('next-cue').classList.contains('is-side')`));
await shot('05b-after-command.jpg');
await click('#next-cue');
for (let i = 0; i < 30; i++) { await sleep(300); if ((await ev('scrollY/innerHeight')) > 7.8) break; }
await sleep(2500);
console.log('after clicking the cue', JSON.stringify(await state()), '| phone usable', await ev(`!document.getElementById('device').hasAttribute('inert')`));
console.log('close line:', await ev(`document.querySelector('#home-close p').textContent`), '| shown', await ev(`document.getElementById('home-close').classList.contains('is-on')`), '| title', await ev(`document.querySelector('.home-title h2').textContent`));
await click('#assistant-toggle');
await sleep(300);
const ask = async (q) => { await ev(`document.getElementById('assistant-input').focus()`); await send('Input.insertText', { text: q }); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(700); console.log(' Q:', q, '-> A:', await ev(`[...document.querySelectorAll('.msg--bot:not(.msg--typing)')].pop()?.textContent`)); };
await ask('Aprinde lumina în Dormitor');
await ask('Ce temperatură e în Baie?');
await ask('Pune scena Noapte');
await ask('Armează casa');
await ask('Aprinde lumina în Recepție');
await sleep(1800);
console.log('house now: dormitor goal', await ev(`window.__stage.house.rooms.get('bedroom').goal`), '| scene', await ev(`document.querySelector('.ui-scenes [aria-pressed="true"]').textContent.trim()`));
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(200);
await click('#journey a[data-at="1.75"]');
for (let i = 0; i < 30; i++) { await sleep(300); if (Math.abs((await ev('scrollY/innerHeight')) - 3.4) < 0.05) break; }
await sleep(1200);
console.log('after rail click', JSON.stringify(await state()));
await ev(`document.querySelector('#journey a[data-at="4.3"]').focus()`);
await sleep(300);
console.log('focused label opacity', await ev(`getComputedStyle(document.querySelector('#journey a[data-at="4.3"] span')).opacity`));
console.log('overflow', await ev('document.documentElement.scrollWidth-document.documentElement.clientWidth'));
console.log(errs.length ? 'errors: ' + errs.slice(0, 3).join(' | ') : 'no exceptions');
sock.close(); proc.kill(); process.exit(0);
