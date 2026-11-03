/* Hero language toggle and the page-wide "current" line that is drawn as the reader scrolls. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Hero RO / EN ---------- */
  var COPY = {
    ro: {
      kickerA: 'Integrare și exploatare BMS', kickerB: 'Clădiri comerciale · România',
      h1a: 'Control clar', h1b: 'pentru clădiri complexe.',
      lead: 'Integrare BMS, depanare, programare și mentenanță pentru clădiri comerciale din toată România.',
      cta1: 'Discută proiectul', cta2: 'Explorează demonstrația'
    },
    en: {
      kickerA: 'BMS integration and operation', kickerB: 'Commercial buildings · Romania',
      h1a: 'Clear control', h1b: 'for complex buildings.',
      lead: 'BMS integration, troubleshooting, programming and maintenance for commercial buildings across Romania.',
      cta1: 'Discuss your project', cta2: 'Explore the demo'
    }
  };
  var hero = document.getElementById('acasa');
  document.querySelectorAll('[data-lang]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.dataset.lang;
      if (!hero || !COPY[lang]) return;
      hero.setAttribute('lang', lang);
      hero.querySelectorAll('[data-copy]').forEach(function (el) { el.textContent = COPY[lang][el.dataset.copy]; });
      document.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      schedule();
    });
  });

  /* ---------- The current ---------- */
  var main = document.querySelector('main');
  var svg = main && main.querySelector('.current-line');
  if (!svg || !hero) return;

  var COLORS = { light: '#2A36E8', dark: '#8F99FF' };
  var routes = [];
  var nodes = [];
  var endDot = null;
  var drawnBefore = [];
  var frame = 0;

  function box(el) {
    var r = el.getBoundingClientRect(), m = main.getBoundingClientRect();
    return { x: r.left - m.left, y: r.top - m.top, w: r.width, h: r.height, cx: r.left - m.left + r.width / 2, cy: r.top - m.top + r.height / 2 };
  }

  function roundedPath(pts, radius) {
    var d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (var i = 1; i < pts.length - 1; i++) {
      var a = pts[i - 1], b = pts[i], c = pts[i + 1];
      var l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y);
      if (l1 < 0.5 || l2 < 0.5) continue;
      var r = Math.min(radius, l1 / 2, l2 / 2);
      var p = { x: b.x - (b.x - a.x) / l1 * r, y: b.y - (b.y - a.y) / l1 * r };
      var q = { x: b.x + (c.x - b.x) / l2 * r, y: b.y + (c.y - b.y) / l2 * r };
      d += ' L' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' Q' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + ' ' + q.x.toFixed(1) + ' ' + q.y.toFixed(1);
    }
    var last = pts[pts.length - 1];
    return d + ' L' + last.x.toFixed(1) + ' ' + last.y.toFixed(1);
  }

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function build() {
    frame = 0;
    var W = main.clientWidth, H = main.offsetHeight;
    var wrapEl = hero.querySelector('.wrap');
    var wrap = box(wrapEl);
    var pad = parseFloat(getComputedStyle(wrapEl).paddingLeft);
    var railL = wrap.x + pad / 2, railR = wrap.x + wrap.w - pad / 2;
    var radius = Math.max(14, Math.min(36, pad * 0.6));

    var lead = hero.querySelector('.lead-line');
    var lb = box(lead);
    var fs = parseFloat(getComputedStyle(lead).fontSize);
    var uy = lb.y + fs * 1.0;
    var services = box(document.getElementById('servicii'));
    var turnY = services.y + services.h - Math.min(72, services.h * 0.05);
    var feed = box(document.getElementById('plan-feed'));
    var ret = box(document.getElementById('plan-return'));
    var chapter = box(document.getElementById('contact-chapter'));
    var endX = chapter.x - 10;
    var endY = chapter.cy;
    var dusk = box(document.querySelector('.dusk'));
    var dawn = box(document.querySelector('.dawn'));

    var r1 = [
      { x: lb.x, y: uy }, { x: railR, y: uy }, { x: railR, y: turnY },
      { x: railL, y: turnY }, { x: railL, y: feed.cy }, { x: feed.cx, y: feed.cy }
    ];
    var r2 = [
      { x: ret.cx, y: ret.cy }, { x: railL, y: ret.cy }, { x: railL, y: endY }, { x: endX, y: endY }
    ];

    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = '';
    var defs = el('defs', {});
    var grad = el('linearGradient', { id: 'current-ink', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: H });
    var a = (dusk.y + dusk.h * 0.5) / H, b = (dawn.y + dawn.h * 0.5) / H;
    [[0, 'light'], [a, 'light'], [a, 'dark'], [b, 'dark'], [b, 'light'], [1, 'light']].forEach(function (s) {
      grad.appendChild(el('stop', { offset: s[0], 'stop-color': COLORS[s[1]] }));
    });
    defs.appendChild(grad);
    svg.appendChild(defs);

    routes = [r1, r2].map(function (pts, k) {
      var d = roundedPath(pts, radius);
      svg.appendChild(el('path', { d: d, class: 'base', stroke: 'url(#current-ink)' }));
      var live = el('path', { d: d, class: 'live', stroke: 'url(#current-ink)' });
      svg.appendChild(live);
      var len = live.getTotalLength();
      var samples = [];
      for (var l = 0; l <= len; l += 6) samples.push([l, live.getPointAtLength(l).y]);
      samples.push([len, live.getPointAtLength(len).y]);
      for (var i = 1; i < samples.length; i++) samples[i][1] = Math.max(samples[i][1], samples[i - 1][1]);
      live.style.strokeDasharray = len + ' ' + (len + 8);
      live.style.transition = 'none';
      live.style.strokeDashoffset = Math.max(0, len - Math.min(drawnBefore[k] || 0, len));
      return { path: live, len: len, samples: samples };
    });
    svg.appendChild(el('circle', { cx: r1[0].x, cy: r1[0].y, r: 6, fill: COLORS.light }));
    endDot = el('circle', { cx: endX, cy: endY, r: 6, fill: COLORS.light, class: 'node-end' });
    svg.appendChild(endDot);
    nodes = Array.prototype.map.call(document.querySelectorAll('.service .node'), function (n) { return { el: n, y: box(n).cy }; });

    svg.getBoundingClientRect();
    update(true);
  }

  function lengthAt(route, y) {
    var s = route.samples, lo = 0, hi = s.length - 1;
    if (y < s[0][1]) return 0;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (s[mid][1] <= y) lo = mid; else hi = mid - 1;
    }
    return s[lo][0];
  }

  function update(fromBuild) {
    if (!routes.length) return;
    var still = reducedMotion.matches;
    var mainTop = main.getBoundingClientRect().top;
    var tip = still ? Infinity : (window.innerHeight * 0.68 - mainTop);
    routes.forEach(function (r, k) {
      var drawn = still ? r.len : lengthAt(r, tip);
      drawnBefore[k] = drawn;
      r.path.style.transition = still ? 'none' : (fromBuild === true ? 'stroke-dashoffset 1400ms cubic-bezier(.3,.7,.2,1)' : 'stroke-dashoffset 450ms cubic-bezier(.3,.7,.2,1)');
      r.path.style.strokeDashoffset = Math.max(0, r.len - drawn);
    });
    nodes.forEach(function (n) { n.el.classList.toggle('is-on', still || n.y <= tip); });
    var last = routes[routes.length - 1];
    if (endDot) endDot.style.opacity = still || lengthAt(last, tip) >= last.len - 1 ? 1 : 0;
  }

  var buildTimer = 0;
  function schedule() {
    clearTimeout(buildTimer);
    buildTimer = setTimeout(build, 60);
  }

  window.addEventListener('scroll', function () {
    if (frame) return;
    frame = requestAnimationFrame(function () { frame = 0; update(false); });
  }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(main);
  else window.addEventListener('resize', schedule);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', function () { update(false); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  build();
})();
