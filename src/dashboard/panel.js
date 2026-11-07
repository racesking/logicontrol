import { BuildingModel } from './model.js';
import { XrayBuilding } from './xray.js';
import { PlantModel } from './plant.js';
import { AhuView, TAGS, AIR } from './ahu.js';
import { Journal } from './journal.js';
import { TrendsView } from './trends.js';

const icon = (path) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const ICONS = {
  building: icon('<path d="M4 21V5l8-3 8 3v16"/><path d="M4 21h16M9 21v-5h6v5M9 8h.01M15 8h.01M9 12h.01M15 12h.01"/>'),
  fan: icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5"/><path d="M12 10.5c0-3 1-5 3-5s2 3-1 5M13.3 12.8c2.6 1.5 3.9 3.3 2.9 5s-3.7.3-4.3-3.2M10.7 12.7c-2.6 1.5-4.8 1.7-5.8 0s1.7-3.2 4.5-2"/>'),
  trend: icon('<path d="M3 20h18M4 16l5-6 4 4 7-9"/>'),
  bell: icon('<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2zM10 21h4"/>'),
  sliders: icon('<path d="M5 4v16M12 4v16M19 4v16"/><path d="M3 15h4M10 8h4M17 13h4"/>'),
  thermo: icon('<path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/>'),
  flame: icon('<path d="M12 3s5 4.6 5 10a5 5 0 0 1-10 0c0-2 1-3.4 2-4.4 0 2 1 3 2 3 1.4 0 1-4.6 1-8.6z"/>'),
  bulb: icon('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.6 1 2.5h6c0-.9.2-1.7 1-2.5A6 6 0 0 0 12 3z"/>'),
  check: icon('<path d="M4 12.5l5 5L20 6.5"/>'),
  warn: icon('<path d="M12 4l9 16H3zM12 10v4M12 17h.01"/>'),
  stop: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>'),
  snow: icon('<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>'),
};

const ring = (value, total, colour, glyph) => {
  const c = 2 * Math.PI * 21;
  const part = total ? Math.max(0.04, value / total) : 1;
  return `<div class="ring"><svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="21" class="ring-track"/><circle cx="25" cy="25" r="21" class="ring-value" stroke="${colour}" stroke-dasharray="${(part * c).toFixed(1)} ${c.toFixed(1)}"/></svg><span style="color:${colour}">${glyph}</span></div>`;
};

const tagHtml = ([id, label]) => `<div class="ahu-tag" data-tag="${id}"><span>${label}</span><b></b></div>`;

const STEPS = [
  ['sent', 'Comanda a plecat'],
  ['ack', 'Echipamentul a răspuns'],
  ['done', 'Măsura confirmă'],
];

export class Dashboard {
  constructor(root, cabinet) {
    this.root = root;
    this.cabinet = cabinet;
    this.model = new BuildingModel();
    this.plant = new PlantModel();
    this.journal = new Journal(this.model, this.plant);
    this.settings = {
      season: 'Iarnă',
      comfort: 21.5,
      reduced: 19,
      co2: 1000,
      freeCooling: true,
      grid: Array.from({ length: 7 }, (_, d) => [false, d < 5, d < 5, d < 5, d < 5, false]),
    };
    this.view = 'building';
    this.lastFrame = performance.now();
    this.floor = null;
    this.room = this.model.find('e1a');
    root.innerHTML = this.template();
    this.el = (s) => root.querySelector(s);
    this.xray = new XrayBuilding(this.el('#xray'), this.el('#xray-labels'), this.model, (r) => this.pickRoom(r));
    this.ahu = new AhuView(this.el('#ahu'), this.el('#ahu-overlay'), this.plant);
    this.trends = new TrendsView(this.el('#body-trend'), () => this.liveTrend());
    this.bind();
    this.drawPill();
    this.drawSummary();
    this.drawFloors();
    this.drawRoom();
    this.xray.selectRoom(this.room);
    this.xray.refresh();
    this.pushToCabinet();
    this.drawPlant();
    this.drawTags();
    this.drawBell();
    this.model.on((e) => this.onEvent(e));
    this.plant.on((e) => this.onPlant(e));
    window.setInterval(() => {
      if (!this.visible) return;
      this.model.tick();
      this.plant.tick();
      this.checkAlarms();
      this.trendClock = (this.trendClock || 0) + 1;
      if (this.view === 'trend' && this.trendClock % 8 === 0) this.trends.draw();
    }, 260);
    window.addEventListener('resize', () => {
      this.xray.resize();
      if (this.view === 'ahu') this.ahu.resize();
    });
  }

