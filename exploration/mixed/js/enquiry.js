/* Two-step prototype enquiry. Validates in the page only: nothing is sent, stored or written to the URL. */
(function () {
  'use strict';
  var form = document.getElementById('enquiry');
  if (!form) return;

  var step1 = document.getElementById('step-1');
  var step2 = document.getElementById('step-2');
  var label = document.getElementById('step-label');
  var summary = document.getElementById('err-summary');
  var result = document.getElementById('enq-result');

  function radio(name) {
    var r = form.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : '';
  }
  function val(id) { return document.getElementById(id).value.trim(); }

  function setError(fieldId, errId, message) {
    var err = document.getElementById(errId);
    var field = document.getElementById(fieldId);
    err.textContent = message || '';
    err.hidden = !message;
    if (field.tagName === 'FIELDSET') field.classList.toggle('has-error', !!message);
    else if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return message ? field : null;
  }

  function firstFocusable(field) {
    return field.tagName === 'FIELDSET' ? field.querySelector('input') : field;
  }

  function report(invalid) {
    invalid = invalid.filter(Boolean);
    if (!invalid.length) { summary.hidden = true; summary.textContent = ''; return true; }
    summary.textContent = invalid.length === 1
      ? 'Verificați câmpul marcat mai jos.'
      : 'Verificați cele ' + invalid.length + ' câmpuri marcate mai jos.';
    summary.hidden = false;
    firstFocusable(invalid[0]).focus();
    return false;
  }

  function validateStep1() {
    return report([
      setError('f-type', 'e-type', radio('tip') ? '' : 'Alegeți tipul clădirii.'),
      setError('f-loc', 'e-loc', val('f-loc').length >= 2 ? '' : 'Completați județul sau localitatea.'),
      setError('f-need', 'e-need', radio('nevoie') ? '' : 'Alegeți nevoia principală.')
    ]);
  }

  function contactError() {
    var v = val('f-contact');
    var mode = radio('mod');
    var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    var digits = v.replace(/\D/g, '').length;
    var isPhone = /^\+?[\d\s().-]+$/.test(v) && digits >= 9 && digits <= 15;
    if (!v) return 'Completați adresa de e-mail sau numărul de telefon.';
    if (mode === 'E-mail' && !isEmail) return 'Adresa de e-mail nu pare completă (exemplu: nume@domeniu.ro).';
    if (mode === 'Telefon' && !isPhone) return 'Numărul de telefon trebuie să aibă cel puțin 9 cifre.';
    if (!isEmail && !isPhone) return 'Introduceți o adresă de e-mail sau un număr de telefon valid.';
    return '';
  }

  function validateStep2() {
    return report([
      setError('f-mode', 'e-mode', radio('mod') ? '' : 'Alegeți modul de contact preferat.'),
      setError('f-name', 'e-name', val('f-name').length >= 2 ? '' : 'Completați numele.'),
      setError('f-contact', 'e-contact', contactError())
    ]);
  }

  function go(step) {
    form.dataset.step = String(step);
    step1.hidden = step !== 1;
    step2.hidden = step !== 2;
    label.textContent = 'Pasul ' + step + ' din 2';
    result.hidden = true;
    result.textContent = '';
  }

  function showResult() {
    var rows = [
      ['Tip clădire', radio('tip')], ['Județ / localitate', val('f-loc')], ['Nevoie', radio('nevoie')],
      ['Descriere', val('f-desc') || '—'], ['Contact preferat', radio('mod')], ['Nume', val('f-name')], ['E-mail sau telefon', val('f-contact')]
    ];
    result.innerHTML = '';
    var p1 = document.createElement('p');
    p1.textContent = 'Solicitarea nu a fost trimisă: acesta este un prototip. Trimiterea va fi activată după configurarea serviciului de contact.';
    var p2 = document.createElement('p');
    p2.textContent = 'Datele introduse rămân doar în această pagină și dispar la reîncărcare. Rezumat verificat:';
    var dl = document.createElement('dl');
    rows.forEach(function (r) {
      var dt = document.createElement('dt'); dt.textContent = r[0];
      var dd = document.createElement('dd'); dd.textContent = r[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    result.appendChild(p1); result.appendChild(p2); result.appendChild(dl);
    result.hidden = false;
    result.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.dataset.step === '1') {
      if (validateStep1()) { go(2); document.getElementById('s2-title').focus(); }
    } else if (validateStep2()) {
      showResult();
    }
  });

  document.getElementById('enq-back').addEventListener('click', function () {
    summary.hidden = true;
    go(1);
    form.querySelector('#step-1 input').focus();
  });

  form.addEventListener('change', function (e) {
    if (e.target.name === 'mod') {
      document.getElementById('f-contact').setAttribute('inputmode', e.target.value === 'Telefon' ? 'tel' : 'email');
    }
  });
})();
