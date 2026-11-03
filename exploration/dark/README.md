# Control — public preview

Dark visual system, Logo B. The page is about air in a home and heat lost while airing, for people in a house and for an automation project. It is an unindexed preview, not the production site.

**Open.** `index.html` (Romanian) and `en.html`. Identity sheet: `identity.html`.

**Demonstration.** `demo-core.js` is a pure `transition(state, action)` for one winter morning: shut window, tilted window, or heat-recovery principle. `site.js` renders it and the prototype enquiry. Figures are illustrative. The form does not send.

**From the repository root**

```bash
python3 -m http.server 8000
# http://127.0.0.1:8000/exploration/dark/
```

```bash
node exploration/tools/check.mjs dark/index.html dark/en.html dark/identity.html
```
