/* Illustrative winter-morning bedroom. Pure transition(state, action).
   No DOM, timers, clock or randomness.
   co2 and heatKept are fixed teaching numbers, not a measurement,
   a bill reduction, or a sized ventilation design. */
(function (root) {
  'use strict';

  var WAYS = {
    closed: { id: 'closed', co2: 1800, heatKept: 100, fresh: false, moistureStays: true },
    tilted: { id: 'tilted', co2: 700, heatKept: 40, fresh: true, moistureStays: false },
    recovery: { id: 'recovery', co2: 850, heatKept: 75, fresh: true, moistureStays: false }
  };
  var LOG_LIMIT = 5;

  function initialState() {
    return { way: 'closed', step: 0, log: [] };
  }

  function transition(state, action) {
    if (!action || typeof action.type !== 'string') return state;
    if (action.type === 'RESET') return initialState();
    if (action.type !== 'SET_WAY') return state;
    var way = WAYS[action.way];
    if (!way || state.way === way.id) return state;
    var step = state.step + 1;
    return {
      way: way.id,
      step: step,
      log: [{ step: step, way: way.id }].concat(state.log).slice(0, LOG_LIMIT)
    };
  }

  function facts(state) {
    return WAYS[state.way];
  }

  root.LCAir = {
    WAYS: WAYS,
    LOG_LIMIT: LOG_LIMIT,
    initialState: initialState,
    transition: transition,
    facts: facts
  };
})(typeof window !== 'undefined' ? window : globalThis);
