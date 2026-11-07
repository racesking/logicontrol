// A small demonstration assistant. There is no language model and no server here:
// replies are written rules over the live simulation, and nothing leaves the browser.
// The interface says so. A real model needs a server to hold its key.

const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

const GREETING = 'Bună. Sunt asistentul demonstrativ. Pot citi valorile din panou și pot da comenzi în simulare.';
const SUGGESTIONS = ['Câte alarme sunt?', 'Ce temperatură e în clădire?', 'Aprinde lumina în Dormitor', 'Arată casa'];

export function initAssistant(dashboard, phone = null) {
  const button = document.getElementById('assistant-toggle');
  const panel = document.getElementById('assistant');
  const log = document.getElementById('assistant-log');
  const form = document.getElementById('assistant-form');
  const input = document.getElementById('assistant-input');
  const chips = document.getElementById('assistant-chips');

  const add = (who, text) => {
    const p = document.createElement('p');
    p.className = `msg msg--${who}`;
    p.textContent = text;
    log.append(p);
    log.scrollTop = log.scrollHeight;
  };

  const open = (state) => {
    // Hangs just below the button, wherever the header currently sits.
    panel.style.setProperty('--assist-top', `${button.getBoundingClientRect().bottom + 10}px`);
    panel.hidden = !state;
    button.setAttribute('aria-expanded', String(state));
    if (state) {
      if (!log.childElementCount) add('bot', GREETING);
      input.focus();
    } else {
      button.focus();
    }
  };

  const showPanel = (view) => {
    if (!dashboard) return;
    dashboard.setView(view);
    dashboard.reveal();
  };

  const findRoom = (q) => dashboard?.model.rooms.find((r) => q.includes(fold(r.name)));
  const findHome = (q) => phone?.model.rooms.find((r) => new RegExp(`\\b${fold(r.name)}\\b`).test(q));

  const answer = (raw) => {
    const q = fold(raw);
    const has = (re) => re.test(q);
    const room = findRoom(q);
    const homeRoom = room ? null : findHome(q);

    if (has(/^(salut|buna|hei|hello|neata)/)) return GREETING;
    if (has(/pret|cost|tarif|oferta/)) return 'Nu am prețuri aici. Depind de instalație, așa că se discută după ce vedem ce există deja.';
    if (has(/contact|telefon|email|adresa/)) return 'Datele de contact nu sunt încă publicate în acest prototip.';
    if (has(/\bcine\b|ce faceti|servicii|logicontrol|ce oferiti/)) return 'Logicontrol face BMS, automatizări HVAC și software, ca să poți urmări și conduce instalații reale, în casă sau în clădire.';
    if (has(/ce (inseamna|este|e) bms|\bbms\b.*\?/)) return 'BMS înseamnă sistemul care strânge într-un singur loc încălzirea, ventilația și iluminatul unei clădiri, ca să le vezi și să le comanzi.';

    if (!dashboard) return 'Panoul nu este disponibil în acest browser, așa că nu pot citi valorile.';
    const { model, plant, journal } = dashboard;

    if (has(/(aprinde|stinge|inchide|porneste|opreste).*(lumin|iluminat|bec)|(lumin|iluminat|bec).*(aprinde|stinge)/)) {
      const on = has(/aprinde|porneste/);
      if (homeRoom) {
        if (homeRoom.light === on) return `${homeRoom.name}: lumina este deja ${on ? 'aprinsă' : 'stinsă'}.`;
        phone.model.toggleLight(homeRoom);
        return `Am trimis comanda pentru ${homeRoom.name}. Lumina se schimbă după ce echipamentul răspunde.`;
      }
      if (!room) return 'În ce cameră? De exemplu: aprinde lumina în Dormitor.';
      if (room.light === on) return `${room.name}: lumina este deja ${on ? 'aprinsă' : 'stinsă'}.`;
      model.command(room, { light: on });
      return `Am trimis comanda pentru ${room.name}. Starea se schimbă după ce echipamentul răspunde.`;
    }
    if (has(/(opreste|porneste).*(cta|central|ventil)/)) {
      const on = has(/porneste/);
      if (plant.ahu.on === on) return `CTA 1 este deja ${on ? 'pornită' : 'oprită'}.`;
      plant.toggleAhu();
      return `Am trimis comanda: CTA 1 se ${on ? 'pornește' : 'oprește'}. Clapetele și ventilatoarele urmează secvența lor.`;
    }

    if (phone && has(/noapte|plecat/) && has(/scena|mod|pune|activeaza|plec/)) {
      const id = has(/noapte/) ? 'noapte' : 'plecat';
      phone.model.setScene(id);
      return `Am pornit scena ${id === 'noapte' ? 'Noapte' : 'Plecat'} acasă. Fiecare cameră primește comanda pe cablul ei.`;
    }
    if (phone && has(/armeaz/)) {
      const on = !has(/dezarm/);
      if (phone.model.armed === on) return `Securitatea este deja ${on ? 'armată' : 'dezarmată'}.`;
      phone.model.toggleArmed();
      return `Securitatea casei este acum ${on ? 'armată' : 'dezarmată'}.`;
    }
    if (phone && has(/arata|deschide|du-ma|vreau sa vad/) && has(/\bcasa\b|telefon/)) {
      window.scrollTo({ top: 7.85 * window.innerHeight, behavior: 'smooth' });
      return 'Te duc la casă. Comenzile sunt pe telefon.';
    }
    if (has(/tendint|grafic|istoric/)) { showPanel('trend'); return 'Am deschis tendințele în panou.'; }
    if (has(/reglaj|setari|program/)) { showPanel('settings'); return 'Am deschis reglajele în panou.'; }
    if (has(/arata|deschide|du-ma|vreau sa vad/) && has(/alarm/)) { showPanel('alarms'); return 'Am deschis alarmele în panou.'; }
    if (has(/arata|deschide|du-ma|vreau sa vad/) && has(/cta|central/)) { showPanel('ahu'); return 'Am deschis centrala în panou.'; }
    if (has(/arata|deschide|du-ma|vreau sa vad/) && has(/cladire|panou|dashboard/)) { showPanel('building'); return 'Am deschis clădirea în panou.'; }

    if (has(/alarm|avertiz|problem|defect/)) {
      if (!journal.active) return 'Nu este nicio alarmă activă.';
      const list = journal.alarms.map((a) => `${a.source}: ${a.text}`).join('; ');
      return `${journal.active === 1 ? 'Este o alarmă activă' : `Sunt ${journal.active} alarme active`}. ${list}.`;
    }
    if (homeRoom) return `${homeRoom.name}, acasă: măsurat ${homeRoom.temp.toFixed(1)}°, cerut ${homeRoom.set.toFixed(1)}°, lumina ${homeRoom.light ? 'aprinsă' : 'stinsă'}.`;
    if (room) return `${room.name}, ${room.floor.name}: măsurat ${room.temp.toFixed(1)}°, cerut ${room.set.toFixed(1)}°, lumina ${room.light ? 'aprinsă' : 'stinsă'}.`;
    if (has(/pompa|caldura|pc1/)) return `PC1 este ${plant.hp.on ? 'pornită' : 'oprită'}, tur ${plant.hp.flowT.toFixed(1)}°.`;
    if (has(/cta|debit|ventil|aer/)) return `CTA 1 este ${plant.ahu.on ? 'pornită' : 'oprită'}: ${Math.round(plant.ahu.flow)} m³/h, aer introdus ${plant.ahu.supplyT.toFixed(1)}°.`;
    if (has(/temperatur|cald|rece|grade/)) return `Media în clădire este ${model.summary().average.toFixed(1)}°, afară ${6.2}°. Întreabă-mă și de o cameră anume.`;

    return 'Nu știu să răspund la asta încă. Încearcă: alarme, temperatura dintr-o cameră, aprinde lumina în Dormitor, sau scena Noapte.';
  };

  const ask = (text) => {
    add('me', text);
    const typing = document.createElement('p');
    typing.className = 'msg msg--bot msg--typing';
    typing.textContent = '…';
    typing.setAttribute('aria-hidden', 'true');
    log.append(typing);
    log.scrollTop = log.scrollHeight;
    window.setTimeout(() => {
      typing.remove();
      add('bot', answer(text));
    }, 420);
  };

  chips.innerHTML = SUGGESTIONS.map((s) => `<button type="button">${s}</button>`).join('');
  chips.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') ask(e.target.textContent); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    ask(text);
  });
  button.addEventListener('click', () => open(panel.hidden));
  document.getElementById('assistant-close').addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) open(false); });
}
