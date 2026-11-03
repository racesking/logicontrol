# Romanian BMS integrator websites — enquiry-flow review
Accessed: 3 November 2026 (Europe/Bucharest). Method: each company's own pages fetched directly (HTML and, where needed, headless-Chrome render); form fields read from page markup. Search engines were used only to find candidates. No account, form submission or contact was made.

## Observed facts
| Company (city) | Pages reviewed | Positioning headline (as published) | Primary CTA labels | Enquiry form (required fields marked *) | Other channels | Languages |
|---|---|---|---|---|---|---|
| Sovitech Control (București) | [home](https://www.sovitech.ro/), [servicii](https://www.sovitech.ro/servicii), [contact](https://www.sovitech.ro/contact) | “Integrator independent de automatizare a clădirilor și BMS.” | “Trimite cererea”, “Deschide calculatorul” (ROI calculator) | Prenume*, Nume*, work e-mail*, telefon, subiect (evaluare clădire, ofertă, suport sistem existent, produse SAUTER, colaborare, presă, altul), detalii with a placeholder prompting systems/problem/deadline | Three phone numbers, named contacts | RO + EN toggle |
| Empire Control (București) | [home](https://empirecontrol.ro/) | “Identificăm exact unde se pierde eficiența clădirii…” | “Diagnostichează clădirea – gratuit”, “Discută cu un specialist BMS”, “Solicită o consultanță gratuită” | Self-assessment: building type*, 8 multiple-choice questions (each with “Nu știu”), then nume and telefon optional, e-mail* | Phone, two e-mails | RO only observed |
| AVITECH (Voluntari/Cluj) | [BMS](https://www.avitech.ro/solutii/automatizari-bms/), [contact](https://www.avitech.ro/contact/) | “Automatizări BMS” within a low-current systems integrator | “Solicită Oferta”, “Vezi Referințele Noastre” | HubSpot embed; fields did not render in headless Chrome — not observed | Separate commercial and service e-mails, phone, three addresses | RO + EN (hreflang) |
| SMART Automatizări (Iași) | [home](https://smartautomations.ro/), [BMS](https://smartautomations.ro/servicii/bms/), [contact](https://smartautomations.ro/contact/) | “Automatizări complete pentru clădiri inteligente” | “Cere ofertă gratuită”, “Cere ofertă” | Prenume*, Nume*, e-mail*, telefon*, serviciu* (10 options), mesaj, GDPR consent* | Contact page | RO only observed |
| Power Plus Expert (București) | [BMS](https://powerplus.ro/bms-automatizari/), [contact](https://powerplus.ro/contact/) | “Clădirea ta, sub control: BMS și automatizări” | “Sună acum”, “Cere ofertă: <phone>” | Nume*, e-mail*, telefon*, lucrare* (electrical, sanitary, HVAC, BMS…), descriere*, consent*; reCAPTCHA | Phone-first CTAs | RO only observed |
| EnergyPal (București) | [home](https://energypal.ro/), [BMS](https://energypal.ro/produs/bms/), [contact](https://energypal.ro/contact/) | “Eficiență energetică. Rezultate certe.” | “Solicită oferta”, “Începe evaluarea” (target not determined) | Nume*, Prenume*, telefon*, e-mail*, mesaj, two consent boxes | Phone | RO + EN |
| Global Technical Systems (București) | [home](https://gtsystems.ro/) | MEP + BMS + renewables, “de la A la Z” | “Contactează-ne”, “Trimite” | Nume*, companie, e-mail*, telefon, subiect*, mesaj | Phone, e-mail | RO + EN |

Other observations: Sovitech publishes indicative cost bands (EUR/m² and per data point) and states a reply within two working days; SMART lists ANRE C1A/C2A authorisations; AVITECH states “de peste 25 de ani”; Power Plus says “răspundem rapid” and “fără obligații”; EnergyPal shows testimonials; Empire Control and AVITECH link to reference/project pages. These are the companies' own claims, not verified here.

## Patterns (interpretation)
- Most flows are a single-page contact form framed as “ofertă”; five of the six observable forms require a name and/or phone number alongside e-mail.
- Only Sovitech asks for the problem context that helps triage (systems present, what fails, deadline); only Empire Control segments by building type before contact.
- Proof is mostly credentials, vendor partnerships, years in business and reference lists. Plain explanations of how troubleshooting works are rare.
- Visual language is largely stock photography, blue/green palettes and vendor logos; none observed uses an interactive explanation of control behaviour.

## Recommendation (hypothesis, not proven)
Keep “Discută proiectul” as primary CTA with a short two-step enquiry:
1. Context, no personal data: building type, county/city, need (defecțiune existentă / modernizare / integrare nouă / mentenanță).
2. Optional short description, preferred contact method, name, one contact detail (e-mail or phone, not both). Consent text and privacy link at submit.
Then a confirmation only after real delivery that states the response window the owner can actually honour.

Tradeoff: starting with context adds one screen versus a single form, but lowers perceived commitment and gives triage information competitors usually lack. Asking for one contact method instead of name+phone+e-mail reduces friction at some cost to follow-up options. Avoid “gratuit/ofertă” framing until the owner decides commercial terms.

Trust elements to add when real evidence exists: a plain “cum lucrăm” sequence (investigare → intervenție → documentare), approved project cases, founder profile, stated response window.

Measure after launch (privacy notice first): step-1→submit completion rate, share of enquiries with enough context to triage without a callback, qualified-opportunity rate by entry point (demo vs direct). No baseline exists yet.

## Limitations
Single access date; sites change. AVITECH's form fields and EnergyPal's evaluation flow were not observable. Seven companies is a sample, not a market census. No traffic or conversion data was available for any competitor.
