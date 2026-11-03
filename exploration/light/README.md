# Concept A — Signal (light)

**Idea.** The site is a set of drawing sheets: visible 12-column grid, numbered sheets (A-00…05), dimension chains, level markers and a title block. Very wide, heavy Archivo gives "Control clar" poster weight; IBM Plex Mono annotates. Warm paper, near-black ink, one signal orange for action and state. Logo A cuts the shared "c" of Logi**c**ontrol where "Logic" becomes "control"; logo B draws L and C as plan walls with a door swing.

**Files.** `index.html` (homepage, demo, prototype form), `identity.html` (brand sheet), `css/signal.css`, `js/demo.js` (pure `transition(state, action)` + DOM layer), `js/site.js` (menu, RO/EN hero, form), `logo/` (A and B: colour, reverse, mono black/white; B mark), `favicon.svg`, `fonts/`.

**Palette.** Paper #F4F1EA, sheet #FBFAF7, tint #E9E4D8, rule #BDB6A6, ink #161513, ink-2 #4D4A43, ink-3 #6B675E, signal #F04A14 (graphics/CTA fill only, 3.27:1 on paper), signal-text #B53308 (5.41:1), signal-tint #FBE2D5. Full measured table on `identity.html`.

**Fonts.** Archivo (Omnibus-Type) variable wdth 62–125 / wght 100–900, IBM Plex Mono 400/500 (IBM). SIL OFL 1.1, licences in `fonts/`. Source: Google Fonts CSS2 API, latin + latin-ext woff2 only (≈233 KB), self-hosted. Upstream: github.com/Omnibus-Type/Archivo, github.com/IBM/plex.

**Checks.** `node exploration/tools/check.mjs light/index.html light/identity.html` passes at 360/768/1440 (gallery present); screenshots reviewed. Scripted tests of the transition function and of the demo/form in headless Chrome (timing, reduced motion, reset, advisories, validation, no URL/storage use).

**Limitations.** Plan zones respond to pointer clicks only; the keyboard and screen-reader path is the HTML zone list, and the SVG is `aria-hidden`. Plan dimensions are illustrative. Copy is provisional.
