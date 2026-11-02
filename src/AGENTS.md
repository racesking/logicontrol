# Website implementation
Scope: src/ and descendants. This file does not imply an app already exists.
Before foundation work, confirm identity selection in DECISIONS and architecture status in STATE.
Read BUILD_PLAN sections 2, 3, 6 and 7 for the relevant feature.

- Use agreed tokens and shared contracts. Inspect actual scripts/configuration before selecting commands.
- Keep content separate from rendering; validate schemas. Provide equivalent Romanian/English routes and preserve locale across navigation.
- Lazy-load demo code; use lightweight SVG/CSS unless heavier rendering has demonstrated value.
- Simulations are deterministic, resettable and visibly labelled. No real device access or random numbers masquerading as live telemetry.
- Dashboard: explain changes to occupancy/lighting/climate and alarms.
- Diagnosis: evidence should justify the cause, not simply reward clicking a guessed answer.
- Configurator: editable scope summary, no fictional pricing or guaranteed compatibility/savings.
- Keep direct contact available without demo completion.
- Implement real error/success states only against a configured submission endpoint. Never expose secrets; static hosting cannot run confidential server code.
- CMS is complete only when the agreed editor workflow works; Markdown files alone do not satisfy it.
- Verify behavioral changes with targeted tests: reset/state transitions, validation, locale, submission success/failure and base-path navigation.
- Review visuals at mobile/tablet/desktop widths, keyboard navigation, contrast and reduced motion.
- No fabricated testimonials/certifications/projects, inaccessible canvas-only controls, unapproved trackers or hard-coded production domain.