  template() {
    return `
    <nav class="bms-rail" aria-label="Secțiuni">
      <img src="${import.meta.env.BASE_URL}logo/option-b-symbol.svg" alt="" width="30" height="30">
      <button type="button" class="is-active" data-view="building" aria-current="page" title="Clădire" aria-label="Clădire">${ICONS.building}</button>
      <button type="button" data-view="ahu" title="Centrală de tratare a aerului" aria-label="Centrală de tratare a aerului">${ICONS.fan}</button>
      <button type="button" data-view="trend" title="Tendințe" aria-label="Tendințe">${ICONS.trend}</button>
      <button type="button" data-view="settings" title="Reglaje" aria-label="Reglaje">${ICONS.sliders}</button>
      <button type="button" data-view="alarms" title="Alarme" aria-label="Alarme">${ICONS.bell}<i class="bms-badge" id="bell-badge" hidden></i></button>
    </nav>
    <div class="bms-main">
      <header class="bms-banner">
        <div>
          <h2 id="s3-title">Clădire demonstrativă</h2>
          <p id="bms-sub">Date simulate · clădirea în 3D, temperaturi și iluminat</p>
          <span class="bms-pill" id="bms-pill"><i></i><span>Funcționare normală</span></span>
        </div>
        <dl class="bms-weather">
          <div><dt>Exterior</dt><dd>6.2°</dd></div>
          <div><dt>Marți, 12 ianuarie</dt><dd>15:02</dd></div>
        </dl>
      </header>
      <section class="bms-kpis" id="kpis" aria-label="Rezumat"></section>
      <div class="bms-body">
        <div class="bms-floors" id="floors" role="group" aria-label="Nivele"></div>
        <div class="bms-view">
          <canvas id="xray" aria-label="Clădirea în secțiune 3D. Trage pentru a roti." role="img"></canvas>
          <div class="xray-labels" id="xray-labels"></div>
          <button type="button" class="bms-chipbtn" id="xray-reset">Resetează vederea</button>
        </div>
        <aside class="bms-room" id="room" aria-live="polite"></aside>
      </div>
      <div class="bms-body bms-body--ahu" id="body-ahu" hidden>
        <div class="ahu-view">
          <canvas id="ahu" role="img" aria-label="Secțiune 3D prin centrala de tratare a aerului, cu ventilatoare, filtre, baterii și recuperator."></canvas>
          <div class="ahu-overlay" id="ahu-overlay">
            <svg aria-hidden="true"></svg>
            <div class="ahu-row ahu-row--top">${TAGS.top.map(tagHtml).join('')}</div>
            <div class="ahu-row ahu-row--bottom">${TAGS.bottom.map(tagHtml).join('')}</div>
            <span class="ahu-air" data-air="eha"><b>EHA</b> evacuat</span>
            <span class="ahu-air" data-air="oda"><b>ODA</b> ${AIR.outdoor.toFixed(1)}°</span>
            <span class="ahu-air" data-air="eta"><b>ETA</b> ${AIR.ret.toFixed(1)}°</span>
            <span class="ahu-air" data-air="sup"><b>SUP</b> <i id="air-sup">21.0</i>°</span>
          </div>
        </div>
        <aside class="bms-room" id="plant" aria-live="polite"></aside>
      </div>
      <div class="bms-body bms-body--wide" id="body-trend" hidden></div>
      <div class="bms-body bms-body--wide" id="body-settings" hidden></div>
      <div class="bms-body bms-body--wide" id="body-alarms" hidden></div>
    </div>`;
  }

