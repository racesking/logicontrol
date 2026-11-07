# Logicontrol project memory

Handoff file for any AI model or developer continuing this work. Read this first, then `PRODUCT.md`. Last updated 2026-11-07. Treat it as a starting point and check the code before relying on it.

## What this is
A design prototype of the website for Logicontrol, a Romanian firm doing BMS, HVAC automation and software. The owner (Razvan) is judging look and flow. It is not yet a lead funnel, and it is not launched.

- Branch: `design-from-scratch`, an orphan branch with no shared history with `main`.
- Latest Phase 1 commit: `55a4ce8`. Nothing has been pushed.
- Stack: Vite + three.js 0.187, plain JS, no framework.
- Run: `npx vite --port 8137 --strictPort --host 127.0.0.1`, then open http://localhost:8137. The test scripts assume port 8137.
- Build: `npm run build`.

## How to work with this owner
- Writes short, visual notes, often with a screenshot. Read the screenshot closely.
- Prefers multiple-choice questions, and a recommendation over a survey of options.
- Wants real engineering accuracy. Hates visual noise: "too in your face" and "annoying" were both about cable motion.
- Commit or push only when asked. Never invent customers, projects, numbers or certifications.
- Label simulations. All dashboard, home and trend data is invented and says so on screen.
- Look at rendered output, not just test results. Passing tests have hidden real visual bugs here.

## The page: one scroll journey, about 8.45 screens
Scroll position `u` is measured in screens. `timeline()` in `src/scene/stage.js` holds all the timing.

| Chapter | Stop | What happens |
|---|---|---|
| Început | u 0 | Hero: pipes photo, headline, service index. Hovering a row swaps the photo; clicking goes to that service's demo |
| (cables) | u 0.8–2.2 | Loose cables sort onto perforated trays. Three captions appear |
| Tablou | u 3.4 | Cabinet has risen from below, cables enter its roof gland at 90°, it powers on |
| Panou | u 5.5 | Slides left; light BMS dashboard (Clădire, CTA, Tendințe, Reglaje, Alarme). Prompt invites a first command |
| Acasă | u 7.85 | Dashboard narrows into a phone. The wall becomes the back of a see-through house with a yard. Phone commands the house |

Left rail shows the four chapters. An "Urmează" pill appears when scrolling stops, and at the dashboard it waits for a first command or 6 seconds.

## Core idea
A person commands a real process. The request leaves, the equipment answers, then the measurement proves it. Never show a request as a result. On the phone, a command travels as an amber pulse down the room's cable before the room changes.

## Files
- `index.html`: page structure.
- `src/main.js`: frame loop, rail, cue, captions.
- `src/hero.js`: service index. `src/assistant.js`: scripted assistant.
- `src/scene/`: `stage.js` (camera, timeline, render quality), `cables.js`, `cabinet.js`, `wall.js` (concrete, trays), `house.js`, `yard.js`, `textures.js`.
- `src/dashboard/`: `panel.js`, `model.js` (building), `plant.js` (AHU, heat pump), `ahu.js`, `xray.js`, `trends.js`, `journal.js` (alarms), `phone.js`, `homeModel.js`.
- `src/styles/`: `site.css`, `dashboard.css`.
- `PRODUCT.md`: product truth and rules. `.impeccable/surfaces/index-html.md`: direction contract.
- `tools/checks/`: browser tests, see below.

## Decisions that are settled
Do not reopen these unless the owner does.
- Keep: Logo B, dark surfaces, amber accent, Geist, engineering photography.
- Cabinet stays pure three.js. Blender is a fallback only if the owner reopens realism. The industrial cabinet stays in the house.
- Dashboard is a light panel, structured like the owner's own BMS. Reuse the look only.
- Hero uses the service index. The owner replaced the earlier dial, and before that the card.
- Assistant is a purple circle with a sparkle, spinning ring on hover. Owner's request. It is a scripted demo and says so; a real model needs a server.
- Wall drawings were removed at the owner's request. Cables are calm drapes, not chaos. Walls are see-through.
- Render rule: quality may drop only while moving. At rest it returns to full, with 2x supersampling on normal screens.
- Phone is a generic modern shape. No Apple name or logo.

