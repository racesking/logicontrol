/* One room fed by one distribution board.
   Pure transition(state, action). No DOM, timers, clock, or randomness.
   Currents and temperatures are a teaching model, not a measurement. */
(function (root) {
  'use strict';

  var CIRCUITS = ['light', 'floor', 'hrv', 'ac', 'blinds'];

  function round1(n) { return Math.round(n * 10) / 10; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function initialState() {
    return {
      step: 0,
      log: [],
      room: 20.2,
      presence: true,
      breakers: { light: true, floor: true, hrv: true, ac: true, blinds: true },
      light: { auto: true, on: true },
      floor: { enabled: true, setpoint: 22 },
      hrv: { on: true },
      ac: { on: false, setpoint: 24 },
      blinds: { position: 35, target: 35 }
    };
  }

  function copyBreakers(b) {
    return { light: b.light, floor: b.floor, hrv: b.hrv, ac: b.ac, blinds: b.blinds };
  }

  function lightsOn(s) {
    if (!s.breakers.light) return false;
    if (s.light.auto) return s.presence;
    return s.light.on;
  }

  function floorOn(s) {
    return s.breakers.floor && s.floor.enabled && s.room < s.floor.setpoint - 0.15;
  }

  function acOn(s) {
    return s.breakers.ac && s.ac.on && s.room > s.ac.setpoint + 0.15;
  }

  function hrvOn(s) {
    return s.breakers.hrv && s.hrv.on;
  }

  function blindsMoving(s) {
    return s.breakers.blinds && Math.abs(s.blinds.position - s.blinds.target) > 0.5;
  }

  function amps(s) {
    var a = 0.15;
    if (lightsOn(s)) a += 1.6;
    if (floorOn(s)) a += 6.2;
    if (hrvOn(s)) a += 0.8;
    if (acOn(s)) a += 4.4;
    if (blindsMoving(s)) a += 0.35;
    return round1(a);
  }

  function logged(state, patch, entry) {
    var next = {
      step: state.step + 1,
      log: [{ step: state.step + 1, text: entry }].concat(state.log).slice(0, 5),
      room: patch.room != null ? patch.room : state.room,
      presence: patch.presence != null ? patch.presence : state.presence,
      breakers: patch.breakers || state.breakers,
      light: patch.light || state.light,
      floor: patch.floor || state.floor,
      hrv: patch.hrv || state.hrv,
      ac: patch.ac || state.ac,
      blinds: patch.blinds || state.blinds
    };
    return next;
  }

  function tick(state) {
    var heat = floorOn(state) ? 0.16 : 0;
    var cool = acOn(state) ? 0.2 : 0;
    var vent = hrvOn(state) ? 0.03 : 0;
    var room = round1(clamp(state.room + heat - cool - vent + (18.5 - state.room) * 0.015, 16, 30));
    var blinds = state.blinds;
    if (state.breakers.blinds && blinds.position !== blinds.target) {
      var dir = blinds.target > blinds.position ? 1 : -1;
      var position = clamp(blinds.position + dir * 12, 0, 100);
      if (Math.abs(blinds.target - position) < 12) position = blinds.target;
      blinds = { position: position, target: blinds.target };
    }
    return {
      step: state.step,
      log: state.log,
      room: room,
      presence: state.presence,
      breakers: state.breakers,
      light: state.light,
      floor: state.floor,
      hrv: state.hrv,
      ac: state.ac,
      blinds: blinds
    };
  }

  function transition(state, action) {
    if (!state || !state.breakers) return initialState();
    if (!action || typeof action.type !== 'string') return state;
    if (action.type === 'RESET') return initialState();
    if (action.type === 'TICK') return tick(state);

    if (action.type === 'BREAKER') {
      if (CIRCUITS.indexOf(action.id) < 0) return state;
      var names = { light: 'iluminat', floor: 'pardoseală', hrv: 'recuperator', ac: 'AC', blinds: 'jaluzele' };
      var breakers = copyBreakers(state.breakers);
      breakers[action.id] = !breakers[action.id];
      return logged(state, { breakers: breakers }, 'Siguranță ' + names[action.id] + (breakers[action.id] ? ' închisă' : ' deschisă'));
    }

    if (action.type === 'PRESENCE') {
      var presence = !state.presence;
      return logged(state, { presence: presence }, presence ? 'Mișcare în cameră' : 'Camera goală');
    }

    if (action.type === 'LIGHT_MODE') {
      var auto = action.auto === true;
      if (state.light.auto === auto) return state;
      return logged(state, { light: { auto: auto, on: state.light.on } }, auto ? 'Lumină pe PIR' : 'Lumină manuală');
    }

    if (action.type === 'LIGHT') {
      return logged(state, { light: { auto: false, on: action.on === true } }, action.on ? 'Lumină pornită' : 'Lumină oprită');
    }

    if (action.type === 'FLOOR') {
      return logged(state, { floor: { enabled: !state.floor.enabled, setpoint: state.floor.setpoint } }, state.floor.enabled ? 'Pardoseală oprită' : 'Pardoseală pornită');
    }

    if (action.type === 'FLOOR_SET') {
      var dir = action.dir === -1 ? -1 : 1;
      var setpoint = round1(clamp(state.floor.setpoint + dir * 0.5, 18, 26));
      if (setpoint === state.floor.setpoint) return state;
      return logged(state, { floor: { enabled: state.floor.enabled, setpoint: setpoint } }, 'Consignă pardoseală ' + setpoint);
    }

    if (action.type === 'HRV') {
      return logged(state, { hrv: { on: !state.hrv.on } }, state.hrv.on ? 'Recuperator oprit' : 'Recuperator pornit');
    }

    if (action.type === 'AC') {
      return logged(state, { ac: { on: !state.ac.on, setpoint: state.ac.setpoint } }, state.ac.on ? 'AC oprit' : 'AC pornit');
    }

    if (action.type === 'AC_SET') {
      var step = action.dir === -1 ? -1 : 1;
      var acSet = round1(clamp(state.ac.setpoint + step * 0.5, 18, 28));
      if (acSet === state.ac.setpoint) return state;
      return logged(state, { ac: { on: state.ac.on, setpoint: acSet } }, 'Consignă AC ' + acSet);
    }

    if (action.type === 'BLINDS') {
      var target = action.target === 0 ? 0 : 100;
      if (state.blinds.target === target) return state;
      return logged(state, { blinds: { position: state.blinds.position, target: target } }, target === 100 ? 'Jaluzele deschise' : 'Jaluzele închise');
    }

    return state;
  }

  function view(state) {
    return {
      room: state.room,
      presence: state.presence,
      lights: lightsOn(state),
      lightAuto: state.light.auto,
      lightCmd: state.light.on,
      floor: floorOn(state),
      floorEnabled: state.floor.enabled,
      floorSet: state.floor.setpoint,
      hrv: hrvOn(state),
      hrvCmd: state.hrv.on,
      ac: acOn(state),
      acCmd: state.ac.on,
      acSet: state.ac.setpoint,
      blinds: state.blinds.position,
      blindsTarget: state.blinds.target,
      amps: amps(state),
      breakers: state.breakers
    };
  }

  root.LCRoom = {
    initialState: initialState,
    transition: transition,
    view: view
  };
})(typeof window !== 'undefined' ? window : globalThis);
