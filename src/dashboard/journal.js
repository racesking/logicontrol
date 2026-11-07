// Alarms and the event log. An alarm stays until its condition clears:
// acknowledging one means "seen", it does not make the fault go away.

const START_MINUTES = 15 * 60 + 2; // the panel's simulated clock starts at 15:02

export class Journal {
  constructor(model, plant) {
    this.model = model;
    this.plant = plant;
    this.started = performance.now();
    this.alarms = [];
    this.events = [
      { time: '14:41', text: 'Program: trecere pe regim de zi' },
      { time: '13:58', text: 'PC1: dezghețare încheiată' },
      { time: '11:26', text: 'Etaj 1 · Sală ședințe: iluminat aprins' },
      { time: '09:03', text: 'CTA 1: debit modificat la 3200 m³/h' },
    ];
    this.raise('filter', 'warning', 'CTA 1', 'Filtru evacuare: 84 Pa, se apropie de limita de 120 Pa', '12:17');
  }

  now() {
    const m = START_MINUTES + Math.floor((performance.now() - this.started) / 60000);
    return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  log(text) {
    this.events.unshift({ time: this.now(), text });
    this.events.length = Math.min(this.events.length, 40);
  }

  raise(id, severity, source, text, time = this.now()) {
    if (this.alarms.some((a) => a.id === id)) return false;
    this.alarms.unshift({ id, severity, source, text, time, acked: false });
    return true;
  }

  clear(id) {
    const i = this.alarms.findIndex((a) => a.id === id);
    if (i < 0) return false;
    this.log(`${this.alarms[i].source}: revenit la normal`);
    this.alarms.splice(i, 1);
    return true;
  }

  ack(id) {
    const a = this.alarms.find((x) => x.id === id);
    if (!a || a.acked) return;
    a.acked = true;
    this.log(`${a.source}: alarmă văzută`);
  }

  ackAll() { this.alarms.forEach((a) => this.ack(a.id)); }

  get active() { return this.alarms.length; }

  get unseen() { return this.alarms.filter((a) => !a.acked).length; }

  /** Conditions are read from the plant, so alarms follow what is really happening. */
  evaluate() {
    let changed = false;
    const rule = (id, condition, severity, source, text) => {
      if (condition) changed = this.raise(id, severity, source, text) || changed;
      else changed = this.clear(id) || changed;
    };
    rule('ahu-off', !this.plant.ahu.on, 'critical', 'CTA 1', 'Centrala este oprită: clădirea nu primește aer proaspăt');
    rule('hp-off', !this.plant.hp.on, 'critical', 'PC1', 'Pompa de căldură este oprită');
    for (const r of this.model.rooms) {
      rule(`room-${r.id}`, Math.abs(r.temp - r.set) > 3, 'warning', `${r.floor.name} · ${r.name}`, `Temperatură ${r.temp.toFixed(1)}°, cerut ${r.set.toFixed(1)}°`);
    }
    return changed;
  }
}
