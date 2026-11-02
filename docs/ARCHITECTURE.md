# Technical architecture
Status: engineering baseline selected under the owner's request to develop the stack (2026-11-02). Not installed or runtime-validated. Identity exploration remains Stage A; full foundation follows identity selection. External accounts, spending and production deployment remain unconfigured.

## 1. Stack and boundaries
| Layer | Selection | Reason |
|---|---|---|
| Content pages | Astro static output | HTML-first SEO, bilingual routes, portable deployment |
| Interactive components | React + TypeScript strict, official Astro React integration | Rich independent demos without a site-wide SPA |
| Styling | CSS custom properties + scoped CSS/CSS Modules | Original identity, shared semantic tokens, no template UI dependency |
| Simulation | Pure TypeScript functions + React useReducer | Deterministic models, straightforward tests and small runtime |
| Scenario flow | Typed finite-state transitions | Diagnosis/wizard state explicit; XState deferred unless concurrent/hierarchical states justify it |
| Graphics | Responsive SVG floor plans and small charts + HTML controls | Crisp, selectable zones, accessible alternatives; lightweight isometric views possible |
| Animation | CSS transforms/opacity, requestAnimationFrame only for rendering needs | Respect reduced motion; avoid a second animation runtime initially |
| Content validation | Astro content collections; Zod at input boundaries | Build-time content checks; shared lead/configurator schemas |
| CMS | Decap CMS, GitHub backend, editorial workflow | Browser editing of versioned content and images without a content database |
| Checks | Astro check/TypeScript, ESLint, Prettier | Discover scripts after scaffolding; no fictitious existing commands |
| Tests | Vitest + Testing Library; Playwright + axe-core | Simulation/unit coverage, real browser flows and accessibility checks |
| Toolchain | pnpm, pinned supported Node LTS | One lockfile, reproducible local/CI tooling |
| CI | GitHub Actions | Check, test, build, artifact review; separate deployment permissions |
| Production candidate | Cloudflare Workers Static Assets + small enquiry Worker | Keep static frontend; add server validation only where needed |

Select exact mutually compatible stable versions when scaffolding using official releases/engine requirements; record them in package.json, packageManager, runtime pin and pnpm-lock.yaml. Do not mix prerelease docs and stable packages. Install with a frozen lockfile in CI.

No initial database, WebSocket service, MQTT broker, real BMS gateway, Redux, full SPA router, Three.js, chart framework or customer accounts. Add a dependency only for an observed requirement. React islands do not limit the sophistication of the individual demos.

## 2. Why this architecture
Next.js would also support these experiences, but the current site needs static marketing content and browser simulations, not request-time application rendering. Astro fits those boundaries with less site-wide client code. Reconsider if authenticated live equipment dashboards become a separate product.

Use one React root per full demo. The homepage contains a lightweight teaser; it does not mount all three full demos. Dedicated demo pages own their state. SSR the initial demo view; hydrate dedicated controls immediately when needed and below-fold teasers on visibility. Avoid client-only rendering unless an actual browser-only dependency requires it.

Keep rendering, state and simulation independent; see [demo contracts](specs/DEMOS.md). React is never the source of engineering truth. The same fixtures and transition functions serve tests and previews.

## 3. Structure and ownership (target paths, not existing code)
| Path | Responsibility / owner |
|---|---|
| src/pages/, src/layouts/ | Static routes and page shells; foundation/content |
| src/components/ui/, src/styles/ | Semantic tokens, accessible shared controls; foundation |
| src/i18n/ | Typed RO/EN dictionaries, route map and translation keys; foundation/content |
| src/content/, src/content.config.* | Services/projects/site content schemas; content |
| src/demos/core/ | Model types, initial fixtures, transitions and summaries; foundation |
| src/demos/dashboard/ | Floor plan, controls, timeline; dashboard agent |
| src/demos/diagnosis/ | Evidence collection and fault scenario; diagnosis agent |
| src/demos/configurator/ | Requirements wizard and summary; configurator agent |
| src/lib/enquiry/ | Public request schema + client adapter; foundation |
| public/admin/, public/uploads/ | CMS config and approved publishable media; content |
| workers/enquiry/ | Server-side validation/delivery adapter; integration |
| tests/e2e/ | Cross-feature browser tests; QA |
| .github/workflows/ | CI/deploy separation; coordinator |

One repository, one application and one dependency lockfile initially. Worker code is a separate deployment boundary without introducing a monorepo framework. Coordinator owns shared schemas and lockfile changes.

## 4. Bilingual content and CMS
- /ro/ and /en/ have complete static routes, with trailing-slash conventions chosen once. Root provides a Romanian default with a working English link; no server middleware dependency.
- Equivalent pages share a stable translation key, not necessarily identical translated slugs. Language switch resolves that key; do not send every switch to the homepage.
- UI dictionaries are typed; build checks catch missing keys. CMS content uses separate locale files paired by translation key.
- Collections: services, projects, site settings; articles deferred until there is real content.
- Project schema includes title, locale, translation key, summary, scope, challenge, intervention, verified outcome, publish status and image alt text. Publish permission is confirmed outside public Git; never store customer agreements in this repo.
- Markdown/structured frontmatter only for editorial content. Do not let CMS content execute arbitrary MDX/JavaScript.
- Decap loads only on /admin/. Pin its bundle; never ship editor dependencies to marketing pages.
- GitHub authentication needs external OAuth handling: use an established supported provider after checking cost/access, not a bespoke auth server. Provider/account setup is a prerequisite for CMS acceptance, not a hidden assumption.
- GitHub CMS users require appropriate repository permissions. Configure the actual publishing branch at integration time. Editorial previews build from the draft branch and remain noindex.
- This repo is public: even unpublished draft branches can expose content. Upload only publishable material; confidential drafts need a private content location before use.
- Acceptance: sign in, edit both languages, upload an image, preview draft, publish/rebuild, verify output and revert a change. Local editing alone is not CMS completion.

