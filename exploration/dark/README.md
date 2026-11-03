# Concept „Control” (dark)

**Idea.** The brand behaves like a well-made building-control console: layered graphite surfaces, fine 1px borders, panels with clear headers and one warm amber "indicator lamp" used only for state and selection. A calm blue marks advisories and prototype labels. The product interface is the hero: a live overview of the demo floor plan sits next to the headline.

**Files.** `index.html` (homepage, demo, prototype enquiry), `identity.html` (brand sheet), `styles.css`, `demo-core.js` (pure `transition(state, action)` model), `site.js` (UI, RO/EN hero, form), `favicon.svg`, `logo/` (A: constructed monoline wordmark whose i-dot is a setpoint lamp; B: control-key symbol with a command/feedback loop plus a Geist Medium wordmark; colour, light-background and black/white mono files), `fonts/`.

**Palette.** Graphite #0F1113 / #15181B / #1C2024 / #252A2F, line #2D3338, control edge #666F78, text #ECE6DC / #B5AFA5 / #9D978D, lamp #F2B24C, advisory #9DB9DC, error #F0A493. Measured ratios are listed on `identity.html`. All text pairs are ≥ 4.5:1.

**Fonts.** Geist and Geist Mono are variable woff2 files, latin and latin-ext subsets only (≈ 82 KB total). Ș ș Ț ț are present in latin-ext (checked via cmap and in the browser). Licence: SIL OFL 1.1 (`fonts/OFL.txt`). Sources: https://github.com/vercel/geist-font, https://fonts.google.com/specimen/Geist, https://fonts.google.com/specimen/Geist+Mono, https://github.com/google/fonts/tree/main/ofl/geist, https://github.com/google/fonts/tree/main/ofl/geistmono.

**Checks.** `node exploration/tools/check.mjs dark/index.html dark/identity.html` was run and screenshots at 360/768/1440 were reviewed. Demo rules, reset, keyboard operation, reduced motion and the form were checked in a headless browser.

**Limitations.** Copy is provisional. The plan is illustrative, not a real building. The wordmarks have not been optically kerned by a type designer.
