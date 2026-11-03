/* UI for the lighting demo. State lives in LogicontrolDemo.reduce; this file only renders and schedules. */
(function () {
  'use strict';
  var D = window.LogicontrolDemo;
  var root = document.getElementById('demo');
  if (!D || !root) return;

  var ACTUATION_MS = 600;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var state = D.initialState();
  var timers = {};

  var $ = function (sel) { return root.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  var out = {
    title: document.getElementById('zone-title'),
    preset: document.getElementById('zone-preset'),
    command: document.getElementById('out-command'),
    confirmed: document.getElementById('out-confirmed'),
    explain: document.getElementById('out-explain'),
    advisory: document.getElementById('out-advisory'),
    summary: document.getElementById('out-summary'),
    log: document.getElementById('out-log')
  };
  var lastSummary = out.summary.textContent;

  function level(v) { return v > 0 ? v + '%' : 'Oprit'; }

  function dispatch(action) {
    var prev = state;
    state = D.reduce(state, action);
    if (state === prev) return;
    if (action.type === 'reset') {
      Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
      timers = {};
      $$('.pulse').forEach(function (p) { p.getAnimations().forEach(function (a) { a.cancel(); }); });
    }
    if (action.type === 'occupancy' || action.type === 'mode') schedule(action.zone, prev);
    render();
  }

  function schedule(id, prev) {
    var cmdBefore = D.commandFor(id, prev.zones[id]);
    var cmdNow = D.commandFor(id, state.zones[id]);
    clearTimeout(timers[id]);
    delete timers[id];
    if (!D.isPending(state, id)) return;
    if (reducedMotion.matches) { dispatch({ type: 'confirm', zone: id }); return; }
    if (cmdBefore !== cmdNow) pulse(id);
    timers[id] = setTimeout(function () {
      delete timers[id];
      dispatch({ type: 'confirm', zone: id });
    }, ACTUATION_MS);
  }

  function pulse(id) {
    var p = $('[data-pulse="' + id + '"]');
    if (!p || !p.animate) return;
    var len = p.getTotalLength();
    p.style.strokeDasharray = '26 ' + (len + 30);
    p.getAnimations().forEach(function (a) { a.cancel(); });
    p.animate(
      [{ strokeDashoffset: 26, opacity: 1 }, { strokeDashoffset: -len, opacity: 1 }],
      { duration: ACTUATION_MS, easing: 'cubic-bezier(.45,.05,.4,1)' }
    );
  }

  function render() {
    var sel = state.selected;
    var def = D.zoneDef(sel);
    var z = state.zones[sel];
    var cmd = D.commandFor(sel, z);
    var pending = D.isPending(state, sel);

    D.ZONES.forEach(function (d) {
      var zs = state.zones[d.id];
      var zPending = D.isPending(state, d.id);
      var adv = D.advisory(state, d.id);
      var g = root.querySelector('.zone[data-zone="' + d.id + '"]');
      g.classList.toggle('is-selected', d.id === sel);
      g.classList.toggle('is-lit', zs.confirmed > 0);
      g.querySelector('.zone-fill').style.setProperty('--mix', zs.confirmed > 0 ? (40 + zs.confirmed * 0.6) + '%' : '0%');
      g.querySelector('[data-meta]').textContent = (zs.occupied ? 'Ocupat' : 'Liber') + ' · ' + D.MODE_LABEL[zs.mode].replace(' (prezență)', '');
      g.querySelector('[data-level]').textContent = zPending ? 'Se aplică…' : level(zs.confirmed);
      g.querySelector('[data-flag]').hidden = !adv;
      root.querySelector('[data-tap="' + d.id + '"]').classList.toggle('is-live', zs.confirmed > 0);

      var btn = root.querySelector('[data-select="' + d.id + '"]');
      btn.setAttribute('aria-pressed', String(d.id === sel));
      btn.querySelector('[data-pick-state]').textContent =
        (zPending ? 'Se aplică…' : (zs.confirmed > 0 ? 'Iluminat ' + zs.confirmed + '%' : 'Oprit')) + (adv ? ' · Atenție' : '');
    });

    out.title.textContent = def.name;
    out.preset.textContent = 'Preset: ' + def.preset + '%';
    $$('[data-occ]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.occ === 'true') === z.occupied)); });
    $$('input[name="demo-mode"]').forEach(function (r) { r.checked = r.value === z.mode; });

    out.command.textContent = level(cmd);
    out.confirmed.textContent = pending ? 'Se aplică…' : level(z.confirmed);
    out.confirmed.classList.toggle('is-pending', pending);
    out.explain.textContent = D.explain(state, sel);
    var adv = D.advisory(state, sel);
    out.advisory.hidden = !adv;
    out.advisory.innerHTML = adv ? '<strong>Atenție:</strong> ' + adv.replace(/^Atenție: /, '') : '';

    var summary = D.summary(state);
    var text = state.notice === 'reset' ? 'Demonstrația a fost resetată. ' + summary + '.' : summary;
    if (text !== lastSummary) { out.summary.textContent = text; lastSummary = text; }

    out.log.innerHTML = '';
    if (!state.log.length) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Nicio acțiune încă.';
      out.log.appendChild(li);
    } else {
      state.log.slice().reverse().forEach(function (e) {
        var item = document.createElement('li');
        var b = document.createElement('b');
        b.textContent = 'Pas ' + e.step;
        var s = document.createElement('span');
        s.textContent = e.text;
        item.appendChild(b); item.appendChild(s);
        out.log.appendChild(item);
      });
    }
  }

  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-select], [data-occ], .zone');
    if (!t) return;
    if (t.dataset.select) dispatch({ type: 'select', zone: t.dataset.select });
    else if (t.dataset.occ) dispatch({ type: 'occupancy', zone: state.selected, occupied: t.dataset.occ === 'true' });
    else if (t.dataset.zone) dispatch({ type: 'select', zone: t.dataset.zone });
  });
  root.addEventListener('change', function (e) {
    if (e.target.name === 'demo-mode') dispatch({ type: 'mode', zone: state.selected, mode: e.target.value });
  });
  document.getElementById('demo-reset').addEventListener('click', function () { dispatch({ type: 'reset' }); });

  window.__currentDemo = { getState: function () { return state; }, dispatch: dispatch };
  render();
})();
