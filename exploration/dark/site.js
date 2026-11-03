/* Concept "Control": language toggle, menu, demo rendering and prototype enquiry. */
(function () {
  'use strict';

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Hero language toggle ---------- */
  var COPY = {
    ro: {
      h1: 'Control clar pentru clădiri complexe.',
      lead: 'Integrare BMS, depanare, programare și mentenanță pentru clădiri comerciale din toată România.',
      cta1: 'Discută proiectul', cta2: 'Explorează demonstrația',
      ovTitle: 'Vedere de ansamblu · iluminat', sim: 'Demonstrație simulată',
      ovHint: 'Selectați o zonă pentru a o comanda',
      sum: function (n) { return 'Zone iluminate: ' + n + ' din 3'; },
      modes: { auto: 'Automat', 'manual-on': 'Manual: pornit', 'manual-off': 'Manual: oprit' },
      pending: 'se aplică…'
    },
    en: {
      h1: 'Clear control for complex buildings.',
      lead: 'BMS integration, troubleshooting, programming and maintenance for commercial buildings across Romania.',
      cta1: 'Discuss your project', cta2: 'Explore the demo',
      ovTitle: 'Overview · lighting', sim: 'Simulated demonstration',
      ovHint: 'Select a zone to control it',
      sum: function (n) { return 'Lit zones: ' + n + ' of 3'; },
      modes: { auto: 'Automatic', 'manual-on': 'Manual: on', 'manual-off': 'Manual: off' },
      pending: 'applying…'
    }
  };
  var lang = 'ro';
  var hero = $('#hero');

  function setLang(next) {
    lang = next;
    hero.setAttribute('lang', next);
    $$('[data-i18n]', hero).forEach(function (el) {
      var v = COPY[next][el.getAttribute('data-i18n')];
      if (typeof v === 'string') el.textContent = v;
    });
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === next)); });
    renderOverview();
  }
  $$('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('.menu-toggle');
  var nav = $('#primary-nav');
  function closeMenu() { nav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); menuBtn.focus(); }
  });

  /* ---------- Demo ---------- */
  var D = window.LCDemo;
  var state = D.initialState();
  var timers = {};
  var MODE_RO = COPY.ro.modes;

  var plan = $('#plan');
  var mirror = plan.cloneNode(true);
  mirror.removeAttribute('id');
  mirror.setAttribute('class', 'plan plan--mirror');
  $('#overview-plan').appendChild(mirror);

  var overviewRows = $('#overview-rows');
  D.ZONES.forEach(function (z) {
    var li = document.createElement('li');
    li.innerHTML = '<button type="button" class="overview-row" data-zone="' + z.id + '">' +
      '<span class="name">' + z.name + '</span><span class="mode" data-ov-mode></span>' +
      '<span class="value" data-ov-value></span></button>';
    overviewRows.appendChild(li);
  });

  function pct(n) { return n + '%'; }
  function zoneName(id) { return D.zoneDef(id).name; }

  function renderPlan(svg) {
    D.ZONES.forEach(function (z) {
      var g = svg.querySelector('[data-zone="' + z.id + '"]');
      var zs = state.zones[z.id];
      var pending = D.isPending(state, z.id);
      g.classList.toggle('is-selected', state.selected === z.id);
      g.classList.toggle('is-lit', zs.feedback > 0);
      g.querySelector('.zone-wash').style.fillOpacity = String((zs.feedback / 100) * 0.15);
      $$('.fixture', g).forEach(function (f) { f.style.fillOpacity = zs.feedback > 0 ? String(0.45 + 0.55 * zs.feedback / 100) : ''; });
      g.querySelector('[data-meta]').textContent = (zs.occupied ? 'Ocupat' : 'Liber') + ' · ' + MODE_RO[zs.mode];
      var valueEl = g.querySelector('[data-value]');
      var pendingEl = g.querySelector('[data-pending]');
      valueEl.textContent = zs.feedback > 0 ? pct(zs.feedback) : 'Oprit';
      pendingEl.textContent = pending ? '→ ' + pct(D.command(state, z.id)) + ' · se aplică…' : '';
      pendingEl.setAttribute('x', String(Number(valueEl.getAttribute('x')) + valueEl.textContent.length * 18 + 12));
    });
  }

  function renderOverview() {
    var c = COPY[lang];
    D.ZONES.forEach(function (z) {
      var row = overviewRows.querySelector('[data-zone="' + z.id + '"]');
      var zs = state.zones[z.id];
      row.querySelector('[data-ov-mode]').textContent = D.isPending(state, z.id) ? c.pending : c.modes[zs.mode];
      row.querySelector('[data-ov-value]').textContent = pct(zs.feedback);
      row.setAttribute('aria-label', z.name + ', ' + pct(zs.feedback) + (lang === 'ro' ? ' — deschide în consolă' : ' — open in console'));
    });
    $('#overview-sum').textContent = c.sum(D.litCount(state));
  }

  function logText(e) {
    var what = e.kind === 'occupancy'
      ? 'prezență: ' + (e.value ? 'Ocupat' : 'Liber')
      : 'mod: ' + MODE_RO[e.value];
    return zoneName(e.zone) + ' · ' + what + ' → comandă ' + pct(e.command);
  }

  function render() {
    var id = state.selected;
    var zs = state.zones[id];
    var cmd = D.command(state, id);
    var pending = D.isPending(state, id);

    renderPlan(plan);
    renderPlan(mirror);
    renderOverview();

    $$('.zone-btn').forEach(function (b) {
      var zid = b.getAttribute('data-zone');
      var z = state.zones[zid];
      b.setAttribute('aria-pressed', String(zid === id));
      b.querySelector('[data-zb-state]').innerHTML = '<span>Comandă <b>' + pct(D.command(state, zid)) + '</b></span><span>Confirmat <b>' + pct(z.feedback) + '</b></span>';
    });

    $('#zone-name').textContent = zoneName(id);
    $('#zone-preset').textContent = 'Preset ' + pct(D.zoneDef(id).preset);
    $$('#occ-group button').forEach(function (b) {
      b.setAttribute('aria-pressed', String((b.getAttribute('data-occupied') === 'true') === zs.occupied));
    });
    $$('#mode-group button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === zs.mode));
    });

    $('#ro-command').textContent = pct(cmd);
    $('#ro-feedback').textContent = pct(zs.feedback);
    var status = $('#ro-status');
    status.textContent = pending ? 'Se aplică…' : 'Confirmat';
    status.classList.toggle('is-pending', pending);
    $('#explain').textContent = D.explanation(state, id);

    var adv = D.ZONES.map(function (z) { return { id: z.id, text: D.advisory(state, z.id) }; }).filter(function (a) { return a.text; });
    var list = $('#advisory-list');
    list.innerHTML = '';
    if (!adv.length) {
      list.innerHTML = '<li class="none">Nicio atenționare activă.</li>';
    } else {
      adv.forEach(function (a) {
        var li = document.createElement('li');
        var ref = document.createElement('span');
        ref.className = 'zone-ref';
        ref.textContent = zoneName(a.id);
        li.appendChild(ref);
        li.appendChild(document.createTextNode(a.text));
        list.appendChild(li);
      });
    }
    $('#advisory-strip').classList.toggle('has-advisory', adv.length > 0);

    var journal = $('#journal');
    journal.innerHTML = '';
    if (!state.log.length) {
      journal.innerHTML = '<li class="empty">Nicio acțiune încă.</li>';
    } else {
      state.log.forEach(function (e) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="step">#' + String(e.step).padStart(2, '0') + '</span><span></span>';
        li.lastChild.textContent = logText(e);
        journal.appendChild(li);
      });
    }
    $('#journal-step').textContent = 'Pas ' + state.step;
  }

  function announce(note) {
    $('#sum-main').textContent = 'Zone iluminate: ' + D.litCount(state) + ' din 3';
    $('#sum-note').textContent = note;
  }

  function restartActuationBar() {
    var bar = $('#ro-actuation');
    bar.classList.remove('is-running');
    if (D.isPending(state, state.selected) && !reducedMotion.matches) {
      void bar.offsetWidth;
      bar.classList.add('is-running');
    }
  }

  function settle(id) {
    delete timers[id];
    var before = state;
    state = D.transition(state, { type: 'SETTLE', zone: id });
    if (state !== before) {
      render();
      restartActuationBar();
      announce(zoneName(id) + ': stare confirmată ' + pct(state.zones[id].feedback) + '.');
    }
  }

  function dispatch(action) {
    var before = state;
    state = D.transition(state, action);
    if (state === before) return;
    var id = action.zone;
    if (action.type === 'SET_OCCUPANCY' || action.type === 'SET_MODE') {
      if (timers[id]) { clearTimeout(timers[id]); delete timers[id]; }
      if (D.isPending(state, id)) {
        if (reducedMotion.matches) { render(); settle(id); return; }
        timers[id] = setTimeout(function () { settle(id); }, 600);
        render();
        restartActuationBar();
        return;
      }
    }
    render();
    restartActuationBar();
  }

  function selectZone(id) { dispatch({ type: 'SELECT', zone: id }); }

  $$('.zone-btn').forEach(function (b) {
    b.addEventListener('click', function () { selectZone(b.getAttribute('data-zone')); });
  });
  $$('.zone', plan).forEach(function (g) {
    g.addEventListener('click', function () {
      var id = g.getAttribute('data-zone');
      selectZone(id);
      $('.zone-btn[data-zone="' + id + '"]').focus({ preventScroll: true });
    });
  });
  $$('#occ-group button').forEach(function (b) {
    b.addEventListener('click', function () {
      dispatch({ type: 'SET_OCCUPANCY', zone: state.selected, occupied: b.getAttribute('data-occupied') === 'true' });
    });
  });
  $$('#mode-group button').forEach(function (b) {
    b.addEventListener('click', function () {
      dispatch({ type: 'SET_MODE', zone: state.selected, mode: b.getAttribute('data-mode') });
    });
  });
  $$('.overview-row').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-zone');
      selectZone(id);
      var target = $('.zone-btn[data-zone="' + id + '"]');
      $('#console').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    });
  });
  $('#demo-reset').addEventListener('click', function () {
    Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
    timers = {};
    state = D.transition(state, { type: 'RESET' });
    render();
    restartActuationBar();
    announce('Demonstrația a fost resetată la starea inițială.');
  });

  render();

  /* ---------- Prototype enquiry (never sends, never stores) ---------- */
  var form = $('#enquiry');
  var step1 = $('#step-1');
  var step2 = $('#step-2');
  var result = $('#form-result');

  function checked(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function setError(fieldId, errId, msg) {
    var field = $('#' + fieldId);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $('#' + errId).textContent = msg || '';
    return !msg;
  }
  function focusFirstInvalid(scope) {
    var bad = scope.querySelector('[aria-invalid="true"]');
    if (!bad) return;
    var target = bad.tagName === 'FIELDSET' ? bad.querySelector('input') : bad;
    target.focus();
  }
  function validateStep1() {
    var ok = true;
    ok = setError('f-building', 'e-building', checked('building') ? '' : 'Alegeți tipul clădirii.') && ok;
    ok = setError('f-location', 'e-location', $('#f-location').value.trim().length >= 2 ? '' : 'Completați județul sau localitatea.') && ok;
    ok = setError('f-need', 'e-need', checked('need') ? '' : 'Alegeți nevoia principală.') && ok;
    return ok;
  }
  function validateStep2() {
    var ok = true;
    var pref = checked('pref');
    var contact = $('#f-contact').value.trim();
    var contactMsg = '';
    if (!contact) contactMsg = 'Completați e-mailul sau telefonul.';
    else if (pref === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact)) contactMsg = 'Introduceți o adresă de e-mail validă.';
    else if (pref === 'telefon' && (contact.replace(/\D/g, '').length < 9 || /[^\d\s+().-]/.test(contact))) contactMsg = 'Introduceți un număr de telefon valid.';
    else if (!pref && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact) && contact.replace(/\D/g, '').length < 9) contactMsg = 'Introduceți un e-mail sau un telefon valid.';
    ok = setError('f-pref', 'e-pref', pref ? '' : 'Alegeți modul de contact preferat.') && ok;
    ok = setError('f-name', 'e-name', $('#f-name').value.trim().length >= 2 ? '' : 'Completați numele.') && ok;
    ok = setError('f-contact', 'e-contact', contactMsg) && ok;
    return ok;
  }
  function showStep(n) {
    step1.hidden = n !== 1;
    step2.hidden = n !== 2;
    $('#form-step-title').textContent = 'Solicitare · Pasul ' + n + ' din 2';
    $('#prog-1').className = n === 1 ? 'is-current' : 'is-done';
    $('#prog-2').className = n === 2 ? 'is-current' : '';
    result.hidden = true;
  }
  $('#to-step-2').addEventListener('click', function () {
    if (!validateStep1()) { focusFirstInvalid(step1); return; }
    showStep(2);
    $('#f-desc').focus();
  });
  $('#to-step-1').addEventListener('click', function () {
    showStep(1);
    $('#to-step-2').focus();
  });
  $$('input[name="pref"]', form).forEach(function (r) {
    r.addEventListener('change', function () {
      $('#f-contact').setAttribute('inputmode', r.value === 'telefon' ? 'tel' : 'email');
    });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (step1.hidden === false) { $('#to-step-2').click(); return; }
    if (!validateStep2()) { result.hidden = true; focusFirstInvalid(step2); return; }
    result.innerHTML = '<strong>Prototip · nimic nu a fost trimis</strong>Solicitarea nu a fost trimisă: acesta este un prototip. Trimiterea va fi activată după configurarea serviciului de contact.';
    result.hidden = false;
  });
})();
