/* Deterministic state for the "Iluminat și prezență" mini-demo.
   reduce(state, action) is pure: same inputs, same output, no clock or randomness. */
(function (root) {
  'use strict';

  var ZONES = [
    { id: 'receptie', name: 'Recepție', preset: 70, occupied: true, mode: 'auto' },
    { id: 'open-space', name: 'Birouri open space', preset: 80, occupied: true, mode: 'auto' },
    { id: 'sala-sedinte', name: 'Sală de ședințe', preset: 60, occupied: false, mode: 'auto' }
  ];
  var MODE_LABEL = { auto: 'Automat (prezență)', on: 'Manual: pornit', off: 'Manual: oprit' };
  var LOG_LIMIT = 5;

  function zoneDef(id) {
    for (var i = 0; i < ZONES.length; i++) if (ZONES[i].id === id) return ZONES[i];
    return null;
  }

  function commandFor(id, z) {
    var def = zoneDef(id);
    if (z.mode === 'on') return def.preset;
    if (z.mode === 'off') return 0;
    return z.occupied ? def.preset : 0;
  }

  function initialState() {
    var zones = {};
    ZONES.forEach(function (d) {
      var z = { occupied: d.occupied, mode: d.mode, confirmed: 0 };
      z.confirmed = commandFor(d.id, z);
      zones[d.id] = z;
    });
    return { selected: ZONES[0].id, step: 0, zones: zones, log: [], notice: null };
  }

  function withZone(state, id, patch) {
    var zones = {};
    Object.keys(state.zones).forEach(function (k) {
      zones[k] = k === id ? Object.assign({}, state.zones[k], patch) : state.zones[k];
    });
    return zones;
  }

  function levelText(v) { return v > 0 ? v + '%' : '0% (oprit)'; }

  function pushLog(log, entry) {
    var next = log.concat([entry]);
    return next.length > LOG_LIMIT ? next.slice(next.length - LOG_LIMIT) : next;
  }

  function reduce(state, action) {
    var id = action.zone;
    switch (action.type) {
      case 'select':
        if (!zoneDef(id) || state.selected === id) return state;
        return Object.assign({}, state, { selected: id, notice: null });

      case 'occupancy': {
        var z = state.zones[id];
        if (!z || z.occupied === action.occupied) return state;
        var zones = withZone(state, id, { occupied: action.occupied });
        var step = state.step + 1;
        var cmd = commandFor(id, zones[id]);
        return Object.assign({}, state, {
          selected: id, step: step, zones: zones, notice: null,
          log: pushLog(state.log, {
            step: step,
            text: zoneDef(id).name + ': ' + (action.occupied ? 'prezență detectată' : 'zonă liberă') + ' → comandă ' + levelText(cmd)
          })
        });
      }

      case 'mode': {
        var zm = state.zones[id];
        if (!zm || !MODE_LABEL[action.mode] || zm.mode === action.mode) return state;
        var zonesM = withZone(state, id, { mode: action.mode });
        var stepM = state.step + 1;
        var cmdM = commandFor(id, zonesM[id]);
        return Object.assign({}, state, {
          selected: id, step: stepM, zones: zonesM, notice: null,
          log: pushLog(state.log, {
            step: stepM,
            text: zoneDef(id).name + ': ' + MODE_LABEL[action.mode] + ' → comandă ' + levelText(cmdM)
          })
        });
      }

      case 'confirm': {
        var zc = state.zones[id];
        if (!zc) return state;
        var target = commandFor(id, zc);
        if (zc.confirmed === target) return state;
        return Object.assign({}, state, { zones: withZone(state, id, { confirmed: target }) });
      }

      case 'reset': {
        var fresh = initialState();
        fresh.notice = 'reset';
        return fresh;
      }

      default:
        return state;
    }
  }

  function isPending(state, id) {
    return state.zones[id].confirmed !== commandFor(id, state.zones[id]);
  }

  function explain(state, id) {
    var z = state.zones[id], def = zoneDef(id);
    if (z.mode === 'on') return 'Comandă manuală: are prioritate față de prezență → iluminat ' + def.preset + '%.';
    if (z.mode === 'off') return 'Comandă manuală: are prioritate față de prezență → iluminat oprit.';
    return z.occupied
      ? 'Mod automat: prezență detectată → iluminat ' + def.preset + '%.'
      : 'Mod automat: zonă liberă → iluminat oprit.';
  }

  function advisory(state, id) {
    var z = state.zones[id];
    if (z.mode === 'on' && !z.occupied) return 'Atenție: iluminat pornit manual într-o zonă liberă.';
    if (z.mode === 'off' && z.occupied) return 'Atenție: zonă ocupată cu iluminatul oprit manual.';
    return null;
  }

  function litCount(state) {
    return ZONES.filter(function (d) { return state.zones[d.id].confirmed > 0; }).length;
  }

  function summary(state) {
    return 'Zone iluminate: ' + litCount(state) + ' din ' + ZONES.length;
  }

  var api = {
    ZONES: ZONES, MODE_LABEL: MODE_LABEL, LOG_LIMIT: LOG_LIMIT,
    initialState: initialState, reduce: reduce, commandFor: commandFor, zoneDef: zoneDef,
    isPending: isPending, explain: explain, advisory: advisory, litCount: litCount, summary: summary
  };
  root.LogicontrolDemo = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