## Hard rules for the public repo
- `.claude/` is gitignored and holds the owner's real BMS screenshots in `.claude/references/`. They show real company and building names. Never commit them, and never copy names, rooms, logos or values from them.
- The owner's other reference screenshots are third-party. Use the look only.
- Siemens and Schneider may be named at most once, as equipment the firm programs. No partner claim, no logo wall.
- Four hero backgrounds are Unsplash stock, not the firm's work. The footer credits two photographers; confirm that covers all four before publishing. `cabinet.jpg` is our own render.

## Technical traps already hit
- `GTAOPass` ignores clipping and transparency. Hide such objects with `userData.noAO`; `stage.js` patches `_overrideVisibility`.
- `[data-act]` and `[data-view]` names repeat across the dashboard, phone and hero. Scope selectors, in tests too.
- Screenshot clips use page coordinates, so add `scrollY`.
- Headless Chrome runs on the Intel GPU. The RTX 3050 Ti has never been measured, and frame counters are unreliable at high pixel density.
- Long inline shell heredocs get truncated. Put patch scripts in files.
- The narrow layout has no fixed scroll stops; the phone's position drives the house.

## Testing
From `tools/checks/`, with the dev server on port 8137:
- `node flow7.mjs <output-folder>`: rail, cue, prompt, closing line, assistant in the house, and a screenshot set.
- `node flow6.mjs`: phone commands. `node flow4.mjs`: dashboard views and alarms. `node flow3.mjs`: AHU. `node flow5.mjs`: service index.
- `node sweep.mjs`: cable ends, bends and gland landing. `node stk.mjs`: narrow layout. `node perf.mjs 1440 900`: frame rates. `node res.mjs <prefix> 1 2`: render resolution.
- `node shot.mjs 1440 900 <prefix> <u...>`: screenshots at scroll positions.

`flow5.mjs` needs a target path argument only to recapture `cabinet.jpg`. `.impeccable/critique/` holds the latest review, which is gitignored.

## Status
Done: homepage journey, review (21/32 before Phase 1), and Phase 1 fixes. All browser tests passed at `55a4ce8`, and the Impeccable detector was clean.

Next: **Phase 2**, real multi-page routing, shared header and footer, a "for a house / for a building" switch, and 3D that loads only when its moment comes into view. The menu links do nothing yet.

**Phase 3**, the five pages. Each is fast and readable in the same dark world, with one signature moment. Build Discuție first, then BMS, HVAC, Software, and Lucrări when material arrives.

| Page | Signature moment | Notes |
|---|---|---|
| BMS | X-ray view switching between house and building | Name Siemens and Schneider here, once |
| HVAC | AHU cutaway: click a part to learn what it does | House and building paths |
| Software | Press a button and watch the signal run from screen to program to output | Needs the owner's real protocols first |
| Lucrări | Before-and-after slider on real photos | Owner has real projects. Labelled placeholders until then |
| Discuție | Each choice adds a breaker to a small panel, becoming the summary | Guided brief, review before sending, no budget question. Sending waits for a real destination |

Each of BMS, HVAC and Software splits by need inside the page: "for a house" and "for a building".

Still open:
- Phone tuning, Impeccable's final review, and `DESIGN.md`.
- From the owner: protocols and platforms, project material with publishing permission, legal name, contact details, domain, enquiry destination, English.
- Are security and blinds real services or demo only? They are on the phone but not in the stated services.
- Whether the Unsplash credit covers all photos.

## Older material
- Branch `impeccable-design`: the earlier preview, plus `AGENTS.md`, `docs/` (decisions D01–D24, research) and the Dark Control assets.
- That branch also has one stash with the old hero rewrite. It is superseded, so keep it but ignore it.
- Decisions there about air-and-heat messaging, Astro and the CMS were dropped or deferred for this prototype.
