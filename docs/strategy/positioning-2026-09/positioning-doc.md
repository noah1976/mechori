# Market Positioning: MECHORI
*Skill: startup-positioning | Generated: 2026-09-22*

## Executive summary

**[Opinion] ENTRY POSITIONING:** MECHORI should enter as **「愛車の整備履歴パスポート」—工場へ持ち運べる整備履歴** for Owners of history-sensitive hobby, older, rare, and imported cars. The first promise is **「次の整備で、愛車の説明をゼロからやり直さない」**: share relevant past work and the current concern, then bring the Workshop's returned result back into the Owner-controlled history.

**[Assumption] LONG-TERM PLATFORM THESIS:** if the roundtrip repeatedly captures permissioned work and outcomes, MECHORI can grow into a maintenance Knowledge Network and later a Professional Network where useful experience remains discoverable across vehicle, Workshop, mechanic, region, and language. The entry loop is a plausible route to that thesis, but current evidence does not prove Workshop adoption, knowledge reuse, mechanic reputation, revenue, or network effects.

## Product reality boundary

| Layer | Status | What can be said |
|---|---|---|
| Owner Garage and maintenance history | **[Data | FACT]** On `main` | An Owner can keep vehicle-linked records. |
| Passport current consultation and revocable link | **[Data | FACT]** On `main` | An Owner can share a purpose-limited Passport link. |
| Workshop structured return → Owner review → Garage | **[Data | FACT]** On `main` | A link recipient can return a Service Visit; the Owner decides what becomes history. Sender identity is not verified. |
| Past Garage history shown to Workshop and refreshed after return | **[Data | FACT about code, HYPOTHESIS about value]** PR #26 | Implemented in an OPEN, unmerged PR; α migration reported; human QA and positioning experiment pending. |
| Knowledge reuse, mechanic reputation, Professional revenue, global network | **[Assumption | HYPOTHESIS]** | Long-term thesis only; not a present marketing promise. |

## 1. Competitive alternatives

The primary competitor is not another startup. It is the familiar bundle:

> **LINE／口頭で今回を伝え、紙・明細・写真で過去を持つ運用**

| Alternative group | Job match | Why it wins today | Where the opening exists |
|---|---|---|---|
| LINE, phone, email, oral explanation, memo | Very high for today's consultation | Zero onboarding, flexible, already used | Conversation is not a durable vehicle history |
| Paper records, inspection records, invoices, photos | High for preserving evidence | Familiar and often Workshop-originated | Scattered and slow to reconstruct for a new Workshop |
| Excel / Notes / maintenance apps | High for Owner recordkeeping | Flexible or convenient, useful alone | Usually no structured Workshop return loop |
| Same Workshop's customer/work-order system | High when one Workshop retains the car | Workshop already has the record | Does not reliably travel to another Workshop or stay Owner-controlled |
| Google, AI, YouTube, forums, Workshop expertise | High for finding knowledge | Broad and fast | Does not carry this individual vehicle's longitudinal history forward |
| Automotive SNS and communities | Medium | Audience, peer examples, enjoyment | Public posts are not a private maintenance handoff |
| Digital service-history platforms | High | Consolidated or verified history; integrations | Strong incumbent expectations; coverage, ownership, and use cases differ |

> **Confidence: High** for the existence and attractiveness of the status quo; **Low** for the claim that MECHORI already beats it, because no comparative α use has been observed.

## 2. Unique attributes

The following are the strongest evidence-backed attributes. “Unique” applies to the combined workflow relative to the primary status-quo bundle, not as a proven global exclusivity claim.

