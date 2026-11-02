# Logicontrol: identity and website delivery plan

Status: agreed business brief; proposed implementation architecture. Identity not selected.
Repository: https://github.com/racesking/logicontrol
Initial inspection: main contains README.md only. This document does not launch agents or deploy a site.

## 1. Agreed brief

- Working brand: Logicontrol. Domain/trademark clearance remains unresolved; do not claim it is cleared.
- Market: commercial building owners and managers across Romania. Contractors are a secondary audience.
- Services: BMS troubleshooting, integration, monitoring, maintenance, assessments, consulting, programming and commissioning. Do not imply full electrical installation capability or certifications without confirmation.
- Company-led presentation, personal founder About section.
- Romanian and English at launch; Romanian is the primary language.
- Premium, technologically advanced, bold identity. Compare genuinely different light, dark and mixed visual directions.
- Explore identity first. The owner selects a direction before full website implementation.
- Real project photographs and details will be supplied. Do not invent projects, clients, testimonials, metrics, certifications, staff or contact details.
- Final website: editable content and three interactive experiences: building dashboard, fault diagnosis and building configurator.
- Quality first, staged launch; no fixed deadline.
- Initially requested hosting: GitHub Pages. Keep portable static output and /logicontrol/ base-path support. Check suitability before commercial launch.

## 2. Positioning and conversion hypothesis

Make the service understandable: investigate unreliable building controls, connect systems, and maintain them with clear documentation.

Proposed primary CTA: “Discută proiectul” / “Discuss your project”.
Secondary CTA: “Explorează demonstrația” / “Explore the demo”.
The primary enquiry path must remain available without completing any demo.

This is a hypothesis, not a proven highest-converting approach. Before final copy, the strategy agent should compare 5–8 relevant Romanian integrator sites, record dated primary-source URLs, assess their enquiry flows, and explain the chosen friction/trust tradeoff. No invented conversion benchmarks.

Enquiry flow:
1. Building type, county/city and need (existing fault, modernisation, new integration, maintenance).
2. Short description and preferred contact method; name and contact detail.
3. Clear confirmation only after a real successful submission.
Keep optional fields optional. Do not ask for an obligatory budget before first contact.
Later, configurator selections can prefill this brief, with user review before submission.
Track completed enquiries and qualified opportunities, not just demo clicks.
Do not activate analytics or third-party submission until configured with appropriate privacy information.

## 3. Proposed architecture

Recommended for validation: Astro static pages + TypeScript + React islands for the demos; CSS custom properties for the selected design system. This supports fast content pages and richer client-side interactions without making the whole site an application.

- Routes: /ro/ and /en/ with equivalent page links; root leads clearly to Romanian.
- Structured, validated content collections for services and projects.
- CMS requirement: first define content schemas; select a Git-backed or headless editor after checking authoring, authentication and cost. Markdown alone is an intermediate authoring method, not fulfilment of the requested CMS.
- Static hosting cannot provide a server-side form handler or confidential CMS authentication. Put submission behind an adapter; later connect an approved hosted endpoint or serverless service. Never embed secrets in client code.
- Build-time content and browser-only simulations initially. No actual BMS access.
- Store base URL centrally; test /logicontrol/ and root deployments.
- Pin dependencies and commit the lockfile when scaffolding; inspect current official documentation rather than assuming versions.
- Avoid a WebGL-heavy homepage by default. Use SVG, CSS and lightweight interactions unless a prototype proves that 3D adds customer value.
- No payments, customer portal or actual equipment control in scope.

Hosting note: GitHub Pages documentation restricts running an online business and sites primarily facilitating commercial transactions. Treat it as a potential design/demo preview, not an assumed permanent commercial lead-generation host. Review current terms and recommend suitable production hosting before launch; do not deploy automatically.

## 4. Agent orchestration

Cursor agents must use isolated branches/worktrees. A coordinator owns shared configuration, dependencies and integration. Do not launch multiple agents that edit shared files in the same checkout.

