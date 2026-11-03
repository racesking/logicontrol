# Current — mixed light/dark concept

**Idea.** The homepage reads like an editorial feature. Warm paper sections (hero, services, about, contact) use big Fraunces display type. The page then dims in stepped bands, "like a building after hours", into deep-ink sections for system content (project, demo), and returns to light. One continuous "current" line ties it together: it underlines the H1, runs through each service node, becomes the lighting circuit in the demo (command out, confirmation back) and ends at Contact. It is drawn as you scroll, and drawn static under `prefers-reduced-motion`.

**Files.** `index.html` (homepage), `identity.html` (brand sheet), `css/current.css`, `js/demo-core.js` (pure `reduce(state, action)`), `js/demo.js`, `js/current.js` (line + RO/EN), `js/enquiry.js`, `logo/` (A, B, mono, dark and white variants, B symbol), `favicon.svg`, `fonts/`.

**Palette.** Paper `#F4EFE6`, paper-deep `#E8E0D1`, ink `#17142B`, ink-muted `#57516B`, night `#110F24`, night-raised `#1C1936`, current `#2A36E8` (light), current-bright `#8F99FF` (dark), lit `#FBF1D9`, caution `#F5A6B6`, error `#A8203E`. The ratios are on `identity.html`; every text pair is ≥ 5.7:1.

**Fonts.** Fraunces (opsz, wght and SOFT axes) and Schibsted Grotesk, both SIL OFL 1.1, self-hosted woff2 (latin + latin-ext, ~294 KB). Source: Google Fonts CSS2 API; licences are in `fonts/OFL-*.txt`. Upstream: github.com/undercasetype/Fraunces and github.com/schibsted/schibsted-grotesk.

**Checks.** `node exploration/tools/check.mjs mixed/index.html mixed/identity.html` reports all ok at 360/768/1440. Screenshots were reviewed. Demo, form, EN toggle and reduced motion were exercised headlessly. Chrome reports that ș ț render from the custom fonts.

**Limitations.** Copy is provisional. The plan's labels are small at 360px (the same state is in the HTML panel). Logos are proposals, not final artwork.
