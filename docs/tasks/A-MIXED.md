# A-MIXED — Current identity concept
Status: review

Objective: a reviewable mixed identity concept, “Current”, at `exploration/mixed/`.
Inputs: root AGENTS.md; exploration/AGENTS.md; [shared brief](../content/stage-a-brief.md); BUILD_PLAN §5C, §6 (dashboard), §7. Base: see STATE active assignments.
Owner: concept agent (isolated worktree). Owned paths: `exploration/mixed/`, this file.
Out of scope: gallery, other concepts, STATE/DECISIONS, shared tools, production stack.

Direction: expressive editorial light sections (magazine-like typographic scale and rhythm) that transition into immersive full-bleed dark interactive sections. A recurring “current/flow” motif connects sections and explains systems working together; controlled motion that stops for reduced motion. Reserved fonts: Fraunces or Newsreader + Schibsted Grotesk (light reserves Archivo/IBM Plex Mono, dark reserves Geist).

Acceptance:
1. All brief deliverables exist; two distinct logo ideas plus monochrome files.
2. Demo follows the shared rules; reset restores initial state; keyboard-only operation works.
3. `node exploration/tools/check.mjs mixed/index.html mixed/identity.html` passes at 360/768/1440px.
4. Romanian diacritics render from self-hosted fonts; licences recorded.
5. Visibly labelled simulation, illustrative project and prototype form (never claims sending).

Result:
- Paths: `exploration/mixed/` (index.html, identity.html, README.md, css/, js/, logo/, fonts/, favicon.svg), this file.
- Commits: 514d9a9 and f926066 on `cursor/mixed-current-concept-90bc`. That branch also carries b4abcd5 and 1f14b56, which other agents committed in the shared `/workspace` checkout. The same mixed/ tree is a single commit on 1828751 in `cursor/mixed-current-concept-clean-90bc`; use that one for integration.
- Checks: `check.mjs mixed/index.html mixed/identity.html` reports all ok at 360/768/1440. `--shots` captures were reviewed and then deleted. Headless runs covered: demo precedence, ~600 ms pending state, both advisories, log capped at 5 and numbered by step, reset; reduced motion (immediate confirmation, static line); the form (errors, focus, step 2, exact "not sent" message, URL and storage untouched); the RO/EN hero toggle. Chrome reports Ă Â Î Ș Ț render from the self-hosted fonts.
- Limitations: copy is provisional. Plan labels are small at 360px (the HTML panel repeats the state). Logos are proposals only.
