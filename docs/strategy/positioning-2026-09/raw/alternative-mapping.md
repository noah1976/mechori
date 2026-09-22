# Raw Alternative Mapping: MECHORI
*Skill: startup-positioning | Generated: 2026-09-22*

## Core job

Carry the right vehicle context into a maintenance visit, capture what happened, and make the result available at the next visit without relying on one person, one Workshop, or memory.

## Alternative map

| Alternative | Type | Hired for | Strength | Breaks down when | Switching trigger |
|---|---|---|---|---|---|
| LINE / email | Status quo communication | Send symptoms, photos, and questions | Familiar, immediate, zero onboarding | History is buried by conversation, inconsistent, and not returned as a reusable vehicle record | New Workshop, repeated explanation, long-running issue |
| Phone / oral explanation | Status quo communication | Explain the current concern | Fast, natural, interactive | Depends on memory; no portable artifact; details are lost | Complex history or handoff to another person |
| Paper memo | Manual | Bring a short list | Flexible, universal | Usually current-visit only; easy to omit or lose context | Several past repairs matter |
| Paper service book / inspection record | Manual record | Prove scheduled or regulated work | Recognized artifact; travels with car if preserved | Limited detail; not a conversational handoff; local formats differ | Missing pages, multiple Workshops, older vehicle |
| Invoices / work orders | Manual record | Preserve what was billed or performed | Workshop-originated detail | Scattered, jargon-heavy, not summarized for the next Workshop | Need to answer “what was already tried?” quickly |
| Photos / phone folders | Manual record | Preserve visual evidence | Low capture friction | Weak chronology and search; context separates from image | Too many images or new device |
| Excel / Notes | Adjacent tool | Maintain a custom log | Flexible, Owner-controlled, searchable | Manual discipline; weak Workshop return loop; attachments and provenance vary | Repeated reformatting for sharing |
| Nothing / memory | Non-consumption | Avoid admin | No effort | Fails as history length and ownership duration grow | Expensive repeat work, Workshop change, sale |
| Maintenance log apps | Direct/adjacent | Track service, reminders, cost, receipts | Familiar category and single-Owner utility | Often optimized for reminders/resale rather than live Owner↔Workshop roundtrip | Workshop handoff and result return become important |
| CARFAX Car Care | Direct/adjacent, US | Consolidate service history and reminders | Automatic partner-shop records, recalls, familiar vehicle-history brand | Geography/data-network dependence; Owner DIY records are not the same as report records | Vehicle/market outside coverage or need deeper hobby-car context |
| Digital Servicebook | Direct, Europe | Verified cross-Workshop digital service book | Workshop integration, multi-brand history, owner/workshop/dealer use | Stronger verification and integration expectations than MECHORI currently meets | Independent Workshop and cross-border continuity needs |
| みんカラ / CARTUNE / forums / Facebook / Reddit | Community | Share ownership, discover experiences, ask peers | Existing audience, conversation, marque knowledge | Individual vehicle history and Workshop handback are fragmented | Need a private, vehicle-specific handoff |
| Google / YouTube / general AI | Knowledge discovery | Find explanations, examples, and possible checks | Broad coverage and immediate answers | Not an Owner-controlled longitudinal record; result may not return to future visits | Repeated issue where own history matters |
| Workshop memory / personal mechanic knowledge | Human expertise | Interpret the actual car and context | High contextual judgment | Does not reliably travel across staff, Workshop, time, or language | Different Workshop or retiring expert |
| Shop management / work-order / invoice systems | Workshop system | Run jobs, customers, billing, and internal history | Fits Workshop operations and accountability | Usually Workshop-centric; Owner portability and cross-Workshop history are not the main job | Customer arrives with fragmented external history |
| FAINES / OEM repair information | Repair information | Access manuals, service data, technical cases | Authoritative or industry-grade reference context | Not the Owner's longitudinal vehicle history or messaging channel | Workshop needs actual prior work on this individual car |

## Critical LINE test

**[Opinion] If Passport contains only the current consultation, LINE is usually sufficient and may be better.** It is already installed, supports text and images, and requires no category education. Main's structured return-to-Garage adds some value, but LINE remains the low-friction benchmark.

**[Data] PR #26 changes the job match** by adding a limited projection of past Garage maintenance to the same Workshop link and by updating that shared history after an accepted return. This makes the object not merely a message but a reusable, accumulating vehicle history.

**[Opinion] This is necessary but not sufficient for switching.** The value only becomes material if the shared past contains information a Workshop uses, the Workshop can scan it faster than asking again, and the Owner reuses the result. Those behaviors are unobserved.

## Key insight

The primary competitor is the **bundle** “LINE/oral explanation for today + paper/invoices/photos for the past,” not any single startup. MECHORI must beat that bundle on continuity without demanding more coordination than the value returned.

## Data gaps

- No observed Workshop read/completion behavior.
- No comparison of Passport handoff time versus normal LINE/oral intake.
- No observed later reuse of a returned record.
- No market-by-market map of official service-history access.

## Red Flags

- The status quo is free, familiar, and flexible.
- Digital service-history incumbents may have stronger verification and integration signals.

## Yellow Flags

- A same-Workshop, low-complexity Owner may have little reason to switch.

## Sources

- Repository docs and PR #26
- [CARFAX Car Care](https://www.carfax.com/Service/)
- [Digital Servicebook](https://www.digital-servicebook.com/en/)
- [FAINES overview](https://faines.jaspa.or.jp/enduser/static/menu/guide)
- [Classic-car recordkeeping discussion](https://www.reddit.com/r/classiccars/comments/1fp8a4d) — Tier 3 customer-language signal
