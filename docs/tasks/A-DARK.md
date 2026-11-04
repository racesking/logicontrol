# A-DARK — Control identity concept
Status: review

Objective: a reviewable dark identity concept, “Control”, at `exploration/dark/`.
Inputs: root AGENTS.md; exploration/AGENTS.md; [shared brief](../content/stage-a-brief.md); BUILD_PLAN §5B, §6 (dashboard), §7. Base: see STATE active assignments.
Owner: concept agent (isolated worktree). Owned paths: `exploration/dark/`, this file.
Out of scope: gallery, other concepts, STATE/DECISIONS, shared tools, production stack.

Direction: dark and premium, informed by professional building-control workstations: graphite surfaces, calm hierarchy, restrained luminous accents reserved for state, the product interface as the hero. Comfortable body contrast; no cyberpunk, neon glow or decorative telemetry. Reserved fonts: Geist + Geist Mono (or alternatives not used by the other concepts: light reserves Archivo/IBM Plex Mono, mixed reserves Fraunces/Newsreader/Schibsted Grotesk).

Acceptance:
1. All brief deliverables exist; two distinct logo ideas plus monochrome files.
2. Demo follows the shared rules; reset restores initial state; keyboard-only operation works.
3. `node exploration/tools/check.mjs dark/index.html dark/identity.html` passes at 360/768/1440px.
4. Romanian diacritics render from self-hosted fonts; licences recorded.
5. Visibly labelled simulation, illustrative project and prototype form (never claims sending).

Result (branch `cursor/stage-a-dark-control-1c44`, implementation commit 2b03492):
- Paths: `exploration/dark/` (index.html, identity.html, styles.css, demo-core.js, site.js, favicon.svg, README.md, logo/ with 10 SVGs, fonts/ with 4 Geist/Geist Mono latin + latin-ext woff2 files, about 82 KB, and OFL.txt).
- Check script: passes at 360/768/1440 except "broken link ../index.html". The gallery is coordinator-owned and missing on this base. With a temporary gallery stub (not committed), all 6 combinations pass.
- Screenshots reviewed at all widths, then deleted.
- Throwaway Node tests (not committed): the model passes initial state, precedence, advisories, a log bounded to 5 entries numbered by step, determinism and reset. Headless browser: 37 UI checks pass, covering plan and keyboard selection, ~600 ms actuation, instant feedback with reduced motion, reset during actuation, the EN toggle, form validation, the "not sent" message, no URL or storage changes, and latin-ext fonts loaded.
- Limitations: copy is provisional; the floor plan is illustrative; wordmark spacing has not been reviewed by a type designer; plan detail labels are hidden below 560px, where the HTML zone buttons carry the state.