| Stage | Agent | Ownership | Completion evidence |
| --- | --- | --- | --- |
| A | Coordinator | Read brief, inspect repository, prepare isolated assignments | Task list, branches, file boundaries, unresolved decisions |
| A | Strategy | docs/research/ and docs/content/ | Competitor review, sitemap, CTA rationale, bilingual content outline |
| A | Identity light | exploration/light/ | Logo explorations, palette, type, hero, project card, demo shell |
| A | Identity dark | exploration/dark/ | Same comparable deliverables |
| A | Identity mixed | exploration/mixed/ | Same comparable deliverables |
| A | Reviewer/coordinator | exploration/index.html and docs/reviews/ | Comparison gallery, screenshots, accessibility and originality critique |
| Gate | Owner | Select or refine one identity | Recorded choice; full build waits |
| B | Foundation | Shared app, dependencies, tokens, routes, schemas | Static build, base-path test, reusable components |
| C | Website/content | Marketing pages, bilingual content, CMS integration | Responsive pages, editing workflow, real evidence or explicit placeholders |
| C | Demo dashboard | Isolated dashboard module | Working state model, keyboard controls and tests |
| C | Demo diagnosis | Isolated scenario module | Reproducible fault, useful checks, justified diagnosis |
| C | Demo configurator | Isolated brief-builder module | Validated selections, editable enquiry summary |
| D | Integration/QA | Cross-feature integration and deployment preparation | Build/tests, screenshots, link checks, form verification, launch checklist |

Stages A strategy and identity work can run in parallel after the brief is loaded.
Stage B precedes C: define shared types and component contracts before parallel feature work.
One agent owns shared package/configuration changes; others request them from the coordinator.
Use at most three active design/feature agents initially to keep review and merge work manageable.
These are Cursor roles, not claims that agents are currently running.

Each task handoff must include:
- Branch and commit
- Files changed and concise rationale
- Commands run and actual results
- Screenshots at desktop and mobile sizes
- Open questions, limitations and unimplemented items
- Next task recommended
Do not report tests as passed unless run. Commit valuable work before worktree cleanup.

## 5. Three identity directions

These are briefs, not a predetermined visual decision. Each must explore a distinct composition and brand idea, not just a theme toggle.

### A. Signal — light
Bright architectural surfaces, bold dark typography, an energetic accent, precise signal/connection graphics. Emphasise understandable engineering and confidence.

### B. Control — dark
Graphite, restrained luminous accents, a distinctive wordmark and a convincing building-control interface. Keep body copy comfortably readable. Avoid generic cyberpunk styling.

### C. Current — mixed
Editorial light service sections transitioning into immersive dark demo sections. Explore rhythmic flow and controlled motion to communicate systems working together.

Each direction must include:
- Two original editable SVG logo/wordmark proposals, including a monochrome version
- Palette with semantic roles and contrast measurements
- Font pairing with Romanian diacritics and licence/source details
- The same Romanian hero message, primary CTA, service card and project card
- A comparable mini building-dashboard treatment
- Desktop and mobile layouts
- A short explanation of what makes it recognisable as Logicontrol
Avoid stock lightning-bolt-in-a-house symbols, copied competitor logos, random circuitry decoration, and unsubstantiated “AI-powered” claims.

## 6. Demo specifications

All experiences must say “Demonstrație simulată” / “Simulated demonstration” in the interface.
Use deterministic, resettable state. Any consumption figures are illustrative, not savings promises.

Dashboard:
- A small commercial-building floor plan with zones.
- Occupancy, lighting schedules and temperature setpoints.
- A visibly explained response to user actions and one alarm.
- Keep controls accessible and state understandable without colour alone.
- No random chart noise pretending to be live equipment telemetry.

