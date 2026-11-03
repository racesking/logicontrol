# A-LIGHT — Signal identity concept
Status: done. Integrated in merge commit d774075 (2026-11-03). The coordinator re-ran check.mjs (all pass) and the cross-concept demo/form test (14/14 pass).

Objective: a reviewable light identity concept, “Signal”, at `exploration/light/`.
Inputs: root AGENTS.md; exploration/AGENTS.md; [shared brief](../content/stage-a-brief.md); BUILD_PLAN §5A, §6 (dashboard), §7. Base: see STATE active assignments.
Owner: concept agent (isolated worktree). Owned paths: `exploration/light/`, this file.
Out of scope: gallery, other concepts, STATE/DECISIONS, shared tools, production stack.

Direction: light and architectural. Bold, large typography on precise grids; technical-drawing graphics (plan views, dimension lines, section markers) used to explain, not decorate. Energetic warm signal accent on bright neutral surfaces. Reserved fonts for this concept: Archivo + IBM Plex Mono (or alternatives not used by the other concepts: dark reserves Geist family, mixed reserves Fraunces/Newsreader/Schibsted Grotesk).

Acceptance:
1. All brief deliverables exist; two distinct logo ideas plus monochrome files.
2. Demo follows the shared rules; reset restores initial state; keyboard-only operation works.
3. `node exploration/tools/check.mjs light/index.html light/identity.html` passes at 360/768/1440px.
4. Romanian diacritics render from self-hosted fonts; licences recorded.
5. Visibly labelled simulation, illustrative project and prototype form (never claims sending).

Result (branch `cursor/stage-a-light-signal-a257`, base 1828751; content through dcd906e):
- Paths: `exploration/light/` — `index.html`, `identity.html`, `README.md`, `css/signal.css`, `js/demo.js`, `js/site.js`, `favicon.svg`, `logo/` (A and B in colour, reverse, mono black and mono white, plus the B mark), `fonts/` (6 woff2 files, ≈233 KB, and 2 OFL licences).
- Checks: `node exploration/tools/check.mjs [--shots] light/index.html light/identity.html` gives "All checks passed" at 360/768/1440. That run had the coordinator's gallery temporarily present; without it the only failure is the `../index.html` 404. Screenshots were reviewed at every width and are not committed. A throwaway Node test of `transition()` passed, covering presets, precedence, advisories, the 5-entry log, no-ops, determinism and reset. A headless Chrome run passed for the 600 ms pending/confirm sequence, reduced motion (immediate), reset during pending, the RO/EN hero, two-step validation and the not-sent message, with the URL unchanged and no storage used.
- Limitations: plan zones respond to pointer clicks only, and the SVG is `aria-hidden`; the HTML zone list is the keyboard and screen-reader path. Dimensions are illustrative and the copy is provisional.
- Note for the coordinator: commit b4abcd5 (A-STRATEGY) swept up byte-identical copies of `exploration/light/fonts/*`, so this branch's fonts will merge cleanly.
