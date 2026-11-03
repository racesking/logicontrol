(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* Mobile navigation */
  var toggle = document.querySelector('.nav-toggle');
  var nav = $('site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
  }

  /* Hero language toggle (hero only; the rest of the page stays Romanian) */
  var COPY = {
    ro: {
      strip: 'Integrare BMS · Clădiri comerciale · România',
      h1a: 'Control clar', h1b: 'pentru clădiri', h1c: 'complexe',
      lead: 'Integrare BMS, depanare, programare și mentenanță pentru clădiri comerciale din toată România.',
      cta1: 'Discută proiectul', cta2: 'Explorează demonstrația'
    },
    en: {
      strip: 'BMS integration · Commercial buildings · Romania',
      h1a: 'Clear control', h1b: 'for complex', h1c: 'buildings',
      lead: 'BMS integration, troubleshooting, programming and maintenance for commercial buildings across Romania.',
      cta1: 'Discuss your project', cta2: 'Explore the demo'
    }
  };
  var hero = $('top');
  var langBtns = document.querySelectorAll('.lang-switch button');
  function setLang(lang) {
    if (!hero || !COPY[lang]) return;
    hero.setAttribute('lang', lang);
    hero.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (key === 'h1c') {
        el.firstChild.nodeValue = COPY[lang].h1c;
      } else {
        el.textContent = COPY[lang][key];
      }
    });
    langBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
  }
  langBtns.forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });

  /* Two-step prototype enquiry. Only radio groups carry name attributes, the form posts (never GETs)
     and submission is always prevented: nothing leaves the page or reaches the URL. */
  var form = $('enquiry');
  if (!form) return;
  var step1 = $('step-1'), step2 = $('step-2');
  var next = $('f-next'), back = $('f-back'), check = $('f-check'), result = $('f-result');
  var ind1 = $('step-ind-1'), ind2 = $('step-ind-2');

  function radioValue(name) {
    var r = form.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : '';
  }
  function setError(field, errId, bad) {
    var err = $(errId);
    err.hidden = !bad;
    if (field.tagName === 'FIELDSET') {
      field.classList.toggle('fieldset-invalid', bad);
      field.querySelectorAll('input').forEach(function (i) { if (bad) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); });
    } else if (bad) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return bad;
  }
  function focusFirst(fields) {
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].bad) {
        var el = fields[i].el.tagName === 'FIELDSET' ? fields[i].el.querySelector('input') : fields[i].el;
        el.focus();
        return false;
      }
    }
    return true;
  }
  function validate1() {
    var type = $('f-type'), place = $('f-place'), need = $('f-need');
    return focusFirst([
      { el: type, bad: setError(type, 'e-type', !type.value) },
      { el: place, bad: setError(place, 'e-place', place.value.trim().length < 2) },
      { el: need, bad: setError(need, 'e-need', !radioValue('need')) }
    ]);
  }
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function isPhone(v) { return /^[+()\d\s.-]+$/.test(v) && v.replace(/\D/g, '').length >= 9; }
  function validate2() {
    var pref = $('f-pref'), name = $('f-name'), contact = $('f-contact');
    var p = radioValue('pref'), v = contact.value.trim();
    var contactBad = !v || (p === 'email' ? !EMAIL.test(v) : p === 'phone' ? !isPhone(v) : !(EMAIL.test(v) || isPhone(v)));
    $('e-contact').textContent = p === 'phone' ? 'Introduceți un număr de telefon valid (minimum 9 cifre).'
      : p === 'email' ? 'Introduceți o adresă de e-mail validă.'
      : 'Introduceți o adresă de e-mail validă sau un număr de telefon.';
    return focusFirst([
      { el: pref, bad: setError(pref, 'e-pref', !p) },
      { el: name, bad: setError(name, 'e-name', name.value.trim().length < 2) },
      { el: contact, bad: setError(contact, 'e-contact', contactBad) }
    ]);
  }
  function showStep(n) {
    step1.hidden = n !== 1; step2.hidden = n !== 2;
    next.hidden = n !== 1; back.hidden = n !== 2; check.hidden = n !== 2;
    result.hidden = true;
    if (n === 1) { ind1.setAttribute('aria-current', 'step'); ind2.removeAttribute('aria-current'); }
    else { ind2.setAttribute('aria-current', 'step'); ind1.removeAttribute('aria-current'); }
  }

  next.addEventListener('click', function () {
    if (validate1()) { showStep(2); form.querySelector('#step-2 textarea').focus(); }
  });
  back.addEventListener('click', function () { showStep(1); $('f-type').focus(); });
  $('f-pref').addEventListener('change', function () {
    $('f-contact').setAttribute('inputmode', radioValue('pref') === 'phone' ? 'tel' : 'email');
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!step1.hidden) { next.click(); return; }
    if (validate2()) {
      result.hidden = false;
      result.setAttribute('tabindex', '-1');
      result.focus();
    }
  });
  form.addEventListener('input', function () { result.hidden = true; });
})();
