# Stage A shared concept brief
Coordinator-owned. Every identity concept uses this copy, scenario and deliverable list so the owner compares design, not content. Copy is provisional, not owner-approved.

## Deliverables per concept (`exploration/<concept>/`)
- `index.html` — responsive homepage concept: navigation, hero (RO default + EN toggle), services, illustrative project card, short About, contact CTA with prototype enquiry, working mini-demo.
- `identity.html` — brand sheet: design idea (≤120 words), two original SVG logo/wordmark options shown in colour on light and dark plus monochrome black and white, small-size test (24–32px), palette with semantic roles, hex values and measured WCAG contrast ratios, type specimen with `Ă Â Î Ș Ț ă â î ș ț`, font licence and source URLs.
- `logo/` — editable SVG files: `option-a.svg`, `option-a-mono.svg`, `option-b.svg`, `option-b-mono.svg` (more variants allowed). Live text converted to paths is fine; keep files hand-editable (no embedded raster, no base64).
- `fonts/` — self-hosted woff2 (latin + latin-ext subsets only) plus `OFL.txt`/licence. No runtime font CDN.
- `README.md` — idea, files, palette, fonts/licences, checks run and known limitations (≤250 words).
- Plain HTML/CSS/JS only; no build step, frameworks or npm packages.

## Shared copy (Romanian primary; use comma-below ș ț, never cedilla ş ţ)
Navigation: Servicii · Proiecte · Demonstrație · Despre · Contact · RO/EN.

Hero
- RO H1: Control clar pentru clădiri complexe.
- RO lead: Integrare BMS, depanare, programare și mentenanță pentru clădiri comerciale din toată România.
- EN H1: Clear control for complex buildings.
- EN lead: BMS integration, troubleshooting, programming and maintenance for commercial buildings across Romania.
- CTAs: “Discută proiectul” (primary → contact section/prototype) and “Explorează demonstrația” (secondary → demo). EN: “Discuss your project”, “Explore the demo”.
- EN toggle must switch hero text, CTA labels and the hero's `lang` attribute; the rest of the page may stay Romanian.

Services — intro: “Lucrăm cu sistemele existente ale clădirii: le investigăm, le conectăm și le întreținem, cu documentație clară.”
1. Integrare BMS — Conectăm HVAC, iluminatul, contorizarea și alte subsisteme într-o imagine operațională coerentă.
2. Depanare și diagnoză — Investigăm alarme repetate, comenzi fără efect și comportamente inconsistente, pornind de la date verificabile.
3. Programare și punere în funcțiune — Logică de control, programe orare și verificări funcționale, documentate pentru echipa de exploatare.
4. Consultanță și evaluări — Evaluăm sistemul existent și propunem pași de modernizare realiști, în ordinea priorităților.
5. Mentenanță și monitorizare — Verificări periodice, ajustări și suport, pentru ca sistemul să rămână fiabil după predare.

Illustrative project card (visible label: “Exemplu ilustrativ — nu este un proiect real”)
- Title: Clădire de birouri cu sisteme care nu comunică
- Provocare: Programele de iluminat și climatizare erau configurate separat, iar alarmele repetate nu aveau o cauză clară.
- Intervenție: Inventarul punctelor de date, corectarea logicii de control și documentarea modului de operare.
- Rezultat: Se completează doar cu rezultate verificate și aprobate pentru publicare.
- Tags: Integrare · Depanare · Documentație. No photos, client names, numbers or logos.

About (label: “Text provizoriu — biografia fondatorului urmează să fie confirmată”)
“Logicontrol este o companie condusă de fondatorul ei, cu experiență în robotică, integrarea sistemelor embedded și DevOps/SRE. Abordarea: sisteme gândite pentru a fi întreținute — logică documentată, modificări controlate și diagnoză bazată pe date.”

Contact CTA
- H2: Spuneți-ne ce se întâmplă în clădire.
- Lead: Primul pas este o discuție despre situația actuală și despre ce doriți să obțineți. Demonstrația nu este necesară pentru a ne contacta.
- Prototype enquiry, two short steps:
  1. Tip clădire (Birouri; Retail / centru comercial; Hotel; Sănătate; Industrial / logistică; Altul), Județ / localitate, Nevoie (Defecțiune existentă; Modernizare; Integrare nouă; Mentenanță).
  2. Descriere scurtă (opțional), Mod de contact preferat (E-mail; Telefon), Nume, E-mail sau telefon.
- Persistent label: “Prototip — formularul nu trimite și nu salvează date.” Final action “Verifică solicitarea” validates fields, then shows: “Solicitarea nu a fost trimisă: acesta este un prototip. Trimiterea va fi activată după configurarea serviciului de contact.” Never display success, never store or put contact data in the URL. No invented phone/e-mail.

## Shared mini-demo: “Iluminat și prezență”
Label inside the demo: “Demonstrație simulată — nu este conectată la o clădire reală.”
Zones (stable IDs, original SVG floor plan + equivalent HTML controls):
| ID | Name | Preset | Initial occupancy | Initial mode |
|---|---|---|---|---|
| receptie | Recepție | 70% | Ocupat | Automat |
| open-space | Birouri open space | 80% | Ocupat | Automat |
| sala-sedinte | Sală de ședințe | 60% | Liber | Automat |

Rules (deterministic, no random or wall-clock values):
- Modes: Automat (prezență) / Manual: pornit / Manual: oprit. Manual modes take priority over occupancy.
- Command = Manual pornit → preset; Manual oprit → 0%; Automat → preset if Ocupat else 0%.
- Feedback (“Stare confirmată”) follows the command after ~600 ms simulated actuation; immediately when reduced motion is requested. While they differ, show “Se aplică…”. Show command and feedback separately.
- Explanation line per selected zone, e.g. “Mod automat: prezență detectată → iluminat 80%.”, “Mod automat: zonă liberă → iluminat oprit.”, “Comandă manuală: are prioritate față de prezență.”
- Advisory (not alarm): Manual pornit + Liber → “Atenție: iluminat pornit manual într-o zonă liberă.”; Manual oprit + Ocupat → “Atenție: zonă ocupată cu iluminatul oprit manual.”
- Summary: “Zone iluminate: N din 3”. Bounded event log (last 5) numbered by action step, not clock time.
- “Resetează demonstrația” restores the initial table, clears the log and pending actuation, announces the reset.
- Accessibility: select zones from the plan or HTML buttons; state communicated in text, not colour alone; `aria-live="polite"` for result summaries only; works with keyboard.

## Quality bar
Commercial decision-makers, not generic SaaS. Typography and composition first; motion only where it explains state. No stock house/lightning marks, excessive glow, decorative circuitry, fake telemetry, invented customers, metrics, certifications or contact details. WCAG AA text contrast; visible focus; skip link; `prefers-reduced-motion` honoured; no horizontal overflow at 360/768/1440px; `<meta name="robots" content="noindex, nofollow">`; only relative URLs (site is served under `/logicontrol/`); SVG favicon; link back to `../index.html` gallery.

Check: `node exploration/tools/check.mjs <concept>/index.html <concept>/identity.html` (add `--shots` to write screenshots; do not commit screenshots from concept tasks).
