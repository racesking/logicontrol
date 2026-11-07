import { initHero, initServices } from './hero.js';
import { Stage, timeline } from './scene/stage.js';
import { Dashboard } from './dashboard/panel.js';
import { initAssistant } from './assistant.js';
import { HomePhone } from './dashboard/phone.js';

initHero();

async function start() {
  // Device faces and the touch panel are drawn with the brand fonts.
  await Promise.all([
    document.fonts.load('500 16px "Geist"'),
    document.fonts.load('500 16px "Geist Mono"'),
  ]);

  let stage;
  try {
    stage = new Stage(document.getElementById('stage'));
  } catch {
    // No WebGL: section 1 still works; the 3D sections collapse rather than sit empty.
    document.documentElement.classList.add('no-stage');
    initAssistant(null);
    return;
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dashboard = new Dashboard(document.getElementById('bms'), stage.cabinet);
  const stacked = window.matchMedia('(max-width: 979px)');
  initServices(dashboard);
  const phone = new HomePhone(document.getElementById('device'), document.getElementById('home-chips'), stage, dashboard);
  initAssistant(dashboard, phone);
  const pin = document.querySelector('.control-pin');
  const closing = document.getElementById('home-close');
  const captions = [...document.querySelectorAll('.caption')].map((el) => ({ el, from: Number(el.dataset.from), to: Number(el.dataset.to) }));
  const cue = document.querySelector('.scroll-cue');
  stage.warm();

  // Where you are, and what comes next. The cue waits until you stop scrolling.
  const journey = document.getElementById('journey');
  const stops = [...journey.querySelectorAll('a')];
  const next = document.getElementById('next-cue');
  const CUES = [
    { until: 2.2, text: 'Continuă: tabloul', to: 3.4 },
    { until: 4.3, text: 'Urmează: panoul de comandă', to: 5.5 },
    { until: 6.45, text: 'Urmează: acasă, de pe telefon', to: 7.85, panel: true },
  ];
  let lastScroll = -1e4;
  let cueTo = null;
  window.addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  const go = (to) => window.scrollTo({ top: to * window.innerHeight, behavior: 'smooth' });
  next.addEventListener('click', () => { if (cueTo !== null) go(cueTo); });
  journey.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    go(Number(a.dataset.u));
  });
  let lastStop = -1;
  const guide = (now, position) => {
    journey.classList.toggle('is-on', position > 0.55);
    // Each chapter begins when its scene starts arriving, not when it has settled.
    const reached = stops.reduce((n, a, i) => (position >= Number(a.dataset.at) ? i : n), 0);
    const here = Number(stops[reached].dataset.at);
    const there = reached < stops.length - 1 ? Number(stops[reached + 1].dataset.at) : here;
    const within = there > here ? (position - here) / (there - here) : 0;
    journey.querySelector('ol').style.setProperty('--trail', ((reached + within) / (stops.length - 1)).toFixed(3));
    if (reached !== lastStop) {
      lastStop = reached;
      stops.forEach((a, i) => {
        a.classList.toggle('is-past', i < reached);
        if (i === reached) a.setAttribute('aria-current', 'step');
        else a.removeAttribute('aria-current');
      });
    }
    const cue = position > 0.4 ? CUES.find((c) => position < c.until) : null;
    // At the panel the visitor is invited to try it first, so the way onward can wait.
    const wait = cue?.panel && !dashboard.commanded ? 6000 : 800;
    const show = cue && now - lastScroll > wait;
    next.classList.toggle('is-side', Boolean(cue?.panel));
    if (show && cueTo !== cue.to) {
      cueTo = cue.to;
      next.querySelector('span').textContent = cue.text;
    }
    if (next.hidden === Boolean(show)) next.hidden = !show;
  };
  if (import.meta.env.DEV) window.__dash = dashboard;

  if (import.meta.env.DEV) window.__stage = stage;

  const screens = () => window.scrollY / window.innerHeight;
  let u = screens();
  let flow = u;
  let last = performance.now();

  // Development only: ?u=2.5 opens the page at that scroll position, settled.
  const seek = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('u') : null;
  if (seek !== null) {
    window.scrollTo({ top: Number(seek) * window.innerHeight, behavior: 'instant' });
    u = flow = Number(seek);
  }

  window.addEventListener('resize', () => stage.resize());
  window.addEventListener('pointermove', (e) => {
    stage.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    stage.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // Measures scrolling only. If it cannot stay smooth, motion gets cheaper; rest never does.
  let movingMs = 0;
  let movingFrames = 0;
  const watchFrameRate = (ms) => {
    if (!stage.moved || document.hidden) return;
    movingMs += ms;
    movingFrames++;
    if (movingMs < 1200) return;
    if ((movingFrames * 1000) / movingMs < 28) stage.degrade();
    movingMs = 0;
    movingFrames = 0;
  };

  const smooth = (a, b, x) => {
    const n = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return n * n * (3 - 2 * n);
  };

  const frame = (now) => {
    // A hidden or collapsed window has no size to draw at.
    if (!window.innerWidth || !window.innerHeight) {
      last = now;
      requestAnimationFrame(frame);
      return;
    }
    const elapsed = now - last;
    const dt = Math.min(0.12, elapsed / 1000);
    last = now;
    const goal = screens();
    const k = reduced ? 1 : 1 - Math.exp(-dt * 5.5);
    u += (goal - u) * k;
    flow += (goal - flow) * (reduced ? 1 : 1 - Math.exp(-dt * 2.4));
    const t = timeline(u);
    const flat = stacked.matches;
    stage.homeShift = flat ? 0 : 0.25;
    stage.frameDt = dt;
    // Stacked layouts have no fixed scroll stops, so the phone's position drives the house.
    const homeOverride = flat ? Math.min(1, Math.max(0, 1 - phone.device.getBoundingClientRect().top / window.innerHeight)) : null;
    stage.update(u, flow, now / 1000, homeOverride);
    stage.render(now);
    // The panel narrows into the phone, its content still showing, then hands over.
    const handover = flat ? 1 : 1 - Math.min(1, Math.max(0, (t.morph - 0.5) / 0.26));
    dashboard.root.style.setProperty('--fade', handover.toFixed(3));
    dashboard.setProgress(flat ? 1 : handover > 0 ? t.dash : 0);
    if (t.morph > 0.01 && !flat) dashboard.root.setAttribute('inert', '');
    phone.setProgress(t.morph, flat);
    phone.frame(homeOverride ?? t.home);
    pin.style.setProperty('--veil', (t.dash * (1 - t.home)).toFixed(3));
    pin.style.setProperty('--foot', t.dash.toFixed(3));
    pin.style.setProperty('--home', Math.max(0, (t.home - 0.8) / 0.2).toFixed(3));
    cue.classList.toggle('is-gone', goal > 0.06);
    for (const c of captions) {
      const o = smooth(c.from, c.from + 0.16, u) * (1 - smooth(c.to - 0.16, c.to, u));
      c.el.style.opacity = o.toFixed(3);
    }
    const close = flat ? 1 : smooth(7.45, 7.75, u);
    pin.style.setProperty('--close', close.toFixed(3));
    closing.classList.toggle('is-on', close > 0.5);
    guide(now, goal);
    watchFrameRate(elapsed);
    window.__frames = (window.__frames || 0) + 1;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

start();
