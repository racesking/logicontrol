/* Pure, deterministic model for the "Iluminat și prezență" mini-demo.
   transition(state, action) -> state. No DOM, timers, clock or randomness. */
(function (root) {
  'use strict';

  var ZONES = [
    { id: 'receptie', name: 'Recepție', preset: 70, occupied: true },
    { id: 'open-space', name: 'Birouri open space', preset: 80, occupied: true },
    { id: 'sala-sedinte', name: 'Sală de ședințe', preset: 60, occupied: false }
  ];
  var MODES = ['auto', 'manual-on', 'manual-off'];
  var LOG_LIMIT = 5;

  function zoneDef(id) {
    for (var i = 0; i < ZONES.length; i++) if (ZONES[i].id === id) return ZONES[i];
    return null;
  }

  function commandFor(id, zone) {
    var def = zoneDef(id);
    if (zone.mode === 'manual-on') return def.preset;
    if (zone.mode === 'manual-off') return 0;
    return zone.occupied ? def.preset : 0;
  }

  function initialState() {
    var zones = {};
    ZONES.forEach(function (z) {
      var zone = { occupied: z.occupied, mode: 'auto' };
      zone.feedback = commandFor(z.id, zone);
      zones[z.id] = zone;
    });
    return { selected: ZONES[0].id, step: 0, zones: zones, log: [] };
  }

  function withZone(state, id, patch) {
    var zones = {};
    Object.keys(state.zones).forEach(function (k) { zones[k] = state.zones[k]; });
    var next = {};
    Object.keys(state.zones[id]).forEach(function (k) { next[k] = state.zones[id][k]; });
    Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
    zones[id] = next;
    return zones;
  }

  function logged(state, zones, entry) {
    var step = state.step + 1;
    entry.step = step;
    return {
      selected: state.selected,
      step: step,
      zones: zones,
      log: [entry].concat(state.log).slice(0, LOG_LIMIT)
    };
  }

  function transition(state, action) {
    if (!action || typeof action.type !== 'string') return state;
    var id = action.zone;
    switch (action.type) {
      case 'SELECT':
        if (!zoneDef(id) || state.selected === id) return state;
        return { selected: id, step: state.step, zones: state.zones, log: state.log };

      case 'SET_OCCUPANCY': {
        if (!zoneDef(id) || typeof action.occupied !== 'boolean') return state;
        if (state.zones[id].occupied === action.occupied) return state;
        var zones = withZone(state, id, { occupied: action.occupied });
        return logged(state, zones, { zone: id, kind: 'occupancy', value: action.occupied, command: commandFor(id, zones[id]) });
      }

      case 'SET_MODE': {
        if (!zoneDef(id) || MODES.indexOf(action.mode) < 0) return state;
        if (state.zones[id].mode === action.mode) return state;
        var z = withZone(state, id, { mode: action.mode });
        return logged(state, z, { zone: id, kind: 'mode', value: action.mode, command: commandFor(id, z[id]) });
      }

      case 'SETTLE': {
        if (!zoneDef(id)) return state;
        var cmd = commandFor(id, state.zones[id]);
        if (state.zones[id].feedback === cmd) return state;
        return { selected: state.selected, step: state.step, zones: withZone(state, id, { feedback: cmd }), log: state.log };
      }

      case 'RESET':
        return initialState();

      default:
        return state;
    }
  }

  function command(state, id) { return commandFor(id, state.zones[id]); }
  function isPending(state, id) { return command(state, id) !== state.zones[id].feedback; }
  function litCount(state) {
    return ZONES.filter(function (z) { return state.zones[z.id].feedback > 0; }).length;
  }
  function advisory(state, id) {
    var z = state.zones[id];
    if (z.mode === 'manual-on' && !z.occupied) return 'Atenție: iluminat pornit manual într-o zonă liberă.';
    if (z.mode === 'manual-off' && z.occupied) return 'Atenție: zonă ocupată cu iluminatul oprit manual.';
    return null;
  }
  function explanation(state, id) {
    var z = state.zones[id];
    var cmd = command(state, id);
    if (z.mode === 'auto') {
      return z.occupied
        ? 'Mod automat: prezență detectată → iluminat ' + cmd + '%.'
        : 'Mod automat: zonă liberă → iluminat oprit.';
    }
    return 'Comandă manuală: are prioritate față de prezență → ' + (cmd > 0 ? 'iluminat ' + cmd + '%.' : 'iluminat oprit.');
  }

  var api = {
    ZONES: ZONES, MODES: MODES, LOG_LIMIT: LOG_LIMIT,
    initialState: initialState, transition: transition,
    command: command, isPending: isPending, litCount: litCount,
    advisory: advisory, explanation: explanation, zoneDef: zoneDef
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LCDemo = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
