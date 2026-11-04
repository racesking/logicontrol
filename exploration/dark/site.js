/* Control surface: menu, plant dashboard, prototype enquiry. Romanian only. */
(function () {
  'use strict';

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var NAMES = { heat: 'Încălzire', air: 'Ventilație', pump: 'Pompă' };
  var UNITS = { heat: '°C', air: '%', pump: 'bar' };
  var KIND = {
    setpoint: 'consignă',
    mode: 'mod',
    manual: 'comandă manuală',
    ack: 'alarmă văzută'
  };

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

  var Plant = window.LCPlant;
  var board = $('#board');
  if (Plant && board) {
    var state = Plant.initialState();
    var shown = { heat: 19.2, air: 45, pump: 1.6 };
    var timer = null;

    function format(id, n) {
      if (id === 'air') return String(Math.round(n));
      return (Math.round(n * 10) / 10).toFixed(1);
    }

    function line(id, view) {
      if (view.alarm === 'lag' && id === 'heat') return 'Încălzirea e în urmă. Vana urcă, camera încă nu.';
      if (view.alarm === 'low') return 'Presiunea stă sub consignă. Pompa nu ține ritmul.';
      if (view.alarm === 'lag') return 'Ventilația nu a ajuns la debitul cerut.';
      if (view.mode === 'manual') return 'Mod manual: comanda ta are prioritate. Procesul execută, nu ghicește.';
      return 'Mod automat: comanda se calculează din diferența dintre măsură și consignă.';
    }

    function render(snap) {
      var selected = state.selected;
      $$('[data-system]', board).forEach(function (btn) {
        var id = btn.getAttribute('data-system');
        var on = id === selected;
        btn.setAttribute('aria-pressed', String(on));
        var view = Plant.view(state, id);
        var value = btn.querySelector('[data-live]');
        if (value) value.textContent = format(id, snap ? view.measured : shown[id]) + ' ' + UNITS[id];
        var lamp = btn.querySelector('.lamp');
        if (lamp) lamp.classList.toggle('is-alarm', Boolean(view.alarm));
      });

      var view = Plant.view(state, selected);
      $('#board-name').textContent = NAMES[selected];
      $('#board-measured').textContent = format(selected, snap ? view.measured : shown[selected]);
      $('#board-unit').textContent = UNITS[selected];
      $('#board-setpoint').textContent = format(selected, view.setpoint) + ' ' + UNITS[selected];
      $('#board-output').textContent = view.output + '%';
      $('#board-bar').style.width = view.output + '%';
      $('#board-mode').textContent = view.mode === 'manual' ? 'Manual' : 'Automat';
      $('#board-line').textContent = line(selected, view);
      var alarm = $('#board-alarm');
      alarm.hidden = !view.alarm;
      $$('[data-mode]', board).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === view.mode));
      });
      var manual = $('#manual-output');
      if (document.activeElement !== manual) manual.value = String(view.mode === 'manual' ? view.manual : view.output);
      $('#out-step').textContent = 'Pas ' + state.step;

      var log = $('#out-log');
      var empty = $('#out-log-empty');
      log.innerHTML = '';
      if (!state.log.length) {
        empty.hidden = false;
      } else {
        empty.hidden = true;
        state.log.forEach(function (entry) {
          var li = document.createElement('li');
          li.textContent = 'Pas ' + entry.step + ' · ' + NAMES[entry.id] + ' · ' + KIND[entry.kind] + ' ' + entry.value;
          log.appendChild(li);
        });
      }
      board.setAttribute('data-selected', selected);
    }

    function paint() {
      var moving = false;
      ['heat', 'air', 'pump'].forEach(function (id) {
        var target = Plant.view(state, id).measured;
        var cur = shown[id];
        var next = reduced ? target : cur + (target - cur) * 0.35;
        if (Math.abs(target - next) < 0.05) next = target;
        else moving = true;
        shown[id] = next;
      });
      render(false);
      if (moving) requestAnimationFrame(paint);
    }

    function apply(action) {
      var next = Plant.transition(state, action);
      if (next === state) return;
      state = next;
      paint();
    }

    board.addEventListener('click', function (event) {
      var sys = event.target.closest('[data-system]');
      if (sys) apply({ type: 'SELECT', id: sys.getAttribute('data-system') });
      var nudge = event.target.closest('[data-nudge]');
      if (nudge) apply({ type: 'NUDGE', dir: Number(nudge.getAttribute('data-nudge')) });
      var mode = event.target.closest('[data-mode]');
      if (mode) apply({ type: 'MODE', mode: mode.getAttribute('data-mode') });
      if (event.target.closest('#ack')) apply({ type: 'ACK' });
      if (event.target.closest('#demo-reset')) {
        state = Plant.initialState();
        shown = { heat: 19.2, air: 45, pump: 1.6 };
        render(true);
      }
    });

    $('#manual-output').addEventListener('change', function (event) {
      apply({ type: 'MANUAL', value: event.target.value });
    });

    function loop() {
      state = Plant.transition(state, { type: 'TICK' });
      paint();
    }
    if (!reduced) timer = window.setInterval(loop, 1400);
    render(true);
    window.addEventListener('pagehide', function () { if (timer) clearInterval(timer); });
  }

  var form = $('#enquiry');
  if (!form) return;
  var result = $('#form-result');

  function clearErrors() {
    $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
    $$('.field-error', form).forEach(function (el) { el.textContent = ''; });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearErrors();
    var first = null;
    function mark(input, message) {
      var box = input.closest('fieldset') || input.parentElement;
      if (box.tagName === 'FIELDSET') box.setAttribute('aria-invalid', 'true');
      else input.setAttribute('aria-invalid', 'true');
      var err = $('.field-error', box);
      if (err) err.textContent = message;
      if (!first) first = input;
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
      [label(problem), label(place), person.value.trim(), contact.value.trim()].join(' · ')));
  });
})();