Fault diagnosis:
- One credible scenario: room remains warm despite a cooling request.
- Let users inspect sensor reading, setpoint, command and actuator feedback.
- Reveal evidence in a sensible order; distinguish symptom from confirmed cause.
- End with the relevant troubleshooting service and an optional enquiry.
- Do not present a simplified scenario as universal repair instructions.

Configurator:
- Building type, existing/new system, relevant subsystems and operational goals.
- Generate an editable scope summary in the selected language.
- No invented instant pricing, compatibility guarantees or guaranteed savings.
- Allow the summary to prefill the enquiry, without requiring the demo for contact.

## 7. Quality criteria

- WCAG AA contrast targets; keyboard access, visible focus and reduced-motion behaviour.
- Usable at 360px, 768px and 1440px; no horizontal overflow.
- Romanian diacritics, meaningful headings, consistent terminology.
- Demo reset, deterministic outcomes, valid enquiry summary and correct language switching tested.
- Correct canonical/hreflang URLs after production hostname is known.
- Optimised imagery; demo code loaded only when needed.
- Test navigation and assets under the GitHub project subpath.
- Real form success/failure handling before commercial launch; no fake submission success.
- Preview pages marked noindex; no confidential customer data in this public repository.
- User-facing project evidence must have permission; remove credentials, addresses and device identifiers where necessary.

## 8. FIRST CURSOR PROMPT — identity exploration only

Paste the following into the coordinator agent with this planning branch checked out:

You are the coordinator for Logicontrol's brand and website project.
Read docs/BUILD_PLAN.md and inspect the repository before making changes.
Execute Stage A only. Do not build the full website or choose the final identity.

Prepare three comparable visual identity explorations: Signal (light), Control (dark), and Current (mixed).
Use isolated Cursor agents/worktrees if available. Give each agent the agreed brief and exclusive ownership of its exploration directory. If parallel agents are unavailable, execute the same assignments sequentially and state that clearly.

For this exploration use simple static HTML/CSS/JS and editable SVG so the owner can review without a production-stack commitment. Do not add a CMS, form backend, analytics, deployment workflow or full application scaffold yet.

Each concept must deliver two SVG logo proposals, a monochrome logo, palette, font choice with licence/source and Romanian character support, responsive homepage hero, service/project card, and an interactive lighting-control mini-demo. All concepts use the same factual content and scenario so visual quality can be compared fairly. Label the demo as simulated and the project card as an illustrative placeholder.

Use this shared provisional hero copy:
RO: “Control clar pentru clădiri complexe.”
EN: “Clear control for complex buildings.”
Description: BMS integration, troubleshooting, programming and maintenance for commercial buildings across Romania.
Primary CTA: “Discută proiectul”.
Secondary CTA: “Explorează demonstrația”.
The primary CTA may lead to a visibly labelled contact-flow prototype; do not pretend it sends an enquiry.

Run the strategy assignment in parallel if capacity allows; otherwise do it after the concepts. Cite actual sources and clearly separate observed facts from recommendations.

Integrate the concepts into exploration/index.html with working links to all three. Add instructions for running a local static preview. Capture desktop/mobile screenshots if a browser tool is available; otherwise provide exact manual verification steps and acknowledge the limitation. Check keyboard controls, contrast, overflow and links.

Return a concise report listing changed files, verification results, screenshots, tradeoffs and your recommendation. Stop for the owner's identity selection. Do not merge to main or publish the site.

## 9. Next decisions after identity review

- Selected logo and visual direction
- Confirmed legal business identity, service scope and contact details
- Publishable project assets and founder profile
- Final CMS/editor choice
- Production hosting and domain
- Real enquiry destination and delivery integration

## 10. Primary references checked during planning

- Astro overview: https://docs.astro.build/
- Astro GitHub Pages deployment: https://docs.astro.build/en/guides/deploy/github/
- Cursor agent practices: https://cursor.com/blog/agent-best-practices
- Cursor subagents: https://cursor.com/docs/subagents
- GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

Current-source check: 2 November 2026. Recheck platform capabilities and terms when implementing.