| Attribute | Evidence | Defensibility |
|---|---|---|
| Vehicle-centered, Owner-controlled longitudinal record | Current repository implementation | Moderate; maintenance apps also keep records |
| Revocable, purpose-limited Workshop projection rather than sending the whole private workspace | Current `main` | Moderate; privacy control is valuable but not globally unique |
| Workshop return is preserved as original submission, then Owner-reviewed before entering Garage history | Current `main` | Strong relative to LINE/paper; global competitor parity not fully researched |
| Past history, current concern, and return flow appear in one Workshop-facing link | PR #26, unmerged | Potentially strong; not yet a current-main or validated attribute |
| Accepted Workshop work becomes part of what the next Workshop can receive | PR #26, unmerged | Core compounding attribute; behavior and value unvalidated |
| Owner value can exist before public Knowledge or Professional network density | Repository architecture and product policy | Strategically important; only proven as design intent, not retention outcome |

> **Confidence: Moderate.** Capabilities are repository-verifiable, but differentiation versus the entire global category and the customer value of PR #26 are not verified.

## 3. Value themes

### Theme A: Maintenance continuity

- **Attribute:** one vehicle-linked history plus a Workshop-facing projection.
- **Outcome:** the next maintenance conversation can start from what has already happened rather than reconstructed memory.
- **Customer language:** “what was done,” “when,” “mileage,” “parts,” “result.”

### Theme B: Owner-controlled handoff

- **Attribute:** explicit sharing, limited fields, revocation, and Owner acceptance of returned content.
- **Outcome:** the Owner can carry context between Workshops without making the full private Garage public or treating an unknown sender as verified.

### Theme C: Each visit strengthens the next

- **Attribute:** Workshop return enters Garage; under PR #26, the share is updated for future use.
- **Outcome:** the work required today can reduce explanation effort later instead of becoming another isolated invoice or chat thread.

> **Confidence: Moderate** for Themes A and B as plausible outcomes; **Low-to-Moderate** for Theme C until later reuse is observed.

## 4. Best-fit customers

**Primary profile:** **過去整備が紙・明細・写真・メモに散在し、新しい／追加の工場へ履歴を伝える必要がある、長期所有の趣味車・旧車・希少車・輸入車Owner**。

They care more because:

- Vehicle-specific history affects the quality and speed of the next conversation.
- A Workshop or staff change makes the existing information silo visible.
- The emotional and financial cost of losing accumulated context is higher than for a low-history, routine-service vehicle.
- A real upcoming maintenance visit provides a concrete reason to organize and share now.

Not the primary entry customer:

- “All car lovers.”
- Owners whose current Workshop already holds a complete, accessible history and who have no handoff need.
- Workshops as paying buyers, until their recurring value and effort are observed.
- Mechanics seeking reputation, until contribution rights, verification, and career value are validated.

> **Confidence: Medium.** Internal strategy and external customer-language signals converge, but no segment-level MECHORI usage or willingness-to-pay evidence exists.

## 5. Market category

**Chosen category:** **愛車の整備履歴パスポート** / **Vehicle Maintenance Passport**.

**Category type:** a subcategory of digital service history / maintenance records, not a new category.

**Required explanation:** **「工場へ持ち運べる整備履歴」**.

Why this frame:

- “整備履歴” is concrete and legible.
- “パスポート” makes portability across Workshops salient.
- It leaves room for the current consultation and returned result without positioning MECHORI as a full Workshop-management system.
- It avoids the authoritative accident/title/ownership expectations of “vehicle history service.”

Expectation to manage: it is not a complete, verified, official service history; it is an Owner-controlled, permissioned record with source and confirmation states.

> **Confidence: Medium.** It best fits the present workflow, but spontaneous category comprehension has not been tested.

## 6. Relevant trends

Digital service histories, service reminders, and Workshop integrations are established enough to make “digital maintenance history” understandable. At the same time, paper, folders, spreadsheets, and phone photos remain common, and repair-information systems remain separate from individual vehicle histories.

**Trend overlay recommendation:** do not lead with a trend. Use it only to explain why a portable Owner-controlled history is timely.

**Would the positioning work without the trend?** Yes. The core job is repeated handoff across time and Workshops.

> **Confidence: Medium** for the broad market pattern; **Low** for its strength within MECHORI's exact initial segment.

## Critical test: is PR #26 enough to beat LINE?

