/* Simulated plant: heating, ventilation, pump.
   Pure transition(state, action). No DOM, timers, clock, or randomness.
   Figures are a teaching model, not a saved bill or a sized installation. */
(function (root) {
  'use strict';

  var LIMITS = {
    heat: { min: 16, max: 26, step: 0.5 },
    air: { min: 0, max: 100, step: 10 },
    pump: { min: 1.2, max: 3, step: 0.2 }
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function round1(n) { return Math.round(n * 10) / 10; }
  function round0(n) { return Math.round(n); }

  function blank(id, measured, setpoint, manual) {
    return { measured: measured, setpoint: setpoint, manual: manual, mode: 'auto', ack: false };
  }

  function initialState() {
    return {
      selected: 'heat',
      step: 0,
      log: [],
      systems: {
        heat: blank('heat', 19.2, 21.5, 40),
        air: blank('air', 45, 60, 60),
        pump: blank('pump', 1.6, 2.2, 55)
      }
    };
  }

  function outputFor(id, sys) {
    if (sys.mode === 'manual') return clamp(round0(sys.manual), 0, 100);
    if (id === 'heat') return clamp(round0((sys.setpoint - sys.measured) * 50), 0, 100);
    if (id === 'air') return clamp(round0(sys.setpoint), 0, 100);
    var need = (sys.setpoint - sys.measured) * 80;
    return clamp(round0(need), 0, 100);
  }

  function nextMeasured(id, sys, output) {
    if (id === 'heat') return round1(clamp(sys.measured + output * 0.008 - 0.1, 14, 28));
    if (id === 'air') return round0(clamp(sys.measured + (output - sys.measured) * 0.45, 0, 100));
    return round1(clamp(sys.measured + (output / 100) * 0.35 - 0.04, 0.8, 3.4));
  }

  function alarmFor(id, sys) {
    if (id === 'heat' && sys.setpoint - sys.measured > 1.6) return 'lag';
    if (id === 'pump' && sys.setpoint - sys.measured > 0.4) return 'low';
    if (id === 'air' && sys.setpoint - sys.measured > 20) return 'lag';
    return null;
  }

  function withSys(state, id, sys) {
    var systems = {
      heat: state.systems.heat,
      air: state.systems.air,
      pump: state.systems.pump
    };
    systems[id] = sys;
    return systems;
  }

  function logged(state, systems, entry) {
    var step = state.step + 1;
    entry.step = step;
    return {
      selected: state.selected,
      step: step,
      log: [entry].concat(state.log).slice(0, 6),
      systems: systems
    };
  }

  function tickOne(id, sys) {
    var output = outputFor(id, sys);
    var measured = nextMeasured(id, sys, output);
    var draft = { measured: measured, setpoint: sys.setpoint, manual: sys.manual, mode: sys.mode, ack: false };
    draft.ack = Boolean(sys.ack && alarmFor(id, draft));
    return draft;
  }

  function transition(state, action) {
    if (!state || !state.systems) return initialState();
    if (!action || typeof action.type !== 'string') return state;
    if (action.type === 'RESET') return initialState();

    if (action.type === 'SELECT') {
      if (!state.systems[action.id] || state.selected === action.id) return state;
      return { selected: action.id, step: state.step, log: state.log, systems: state.systems };
    }

    if (action.type === 'TICK') {
      var systems = {
        heat: tickOne('heat', state.systems.heat),
        air: tickOne('air', state.systems.air),
        pump: tickOne('pump', state.systems.pump)
      };
      return { selected: state.selected, step: state.step, log: state.log, systems: systems };
    }

    var id = action.id || state.selected;
    var sys = state.systems[id];
    if (!sys) return state;
    var limits = LIMITS[id];

    if (action.type === 'NUDGE') {
      var dir = action.dir === -1 ? -1 : 1;
      var setpoint = round1(clamp(sys.setpoint + dir * limits.step, limits.min, limits.max));
      if (setpoint === sys.setpoint) return state;
      var nudged = { measured: sys.measured, setpoint: setpoint, manual: sys.manual, mode: sys.mode, ack: false };
      return logged(state, withSys(state, id, nudged), { id: id, kind: 'setpoint', value: setpoint });
    }

    if (action.type === 'MODE') {
      if (action.mode !== 'auto' && action.mode !== 'manual') return state;
      if (sys.mode === action.mode) return state;
      var switched = { measured: sys.measured, setpoint: sys.setpoint, manual: sys.manual, mode: action.mode, ack: false };
      return logged(state, withSys(state, id, switched), { id: id, kind: 'mode', value: action.mode });
    }

    if (action.type === 'MANUAL') {
      var manual = clamp(round0(Number(action.value)), 0, 100);
      if (sys.mode === 'manual' && sys.manual === manual) return state;
      var forced = { measured: sys.measured, setpoint: sys.setpoint, manual: manual, mode: 'manual', ack: false };
      return logged(state, withSys(state, id, forced), { id: id, kind: 'manual', value: manual });
    }

    if (action.type === 'ACK') {
      if (!alarmFor(id, sys) && !sys.ack) return state;
      var acked = { measured: sys.measured, setpoint: sys.setpoint, manual: sys.manual, mode: sys.mode, ack: true };
      return logged(state, withSys(state, id, acked), { id: id, kind: 'ack', value: true });
    }

    return state;
  }

  function view(state, id) {
    var sys = state.systems[id];
    var output = outputFor(id, sys);
    var alarm = alarmFor(id, sys);
    return {
      output: output,
      alarm: alarm && !sys.ack ? alarm : null,
      seen: Boolean(alarm && sys.ack),
      measured: sys.measured,
      setpoint: sys.setpoint,
      mode: sys.mode,
      manual: sys.manual
    };
  }

  root.LCPlant = {
    LIMITS: LIMITS,
    initialState: initialState,
    transition: transition,
    view: view,
    outputFor: outputFor
  };
})(typeof window !== 'undefined' ? window : globalThis);
