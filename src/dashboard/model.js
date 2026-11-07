// The simulated building. An invented plan and invented values: no real project.
// Commands and measurements stay separate, so a request is never shown as a result.

const room = (id, name, x, y, w, h, temp, set, light = false) => ({
  id, name, x, y, w, h, temp, set, light, ac: false, status: 'idle', heating: false,
});

export const FLOORS = [
  {
    id: 'e2', name: 'Etaj 2', level: 3,
    rooms: [
      room('e2a', 'Birou deschis', 0, 0, 13, 8, 22.4, 22),
      room('e2b', 'Sală proiecte', 0, 8, 7, 6, 21.6, 22),
      room('e2c', 'Birou 2.1', 7, 8, 6, 6, 22.1, 22, true),
      room('e2d', 'Terasă tehnică', 16, 0, 8, 7, 18.2, 18),
      room('e2e', 'Birou 2.2', 16, 7, 8, 7, 23.1, 22),
    ],
  },
  {
    id: 'e1', name: 'Etaj 1', level: 2,
    rooms: [
      room('e1a', 'Birou 1.1', 0, 0, 6.5, 7, 21.2, 22, true),
      room('e1b', 'Birou 1.2', 6.5, 0, 6.5, 7, 21.9, 22),
      room('e1c', 'Sală ședințe', 0, 7, 13, 7, 22.8, 22, true),
      room('e1d', 'Laborator', 16, 0, 8, 7, 20.4, 21),
      room('e1e', 'Birou 1.3', 16, 7, 8, 7, 22.2, 22),
    ],
  },
  {
    id: 'p', name: 'Parter', level: 1,
    rooms: [
      room('pa', 'Recepție', 0, 0, 7, 8, 21.4, 21, true),
      room('pb', 'Cafenea', 7, 0, 6, 8, 23.2, 22, true),
      room('pc', 'Sală mare', 0, 8, 13, 6, 20.7, 22),
      room('pd', 'Atelier', 16, 0, 8, 14, 19.8, 20, true),
    ],
  },
  {
    id: 'd', name: 'Demisol', level: 0,
    rooms: [
      room('da', 'Cameră tehnică', 0, 0, 9, 8, 24.6, 24, true),
      room('db', 'Tablou TA-01', 9, 0, 4, 8, 23.8, 24, true),
      room('dc', 'Depozit', 0, 8, 13, 6, 17.9, 18),
      room('dd', 'Parcare', 16, 0, 8, 14, 12.4, 12),
    ],
  },
];

export const SIZE = { width: 24, depth: 14, storey: 3.4, core: { x: 13, w: 3 } };

const ACK_MS = 800;

export class BuildingModel {
  constructor() {
    this.floors = FLOORS;
    this.rooms = FLOORS.flatMap((f) => f.rooms.map((r) => Object.assign(r, { floor: f })));
    this.listeners = new Set();
    this.rooms.forEach((r) => { r.heating = r.temp < r.set - 0.2; });
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  emit(event) { this.listeners.forEach((fn) => fn(event)); }

  find(id) { return this.rooms.find((r) => r.id === id); }

  summary(floor = null) {
    const list = floor ? floor.rooms : this.rooms;
    return {
      average: list.reduce((n, r) => n + r.temp, 0) / list.length,
      rooms: list.length,
      heating: list.filter((r) => r.heating).length,
      lights: list.filter((r) => r.light).length,
      alarms: list.filter((r) => Math.abs(r.temp - r.set) > 3).length,
    };
  }

  /** Every command goes: sent, then equipment answers, then the measurement proves it. */
  command(r, change) {
    r.status = 'sent';
    this.emit({ type: 'sent', room: r, change });
    window.clearTimeout(r.timer);
    r.timer = window.setTimeout(() => {
      if (change.set !== undefined) r.set = change.set;
      if (change.light !== undefined) r.light = change.light;
      if (change.ac !== undefined) r.ac = change.ac;
      r.status = change.set !== undefined ? 'acting' : 'confirmed';
      this.emit({ type: 'ack', room: r, change });
      if (r.status === 'confirmed') this.emit({ type: 'confirmed', room: r, change });
    }, ACK_MS);
  }

  setpoint(r, delta) {
    const next = Math.max(16, Math.min(28, Math.round((r.pendingSet ?? r.set) * 2 + delta * 2) / 2));
    r.pendingSet = next;
    this.command(r, { set: next });
  }

  toggleLight(r) { this.command(r, { light: !r.light }); }

  toggleCooling(r) { this.command(r, { ac: !r.ac }); }

  /** Fixed step: the same commands always give the same temperatures. */
  tick() {
    let changed = false;
    for (const r of this.rooms) {
      const gap = r.set - r.temp;
      if (r.status === 'acting') {
        r.temp += Math.sign(gap) * Math.min(Math.abs(gap), 0.12);
        changed = true;
        if (Math.abs(r.set - r.temp) < 0.06) {
          r.temp = r.set;
          r.status = 'confirmed';
          r.pendingSet = undefined;
          this.emit({ type: 'confirmed', room: r });
        }
      }
      const heating = r.temp < r.set - 0.2;
      if (heating !== r.heating) { r.heating = heating; changed = true; }
    }
    if (changed) this.emit({ type: 'tick' });
  }
}

/** Temperature to a colour band. Values are always printed too, never colour alone. */
export function tempColor(t) {
  if (t < 19) return '#2F7FD1';
  if (t < 21) return '#16A3A8';
  if (t < 23) return '#2FA866';
  if (t < 25) return '#E2A21B';
  return '#E0641F';
}