**[Opinion] If the Passport only carries the current concern, no.** LINE is likely enough and often superior on familiarity and flexibility.

**[Opinion] PR #26 creates the first credible non-LINE reason:** the link carries a limited past history and the returned work can become the next visit's history. That changes MECHORI from a message format into a compounding vehicle record.

**[Assumption] It becomes a switching reason only when all three conditions hold:**

1. the prior history contains something relevant;
2. the Workshop can understand it faster or more reliably than asking again; and
3. the Owner uses the returned record later.

Therefore, history projection is **necessary but not yet sufficient**. Positioning should promise continuity, then test whether the workflow earns its extra click and form effort.

## Entry positioning vs. long-term platform thesis

| Horizon | Position | Promise | Evidence status |
|---|---|---|---|
| Entry | 愛車の整備履歴パスポート | 次の整備で説明をゼロからやり直さない | Workflow partly on main; key past-history addition is PR #26 and unvalidated |
| Expansion | Owner↔Workshop maintenance collaboration | Each visit returns structured history to the Owner | Current roundtrip exists; Workshop value unvalidated |
| Long term | Maintenance Knowledge Network | Permissioned outcomes help the next similar vehicle and Workshop | Hypothesis only |
| Long term Professional | Mechanic Professional Network / “整備士のGitHub” | Contributions become traceable expertise and opportunity | Hypothesis only |

The Passport can connect to the long-term network because it is positioned at the moment where history is consumed and new outcome evidence is produced. It will fail as a wedge if Workshops do not use it, Owners do not return, or permissioned records cannot be safely normalized and reused. The vision must not be used to declare those transitions inevitable.

## Positioning strength assessment

| Component | Strength | Notes |
|---|---|---|
| Competitive alternatives | Strong | Status quo is clear and behaviorally realistic |
| Unique attributes | Moderate | Workflow combination is real; key history projection is unmerged and global uniqueness unproven |
| Value themes | Moderate | Clear outcomes, but not measured |
| Best-fit customer | Moderate | Sharply defined; segment response not measured |
| Market category | Moderate | Understandable with descriptor; category comprehension untested |
| Overall | **Moderate / experiment-ready** | Strong enough to test, not strong enough to claim validated positioning |

## Strategic recommendations

1. Lead with the job and outcome: **「工場へ持ち運べる整備履歴」** and **「説明をゼロからやり直さない」**.
2. Use **愛車パスポート** as the product object, always paired with **整備履歴** until users can restate it unaided.
3. Keep Workshop, Knowledge Network, and Professional Network as the second and long-term story, not the first headline.
4. Treat PR #26 as the latest product hypothesis under validation, not a shipped or validated market promise.
5. Run the single α experiment specified in `MECHORI_POSITIONING_DECISION.md` before broadening the segment or category.

## Data gaps & limitations

- No live Owner↔Workshop use of the PR #26 history-enabled loop.
- No later-visit reuse observation.
- No measured comprehension of “愛車の整備履歴パスポート.”
- No willingness-to-pay or Professional adoption evidence.
- LIGHT web scan, not an exhaustive global competitor audit.

## Red Flags

- If a Workshop does not consume the history, the differentiated loop collapses back to “LINE plus a record app.”
- “Complete,” “verified,” “official,” or “health” language would overstate the product.
- The long-term network thesis is not a substitute for present single-user value.

## Yellow Flags

- Owners loyal to one Workshop may experience the problem infrequently.
- Digitizing old records may cost more effort than the first-use benefit.
- “Passport” may be memorable but unclear outside the immediate UI context.

## Sources

- Repository sources listed in `intake.md`
- [PR #26](https://github.com/noah1976/mechori/pull/26)
- [CARFAX Car Care](https://www.carfax.com/Service/)
- [Digital Servicebook](https://www.digital-servicebook.com/en/)
- [FAINES overview](https://faines.jaspa.or.jp/enduser/static/menu/guide)
- Tier 3 discussions listed in `raw/customer-intelligence.md`
