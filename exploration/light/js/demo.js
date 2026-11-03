/* Mini-demo "Iluminat și prezență" — simulated, deterministic, resettable. */
(function () {
  'use strict';

  var ZONES = [
    { id: 'receptie', tag: 'Z1', name: 'Recepție', preset: 70, occupancy: 'ocupat', mode: 'auto' },
    { id: 'open-space', tag: 'Z2', name: 'Birouri open space', preset: 80, occupancy: 'ocupat', mode: 'auto' },
    { id: 'sala-sedinte', tag: 'Z3', name: 'Sală de ședințe', preset: 60, occupancy: 'liber', mode: 'auto' }
  ];
  var BY_ID = {};
  ZONES.forEach(function (z) { BY_ID[z.id] = z; });
  var LOG_LIMIT = 5;
  var MODE_LABEL = { auto: 'Automat (prezență)', on: 'Manual: pornit', off: 'Manual: oprit' };
  var MODE_SHORT = { auto: 'Automat', on: 'Manual pornit', off: 'Manual oprit' };
  var OCC_LABEL = { ocupat: 'Ocupat', liber: 'Liber' };

  function command(id, z) {
    if (z.mode === 'on') return BY_ID[id].preset;
    if (z.mode === 'off') return 0;
    return z.occupancy === 'ocupat' ? BY_ID[id].preset : 0;
  }

  function initialState() {
    var zones = {};
    ZONES.forEach(function (z) {
      var s = { occupancy: z.occupancy, mode: z.mode };
      s.feedback = command(z.id, s);
      zones[z.id] = s;
    });
    return { selected: ZONES[0].id, step: 0, zones: zones, log: [], notice: null };
  }

  function pct(v) { return v === 0 ? 'oprit' : v + '%'; }
  function level(v) { return v === 0 ? 'iluminat oprit' : 'iluminat ' + v + '%'; }

  function withZone(state, id, patch, logText) {
    var zones = {};
    Object.keys(state.zones).forEach(function (k) { zones[k] = state.zones[k]; });
    var next = {};
    Object.keys(zones[id]).forEach(function (k) { next[k] = zones[id][k]; });
    Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
    zones[id] = next;
    var step = state.step + 1;
    var log = state.log.concat([{ step: step, text: BY_ID[id].name + ': ' + logText + ' → comandă ' + level(command(id, next)) }]);
    if (log.length > LOG_LIMIT) log = log.slice(log.length - LOG_LIMIT);
    return { selected: id, step: step, zones: zones, log: log, notice: { type: 'command', zone: id } };
  }

  /* Pure transition: (state, action) -> state. No clocks, no randomness. */
  function transition(state, action) {
    var z;
    switch (action.type) {
      case 'select':
        if (!BY_ID[action.zone] || state.selected === action.zone) return state;
        return { selected: action.zone, step: state.step, zones: state.zones, log: state.log, notice: null };
      case 'occupancy':
        z = state.zones[action.zone];
        if (!z || z.occupancy === action.value || !OCC_LABEL[action.value]) return state;
        return withZone(state, action.zone, { occupancy: action.value }, 'prezență ' + OCC_LABEL[action.value]);
      case 'mode':
        z = state.zones[action.zone];
        if (!z || z.mode === action.value || !MODE_LABEL[action.value]) return state;
        return withZone(state, action.zone, { mode: action.value }, 'mod ' + MODE_LABEL[action.value]);
      case 'confirm': {
        z = state.zones[action.zone];
        if (!z) return state;
        var cmd = command(action.zone, z);
        if (z.feedback === cmd) return state;
        var zones = {};
        Object.keys(state.zones).forEach(function (k) { zones[k] = state.zones[k]; });
        zones[action.zone] = { occupancy: z.occupancy, mode: z.mode, feedback: cmd };
        return { selected: state.selected, step: state.step, zones: zones, log: state.log, notice: { type: 'confirmed', zone: action.zone } };
      }
      case 'reset': {
        var s = initialState();
        s.notice = { type: 'reset' };
        return s;
      }
      default:
        return state;
    }
  }

  function explain(id, z) {
    var c = command(id, z);
    if (z.mode !== 'auto') return 'Comandă manuală: are prioritate față de prezență → iluminat ' + (c ? c + '%' : 'oprit') + '.';
    if (z.occupancy === 'ocupat') return 'Mod automat: prezență detectată → iluminat ' + c + '%.';
    return 'Mod automat: zonă liberă → iluminat oprit.';
  }

  function advisory(z) {
    if (z.mode === 'on' && z.occupancy === 'liber') return 'Atenție: iluminat pornit manual într-o zonă liberă.';
    if (z.mode === 'off' && z.occupancy === 'ocupat') return 'Atenție: zonă ocupată cu iluminatul oprit manual.';
    return '';
  }

  function litCount(state) {
    return ZONES.filter(function (z) { return state.zones[z.id].feedback > 0; }).length;
  }

  var api = { ZONES: ZONES, initialState: initialState, transition: transition, command: command, explain: explain, advisory: advisory, litCount: litCount };
  window.LCDemo = api;

  /* ---------- DOM layer ---------- */
  var root = document.getElementById('demo');
  if (!root) return;

  var ACTUATION_MS = 600;
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var timers = {};
  var state = initialState();

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    zoneBtns: root.querySelectorAll('.zone-btn'),
    planZones: root.querySelectorAll('.plan .zone'),
    name: $('zone-name'), preset: $('zone-preset'),
    occ: root.querySelectorAll('input[name="occ"]'), mode: root.querySelectorAll('input[name="mode"]'),
    cmd: $('out-cmd'), fb: $('out-fb'), status: $('out-status'),
    explain: $('out-explain'), advisory: $('out-advisory'),
    summary: $('out-summary'), announce: $('out-announce'),
    log: $('out-log'), logEmpty: $('out-log-empty'), step: $('out-step'), reset: $('demo-reset')
  };

  function schedule(id) {
    clearTimeout(timers[id]);
    delete timers[id];
    var z = state.zones[id];
    if (z.feedback === command(id, z)) return;
    if (reduceMotion.matches) { dispatch({ type: 'confirm', zone: id }); return; }
    timers[id] = setTimeout(function () { delete timers[id]; dispatch({ type: 'confirm', zone: id }); }, ACTUATION_MS);
  }

  function dispatch(action) {
    var next = transition(state, action);
    if (next === state) return;
    state = next;
    if (action.type === 'reset') {
      Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
      timers = {};
    }
    render();
    if (action.type === 'occupancy' || action.type === 'mode') schedule(action.zone);
  }

  function render() {
    var sel = state.selected, meta = BY_ID[sel], z = state.zones[sel];
    var cmd = command(sel, z), pending = z.feedback !== cmd;

    ZONES.forEach(function (m) {
      var s = state.zones[m.id], c = command(m.id, s), p = s.feedback !== c;
      var btn = root.querySelector('.zone-btn[data-zone="' + m.id + '"]');
      btn.setAttribute('aria-pressed', String(m.id === sel));
      btn.querySelector('.zstate').textContent = pct(s.feedback) + ' · ' + OCC_LABEL[s.occupancy] + (p ? ' · se aplică…' : '') + (advisory(s) ? ' · atenție' : '');
      var g = root.querySelector('.plan .zone[data-zone="' + m.id + '"]');
      g.classList.toggle('is-selected', m.id === sel);
      g.classList.toggle('is-lit', s.feedback > 0);
      g.classList.toggle('is-pending', p);
      g.classList.toggle('is-occupied', s.occupancy === 'ocupat');
      g.classList.toggle('has-advisory', !!advisory(s));
      g.querySelectorAll('.z-value').forEach(function (t) { t.textContent = s.feedback + '%'; });
      g.querySelector('.z-cmd').textContent = 'COMANDĂ ' + c + '%';
      var st = g.querySelector('.z-status');
      st.textContent = p ? 'SE APLICĂ…' : 'CONFIRMAT';
      st.setAttribute('fill', p ? '#B53308' : '#161513');
      g.querySelector('.z-occ').textContent = (OCC_LABEL[s.occupancy] + ' · ' + MODE_SHORT[s.mode]).toUpperCase();
    });

    els.name.textContent = meta.name;
    els.preset.textContent = 'Preset ' + meta.preset + '%';
    els.occ.forEach(function (i) { i.checked = i.value === z.occupancy; });
    els.mode.forEach(function (i) { i.checked = i.value === z.mode; });
    els.cmd.textContent = pct(cmd);
    els.fb.textContent = pct(z.feedback);
    els.status.textContent = pending ? 'Se aplică…' : 'Confirmat';
    els.status.classList.toggle('is-pending', pending);
    els.explain.textContent = explain(sel, z);
    var adv = advisory(z);
    els.advisory.hidden = !adv;
    els.advisory.textContent = adv;

    var summary = 'Zone iluminate: ' + litCount(state) + ' din 3';
    if (els.summary.textContent !== summary) els.summary.textContent = summary;
    var n = state.notice, msg = '';
    if (n && n.type === 'reset') msg = 'Demonstrația a fost resetată la starea inițială.';
    else if (n && n.type === 'confirmed') msg = BY_ID[n.zone].name + ': stare confirmată — ' + level(state.zones[n.zone].feedback) + '.';
    else if (n && n.type === 'command') {
      var nz = state.zones[n.zone], nc = command(n.zone, nz);
      msg = BY_ID[n.zone].name + ': comandă ' + level(nc) + (nz.feedback !== nc ? ' — se aplică…' : ' — fără schimbare.');
    }
    if (n && els.announce.textContent !== msg) els.announce.textContent = msg;

    els.log.textContent = '';
    state.log.forEach(function (e) {
      var li = document.createElement('li');
      var s = document.createElement('span'); s.className = 'step'; s.textContent = 'Pas ' + e.step;
      var t = document.createElement('span'); t.textContent = e.text;
      li.appendChild(s); li.appendChild(t);
      els.log.appendChild(li);
    });
    els.log.hidden = state.log.length === 0;
    els.logEmpty.hidden = state.log.length > 0;
    els.step.textContent = String(state.step);
  }

  els.zoneBtns.forEach(function (b) {
    b.addEventListener('click', function () { dispatch({ type: 'select', zone: b.getAttribute('data-zone') }); });
  });
  els.planZones.forEach(function (g) {
    g.addEventListener('click', function () { dispatch({ type: 'select', zone: g.getAttribute('data-zone') }); });
  });
  els.occ.forEach(function (i) {
    i.addEventListener('change', function () { if (i.checked) dispatch({ type: 'occupancy', zone: state.selected, value: i.value }); });
  });
  els.mode.forEach(function (i) {
    i.addEventListener('change', function () { if (i.checked) dispatch({ type: 'mode', zone: state.selected, value: i.value }); });
  });
  els.reset.addEventListener('click', function () { dispatch({ type: 'reset' }); });

  render();
})();
