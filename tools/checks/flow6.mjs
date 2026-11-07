// Real input through the phone: every command must travel, be answered, and show in the house.
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
const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) console.log('EXC', r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 }); writeFileSync(join(here, name), Buffer.from(s.result.data, 'base64')); };
const at = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
const click = async (sel) => {
  const b = await at(sel);
  if (!b) { console.log('NOT FOUND', sel); return; }
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b[0], y: b[1], button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b[0], y: b[1], button: 'left', clickCount: 1 });
};
const txt = (s) => ev(`document.querySelector(${JSON.stringify(s)})?.textContent.replace(/\\s+/g,' ').trim()`);
const k = (r) => ev(`+window.__stage.house.rooms.get('${r}').k.toFixed(2)`);
const chain = () => ev(`document.querySelectorAll('.ui-chain .is-on').length`);
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8137/' });
for (let i = 0; i < 80; i++) { await sleep(200); if (await ev('window.__frames > 3')) break; }

// Transition frames
await ev(`window.scrollTo({top:5.2*innerHeight,behavior:'instant'})`);
await sleep(2500);
for (const u of [6.42, 6.6, 6.75, 6.95]) {
  await ev(`window.scrollTo({top:${u}*innerHeight,behavior:'instant'})`);
  await sleep(1900);
  await shot(`m-${u}.jpg`);
}
await ev(`window.scrollTo({top:7.85*innerHeight,behavior:'instant'})`);
await sleep(3500);
console.log('phone inert:', await ev(`document.getElementById('device').hasAttribute('inert')`), '| panel inert:', await ev(`document.getElementById('bms').hasAttribute('inert')`));
await shot('m-home.jpg');
const hit = await ev(`(()=>{const r=document.querySelector('.phone-ui [data-act="light"]').getBoundingClientRect();const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e.closest('[data-act]')?.dataset.act})()`);
console.log('click target resolves to:', hit);

// Light: leaves, travels, then the room changes
await click('.phone-ui [data-act="room"][data-value="bedroom"]');
await sleep(250);
console.log('selected:', await txt('.ui-rooms [aria-pressed="true"]'), '| room k', await k('bedroom'));
await click('.phone-ui [data-act="light"]');
await sleep(250);
console.log('t+.25s chain', await chain(), '| k', await k('bedroom'), '| switch', await txt('.phone-ui [data-act="light"] em'), '| head', await ev(`+window.__stage.house.routes.get('bedroom').uniforms.head.value.toFixed(2)`));
await shot('m-pulse.jpg');
await sleep(1600);
console.log('t+1.8s chain', await chain(), '| k', await k('bedroom'), '| switch', await txt('.phone-ui [data-act="light"] em'));
// Temperature: only moves after the equipment answers
await click('.phone-ui [data-act="up"]');
await sleep(200);
console.log('temp asked:', await txt('.ui-step strong'), '| measured', await txt('.ui-temp b'), '| chain', await chain());
await sleep(5000);
console.log('temp settled:', await txt('.ui-temp b'), '| chain', await chain());
// Blinds
await click('.phone-ui [data-act="blind"][data-value="1"]');
await sleep(2600);
console.log('blinds:', await ev(`+window.__stage.house.rooms.get('bedroom').blind.toFixed(2)`), '| visible', await ev(`window.__stage.house.rooms.get('bedroom').blinds[0].visible`));
// Scene, chip, tiles
await click('.phone-ui [data-act="scene"][data-value="noapte"]');
await sleep(2600);
console.log('scene noapte: lights', await ev(`[...window.__stage.house.rooms.values()].filter(r=>r.goal>0).map(r=>r.id).join(',')`), '| armed', await txt('.phone-ui [data-act="armed"] b'));
await shot('m-night.jpg');
await click('.phone-ui [data-act="scene"][data-value="acasa"]');
await sleep(2400);
await click('[data-chip="kitchen"]');
await sleep(200);
console.log('chip selects:', await txt('.ui-rooms [aria-pressed="true"]'));
await click('.phone-ui [data-act="heat"]');
await sleep(200);
console.log('heat:', await txt('.phone-ui [data-act="heat"]'), '| pressed', await ev(`document.querySelector('[data-act="heat"]').getAttribute('aria-pressed')`));
await click('.phone-ui [data-act="vent-up"]');
await sleep(150);
console.log('vent:', await txt('.ui-tile b'), '| journal top:', await ev(`window.__dash.journal.events[0].text`));
console.log('cabinet screen:', await ev(`window.__stage.cabinet.lastCommand`));
console.log('overflow:', await ev('document.documentElement.scrollWidth-document.documentElement.clientWidth'), '| end u', await ev('((document.documentElement.scrollHeight-innerHeight)/innerHeight).toFixed(2)'));
console.log(errs.length ? 'errors: ' + errs.slice(0, 4).join(' | ') : 'no exceptions');
sock.close(); proc.kill(); process.exit(0);
