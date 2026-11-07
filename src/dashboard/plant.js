// The simulated plant: one air handling unit and one heat pump. Invented values.
// As in the building model, a request is never shown as a result: the equipment
// answers first, then the measurement catches up, then the command is confirmed.

const ACK_MS = 800;
const OUTDOOR = 6.2;
const RETURN_AIR = 22.1;

export class PlantModel {
  constructor() {
    this.listeners = new Set();
    this.status = 'idle';
    this.ahu = {
      on: true,
      mode: 'Automat',
      setT: 21,
      setFlow: 3200,
      flow: 3200,
      supplyT: 21,
      damper: 100,
      wheel: 68,
      heat: 34,
      cool: 0,
      filterSupply: 96,
      filterExtract: 84,
      co2: 612,
    };
    this.hp = { on: true, setT: 42, flowT: 42, load: 58 };
    this.pending = {};
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  emit(event) { this.listeners.forEach((fn) => fn(event)); }

  command(change, text) {
    this.status = 'sent';
    this.emit({ type: 'sent', change, text });
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      Object.assign(this.ahu, change.ahu);
      Object.assign(this.hp, change.hp);
      this.pending = {};
      this.status = 'acting';
      this.emit({ type: 'ack', change, text });
    }, ACK_MS);
  }

  toggleAhu() {
    const on = !this.ahu.on;
    this.command({ ahu: { on, mode: on ? 'Automat' : 'Oprit' } }, on ? 'CTA 1 pornită' : 'CTA 1 oprită');
  }

  nudgeT(delta) {
    const v = Math.max(16, Math.min(26, (this.pending.setT ?? this.ahu.setT) + delta));
    this.pending.setT = v;
    this.command({ ahu: { setT: v } }, `CTA 1 ${v.toFixed(1)}°`);
  }

  nudgeFlow(delta) {
    const v = Math.max(1200, Math.min(4800, (this.pending.setFlow ?? this.ahu.setFlow) + delta));
    this.pending.setFlow = v;
    this.command({ ahu: { setFlow: v } }, `CTA 1 ${v} m³/h`);
  }

  toggleHp() {
    const on = !this.hp.on;
    this.command({ hp: { on } }, on ? 'PC1 pornită' : 'PC1 oprită');
  }

  nudgeHp(delta) {
    const v = Math.max(30, Math.min(55, (this.pending.hpT ?? this.hp.setT) + delta));
    this.pending.hpT = v;
    this.command({ hp: { setT: v } }, `PC1 tur ${v}°`);
  }

  get running() { return this.ahu.flow > 40; }

  /** Fixed step, so the same commands always give the same numbers. */
  tick() {
    const a = this.ahu;
    const h = this.hp;
    const approach = (now, goal, step) => now + Math.sign(goal - now) * Math.min(Math.abs(goal - now), step);

    // Dampers open before the fans ramp; on stopping, the fans run down first.
    a.damper = approach(a.damper, a.on ? 100 : a.flow > 200 ? a.damper : 0, 12);
    const flowGoal = a.on && a.damper > 90 ? a.setFlow : 0;
    a.flow = approach(a.flow, flowGoal, 130);

    const moving = a.flow > 40;
    const recovered = OUTDOOR + (RETURN_AIR - OUTDOOR) * 0.68;
    const load = a.setT - recovered;
    a.wheel = approach(a.wheel, moving ? (load < 0 ? 30 : 68) : 0, 5);
    a.heat = approach(a.heat, moving ? Math.max(0, Math.min(100, load * 30)) : 0, 6);
    a.cool = approach(a.cool, moving ? Math.max(0, Math.min(100, -load * 30)) : 0, 6);
    a.supplyT = approach(a.supplyT, moving ? a.setT : 14, 0.09);

    h.flowT = approach(h.flowT, h.on ? h.setT : 24, 0.3);
    h.load = approach(h.load, h.on ? 40 + (h.setT - 30) * 1.2 : 0, 3);

    if (this.status === 'acting') {
      const settled = Math.abs(a.flow - flowGoal) < 1 && Math.abs(a.supplyT - (moving ? a.setT : 14)) < 0.05
        && Math.abs(h.flowT - (h.on ? h.setT : 24)) < 0.05;
      if (settled) {
        this.status = 'confirmed';
        this.emit({ type: 'confirmed' });
      }
    }
    this.emit({ type: 'tick' });
  }

  /** The value tags, with the running state that colours each one. */
  tags() {
    const a = this.ahu;
    const on = a.flow > 40;
    const state = (v) => (v ? 'run' : 'off');
    const onOff = (v) => (v ? 'PORNIT' : 'OPRIT');
    return {
      damperEx: [`${Math.round(a.damper)} %`, state(a.damper > 5)],
      wheel: [`${Math.round(a.wheel)} %`, state(a.wheel > 1)],
      fanEx: [onOff(on), state(on)],
      filterEx: [`${Math.round(on ? a.filterExtract * (a.flow / 3200) ** 2 : 0)} Pa`, state(on)],
      air: [`${a.co2} ppm`, 'run'],
      tempEx: [`${RETURN_AIR.toFixed(1)} °C`, 'run'],
      tempOut: [`${OUTDOOR.toFixed(1)} °C`, 'run'],
      filterSup: [`${Math.round(on ? a.filterSupply * (a.flow / 3200) ** 2 : 0)} Pa`, state(on)],
      heat: [`${Math.round(a.heat)} %`, state(a.heat > 1)],
      cool: [`${Math.round(a.cool)} %`, state(a.cool > 1)],
      fanSup: [onOff(on), state(on)],
      flow: [`${Math.round(a.flow)} m³/h`, state(on)],
      tempSup: [`${a.supplyT.toFixed(1)} °C`, 'run'],
    };
  }
}

export const AIR = { outdoor: OUTDOOR, ret: RETURN_AIR };