## 5. Graphics, motion and accessibility
Use an original SVG building plan rather than a generic admin template. Pair selected zones with labelled HTML buttons/sliders and a readable status panel. Provide a table/list equivalent for chart and floor-plan information. Do not make drag gestures or colour the only way to act or understand.

Use CSS variables for colours, spacing, type, radius and elevation. JS reads semantic state, not hard-coded colours. Fonts are licensed, subset/self-hosted where practical and include Romanian glyphs.
Animate commands/results meaningfully, not perpetual glowing activity. Pause offscreen/inactive simulations; reduced motion removes decorative transitions while preserving functionality. Keep status announcements selective, not a screen-reader update every tick.

If an optional 3D scene is later chosen, add it as a lazy enhancement with a complete 2D path and measure its payload/accessibility cost first. A 3D dependency is not part of the baseline.

## 6. Enquiry integration
Recommended path: direct enquiry plus optional configurator-prefilled summary. The visitor reviews/edit selections before submitting.
- Share a versioned Zod request schema between UI and endpoint; validate again server-side, limit sizes, allow known enums and sanitise rendered text.
- Contact fields and messages never enter URL query strings, Git, analytics or browser persistence. Demo-only choices may use validated sessionStorage.
- Static prototype: visibly explain that submission is unavailable until configured; never show simulated delivery success.
- Production candidate: POST /api/enquiry handled by a Worker, server-side Turnstile verification, rate limiting and email-provider adapter. Email provider/domain/recipient remain setup decisions.
- Return success only after the provider accepts the request; describe it as received for processing, not guaranteed inbox delivery. Handle failure, retry and duplicate submissions explicitly.
- CORS/origin checks reduce accidental cross-origin use but are not spam protection. Protect secrets server-side; avoid logging payloads or contacts. Configure retention and privacy notice before collecting real leads.
- A separate endpoint URL allows a static preview host; prefer same-origin production to simplify deployment.
- No file uploads in the first enquiry flow. Add them only with explicit storage, access, size and retention handling.

## 7. Performance, security and release checks
Initial budgets are engineering targets, not measured results:
- Marketing route: <=100 KB compressed first-party JS; no full demo chunks before needed.
- Dedicated demo: <=250 KB compressed initial first-party JS; heavy optional extras deferred.
- Mobile Lighthouse performance >=90 on representative routes; use LCP <=2.5s, CLS <=0.1 and INP <=200ms as experience targets, verifying field data when available.
Measure repeatably on built output and document device/network; never quote lab results as customer field performance.

CI after foundation:
1. frozen install; formatting/lint/type checks.
2. Vitest models, schemas and state transitions.
3. static builds for root and /logicontrol/ base paths.
4. Playwright built-site flows: both locales, all demos, keyboard/reset, forms with mocked server success/failure.
5. axe scan plus manual contrast/focus/reduced-motion review; automated scans alone do not prove accessibility.
6. artifact/bundle report; screenshots at 360, 768 and 1440px.
Production smoke test includes actual authorised enquiry delivery and CMS editing. Mock success is not production evidence.

Untrusted PR builds receive no deployment secrets. Pin Actions revisions, minimise permissions, keep deployment separate, and protect configured production environments. Include dependency update review and rollback to the previous static artifact. Never weaken checks merely to get a green build.

## 8. Hosting and migration
Initial preview must remain static and work under /logicontrol/. GitHub Pages cannot host the enquiry Worker or confidential OAuth exchange. Its commercial-use restrictions require review before a business launch.
Preferred production candidate is Workers Static Assets with enquiry routing; do not silently migrate or create paid services.
Migration: change configured site URL/base and endpoint, rebuild, verify canonical/hreflang/sitemap/assets/routes, connect DNS when authorised, test editor callback URLs and real form delivery. No rewriting demo logic.

## 9. Foundation acceptance (after identity gate)
Select/pin versions; create project and scripts; wire tokens and bilingual routes; build one model-driven vertical slice; then split demo ownership. Implement a small room/lighting simulation, RESET test and bilingual accessible controls before expanding.
Prove both deployment bases and schema parity before adding CMS/endpoint integration. This plan is not a claim these checks have run.

## Sources (official; checked 2026-11-02)
- https://docs.astro.build/en/concepts/islands/
- https://docs.astro.build/en/guides/integrations-guide/react/
- https://docs.astro.build/en/recipes/i18n/
- https://decapcms.org/docs/github-backend/
- https://decapcms.org/docs/configuration-options/
- https://stately.ai/docs/xstate-react (evaluated; deferred)
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://vitest.dev/guide/
- https://playwright.dev/docs/accessibility-testing
