import { HomeModel, SCENES } from './homeModel.js';

// The phone. It grows out of the dashboard panel, then commands the house.
const UI_W = 390;
const UI_H = 830;
const BEZEL = 11;

const icon = (path) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const ICONS = {
  bulb: icon('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.6 1 2.5h6c0-.9.2-1.7 1-2.5A6 6 0 0 0 12 3z"/>'),
  fan: icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5"/><path d="M12 10.5c0-3 1-5 3-5s2 3-1 5M13.3 12.8c2.6 1.5 3.9 3.3 2.9 5s-3.7.3-4.3-3.2M10.7 12.7c-2.6 1.5-4.8 1.7-5.8 0s1.7-3.2 4.5-2"/>'),
  shield: icon('<path d="M12 3l7 3v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>'),
  home: icon('<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/>'),
  away: icon('<path d="M4 12h12M12 7l5 5-5 5"/><path d="M20 4v16"/>'),
  flame: icon('<path d="M12 3s5 4.6 5 10a5 5 0 0 1-10 0c0-2 1-3.4 2-4.4 0 2 1 3 2 3 1.4 0 1-4.6 1-8.6z"/>'),
  moon: icon('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
};
const SCENE_ICON = { acasa: ICONS.home, plecat: ICONS.away, noapte: ICONS.moon };
const BLINDS = [[0, 'Sus'], [0.5, 'Jumătate'], [1, 'Jos']];
const STEPS = ['Comandă', 'Echipament', 'Măsură'];

const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

export class HomePhone {
  constructor(device, chips, stage, dashboard) {
    this.device = device;
    this.chipLayer = chips;
    this.stage = stage;
    this.dashboard = dashboard;
    this.house = stage.house;
    this.model = new HomeModel((id, done) => this.house.pulse(id, done));
    this.selected = this.model.find('living');
    this.step = 0;

    device.innerHTML = `
      <span class="device-btn device-btn--a"></span><span class="device-btn device-btn--b"></span><span class="device-btn device-btn--c"></span>
      <div class="device-screen">
        <div class="phone-ui" id="phone-ui">
          <div class="ui-status" aria-hidden="true"><span>15:02</span><i class="ui-island"></i><svg viewBox="0 0 44 14" width="44" height="14"><path d="M1 12h3V9H1zM7 12h3V6H7zM13 12h3V3h-3zM19 12h3V0h-3z" fill="currentColor"/><rect x="27" y="1" width="15" height="11" rx="3" fill="none" stroke="currentColor"/><rect x="29" y="3" width="10" height="7" rx="1.5" fill="currentColor"/></svg></div>
          <div class="ui-body" id="ui-body"></div>
          <i class="ui-handle" aria-hidden="true"></i>
        </div>
      </div>`;
    this.body = device.querySelector('#ui-body');
    this.ui = device.querySelector('#phone-ui');

    chips.innerHTML = this.model.rooms.map((r) => `<button type="button" class="home-chip" data-chip="${r.id}"></button>`).join('');
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-chip]');
      if (b) this.pick(this.model.find(b.dataset.chip));
    });
    this.body.addEventListener('click', (e) => this.onClick(e));
    this.model.on((e) => this.onEvent(e));

    for (const r of this.model.rooms) {
      this.house.setLight(r.id, r.light, true);
      this.house.setBlind(r.id, r.blind, true);
    }
    this.house.select(this.selected.id);
    this.draw();
    this.drawChips();
    window.setInterval(() => { if (this.shown) this.model.tick(); }, 260);
    window.addEventListener('resize', () => { this.fromRect = null; });
  }

  pick(r) {
    this.selected = r;
    this.step = 0;
    this.house.select(r.id);
    this.draw();
    this.drawChips();
  }

  onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const r = this.selected;
    const { act, value } = b.dataset;
    if (act === 'scene') this.model.setScene(value);
    if (act === 'room') this.pick(this.model.find(value));
    if (act === 'light') this.model.toggleLight(r);
    if (act === 'up') this.model.nudge(r, 0.5);
    if (act === 'down') this.model.nudge(r, -0.5);
    if (act === 'blind') this.model.setBlind(r, Number(value));
    if (act === 'armed') this.model.toggleArmed();
    if (act === 'heat') this.model.toggleHeat();
    if (act === 'vent-up') this.model.nudgeVent(5);
    if (act === 'vent-down') this.model.nudgeVent(-5);
  }

  onEvent(e) {
    const { journal } = this.dashboard;
    if (e.type === 'sent') {
      if (e.room === this.selected) this.step = 1;
      // The command reaches a real output in the cabinet before it goes down the cable.
      this.stage.cabinet.signalText(e.room.id, e.text || e.room.name);
      if (e.text) journal.log(`Acasă · ${e.text}`);
    }
    if (e.type === 'ack') {
      if (e.room === this.selected) this.step = 2;
      this.house.setLight(e.room.id, e.room.light);
      this.house.setBlind(e.room.id, e.room.blind);
    }
    if (e.type === 'confirmed' && e.room === this.selected) this.step = 3;
    if (e.type === 'scene') {
      if (e.scene) journal.log(`Acasă · scena ${SCENES.find((s) => s.id === e.scene).name}`);
      if (e.text) {
        journal.log(`Acasă · ${e.text}`);
        this.stage.cabinet.signalText('home', e.text);
      }
    }
    this.draw();
    this.drawChips();
  }

  draw() {
    const m = this.model;
    const r = this.selected;
    const keep = document.activeElement?.closest?.('#ui-body') ? `[data-act="${document.activeElement.dataset.act}"]${document.activeElement.dataset.value ? `[data-value="${document.activeElement.dataset.value}"]` : ''}` : null;
    this.body.innerHTML = `
      <header class="ui-head">
        <div><h3>Acasă</h3><p>${m.average.toFixed(1)}° înăuntru · 6.2° afară</p></div>
        <span class="ui-sim">Simulare</span>
      </header>
      <div class="ui-scenes" role="group" aria-label="Scene">
        ${SCENES.map((s) => `<button type="button" data-act="scene" data-value="${s.id}" aria-pressed="${m.scene === s.id}">${SCENE_ICON[s.id]}<span>${s.name}</span></button>`).join('')}
      </div>
      <div class="ui-rooms" role="group" aria-label="Camere">
        ${m.rooms.map((x) => `<button type="button" data-act="room" data-value="${x.id}" aria-pressed="${x === r}">${x.name}</button>`).join('')}
      </div>
      <section class="ui-card" aria-label="${r.name}">
        <div class="ui-temp">
          <div><span>Măsurat</span><b>${r.temp.toFixed(1)}°</b></div>
          <div class="ui-step"><span>Valoare cerută</span><div>
            <button type="button" data-act="down" aria-label="Scade temperatura cerută">−</button>
            <strong>${(r.pending ?? r.set).toFixed(1)}°</strong>
            <button type="button" data-act="up" aria-label="Crește temperatura cerută">+</button>
          </div></div>
        </div>
        <button type="button" class="ui-row" data-act="light" aria-pressed="${r.light}">${ICONS.bulb}<span>Lumină</span><em>${r.light ? 'Aprinsă' : 'Stinsă'}</em><i class="ui-switch"></i></button>
        <div class="ui-blinds" role="group" aria-label="Jaluzele">
          <span>Jaluzele</span>
          <div>${BLINDS.map(([v, name]) => `<button type="button" data-act="blind" data-value="${v}" aria-pressed="${r.blind === v}">${name}</button>`).join('')}</div>
        </div>
        <ol class="ui-chain" aria-label="Starea comenzii">${STEPS.map((s, i) => `<li class="${i < this.step ? 'is-on' : ''}">${s}</li>`).join('')}</ol>
      </section>
      <div class="ui-tiles">
        <section class="ui-tile">
          <div>${ICONS.fan}<span>Ventilație</span></div>
          <b>${m.vent} %</b>
          <div class="ui-mini"><button type="button" data-act="vent-down" aria-label="Scade ventilația">−</button><button type="button" data-act="vent-up" aria-label="Crește ventilația">+</button></div>
        </section>
        <button type="button" class="ui-tile ui-tile--btn" data-act="armed" aria-pressed="${m.armed}">
          <div>${ICONS.shield}<span>Securitate</span></div>
          <b>${m.armed ? 'Armată' : 'Dezarmată'}</b>
          <small>${m.armed ? 'Senzorii sunt activi' : 'Senzorii sunt opriți'}</small>
        </button>
      </div>
      <button type="button" class="ui-row ui-row--card" data-act="heat" aria-pressed="${m.heat}">${ICONS.flame}<span>Pompă de căldură<small>Tur ${m.heat ? '38.0' : '24.0'}° · ${m.power.toFixed(1)} kW acum</small></span><i class="ui-switch"></i></button>`;
    if (keep) this.body.querySelector(keep)?.focus();
  }

  drawChips() {
    for (const r of this.model.rooms) {
      const c = this.chipLayer.querySelector(`[data-chip="${r.id}"]`);
      c.innerHTML = `<i class="${r.light ? 'is-lit' : ''}"></i><b>${r.temp.toFixed(1)}°</b><span>${r.name}</span>`;
      c.classList.toggle('is-selected', r === this.selected);
      c.setAttribute('aria-pressed', String(r === this.selected));
    }
  }

  finalRect() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const height = Math.min(800, h - 64 - 62);
    const k = (height - BEZEL * 2) / UI_H;
    const width = UI_W * k + BEZEL * 2;
    return { k, left: w - width - Math.max(24, w * 0.075), top: 64 + (h - 64 - 46 - height) / 2, width, height };
  }

  /** p is the morph: 0 is the dashboard panel, 1 is the phone. */
  setProgress(p, stacked) {
    const d = this.device;
    d.classList.toggle('is-stacked', stacked);
    if (stacked) {
      this.shown = true;
      const width = Math.min(window.innerWidth - 24, 372);
      const k = (width - BEZEL * 2) / UI_W;
      d.style.cssText = `--e:1;--ui:1;--pop:1;width:${width}px;height:${UI_H * k + BEZEL * 2}px;`;
      this.ui.style.transform = `scale(${k})`;
      d.toggleAttribute('inert', false);
      return;
    }
    this.shown = p > 0.001;
    d.style.visibility = this.shown ? 'visible' : 'hidden';
    d.toggleAttribute('inert', p < 0.92);
    if (!this.shown) {
      this.fromRect = null;
      this.dashboard.root.style.clipPath = '';
      return;
    }
    if (!this.fromRect) {
      const r = this.dashboard.root.getBoundingClientRect();
      this.fromRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    const to = this.finalRect();
    const from = this.fromRect;
    const e = sm(0.04, 1, p);
    d.style.left = `${mix(from.left, to.left, e)}px`;
    d.style.top = `${mix(from.top, to.top, e)}px`;
    d.style.width = `${mix(from.width, to.width, e)}px`;
    d.style.height = `${mix(from.height, to.height, e)}px`;
    d.style.setProperty('--e', e.toFixed(3));
    d.style.setProperty('--pop', sm(0, 0.14, p).toFixed(3));
    d.style.setProperty('--ui', sm(0.62, 0.98, p).toFixed(3));

    // The panel stays visible through the phone's outline as it closes in.
    const bezel = e * BEZEL;
    const L = mix(from.left, to.left, e) + bezel;
    const T = mix(from.top, to.top, e) + bezel;
    const W = mix(from.width, to.width, e) - bezel * 2;
    const Hh = mix(from.height, to.height, e) - bezel * 2;
    const top = Math.max(0, T - from.top);
    const left = Math.max(0, L - from.left);
    const right = Math.max(0, from.left + from.width - (L + W));
    const bottom = Math.max(0, from.top + from.height - (T + Hh));
    this.dashboard.root.style.clipPath = p > 0.002 ? `inset(${top}px ${right}px ${bottom}px ${left}px round ${14 + e * 40}px)` : '';
    this.ui.style.transform = `scale(${to.k})`;
  }

  /** Chips sit over the rooms in the 3D view. */
  frame(home) {
    const show = Math.max(0, (home - 0.86) / 0.14);
    this.chipLayer.style.opacity = show.toFixed(3);
    this.chipLayer.toggleAttribute('inert', show < 0.5);
    if (show <= 0) return;
    for (const r of this.model.rooms) {
      const [x, y] = this.stage.projectRoom(r.id);
      this.chipLayer.querySelector(`[data-chip="${r.id}"]`).style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  }
}