  setView(view) {
    this.view = view;
    this.root.querySelectorAll('[data-view]').forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle('is-active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const bodies = { building: this.root.querySelector('.bms-body'), ahu: this.el('#body-ahu'), trend: this.el('#body-trend'), settings: this.el('#body-settings'), alarms: this.el('#body-alarms') };
    for (const [name, el] of Object.entries(bodies)) el.hidden = name !== view;
    const kpis = view === 'building' || view === 'ahu';
    this.el('#kpis').hidden = !kpis;
    this.root.querySelector('.bms-main').classList.toggle('no-kpis', !kpis);
    const titles = {
      building: ['Clădire demonstrativă', 'Date simulate · clădirea în 3D, temperaturi și iluminat'],
      ahu: ['CTA 1 · Clădire demonstrativă', 'Date simulate · centrala de tratare a aerului'],
      trend: ['Tendințe', 'Date simulate · istoric inventat, ultimele valori sunt cele din panou'],
      settings: ['Reglaje', 'Date simulate · programul și limitele clădirii'],
      alarms: ['Alarme', 'Date simulate · alarme active și jurnal'],
    };
    this.el('#s3-title').textContent = titles[view][0];
    this.el('#bms-sub').textContent = titles[view][1];
    this.drawSummary();
    this.drawPill();
    if (view === 'ahu') {
      this.ahu.resize();
      this.drawTags();
    }
    if (view === 'building') this.xray.resize();
    if (view === 'trend') this.trends.draw();
    if (view === 'settings') this.drawSettings();
    if (view === 'alarms') this.drawAlarms();
  }

  liveTrend() {
    return { outdoor: AIR.outdoor, rooms: this.model.summary().average, supply: this.plant.ahu.supplyT, flow: this.plant.ahu.flow };
  }

  drawSettings() {
    const s = this.settings;
    const days = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
    const blocks = ['00', '04', '08', '12', '16', '20'];
    const step = (label, value, down, up) => `<div class="set-row"><span>${label}</span><div class="set-step"><button type="button" data-set="${down}" aria-label="Scade ${label}">−</button><strong>${value}</strong><button type="button" data-set="${up}" aria-label="Crește ${label}">+</button></div></div>`;
    this.el('#body-settings').innerHTML = `
      <div class="set-grid">
        <section class="set-card">
          <h3>Program săptămânal</h3>
          <p>Fiecare celulă este un interval de patru ore. Apasă pentru a schimba regimul.</p>
          <div class="sched" role="group" aria-label="Program pe zile și ore">
            <span></span>${blocks.map((b) => `<span>${b}</span>`).join('')}
            ${days.map((d, i) => `<span class="day">${d}</span>${blocks.map((b, j) => `<button type="button" data-cell="${i}-${j}" aria-pressed="${s.grid[i][j]}" aria-label="${d} de la ${b}:00, ${s.grid[i][j] ? 'confort' : 'redus'}">${s.grid[i][j] ? 'C' : ''}</button>`).join('')}`).join('')}
          </div>
          <div class="sched-key"><span><i></i>C · Confort</span><span><i></i>Redus</span></div>
        </section>
        <div>
          <section class="set-card">
            <h3>Temperaturi</h3>
            ${step('Confort', `${s.comfort.toFixed(1)}°`, 'comfort-down', 'comfort-up')}
            ${step('Redus', `${s.reduced.toFixed(1)}°`, 'reduced-down', 'reduced-up')}
          </section>
          <section class="set-card">
            <h3>Regim</h3>
            <div class="set-row"><span>Sezon</span><button type="button" class="set-switch" data-set="season" aria-pressed="${s.season === 'Vară'}">${s.season}</button></div>
            <div class="set-row"><span>Răcire gratuită</span><button type="button" class="set-switch" data-set="free" aria-pressed="${s.freeCooling}">${s.freeCooling ? 'Activă' : 'Oprită'}</button></div>
            ${step('Limită CO₂', `${s.co2} ppm`, 'co2-down', 'co2-up')}
          </section>
        </div>
      </div>`;
  }

  onSetting(id) {
    const s = this.settings;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    let text = '';
    if (id.includes('-') && /^\d/.test(id)) {
      const [d, b] = id.split('-').map(Number);
      s.grid[d][b] = !s.grid[d][b];
      text = 'Program săptămânal modificat';
    } else if (id === 'comfort-up' || id === 'comfort-down') {
      s.comfort = clamp(s.comfort + (id.endsWith('up') ? 0.5 : -0.5), s.reduced, 26);
      text = `Confort ${s.comfort.toFixed(1)}°`;
    } else if (id === 'reduced-up' || id === 'reduced-down') {
      s.reduced = clamp(s.reduced + (id.endsWith('up') ? 0.5 : -0.5), 14, s.comfort);
      text = `Redus ${s.reduced.toFixed(1)}°`;
    } else if (id === 'co2-up' || id === 'co2-down') {
      s.co2 = clamp(s.co2 + (id.endsWith('up') ? 100 : -100), 600, 1600);
      text = `Limită CO₂ ${s.co2} ppm`;
    } else if (id === 'season') {
      s.season = s.season === 'Iarnă' ? 'Vară' : 'Iarnă';
      text = `Sezon: ${s.season}`;
    } else if (id === 'free') {
      s.freeCooling = !s.freeCooling;
      text = `Răcire gratuită ${s.freeCooling ? 'activă' : 'oprită'}`;
    }
    this.journal.log(`Reglaj: ${text}`);
    this.cabinet.signalText('set', text);
    this.drawSettings();
  }

  drawAlarms() {
    const j = this.journal;
    const sev = { warning: ['Avertizare', ICONS.warn], critical: ['Critică', ICONS.stop] };
    this.el('#body-alarms').innerHTML = `
      <div class="al-head"><h3>Active (${j.active})</h3>${j.unseen ? '<button type="button" data-ack="all">Marchează toate ca văzute</button>' : ''}</div>
      ${j.alarms.length ? j.alarms.map((a) => `
        <article class="al-item">
          <span class="al-sev" data-sev="${a.severity}">${sev[a.severity][1]}${sev[a.severity][0]}</span>
          <div><b>${a.source}</b><p><time>${a.time}</time> · ${a.text}</p></div>
          ${a.acked ? '<span class="al-seen">Văzută, încă activă</span>' : `<button type="button" data-ack="${a.id}">Văzută</button>`}
        </article>`).join('') : '<p class="al-empty">Nicio alarmă activă.</p>'}
      <h3 class="al-log-title">Jurnal</h3>
      <ol class="al-log">${j.events.map((e) => `<li><time>${e.time}</time><span>${e.text}</span></li>`).join('')}</ol>`;
  }

  drawBell() {
    const j = this.journal;
    const badge = this.el('#bell-badge');
    badge.hidden = !j.unseen;
    badge.textContent = j.unseen;
    this.cabinet.setAlarm(j.unseen > 0);
  }

  checkAlarms() {
    if (this.journal.evaluate()) {
      this.drawBell();
      this.drawPill();
      this.drawSummary();
      if (this.view === 'alarms') this.drawAlarms();
    }
  }

  bind() {
    this.root.querySelector('.bms-rail').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (b) this.setView(b.dataset.view);
    });
    this.el('#body-settings').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cell],[data-set]');
      if (b) this.onSetting(b.dataset.cell || b.dataset.set);
    });
    this.el('#body-alarms').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ack]');
      if (!b) return;
      if (b.dataset.ack === 'all') this.journal.ackAll();
      else this.journal.ack(b.dataset.ack);
      this.drawAlarms();
      this.drawBell();
    });
    this.el('#plant').addEventListener('click', (e) => {
      const b = e.target.closest('[data-plant]');
      if (!b) return;
      this.plantProgress = 'sent';
      const act = b.dataset.plant;
      if (act === 'power') this.plant.toggleAhu();
      if (act === 't-up') this.plant.nudgeT(0.5);
      if (act === 't-down') this.plant.nudgeT(-0.5);
      if (act === 'f-up') this.plant.nudgeFlow(200);
      if (act === 'f-down') this.plant.nudgeFlow(-200);
      if (act === 'hp') this.plant.toggleHp();
      if (act === 'hp-up') this.plant.nudgeHp(1);
      if (act === 'hp-down') this.plant.nudgeHp(-1);
    });
    this.el('#floors').addEventListener('click', (e) => {
      const b = e.target.closest('[data-floor]');
      if (b) {
        this.floor = this.model.floors.find((f) => f.id === b.dataset.floor) || null;
        this.xray.selectFloor(this.floor);
        this.drawFloors();
        this.drawSummary();
        this.xray.refresh();
        return;
      }
      const r = e.target.closest('[data-room]');
      if (r) this.pickRoom(this.model.find(r.dataset.room));
    });
    this.el('#xray-reset').addEventListener('click', () => this.xray.reset());
    this.el('#room').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !this.room) return;
      const r = this.room;
      this.progress = 'sent';
      if (b.dataset.act === 'up') this.model.setpoint(r, 0.5);
      if (b.dataset.act === 'down') this.model.setpoint(r, -0.5);
      if (b.dataset.act === 'light') this.model.toggleLight(r);
      if (b.dataset.act === 'ac') this.model.toggleCooling(r);
    });
  }

  pickRoom(r) {
    this.room = r;
    this.progress = null;
    if (this.floor !== r.floor) {
      this.floor = r.floor;
      this.xray.selectFloor(r.floor);
      this.drawFloors();
      this.drawSummary();
    }
    this.xray.selectRoom(r);
    this.xray.refresh();
    this.drawFloors();
    this.drawRoom();
  }

  onEvent(e) {
    if (e.type === 'sent' || e.type === 'ack' || e.type === 'confirmed') {
      if (e.room === this.room) this.progress = e.type === 'sent' ? 'sent' : e.type === 'ack' ? 'ack' : 'done';
      // The physical end of the chain: the same command reaches the 3D cabinet.
      if (e.type === 'sent') {
        this.cabinet.signal(e.room, e.change);
        this.journal.log(`${e.room.floor.name} · ${e.room.name}: ${this.cabinet.lastCommand.split(' · ').pop()}`);
      }
      if (e.type === 'ack') this.pushToCabinet();
    }
    this.xray.refresh();
    this.drawSummary();
    this.drawFloors();
    if (e.room === this.room || e.type === 'tick') this.drawRoom();
  }

  onPlant(e) {
    if (e.type === 'tick') {
      this.ahu.dirty = true;
      if (this.view === 'ahu') {
        this.drawTags();
        this.drawSummary();
        this.drawPlant();
      }
      return;
    }
    if (e.type === 'sent') {
      this.plantProgress = 'sent';
      this.cabinet.signalText('cta', e.text);
      this.journal.log(e.text);
    }
    if (e.type === 'ack') {
      this.plantProgress = 'ack';
      this.pushToCabinet();
    }
    if (e.type === 'confirmed') this.plantProgress = 'done';
    this.drawPlant();
  }

  drawTags() {
    const t = this.plant.tags();
    for (const [id, [value, state]] of Object.entries(t)) {
      const el = this.root.querySelector(`[data-tag="${id}"]`);
      if (!el) continue;
      el.dataset.state = state;
      el.querySelector('b').textContent = value;
    }
    this.el('#air-sup').textContent = this.plant.ahu.supplyT.toFixed(1);
  }

  drawPill() {
    const n = this.journal.active;
    const pill = this.el('#bms-pill');
    pill.classList.toggle('is-warn', n > 0);
    pill.querySelector('span').textContent = n ? `${n} ${n === 1 ? 'alarmă activă' : 'alarme active'}` : 'Funcționare normală';
  }

  drawPlant() {
    this.drawPill();
    const a = this.plant.ahu;
    const h = this.plant.hp;
    const p = this.plant.pending;
    const order = ['sent', 'ack', 'done'];
    const at = this.plantProgress ? order.indexOf(this.plantProgress) : -1;
    const stepper = (label, value, down, up, name) => `
      <div class="bms-set"><span>${label}</span><div>
        <button type="button" data-plant="${down}" aria-label="Scade ${name}">−</button>
        <strong>${value}</strong>
        <button type="button" data-plant="${up}" aria-label="Crește ${name}">+</button>
      </div></div>`;
    const focus = this.root.activeElement ?? document.activeElement;
    const keep = focus?.dataset?.plant;
    this.el('#plant').innerHTML = `
      <h3>CTA 1</h3>
      <p class="bms-where">${a.on ? 'Mod: ' + a.mode : 'Oprită'}</p>
      <button type="button" class="bms-toggle" data-plant="power" aria-pressed="${a.on}"><span>${ICONS.fan}Întrerupător</span><em>${a.on ? 'Pornită' : 'Oprită'}</em></button>
      ${stepper('Temperatură introdusă', `${(p.setT ?? a.setT).toFixed(1)}°`, 't-down', 't-up', 'temperatura cerută')}
      ${stepper('Debit cerut, m³/h', `${p.setFlow ?? a.setFlow}`, 'f-down', 'f-up', 'debitul cerut')}
      <h3 class="bms-sep">PC1 · Pompă de căldură</h3>
      <button type="button" class="bms-toggle" data-plant="hp" aria-pressed="${h.on}"><span>${ICONS.flame}Compresor</span><em>${h.on ? Math.round(h.load) + ' %' : 'Oprit'}</em></button>
      ${stepper(`Tur ${h.flowT.toFixed(1)}°`, `${p.hpT ?? h.setT}°`, 'hp-down', 'hp-up', 'temperatura pe tur')}
      <ol class="bms-chain" aria-label="Starea comenzii">
        ${STEPS.map(([, label], i) => `<li class="${i <= at ? 'is-done' : ''}">${label}</li>`).join('')}
      </ol>`;
    if (keep) this.el(`[data-plant="${keep}"]`)?.focus();
  }

  pushToCabinet() {
    const s = this.model.summary();
    this.cabinet.setPlant({
      average: s.average,
      lights: s.lights,
      total: this.model.rooms.length,
      floorLights: this.model.floors.filter((f) => f.level > 0).map((f) => f.rooms.some((r) => r.light)),
      ahuOn: this.plant.ahu.on,
      hpOn: this.plant.hp.on,
    });
  }

  drawSummary() {
    if (this.view === 'ahu') {
      const a = this.plant.ahu;
      const h = this.plant.hp;
      this.el('#kpis').innerHTML = `
        <div class="kpi">${ring(a.supplyT - 10, 18, '#C8600B', ICONS.thermo)}<div><b>${a.supplyT.toFixed(1)}°</b><span>Aer introdus</span></div></div>
        <div class="kpi">${ring(a.flow, 4800, '#0B6E8F', ICONS.fan)}<div><b>${Math.round(a.flow)}</b><span>Debit, m³/h</span></div></div>
        <div class="kpi">${ring(a.wheel, 100, '#1E8E55', ICONS.trend)}<div><b>${Math.round(a.wheel)} %</b><span>Recuperare</span></div></div>
        <div class="kpi">${ring(h.load, 100, '#C8600B', ICONS.flame)}<div><b>${h.flowT.toFixed(1)}°</b><span>Tur pompă căldură</span></div></div>`;
      return;
    }
    const s = this.model.summary(this.floor);
    const lit = s.lights;
    this.el('#kpis').innerHTML = `
      <div class="kpi">${ring(s.average - 10, 18, '#C8600B', ICONS.thermo)}<div><b>${s.average.toFixed(1)}°</b><span>Medie camere</span></div></div>
      <div class="kpi">${ring(s.heating, s.rooms, '#C8600B', ICONS.flame)}<div><b>${s.heating}<small> / ${s.rooms}</small></b><span>Camere în încălzire</span></div></div>
      <div class="kpi">${ring(lit, s.rooms, '#A87400', ICONS.bulb)}<div><b>${lit}<small> / ${s.rooms}</small></b><span>Circuite aprinse</span></div></div>
      <div class="kpi">${ring(0, 0, this.journal.active ? '#C8600B' : '#1E8E55', this.journal.active ? ICONS.warn : ICONS.check)}<div><b>${this.journal.active}</b><span>${this.journal.active ? 'Alarme active' : 'Fără probleme'}</span></div></div>`;
  }

  drawFloors() {
    const whole = this.model.summary();
    const row = (id, name, sum, active) => `
      <button type="button" data-floor="${id}" aria-pressed="${active}" class="${active ? 'is-active' : ''}">
        <span><b>${name}</b><small>${sum.rooms} camere</small></span><strong>${sum.average.toFixed(1)}°</strong>
      </button>`;
    const list = this.floor
      ? `<ul class="bms-roomlist" aria-label="Camere pe ${this.floor.name}">${this.floor.rooms.map((r) => `<li><button type="button" data-room="${r.id}" class="${r === this.room ? 'is-active' : ''}">${r.name}<span>${r.temp.toFixed(1)}°</span></button></li>`).join('')}</ul>`
      : '';
    this.el('#floors').innerHTML = row('all', 'Toată clădirea', whole, !this.floor)
      + this.model.floors.map((f) => row(f.id, f.name, this.model.summary(f), this.floor === f) + (this.floor === f ? list : '')).join('');
  }

  drawRoom() {
    const box = this.el('#room');
    const r = this.room;
    if (!r) {
      box.innerHTML = '<p class="bms-hint">Alege o cameră din clădire sau din listă. Comanda ajunge în tabloul din stânga.</p>';
      return;
    }
    const order = ['sent', 'ack', 'done'];
    const at = this.progress ? order.indexOf(this.progress) : -1;
    box.innerHTML = `
      <h3>${r.name}</h3>
      <p class="bms-where">${r.floor.name}</p>
      <div class="bms-read"><span>Măsurat</span><b>${r.temp.toFixed(1)}°</b></div>
      <div class="bms-set">
        <span>Valoare cerută</span>
        <div>
          <button type="button" data-act="down" aria-label="Scade valoarea cerută">−</button>
          <strong>${(r.pendingSet ?? r.set).toFixed(1)}°</strong>
          <button type="button" data-act="up" aria-label="Crește valoarea cerută">+</button>
        </div>
      </div>
      <button type="button" class="bms-toggle" data-act="light" aria-pressed="${r.light}"><span>${ICONS.bulb}Iluminat</span><em>${r.light ? 'Aprins' : 'Stins'}</em></button>
      <button type="button" class="bms-toggle" data-act="ac" aria-pressed="${r.ac}"><span>${ICONS.snow}Răcire</span><em>${r.ac ? 'Pornită' : 'Oprită'}</em></button>
      <ol class="bms-chain" aria-label="Starea comenzii">
        ${STEPS.map(([, label], i) => `<li class="${i <= at ? 'is-done' : ''}">${label}</li>`).join('')}
      </ol>`;
  }

  /** Called on every page frame. p is 0 hidden, 1 fully shown. */
  /** Brings the panel into view, wherever the page is. */
  reveal() {
    const stacked = window.matchMedia('(max-width: 979px)').matches;
    const top = stacked ? this.root.getBoundingClientRect().top + window.scrollY - 72 : 5.2 * window.innerHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  setProgress(p) {
    const visible = p > 0.01;
    if (visible !== this.visible) {
      this.visible = visible;
      if (visible) this.xray.resize();
    }
    this.root.style.setProperty('--show', p.toFixed(3));
    this.root.toggleAttribute('inert', p < 0.6);
    if (!visible) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.view === 'ahu') this.ahu.frame(dt);
    else this.xray.frame();
  }
}
