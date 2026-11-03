/* Control page: menu, air-and-heat demonstration, prototype enquiry. */
(function () {
  'use strict';

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var lang = document.documentElement.lang === 'en' ? 'en' : 'ro';

  var COPY = {
    ro: {
      airFresh: 'Mai curat',
      airHeavy: 'Greu',
      heatWords: { 100: 'Rămâne în cameră', 40: 'Multă iese pe geam', 75: 'O mare parte rămâne' },
      explain: {
        closed: 'Geamul a stat închis. Aerul rămâne greu. Căldura stă în cameră, dar nu a intrat aer proaspăt, iar umiditatea rămâne înăuntru.',
        tilted: 'Geamul întredeschis aduce aer mai curat și scoate căldura afară. Dimineața, centrala sau pompa încălzește aer rece.',
        recovery: 'Intră aer mai curat, iar o mare parte din căldură rămâne în casă. Este un principiu ilustrativ, nu o economie promisă și nu un echipament dimensionat.'
      },
      ways: {
        closed: 'Geam închis toată noaptea',
        tilted: 'Geam întredeschis',
        recovery: 'Aer proaspăt cu recuperare de căldură'
      },
      emptyLog: 'Nicio alegere încă. Porniți de la geamul închis.',
      step: function (n) { return 'Pas ' + n; },
      notSent: 'Nu s-a trimis nimic',
      notSentBody: 'Acesta este un formular prototip. Mesajul rămâne doar pe acest ecran.',
      need: 'Alegeți una dintre variante.',
      needText: 'Completați acest câmp.',
      incomplete: 'Completați formularul',
      incompleteBody: 'Alegeți ce nu merge, locul și ce există deja, apoi scrieți numele și emailul sau telefonul.'
    },
    en: {
      airFresh: 'Fresher',
      airHeavy: 'Heavy',
      heatWords: { 100: 'Stays in the room', 40: 'Much of it leaves', 75: 'Most of it stays' },
      explain: {
        closed: 'The window stayed shut. The air stays heavy. The heat remains in the room, but no fresh air came in, and the moisture stays inside.',
        tilted: 'A tilted window brings fresher air and lets the heat out. In the morning the boiler or heat pump warms cold air.',
        recovery: 'Fresher air comes in, and most of the heat stays in the house. This illustrates a principle. It is not a promised saving and not a sized product.'
      },
      ways: {
        closed: 'Window shut all night',
        tilted: 'Window tilted open',
        recovery: 'Fresh air with heat recovery'
      },
      emptyLog: 'No choice yet. Start from the shut window.',
      step: function (n) { return 'Step ' + n; },
      notSent: 'Nothing was sent',
      notSentBody: 'This is a prototype form. The message stays on this screen only.',
      need: 'Choose one option.',
      needText: 'Fill in this field.',
      incomplete: 'Complete the form',
      incompleteBody: 'Choose what is wrong, the place, and what is already there, then add a name and an email or phone.'
    }
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

  var D = window.LCAir;
  var demo = $('#demo');
  if (D && demo) {
    var state = D.initialState();
    var t = COPY[lang];

    function render() {
      var f = D.facts(state);
      $('#air-word').textContent = f.fresh ? t.airFresh : t.airHeavy;
      $('#co2').textContent = String(f.co2);
      $('#heat').value = f.heatKept;
      $('#heat-word').textContent = t.heatWords[f.heatKept];
      $('#explain').textContent = t.explain[state.way];
      $('#out-step').textContent = t.step(state.step);
      $$('input[name="way"]', demo).forEach(function (input) {
        input.checked = input.value === state.way;
      });
      var log = $('#out-log');
      var empty = $('#out-log-empty');
      log.innerHTML = '';
      if (!state.log.length) {
        empty.hidden = false;
        empty.textContent = t.emptyLog;
      } else {
        empty.hidden = true;
        state.log.forEach(function (entry) {
          var li = document.createElement('li');
          li.textContent = t.step(entry.step) + ' — ' + t.ways[entry.way];
          log.appendChild(li);
        });
      }
    }

    demo.addEventListener('change', function (event) {
      if (event.target.name !== 'way') return;
      state = D.transition(state, { type: 'SET_WAY', way: event.target.value });
      render();
    });
    $('#demo-reset').addEventListener('click', function () {
      state = D.transition(state, { type: 'RESET' });
      render();
    });
    render();
  }

  var form = $('#enquiry');
  if (!form) return;
  var result = $('#form-result');
  var copy = COPY[lang];

  function fieldsetOf(input) {
    return input.closest('fieldset');
  }

  function clearErrors() {
    $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
    $$('.field-error', form).forEach(function (el) { el.textContent = ''; });
  }

  function fail(el, message) {
    var box = fieldsetOf(el) || el.parentElement;
    if (box.tagName === 'FIELDSET') box.setAttribute('aria-invalid', 'true');
    else el.setAttribute('aria-invalid', 'true');
    var err = $('.field-error', box);
    if (err) err.textContent = message;
    return el;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearErrors();
    var first = null;
    function mark(el, message) {
      var target = fail(el, message);
      if (!first) first = target.tagName === 'FIELDSET' ? $('input, textarea', target) || target : target;
    }

    var problem = $('input[name="problem"]:checked', form);
    var place = $('input[name="place"]:checked', form);
    var plant = $('input[name="plant"]:checked', form);
    var person = $('#person');
    var contact = $('#contact-detail');
    if (!problem) mark($('input[name="problem"]', form), copy.need);
    if (!place) mark($('input[name="place"]', form), copy.need);
    if (!plant) mark($('input[name="plant"]', form), copy.need);
    if (!person.value.trim()) mark(person, copy.needText);
    if (!contact.value.trim()) mark(contact, copy.needText);
    if (first) {
      result.hidden = false;
      result.textContent = '';
      var incomplete = document.createElement('strong');
      incomplete.textContent = copy.incomplete;
      result.appendChild(incomplete);
      result.appendChild(document.createTextNode(' ' + copy.incompleteBody));
      var box = first.closest('fieldset') || first.parentElement;
      box.scrollIntoView({ block: 'center' });
      if (first.focus) first.focus({ preventScroll: true });
      return;
    }

    var chosen = function (input) {
      var label = input.closest('label');
      return label ? label.textContent.replace(/\s+/g, ' ').trim() : input.value;
    };
    result.hidden = false;
    result.textContent = '';
    var title = document.createElement('strong');
    title.textContent = copy.notSent;
    result.appendChild(title);
    result.appendChild(document.createTextNode(' ' + copy.notSentBody + ' ' +
      [chosen(problem), chosen(place), chosen(plant), person.value.trim(), contact.value.trim()].join(' · ')));
  });
})();
