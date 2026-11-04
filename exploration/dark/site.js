/* Room, distribution board and dashboard. Romanian only. */
(function () {
  'use strict';

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var menuBtn = $('.menu-toggle');
  var nav = $('#primary-nav');
  if (menuBtn && nav) {
    function closeMenu() {
      nav.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    menuBtn.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        closeMenu();
        menuBtn.focus();
      }
    });
  }

  var Room = window.LCRoom;
  var root = $('#scada');
  if (Room && root) {
    var state = Room.initialState();
    var shownRoom = state.room;
    var shownAmps = 0;
    var timer = null;

    function n1(n) { return (Math.round(n * 10) / 10).toFixed(1); }

    function render() {
      var v = Room.view(state);
      var roomEl = $('#room');
      roomEl.classList.toggle('is-lit', v.lights);
      roomEl.classList.toggle('is-heat', v.floor);
      roomEl.classList.toggle('is-hrv', v.hrv);
      roomEl.classList.toggle('is-ac', v.ac);
      roomEl.classList.toggle('is-occupied', v.presence);
      var cover = (100 - v.blinds) / 100;
      var slats = $$('.slat', roomEl);
      var shown = Math.round(cover * slats.length);
      slats.forEach(function (el, i) { el.style.opacity = i < shown ? '1' : '0'; });

      $('#room-temp').textContent = n1(reduced ? v.room : shownRoom);
      var ampsText = n1(reduced ? v.amps : shownAmps);
      $('#room-amps').textContent = ampsText;
      var meter = $('#meter-mirror');
      if (meter) meter.textContent = ampsText;
      var bar = $('#meter-bar');
      if (bar) bar.style.setProperty('--meter', Math.min(100, (parseFloat(ampsText) / 14) * 100) + '%');
      function load(n) { return n.toFixed(1); }
      var lightEl = $('#light-amps');
      if (lightEl) lightEl.textContent = load(v.lights ? 1.6 : 0);
      var floorEl = $('#floor-amps');
      if (floorEl) floorEl.textContent = load(v.floor ? 6.2 : 0);
      var hrvEl = $('#hrv-amps');
      if (hrvEl) hrvEl.textContent = load(v.hrv ? 0.8 : 0);
      var acEl = $('#ac-amps');
      if (acEl) acEl.textContent = load(v.ac ? 4.4 : 0);
      $('#pir-state').textContent = v.presence ? 'Mișcare' : 'Liniște';
      $('#blind-state').textContent = Math.round(v.blinds) + '%';
      $('#floor-set').textContent = n1(v.floorSet) + '°';
      $('#ac-set').textContent = n1(v.acSet) + '°';
      $('#light-mode').textContent = v.lightAuto ? 'PIR' : (v.lightCmd ? 'Manual pornit' : 'Manual oprit');
      $('#floor-mode').textContent = !v.breakers.floor ? 'Circuit deschis' : (v.floor ? 'Încălzește' : (v.floorEnabled ? 'În consignă' : 'Oprit'));
      $('#hrv-mode').textContent = !v.breakers.hrv ? 'Circuit deschis' : (v.hrv ? 'Pornește' : 'Oprit');
      $('#ac-mode').textContent = !v.breakers.ac ? 'Circuit deschis' : (v.ac ? 'Răcește' : (v.acCmd ? 'În consignă' : 'Oprit'));

      $$('[data-breaker]', root).forEach(function (btn) {
        var id = btn.getAttribute('data-breaker');
        var on = v.breakers[id];
        btn.setAttribute('aria-pressed', String(on));
        btn.classList.toggle('is-on', on);
      });
      var presenceBtn = $('#presence');
      presenceBtn.setAttribute('aria-pressed', String(v.presence));
      presenceBtn.textContent = v.presence ? 'Cineva este în cameră' : 'Camera este goală';
      $('#light-auto').setAttribute('aria-pressed', String(v.lightAuto));
      $('#floor-enable').setAttribute('aria-pressed', String(v.floorEnabled));
      $('#hrv-toggle').setAttribute('aria-pressed', String(v.hrvCmd));
      $('#ac-toggle').setAttribute('aria-pressed', String(v.acCmd));

      var log = $('#out-log');
      log.innerHTML = '';
      if (!state.log.length) {
        $('#out-log-empty').hidden = false;
      } else {
        $('#out-log-empty').hidden = true;
        state.log.forEach(function (entry) {
          var li = document.createElement('li');
          li.textContent = 'Pas ' + entry.step + ' · ' + entry.text;
          log.appendChild(li);
        });
      }
    }

    function paint() {
      var v = Room.view(state);
      var move = false;
      if (reduced) {
        shownRoom = v.room;
        shownAmps = v.amps;
      } else {
        shownRoom = shownRoom + (v.room - shownRoom) * 0.28;
        shownAmps = shownAmps + (v.amps - shownAmps) * 0.28;
        if (Math.abs(v.room - shownRoom) < 0.05) shownRoom = v.room;
        else move = true;
        if (Math.abs(v.amps - shownAmps) < 0.05) shownAmps = v.amps;
        else move = true;
      }
      render();
      if (move) requestAnimationFrame(paint);
    }

    function apply(action) {
      var next = Room.transition(state, action);
      if (next === state) return;
      state = next;
      paint();
    }

    root.addEventListener('click', function (event) {
      var breaker = event.target.closest('[data-breaker]');
      if (breaker) apply({ type: 'BREAKER', id: breaker.getAttribute('data-breaker') });
      if (event.target.closest('#presence')) apply({ type: 'PRESENCE' });
      if (event.target.closest('#light-auto')) apply({ type: 'LIGHT_MODE', auto: !state.light.auto });
      if (event.target.closest('#light-on')) apply({ type: 'LIGHT', on: true });
      if (event.target.closest('#light-off')) apply({ type: 'LIGHT', on: false });
      if (event.target.closest('#floor-enable')) apply({ type: 'FLOOR' });
      if (event.target.closest('#floor-up')) apply({ type: 'FLOOR_SET', dir: 1 });
      if (event.target.closest('#floor-down')) apply({ type: 'FLOOR_SET', dir: -1 });
      if (event.target.closest('#hrv-toggle')) apply({ type: 'HRV' });
      if (event.target.closest('#ac-toggle')) apply({ type: 'AC' });
      if (event.target.closest('#ac-up')) apply({ type: 'AC_SET', dir: 1 });
      if (event.target.closest('#ac-down')) apply({ type: 'AC_SET', dir: -1 });
      if (event.target.closest('#blinds-open')) apply({ type: 'BLINDS', target: 100 });
      if (event.target.closest('#blinds-close')) apply({ type: 'BLINDS', target: 0 });
      if (event.target.closest('#demo-reset')) {
        state = Room.initialState();
        shownRoom = state.room;
        shownAmps = Room.view(state).amps;
        render();
      }
    });

    if (!reduced) {
      timer = window.setInterval(function () {
        state = Room.transition(state, { type: 'TICK' });
        paint();
      }, 900);
    }
    shownAmps = Room.view(state).amps;
    render();
    window.addEventListener('pagehide', function () { if (timer) clearInterval(timer); });
  }

  var path = document.querySelector('.path');
  if (path) {
    var steps = $$('.path > li');
    function showStep(index) {
      steps.forEach(function (li, n) {
        li.classList.toggle('is-current', n === index);
        li.setAttribute('aria-current', n === index ? 'step' : 'false');
      });
    }
    steps.forEach(function (li, index) {
      li.tabIndex = 0;
      li.addEventListener('click', function () { showStep(index); });
      li.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          showStep(index);
        }
      });
    });
    showStep(0);
  }

  var frag = $('#fragment');
  if (frag) {
    var measured = 19.4;
    var shown = 19.4;
    var setpoint = 21;
    var sent = false;
    var confirmed = false;
    var status = $('#frag-status');
    var confirm = $('#frag-confirm');
    var measureEl = $('#frag-measured');
    var setEl = $('#frag-set');
    function draw() {
      measureEl.textContent = shown.toFixed(1);
      setEl.textContent = setpoint.toFixed(1) + '°';
    }
    function approach() {
      if (!sent) return;
      var gap = setpoint - shown;
      if (Math.abs(gap) < 0.05) {
        shown = setpoint;
        confirmed = true;
        status.textContent = 'Măsura a ajuns la consignă.';
        confirm.textContent = 'Echipamentul a confirmat.';
        draw();
        return;
      }
      shown = reduced ? setpoint : shown + gap * 0.18;
      status.textContent = 'Comanda a plecat.';
      confirm.textContent = 'Echipamentul încă nu a confirmat.';
      draw();
      if (!reduced) requestAnimationFrame(approach);
      else approach();
    }
    function command(next) {
      setpoint = Math.max(16, Math.min(26, Math.round(next * 2) / 2));
      sent = true;
      confirmed = false;
      status.textContent = 'Comanda a plecat.';
      confirm.textContent = 'Echipamentul încă nu a confirmat.';
      draw();
      approach();
    }
    $('#frag-up').addEventListener('click', function () { command(setpoint + 0.5); });
    $('#frag-down').addEventListener('click', function () { command(setpoint - 0.5); });
    draw();
  }

  var starts = document.querySelector('.starts');
  if (starts) {
    var startValue = $('#start-value');
    starts.addEventListener('click', function (event) {
      var button = event.target.closest('[data-start]');
      if (!button) return;
      var key = button.getAttribute('data-start');
      $$('[data-start]', starts).forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
      startValue.value = key;
      ['house', 'building', 'paper'].forEach(function (name) {
        var box = document.getElementById('start-' + name);
        var on = name === key;
        box.hidden = !on;
        if (!on) $$('input', box).forEach(function (input) { input.checked = false; });
      });
      var place = { house: 'home', building: 'building', paper: 'home' }[key];
      var placeInput = form && $('input[name="place"][value="' + place + '"]', form);
      if (placeInput) placeInput.checked = true;
      $('#start-error').textContent = '';
    });
  }

  var hashNav = document.querySelector('[data-nav="' + (location.hash || '').replace('#', '') + '"]');
  if (hashNav && location.pathname.indexOf('practici') !== -1) {
    $$('[data-nav]').forEach(function (link) { link.removeAttribute('aria-current'); });
    hashNav.setAttribute('aria-current', 'page');
  }

  var form = $('#enquiry');
  if (!form) return;
  var result = $('#form-result');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
    $$('.field-error', form).forEach(function (el) { el.textContent = ''; });
    var first = null;
    function mark(input, message) {
      var box = input.closest('fieldset') || input.parentElement;
      if (box.tagName === 'FIELDSET') box.setAttribute('aria-invalid', 'true');
      else input.setAttribute('aria-invalid', 'true');
      var err = $('.field-error', box);
      if (err) err.textContent = message;
      if (!first) first = input;
    }
    var startBtn = $('.starts [aria-pressed="true"]');
    if ($('#start-value') && !$('#start-value').value) {
      $('#start-error').textContent = 'Alege de unde pornești.';
      if (!first) first = $('.starts button');
    }
    var problem = $('input[name="problem"]:checked', form);
    var place = $('input[name="place"]:checked', form);
    var person = $('#person');
    var contact = $('#contact-detail');
    if (!problem) mark($('input[name="problem"]', form), 'Alege ce vrei să conduci.');
    if (!place) mark($('input[name="place"]', form), 'Alege locul.');
    if (!person.value.trim()) mark(person, 'Scrie un nume.');
    if (!contact.value.trim()) mark(contact, 'Lasă un email sau un telefon.');
    if (first) {
      result.hidden = false;
      result.textContent = '';
      var title = document.createElement('strong');
      title.textContent = 'Mai lipsește ceva';
      result.appendChild(title);
      result.appendChild(document.createTextNode(' Spune ce proces vrei să vezi și să comanzi, unde este, și cum te contactăm.'));
      (first.closest('fieldset') || first.parentElement).scrollIntoView({ block: 'center' });
      first.focus({ preventScroll: true });
      return;
    }
    var label = function (input) {
      var node = input.closest('label');
      return node ? node.textContent.replace(/\s+/g, ' ').trim() : input.value;
    };
    result.hidden = false;
    result.textContent = '';
    var strong = document.createElement('strong');
    strong.textContent = 'Nu s-a trimis nimic';
    result.appendChild(strong);
    result.appendChild(document.createTextNode(' Formularul este un prototip. Pe ecran rămâne doar rezumatul: ' +
      [startBtn ? startBtn.textContent.trim() : '', label(problem), label(place), person.value.trim(), contact.value.trim()].filter(Boolean).join(' · ')));
  });
})();
