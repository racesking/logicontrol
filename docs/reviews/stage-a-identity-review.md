# Stage A identity review
Date: 2026-11-03. Reviewer: coordinator. Gallery: `exploration/index.html`. Status: awaiting owner selection.

## Concepts
| | Signal (light) | Control (dark) | Current (mixed) |
|---|---|---|---|
| Idea | Technical drawing sheets: grid, numbered sheets, cross-section hero, hatched plan demo | Operator console: graphite panels, amber lamp for state only, live plan as hero | Editorial feature that dims into violet “after-hours” system sections; one ultramarine line threads the page |
| Logo A | Shared “c” split between Logic and control | Lowercase monoline, i-dot as setpoint lamp | Serif wordmark, i-stem becomes underline |
| Logo B | L and C as plan walls with door swing | Control key holding a command/feedback loop | Single stroke: C above, L below |
| Type | Archivo + IBM Plex Mono | Geist + Geist Mono | Fraunces + Schibsted Grotesk |
| Fonts | OFL, 240 KB | OFL, 92 KB | OFL, 296 KB |

All three use the shared brief (`docs/content/stage-a-brief.md`): identical copy, illustrative project card, About placeholder, two-step prototype enquiry and simulated three-zone lighting demo.

## Originality and quality critique
- No house, lightning, bulb or circuit marks; no fake telemetry. Each concept's visible values come from the demo state only.
- Signal is the most ownable relative to the seven reviewed competitors (see `docs/research/competitors-2026-11.md`), which mostly use stock imagery and blue/green palettes.
- Control is the most product-credible, but its lowercase geometric wordmark is the least distinctive mark of the six.
- Current is the most premium, but Logo A thins out at 24px, and its page-spanning line is the costliest to keep working with CMS-edited content.
- None of the wordmarks has been reviewed by a type designer; trademark and domain clearance have not been done.

## Recommendation (proposal)
Signal as the base, with production demos presented on dark control-surface panels inside the light site. Tradeoffs: the wide headline needs tuning for long words; drawing devices must stay functional; the orange accent must be used sparingly. Choose Control if the demos and monitoring should lead; choose Current if an editorial voice outweighs build simplicity.

## Verification
- `node exploration/tools/check.mjs --shots`: all 7 pages pass at 360/768/1440px (overflow, console errors, failed requests, relative URLs, noindex, internal links, visible focus over 60 tab stops). Screenshots: `exploration/screenshots/`, inspected at desktop and mobile widths.
- Throwaway headless test (not committed), same 14 checks per concept, all pass: simulated label, initial summary, select zone, manual override, pending state, advisory, summary update, reset, advisory cleared, EN hero with `lang`, “not sent” message present, no success claim, no cedilla ş/ţ.
- Measured contrast: Signal primary CTA ink on orange is 4.95:1. Agents list their full palette ratios on each identity sheet.
- Not verified: screen-reader output, real devices or Safari/Firefox, Windows font rendering, print, performance budgets.
