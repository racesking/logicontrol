# A-REVIEW — Comparison gallery and integration
Status: done

Objective: one gallery page where the owner can open and compare all three concepts.
Inputs: the three concept task results; [shared brief](../content/stage-a-brief.md).
Owner: coordinator. Owned paths: `exploration/index.html`, `exploration/README.md`, `exploration/tools/`, `exploration/screenshots/`, `docs/reviews/`, `docs/tasks/`, STATE/DECISIONS/CHANGES.
Out of scope: picking the final identity; production scaffold; deployment.

Acceptance:
1. `exploration/index.html` links every concept homepage and identity sheet; links work under `/logicontrol/`.
2. Screenshots at 360/768/1440px for every concept page, inspected by the coordinator.
3. `node exploration/tools/check.mjs` passes for all pages, or remaining failures are reported.
4. Review notes compare concepts on the same criteria and give a recommendation with tradeoffs.
5. Local preview instructions documented.

Result: The gallery `exploration/index.html` links every concept homepage and identity sheet, with screenshots, logo options, a comparison table and a recommendation. Review notes are in [stage-a-identity-review.md](../reviews/stage-a-identity-review.md).
- Checks: `node exploration/tools/check.mjs --shots` passes for all 7 pages at 360/768/1440px under `/logicontrol/`. A cross-concept demo/form test passes 14/14 per concept.
- Not verified: screen readers, Safari/Firefox, real devices.
- Next: owner selects or refines an identity, then the coordinator records it in DECISIONS.
