# Interactive demo contracts
Load when implementing models, demos, configurator handoff or their tests.
Status: implementation specification, not working code. UI styling follows the owner's selected identity.

## Common model boundary
Use serialisable readonly TypeScript domain values; no DOM, React hooks, fetch, wall-clock reads or random values in the engine.
- Locale = ro | en. Translation keys are separate from model enums.
- Zone: stable ID, occupancy, temperatureC, setpointC, light command, light feedback.
- BuildingState: schemaVersion, simulationTimeSeconds, zones, bounded alarm/event history and scenario ID.
- Event is a discriminated union: SET_OCCUPANCY, SET_SETPOINT, SET_LIGHT_MODE, ADVANCE, INJECT_FAULT, ACKNOWLEDGE_ALARM, RESET.
- transition(state, event) returns the next state; selectors derive UI values. Commands and measured/feedback state must remain distinguishable.
- clamp/validate physical inputs; reject invalid event payloads. Fixed explicit timestep for ADVANCE; rendering frame rate must not affect results.
- makeInitialState(scenarioId) is deterministic. RESET returns the same initial state and clears history.
- Start with a documented three-zone office fixture. Temperatures/loads are illustrative, not a calibrated building model.
- Stop ticking when paused, offscreen or hidden. Do not fast-forward unbounded elapsed wall-clock time on return. Clean up listeners/timers.
- Model presets/serialized state are versioned and validated; unknown versions reset safely.
- Never persist contact fields. Only nonpersonal configuration choices may use sessionStorage with graceful failure handling.

No global cross-page state library. Each demo owns its React reducer. Reuse core functions and fixtures, not a hidden browser singleton. A dedicated demo uses one root to avoid inconsistent islands. Unmounted/remounted islands must not duplicate clocks.

## Dashboard
Display an SVG floor plan plus accessible HTML zone list. Select a zone, change occupancy, lighting mode or setpoint, then show the command and resulting status.
Manual lighting override and scheduled/occupancy mode have documented precedence. RESET clears overrides.
Model HVAC lag with a simple bounded timestep rule; state its limits. Do not imply instantaneous physical room cooling.
One injectable scenario exposes a mismatch between cooling request and actuator feedback.
Alarm acknowledgement means “seen”, not “fault repaired”; persistent fault remains visible.
Timeline/chart uses bounded state-derived samples and matching text/table summary. Illustrative energy values carry a clear label and assumptions; no savings percentages.

Acceptance:
- Same initial state + same event sequence => same outcome.
- Setpoint clamps, occupancy changes and override precedence behave as specified.
- Acknowledgement does not remove the underlying fault.
- RESET clears injected fault and histories.
- Pause/resume and unmount/remount do not create duplicate updates.
- Controls work by keyboard and communicate selected zone/status without colour alone.

## Fault diagnosis
Finite states: introduction -> investigating -> hypothesis -> resolution -> summary.
Evidence actions reveal room measurement, setpoint, cooling command and actuator feedback; scenario definitions supply consistent evidence.
The initial scenario is an illustrative stuck-closed valve: command requests cooling while feedback remains closed. Do not generalise this evidence to all real installations.
Allow revisiting evidence and revising hypotheses. Feedback explains why an unsupported answer is insufficient. Resolution must be linked to collected evidence.
Reset restarts the scenario. End with troubleshooting-service context and optional enquiry.
Use a typed transition table/reducer; add XState only if state complexity warrants an explicit architecture change.

Acceptance: insufficient evidence cannot produce a confirmed diagnosis; alternate hypotheses receive explanatory feedback; resolution matches scenario; restart works in both languages.

## Configurator
Steps: building context -> systems -> needs -> review.
Data: schemaVersion, buildingType, existingOrNew, selectedSystems, goals, optional existingProtocols, locale.
Use stable enum IDs and translated labels. Existing protocols are user-reported, not verified compatibility.
Allow back/edit without losing valid selections. If a change invalidates dependent fields, explain and clear them.
Output is a scope brief, not an automatic engineering design, binding quotation or feasibility promise.
serializeBrief creates the same semantic summary in either language. Versioned schema validates imported/persisted choices.
CTA pre-fills the enquiry summary for review, with no automatic sending.

Acceptance: validation by step; backward editing; dependent-field changes; RO/EN parity; invalid/corrupt persisted data; reset; reviewed handoff; no contact data in URL or storage.

## Verification ownership
Core owner supplies fixture, event/schema contracts and model tests before demo agents branch.
Each demo agent owns its UI/behavior tests. Integration owner tests routing, locale, reduced motion and enquiry handoff.
Use Vitest for pure state; Testing Library for controls; Playwright for built-site flows. Avoid snapshot-only tests of engineering behavior.
