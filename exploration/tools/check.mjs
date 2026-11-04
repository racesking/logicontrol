#!/usr/bin/env node
// Dependency-free preview check for the identity exploration.
// Serves the repository under /logicontrol/ (GitHub Pages project path), drives
// headless Chrome over the DevTools protocol and reports overflow, console
// errors, failed requests, root-absolute URLs, missing noindex and focus
// visibility at 360/768/1440px. Optionally saves JPEG screenshots.
//
// Usage: node exploration/tools/check.mjs [--shots] [page ...]
//   page: path relative to exploration/, e.g. light/index.html (default: all)
//   --shots: write screenshots to exploration/screenshots/
//   CHROME=/path/to/chrome to override the browser binary.

import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = '/logicontrol/';
const WIDTHS = [360, 768, 1440];
const DEFAULT_PAGES = [
  'index.html',
  'light/index.html', 'light/identity.html',
  'dark/index.html', 'dark/identity.html',
  'mixed/index.html', 'mixed/identity.html',
];
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

const args = process.argv.slice(2);
const shots = args.includes('--shots');
const pages = args.filter((a) => !a.startsWith('--'));
const targets = pages.length ? pages : DEFAULT_PAGES;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith(BASE)) { res.writeHead(404); return res.end('outside base path'); }
  let rel = decodeURIComponent(url.pathname.slice(BASE.length));
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(301, { Location: url.pathname + '/' }); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const chromeBin = process.env.CHROME || 'google-chrome';
const profile = join(tmpdir(), `lc-check-${process.pid}`);
const chrome = spawn(chromeBin, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((res, rej) => {
  let buf = '';
  const t = setTimeout(() => rej(new Error('Chrome did not start')), 30000);
  chrome.stderr.on('data', (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) { clearTimeout(t); res(m[1]); }
  });
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
const listeners = new Set();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else for (const l of listeners) l(msg);
});
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await s('Page.enable'); await s('Runtime.enable'); await s('Network.enable'); await s('Log.enable');

let problems = [];
listeners.add((msg) => {
  if (msg.sessionId !== sessionId) return;
  if (msg.method === 'Runtime.exceptionThrown') problems.push(`JS exception: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') problems.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400 && !msg.params.response.url.endsWith('/favicon.ico')) problems.push(`HTTP ${msg.params.response.status}: ${msg.params.response.url}`);
  if (msg.method === 'Network.loadingFailed' && !msg.params.canceled) problems.push(`request failed: ${msg.params.errorText}`);
});
const evaluate = async (expression) => (await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(url) {
  const loaded = new Promise((r) => {
    const l = (msg) => { if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') { listeners.delete(l); r(); } };
    listeners.add(l);
  });
  await s('Page.navigate', { url });
  await Promise.race([loaded, sleep(15000)]);
  await evaluate('document.fonts.ready.then(() => true)');
  await sleep(400);
}

const PAGE_AUDIT = `(() => {
  const out = [];
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) {
    const offenders = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed';
    }).slice(0, 5).map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : ''));
    out.push('horizontal overflow: scrollWidth ' + de.scrollWidth + ' > ' + de.clientWidth + ' (' + offenders.join(', ') + ')');
  }
  const robots = document.querySelector('meta[name="robots"]');
  if (!robots || !/noindex/.test(robots.content)) out.push('missing noindex meta');
  if (!de.lang) out.push('missing html lang');
  for (const el of document.querySelectorAll('[href], [src]')) {
    const v = el.getAttribute('href') ?? el.getAttribute('src');
    if (/^\\/(?!\\/)/.test(v)) out.push('root-absolute URL: ' + v);
  }
  for (const img of document.querySelectorAll('img:not([alt])')) out.push('img without alt: ' + img.src);
  const links = [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin));
  return { out, links: [...new Set(links.map((h) => h.split('#')[0]))], height: de.scrollHeight };
})()`;

const FOCUS_AUDIT = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
  const label = (el.getAttribute('aria-label') || el.textContent || el.id || el.tagName).trim().replace(/\\s+/g, ' ').slice(0, 40);
  return { label: el.tagName.toLowerCase() + ' "' + label + '"', visible };
})()`;

const checkedLinks = new Map();
let failures = 0;
if (shots) await mkdir(join(ROOT, 'exploration', 'screenshots'), { recursive: true });

for (const page of targets) {
  const url = `${origin}${BASE}exploration/${page}`;
  for (const width of WIDTHS) {
    problems = [];
    await s('Emulation.setDeviceMetricsOverride', { width, height: width < 800 ? 800 : 900, deviceScaleFactor: 1, mobile: width < 800 });
    await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await load(url);
    const audit = await evaluate(PAGE_AUDIT);
    problems.push(...audit.out);

    if (width === 1440) {
      for (const link of audit.links) {
        if (!checkedLinks.has(link)) {
          const r = await fetch(link).catch(() => ({ status: 0 }));
          checkedLinks.set(link, r.status);
        }
        if (checkedLinks.get(link) >= 400 || checkedLinks.get(link) === 0) problems.push(`broken link: ${link} (${checkedLinks.get(link)})`);
      }
      const unfocused = [];
      let stops = 0;
      for (let i = 0; i < 60; i++) {
        await s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        const f = await evaluate(FOCUS_AUDIT);
        if (!f) continue;
        stops++;
        if (!f.visible) unfocused.push(f.label);
      }
      if (unfocused.length) problems.push(`focus without visible outline/box-shadow: ${[...new Set(unfocused)].slice(0, 6).join('; ')}`);
      if (stops === 0) problems.push('no keyboard focus stops found');
    }

    if (shots) {
      const name = page.replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\//g, '-');
      const clipH = Math.min(audit.height, 6000);
      const { data } = await s('Page.captureScreenshot', {
        format: 'jpeg', quality: 72, captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height: clipH, scale: 1 },
      });
      await writeFile(join(ROOT, 'exploration', 'screenshots', `${name === 'index' ? 'gallery' : name}-${width}.jpg`), Buffer.from(data, 'base64'));
    }

    await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await load(url);

    const status = problems.length ? 'FAIL' : 'ok  ';
    if (problems.length) failures++;
    console.log(`${status} ${page} @${width}px`);
    for (const p of [...new Set(problems)]) console.log(`     - ${p}`);
  }
}

ws.close();
chrome.kill();
server.close();
console.log(failures ? `\n${failures} page/width combinations reported problems.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
