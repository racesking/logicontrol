// The simulated home. Invented values, and the same rule as the building:
// the request leaves first, the equipment answers, then the measurement proves it.

const room = (id, name, temp, set, light, blind) => ({ id, name, temp, set, light, blind, status: 'idle' });

export const SCENES = [
  { id: 'acasa', name: 'Acasă' },
  { id: 'plecat', name: 'Plecat' },
  { id: 'noapte', name: 'Noapte' },
];

export class HomeModel {
  constructor(travel) {
    this.travel = travel; // carries a command down the room's cable
    this.listeners = new Set();
    this.scene = 'acasa';
    this.armed = false;
    this.vent = 45;
    this.heat = true;
    this.rooms = [
      room('living', 'Living', 21.8, 22, true, 0),
      room('kitchen', 'Bucătărie', 21.4, 21.5, true, 0),
      room('bedroom', 'Dormitor', 19.6, 20, false, 0.5),
      room('bath', 'Baie', 22.6, 23, false, 0),
      room('hall', 'Hol', 20.9, 21, true, 0),
      room('tech', 'Tehnic', 18.4, 18, true, 0),
    ];
  }

  on(fn) { this.listeners.add(fn); }

  emit(e) { this.listeners.forEach((fn) => fn(e)); }

  find(id) { return this.rooms.find((r) => r.id === id); }

  get average() {
    const list = this.rooms.filter((r) => r.id !== 'tech');
    return list.reduce((n, r) => n + r.temp, 0) / list.length;
  }

  get lights() { return this.rooms.filter((r) => r.light).length; }

  /** Illustrative only: base load, plus lights, ventilation and heat demand. */
  get power() {
    const heat = this.rooms.filter((r) => r.temp < r.set - 0.1).length;
    return 0.34 + this.lights * 0.03 + this.vent * 0.0022 + heat * 0.32 + (this.heat ? 0.9 : 0);
  }

  command(r, change, text) {
    r.status = 'sent';
    this.emit({ type: 'sent', room: r, change, text });
    this.travel(r.id, () => {
      Object.assign(r, change);
      r.status = change.set !== undefined ? 'acting' : 'confirmed';
      this.emit({ type: 'ack', room: r, change });
      if (r.status === 'confirmed') this.emit({ type: 'confirmed', room: r });
    });
  }

  toggleLight(r) {
    const light = !r.light;
    this.command(r, { light }, `${r.name}: lumină ${light ? 'aprinsă' : 'stinsă'}`);
  }

  nudge(r, delta) {
    const set = Math.max(16, Math.min(26, (r.pending ?? r.set) + delta));
    r.pending = set;
    this.command(r, { set }, `${r.name}: ${set.toFixed(1)}°`);
  }

  setBlind(r, blind) {
    const word = blind === 0 ? 'sus' : blind === 1 ? 'jos' : 'la jumătate';
    this.command(r, { blind }, `${r.name}: jaluzele ${word}`);
  }

  setScene(id) {
    this.scene = id;
    const plan = {
      acasa: { armed: false, vent: 45, room: (r) => ({ light: ['living', 'kitchen', 'hall', 'tech'].includes(r.id), blind: r.id === 'bedroom' ? 0.5 : 0 }) },
      plecat: { armed: true, vent: 20, room: () => ({ light: false, blind: 0.5 }) },
      noapte: { armed: true, vent: 30, room: (r) => ({ light: r.id === 'hall', blind: 1 }) },
    }[id];
    this.armed = plan.armed;
    this.vent = plan.vent;
    this.emit({ type: 'scene', scene: id });
    for (const r of this.rooms) this.command(r, plan.room(r), null);
  }

  toggleArmed() {
    this.armed = !this.armed;
    this.emit({ type: 'scene', text: `Securitate ${this.armed ? 'armată' : 'dezarmată'}` });
  }

  toggleHeat() {
    this.heat = !this.heat;
    this.emit({ type: 'scene', text: `Pompă de căldură ${this.heat ? 'pornită' : 'oprită'}` });
  }

  nudgeVent(delta) {
    this.vent = Math.max(0, Math.min(100, this.vent + delta));
    this.emit({ type: 'scene', text: `Ventilație ${this.vent} %` });
  }

  /** Fixed step, so the same commands always give the same temperatures. */
  tick() {
    let changed = false;
    for (const r of this.rooms) {
      if (r.status !== 'acting') continue;
      const gap = r.set - r.temp;
      r.temp += Math.sign(gap) * Math.min(Math.abs(gap), 0.1);
      changed = true;
      if (Math.abs(r.set - r.temp) < 0.05) {
        r.temp = r.set;
        r.status = 'confirmed';
        r.pending = undefined;
        this.emit({ type: 'confirmed', room: r });
      }
    }
    if (changed) this.emit({ type: 'tick' });
  }
}
