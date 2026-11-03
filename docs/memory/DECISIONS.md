# Decisions and user intent
Read for product/brand choices; do not auto-load for every small code task.
Status: accepted = explicit owner choice; proposed = recommendation; unresolved = not decided.
Change a decision only with its source; preserve superseded decisions briefly when they explain a tradeoff.

## Accepted — owner conversation, 2026-11-02
| ID | Choice | Consequence |
|---|---|---|
| D01 | Use Logicontrol | Firlogic and Voltlogic are prior alternatives, not parallel brands |
| D02 | Commercial buildings; nationwide Romania | Speak to owners/managers and operational needs |
| D03 | BMS/integration + consulting/programming | Troubleshooting, monitoring, maintenance, assessments and commissioning; do not assume full electrical installation |
| D04 | Premium, bold modern technology; stand apart | Compare light, dark and mixed concepts before choosing |
| D05 | Explore identity first; quality before speed | Owner reviews concepts before full implementation |
| D06 | Romanian + English | Equivalent content, proper diacritics and language switching |
| D07 | Service website + CMS + all three demos | Dashboard, diagnosis and configurator are all in scope |
| D08 | Company-led with personal About | Use founder background accurately; assets/bio still to be supplied |
| D09 | Real photos/project details available | Request actual assets when needed; never treat availability as publication permission |
| D10 | Shared repository and Cursor agents | Coordinate tasks and review commits; do not claim unlaunched agents are running |
| D11 | GitHub Pages initially, migration possible | Preserve static portability; production suitability remains unresolved |
| D12 | Conversion approach delegated for research | Recommend a funnel with evidence and measurable hypotheses |
| D13 | Multiple-choice clarification preferred | Minimise typing and avoid re-asking answered questions |
| D14 | Token-efficient project memory requested | Small root guidance, scoped detail, compact state and task handoffs |

## Accepted — owner conversation, 2026-11-03
Source: owner messages the same day. These supersede the rows named in the last column.

| ID | Choice | Supersedes |
|---|---|---|
| D15 | Dark Control visual system and Logo B. Signal is dropped as too complicated. | D04’s open comparison. Palette and Geist stay with that concept. |
| D16 | Homes and automation projects lead. Commercial buildings remain a service line, not the homepage story. | D02’s commercial-only market. |
| D17 | The company solves problems people already value: clean indoor air and energy that is not wasted while airing. The demonstration is that tradeoff. It is not a light switch and not a simple room gadget. | The lighting-console proof. |
| D18 | Do not spend this stage on a CMS. Content stays in the repository until someone other than the owner must publish without a commit. | D07’s CMS-in-scope requirement. |
| D19 | Tailor language from organic-reach research: household Romanian first, separate Romanian and English URLs, no savings percentage, no health cure, no energy certificate, no funding application. | The BMS-led hero and the “Discută proiectul” label as the only CTA. |

The enquiry still works without finishing the demonstration. Headline and button wording from the research note are hypotheses in use on the preview, not tested winners.

## Proposed — not owner-approved
- Contractors as a secondary audience.
- GitHub Pages for prototype use, alternative production hosting subject to terms review.
- Later pages for air, heat, a project, questions and the conversation, once the single preview page is accepted.
- A diagnosis or a project brief only if it serves the air-and-energy outcome.

## Unresolved
No final domain, trademark clearance, legal company details, contact endpoint or production host has been selected. Logo B is selected inside the dark system; optical kerning by a type designer has not been done.
Do not turn prior assistant suggestions into facts.

## Technical basis
Owner has robotics, embedded integration and DevOps/SRE experience. Use that combination to explain maintainability and integration; publish specific employers, certifications, projects or numerical achievements only after verification and permission.

## Engineering baseline — delegated design, 2026-11-02
Owner requested best-practice stack development with all three demos. Selected: Astro static + React/TypeScript islands, CSS/SVG, pure simulation reducers, Decap GitHub CMS, Vitest/Playwright. See [architecture](../ARCHITECTURE.md) for rationale and contracts. This is an engineering selection, not a claim the owner explicitly chose each package. Exact compatible versions are locked at scaffolding; services/accounts and runtime validation remain pending. XState/3D/global state libraries deferred until justified.
