# Competitive Alternatives Map: MECHORI
*Skill: startup-positioning | Generated: 2026-09-22*

## The job to be done

When a history-sensitive vehicle goes to a Workshop, carry forward the relevant vehicle identity, prior work, and current concern; then preserve the new work so the next visit starts with more context rather than less.

## Primary competitive alternative

**LINE／口頭で今回を伝え、紙・明細・写真で過去を持つ運用**.

This bundle wins because every piece is already available, requires almost no onboarding, and lets each party improvise. MECHORI must not compare itself only with maintenance apps while ignoring this bundle.

## Communication alternatives

| Alternative | Hired for | Strengths | Shortcomings | Switching trigger |
|---|---|---|---|---|
| LINE | Current concern, photos, quick coordination | Familiar, fast, asynchronous | History becomes a chat archive; structure and later retrieval are weak | Repeated issue, new Workshop, several prior repairs |
| Phone / oral explanation | Immediate intake and clarification | Natural, interactive | Memory-dependent and not portable | Complex chronology or staff handoff |
| Email | Send longer explanation and attachments | Searchable, broadly available | Still thread-centric rather than vehicle-centric | Multiple visits and attachments |
| Paper memo | Bring a concise current list | Universal, no account | Usually single-use and Owner-authored only | Need to show prior work and receive a durable return |

## Recordkeeping alternatives

| Alternative | Hired for | Strengths | Shortcomings | Switching trigger |
|---|---|---|---|---|
| Paper service / inspection records | Preserve recognized maintenance evidence | Familiar, often Workshop-originated | Detail and portability vary; market-specific | Missing or incomplete history |
| Invoices / work orders | Preserve performed and billed work | Detailed, source artifact | Scattered and hard to summarize | Need to answer prior-attempt questions quickly |
| Photos / cloud folders | Preserve receipts, parts, and visual state | Easy capture | Weak context, chronology, and search | Volume grows or devices change |
| Excel / Notes | Custom chronological log | Flexible, Owner-controlled | Discipline-heavy; no Workshop return protocol | Reformatting becomes repetitive |
| Nothing / memory | Avoid administration | Zero effort | High information loss | Costly repeated work or Workshop change |

## Product and platform alternatives

| Alternative | Category strength | Where it wins | Where MECHORI may win | Where it still wins |
|---|---|---|---|---|
| Generic maintenance log apps | Clear personal utility | Reminders, fuel/cost, receipts, export | Owner↔Workshop roundtrip around one history | Mature features and lower learning cost |
| CARFAX Car Care | Data-network and brand | Auto-added partner-shop history, recalls, reminders | Hobby-car-specific Owner-controlled handoff where coverage is incomplete | US network, familiarity, vehicle-history ecosystem |
| Digital Servicebook | Verified multi-party history | Workshop integration and cross-party service history | Owner-reviewed contextual history and future knowledge connection | Verification, scale, Workshop integrations |
| Automotive SNS / communities | Network and content | Discovery, belonging, peer examples | Private vehicle continuity and purpose-limited Workshop sharing | Audience, engagement, existing content density |
| Google / AI / YouTube / forums | Knowledge breadth | Fast, broad, often free | Own-vehicle chronology and returned outcomes | Coverage, habit, no setup |
| Workshop management / work-order systems | Operational fit | Jobs, customer records, invoices, accountability | Owner portability across Workshops | Deep operational workflow and integration |
| FAINES / OEM data | Repair-information authority | Manuals, service data, technical cases | Actual history of this individual vehicle | Authoritative repair information |

## Workshop-side alternatives

- Ask the Owner again.
- Search the shop's customer history.
- Request invoices or service-book photos.
- Contact the former Workshop.
- Use mechanic memory or internal notes.
- Ignore unverifiable history and inspect from the beginning.

MECHORI must make the shared object faster to scan than these alternatives. A longer form or untrusted data dump loses even if it is structurally richer.

## Unique attributes versus the status quo

| Status-quo limitation | MECHORI attribute | Customer value | Evidence status |
|---|---|---|---|
| Today and past are in different places | Vehicle-centered Passport combines current concern with selected history | One object for the visit | Past-history portion is PR #26, unmerged |
| Workshop result becomes another message or invoice | Structured return enters Owner review | Result can become reusable history | On `main` |
| Private Garage would be too broad to share | Limited, revocable projection | Owner controls scope and access | On `main`; history projection in PR #26 |
| A later Workshop cannot see the previous return | Accepted result refreshes future share | Each visit can strengthen the next | PR #26, unvalidated |

## Switching-cost analysis

| Alternative | Technical | Contractual | Emotional / behavioral | Net barrier |
|---|---:|---:|---:|---|
| LINE + oral explanation | Low | Low | High habit | High because “good enough” |
| Paper / invoices | Low | Low | Medium | Medium; digitization effort matters |
| Excel / Notes | Low | Low | Medium | Medium; custom systems feel owned |
| Maintenance app | Medium | Low/Medium | Medium | Medium; data import/export matters |
| Same Workshop's system | High for Owner | Medium | High trust | High until Workshop changes |

## Key positioning insights

1. “Better recordkeeping” is not enough; Excel, paper, and apps already do that.
2. “Better communication” is not enough; LINE already does that.
3. The available rung is **maintenance continuity across visits and Workshops under Owner control**.
4. The return path matters as much as the outbound share. Without it, the product is a prettier handoff.
5. Workshop effort is part of the competitive equation even if the Owner is the entry customer.

## Data gaps

- Real handoff time, Workshop scan time, and completion rate.
- History relevance during an actual visit.
- Later reuse and data-maintenance burden.
- Exhaustive parity check against global digital-service-history products.

## Confidence

**High** that the status-quo bundle is the primary behavioral alternative; **Low-to-Medium** that MECHORI's proposed loop is strong enough to cause switching.

## Red Flags

- LINE is sufficient if the product carries only today's consultation.
- Official/verified service-history platforms can own trust and completeness better than MECHORI today.

## Yellow Flags

- The value may appear only at infrequent transition moments, weakening retention.
- Some Workshops may refuse external links or duplicated input.

## Sources

- `raw/alternative-mapping.md`
- Repository documents listed in `intake.md`
- [PR #26](https://github.com/noah1976/mechori/pull/26)
- [CARFAX Car Care](https://www.carfax.com/Service/)
- [Digital Servicebook](https://www.digital-servicebook.com/en/)
- [FAINES overview](https://faines.jaspa.or.jp/enduser/static/menu/guide)
