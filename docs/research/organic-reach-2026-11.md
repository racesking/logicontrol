# Organic reach: air and energy, for homes and projects

**Date:** 3 November 2026. **Company:** Logicontrol, Romania. Romanian primary, English second. Audience: people in a home, and people planning an automation project. Commercial buildings stay a service line, not the lead.

**Observed** is separate from **recommendations**. No volumes or rankings. Other sites’ percentages are not copied. Opened 3 November 2026.

## 1. Words people use

These are words in titles, questions and explanations, not measured queries.

**Consumer Romanian.** [Digi24](https://www.digi24.ro/magazin/stil-de-viata/casa-si-gradina/de-ce-apare-condensul-pe-geamuri-cand-scad-temperaturile-cum-masori-umiditatea-din-casa-si-ce-valori-sunt-recomandate-3974741) (3 October 2026) and [Semnal](https://semnal.eu/ro/semnal-magazin/2026/10/06/condens-mucegai-iarna-aerisire-umiditate-bloc/) (6 October 2026) use *condens pe geamuri*, *geamuri aburite*, *umiditate*, *higrometru*, *mucegai*, *pete negre*, *aerisire*, *geam întredeschis* and *termopane* that keep heat in and moisture in. [E.ON](https://www.eon.ro/statie-energie/ghid-consum/recuperator-caldura-vs-aer-conditionat) uses *aer viciat*, *aer greu*, *aer proaspăt*, *mirosuri*, *dormitor*, *CO₂* and *recuperator de căldură*, and says an air conditioner recirculates air rather than replacing it. [Kapal](https://kapal.ro/articole/702-calitatea-aerului-interior-de-ce-conteaza-si-cum-o-imbunatatim) (updated 23 October 2026) uses *calitatea aerului interior*, *ventilație naturală sau mecanică*, and *recuperator centralizat sau local*. On [r/Romania](https://www.reddit.com/r/Romania/comments/1bd814k/pareri_ventilatie_cu_recuperare_caldura/) someone asks for *păreri* about *ventilație cu recuperare* *descentralizată*, mentions a boulevard, and worries about *carotare*. On [r/bucuresti](https://www.reddit.com/r/bucuresti/comments/1qu1mva/sisteme_de_ventila%C8%9Bie_cu_recuperare_c%C4%83ldur%C4%83/) someone asks which systems others *au*, *au auzit* or *au folosit*, and says the ones they found are *scumpe*. [Arena IT](https://arenait.ro/stii-respiri-propria-casa-concluzii-dupa-1-ventilatie-recuperare-caldura-plus-cum-arata-filtrele/) (29 July 2026) is one household: filters, dry winter air, cooking smells, and not opening windows so the heating does not run flat out.

**Heating, still everyday words.** Search titles, bodies unused for figures, turn on *factură la gaz*, *termostat* and *centrală*: [EnergieAcasa](https://energieacasa.ro/ghid/termostat-inteligent-centrala-economie), [Metodic](https://metodic.ro/energie/cum-reduci-factura-la-gaz-iarna-masuri-ordonate-dupa-cost). The same guides then use *OpenTherm* and *curbă climatică*, which are installer words. The first screen stays with the bill, the plant they already have, and heat lost while airing.

**Trade, for a later page.** A [KNX integrator](https://knxsmarthome.ro/integrare-knx-hvac/) (27 October 2026) leads with *KNX*, *setpoint*, *Modbus*, *BACnet*, *BMS* and *ETS*. Arena IT mentions *Home Assistant* as a hobby layer. Fine if a controller is already there. Wrong as the first line for condensation.

**English to mirror.** Consumer: *condensation*, *damp*, *mould*, *stale air*, *cooking smells*, *heating bill*. Off the first screen: *IAQ*, *HRV*, *MVHR*, *setpoint*, *BMS*, *KNX*.

## 2. Channels

**Google Search.** The result title is taken from the `<title>`, the visible heading and other prominent text, and a title in the wrong language can be dropped ([title links](https://developers.google.com/search/docs/appearance/title-link)). Snippets come mainly from the page ([starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)). Each language URL should list itself and the other with `hreflang` (`ro`, `en`, `x-default`). Google does not read the language from the `lang` attribute alone ([localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)). Off-site: nothing to buy; other sites already answer these questions. On-site: one URL per intent. The H1 and first paragraph must use household words, because that text can become the result.

**Google Business Profile / Maps.** A profile is free and is how a business shows in Search and Maps ([Profilul companiei](https://business.google.com/ro/business-profile/)). The name is the real name, not a keyword list. A firm that visits clients is a service-area business: one profile, up to 20 cities or areas, not a radius, address hidden if clients are not received there ([guidelines](https://support.google.com/business/answer/3038177?hl=en), [service areas](https://support.google.com/business/answer/9157481?hl=en)). Off-site: profile, category, real area, photos of work that exists. On-site: the same name and area, in the same plain words. Do not put town names in the business name.

**Directories.** [ListaFirme](https://listafirme.ro/) looks a firm up by name, CUI or county, from public registers (ANAF, the Trade Register, the Ministry of Finance). That verifies a name. It is not where a person starts from “condens pe geamuri”. Off-site: legal name, CUI and website must match after registration. On-site: the same legal name in the footer.

**Forums and word of mouth.** The Reddit posts ask neighbours what they installed and what they heard. The Timișoara thread “RECUPERATOR DE CĂLDURĂ” was already deleted when opened, so its comments are unused. No Softpedia thread turned up. Off-site: reply where someone asked, without a promised result. On-site: a URL a neighbour can forward, and a form that does not ask for a protocol.

**YouTube and articles.** Arena IT points to a YouTube film of that house. No view count was opened. Off-site: show a real installation or a real explanation. On-site: the page that film links to, with section 4 beside it.

## 3. Small site

Static pages are enough. Each needs an `/en/` twin.

| Page | Intent |
| --- | --- |
| Acasă | “The air or the heating is wrong. Who do I talk to?” |
| Aer în casă | Condensation, stale air, humidity, ventilation that also keeps heat |
| Căldură și consum | The bill, the boiler or heat pump already there, heat lost while airing |
| Proiect | A house being designed or renovated; controls that serve air and heat |
| Clădiri | Commercial work, linked, not in the hero |
| Întrebări | The worries below |
| Discuție | The form |

**First screen (recommendation).** One view must say who it is for (a home, or a project), the problem in household words, what happens next (a conversation, not a catalogue), and where you work. English is a real URL, not a hero-only toggle.

**FAQ, drawn from the sources.** Will a tilted window fix condensation, or only cool the wall? Does heat recovery replace air conditioning? (E.ON and Arena IT both say no.) Can you use the boiler, heat pump or ventilator already there? Do you sign an energy certificate or an energy audit? Can you file Casa Eficientă Energetic? Will mould or a headache go away? How much will the bill fall? Do you also do offices?

**Form (recommendation).** Ask for the problem. Fields: what is wrong (stale air; condensation or mould; heating that seems wasted; a project on paper; something else); place (apartment, existing house, house being designed, commercial); county and town; what is already there (gas boiler, heat pump, air conditioning, some ventilation, not sure); timing; how to reply; name; email or phone; an optional sentence. Do not offer “BMS / KNX / setpoint” as choices.

## 4. Claims to avoid

**Savings.** Other sites print conflicting percentages. None are adopted. Do not state a cut in the bill, a payback, or “up to” anything. The KNX page already says there is no saving guaranteed for every project. Publish a number only after a measured, agreed result exists.

**Health.** Digi24 quotes a pulmonologist and the US EPA; Semnal prints another comfort band (40–60%, against the 30–50% Digi24 attributes to EPA). Kapal says a CO₂ sensor does not certify the air, and not to claim a medical improvement without evidence. Legea nr. 363/2007 treats as misleading a claim about results of use, or about qualifications and authorisation ([ANPC text](https://www.anpc.ro/uploads/legislation/legean4-3.pdf), art. 6). Do not promise a cure for asthma, allergies, headaches, poor sleep, or mould.

**Audit and grants.** MDLPA attests building energy auditors under Legea nr. 372/2005 and says certificate forms used without that attestation, or filled with values that do not come from the calculation, are sanctioned ([announcement](https://www.mdlpa.ro/pages/anunturiatestariprofesionale); [exams](https://atestari.mdlpa.ro/portal/inscriere)). The list is on [data.gov.ro](https://data.gov.ro/ro/dataset/auditori-energetici-atestati) (note: updated 1 April 2026). A visit is not an *audit energetic* or a *certificat de performanță energetică* unless an attested auditor signs it.

The AFM guide [URL](https://www.afm.ro/casa_eficienta_energetic_ghid_finantare.php) returned only a JavaScript gate, so the session was not read from AFM. [economisi.ro](https://economisi.ro/energie/programe-finantare/casa-eficienta-energetic) (updated 7 October 2026) describes one session, 15 September 2020–15 December 2021, under Ordinul MMAP nr. 1438/2020, and says no new session had been announced. Do not offer to enrol anyone. If asked, point to afm.ro.

Also avoid invented customers and a lead about switching a light on.

## 5. Changes for the page author

Headlines marked **hypothesis** are untested, not winners.

1. **Replace a BMS-led hero.** Hypothesis, Romanian H1: „Aer mai curat în casă, fără să aruncați căldura pe geam.” Hypothesis, English: “Cleaner air at home, without throwing the heat out of the window.” First paragraph: condensation, heavy air, a project still on paper. Offices move under Clădiri.
2. **Order:** problem, what you look at, what the first conversation does, a short commercial link, then the form.
3. **Problem-page H2s, all hypotheses:** „Condens și aer greu”; „Aerisirea care răcește casa”; „Centrală sau pompă de căldură deja montată”; „Proiect nou: aerul și căldura, nu doar întrerupătorul”.
4. **FAQ** as in section 3. Certificate, grant, bill and health need a plain no.
5. **Enquiry** as in section 3. Button hypothesis: „Descrieți ce se întâmplă în casă”.
6. **Title themes,** same language as the page, brand at the end, a different sentence per URL: home = air and heat; aer = condensation and stale air; căldură = the bill and the plant already there; proiect = planning air and heat; întrebări = certificate, grant, mould; discuție = what to send.
7. **Separate** `/` and `/en/` URLs, reciprocal `hreflang`, `x-default` on Romanian. H1 and `<title>` in that page’s language.
8. **One limit** by the form and in Despre: no savings figure, no health result, no energy certificate, no AFM file, unless that status is actually true.

## Limits

Reddit replies past the opening posts were not used. AFM’s guide did not render. Heating pages were used as titles only.
