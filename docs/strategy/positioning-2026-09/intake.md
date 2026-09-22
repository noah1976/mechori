# Positioning Intake: MECHORI
*Skill: startup-positioning | Generated: 2026-09-22*

## Product context

**[Data | FACT]** MECHORI currently has an Owner-centered Garage and maintenance-history foundation. On the audited `main`, an Owner can prepare an 愛車パスポート, share a purpose-limited URL with a Workshop, receive a structured Service Visit, review or edit it, and add the accepted content to the Garage history. The repository explicitly marks this as `EXPERIMENT_NOT_STARTED` and `HUMAN_QA_PENDING`.

**[Data | FACT]** [PR #26](https://github.com/noah1976/mechori/pull/26), 「愛車パスポートに整備履歴共有を追加」, was OPEN and unmerged when this audit was conducted on 2026-09-22; it was subsequently merged into `main` as `d289f67be6fd0a3f59ad8d639c5014bfabcb765b`. Its diff adds an Owner-approved, Workshop-facing projection of past `MaintenanceRecord` data and refreshes the shared history after an accepted Workshop return. It excludes cost, private notes, internal identifiers, and unrelated records. The PR reports automated verification and an α migration, but also states that the Passport hypothesis is unvalidated and the experiment has not started. The later merge does not change that validation status.

**[Assumption | HYPOTHESIS]** Workshops will read the shared history, find it useful, return a structured result, and do so with acceptable effort.

**[Assumption | HYPOTHESIS]** Owners will reuse the returned result in a later Workshop visit.

**[Assumption | HYPOTHESIS]** Permissioned records can later become reusable maintenance knowledge, mechanic reputation, Professional revenue, or a global network. None of these outcomes is demonstrated by the present α.

## Customer problem

The strongest candidate job is not “post about my car” or “store maintenance notes.” It is:

> When I take a history-sensitive car to a Workshop, help me carry forward the relevant past work and bring the new result back into one Owner-controlled history, so the next visit does not restart from memory.

The problem becomes acute when history is scattered across invoices, paper records, phone photos, messages, and memory; when the vehicle has unusual specifications or a long repair history; or when a new or unfamiliar Workshop becomes involved.

## Current alternatives

- Current consultation: LINE, phone, email, oral explanation, paper memo.
- History retention: paper maintenance record, inspection/service documents, invoices, photos, Excel/Notes, or no record.
- Community: みんカラ, CARTUNE, marque forums, Facebook groups, Reddit.
- Knowledge search: Google, general AI, YouTube, forums, Workshop experience, individual mechanic knowledge.
- Workshop operations: customer/shop management, work-order/invoice systems, repair information databases, OEM/industry sources such as FAINES.

## Candidate best-fit customers

- Long-term hobby-car, older-car, rare-car, and imported-car Owners.
- Owners whose maintenance history is important but scattered.
- Owners who use more than one Workshop, are changing Workshop, or need to brief a Workshop unfamiliar with the vehicle.
- Workshops receiving an unfamiliar vehicle are a secondary participant, not yet a validated initial buyer.

## Strategic question

Should MECHORI enter as a maintenance record app, 愛車パスポート, Workshop tool, vehicle history service, automotive SNS, maintenance knowledge network, or mechanic professional network—and what should it promise first without claiming future network effects as present value?

## Prior work reused

- `docs/PRODUCT.md`
- `docs/COMPETITIVE_POSITIONING.md`
- `docs/OWNER_VALUE_LOOP.md`
- `docs/BUSINESS_MODEL.md`
- `docs/PROFESSIONAL_PLATFORM.md`
- `docs/PROFESSIONAL_DISCOVERY.md`
- `docs/PROJECT_STATE.md`
- `docs/DECISIONS.md`
- `docs/MEASUREMENT_PLAN.md`
- `docs/TRUST_AND_VERIFICATION.md`
- `docs/ux/USER_FLOWS.md`
- `docs/ux/UI_TERMINOLOGY.md`
- PR #26 description and diff

## Research depth

The natural complexity score is **[Data] 9/9**: broad adjacent market, more than six known alternatives, and global design scope. Per the explicit user constraint, the selected depth is **LIGHT**. Repository evidence is reused; web research only checks category reality, relevant incumbent framing, and customer-language signals.

## Confidence

**High** for repository implementation status and **Low-to-Medium** for customer behavior and category response. Internal documents are strategic evidence, not independent market validation.

## Data Gaps

- No direct customer or Workshop interview was conducted in this audit.
- No live use of the PR #26 history-enabled flow has been observed.
- The web scan is directional, not an exhaustive global competitor review.

## Red Flags

- There is no observed proof that a Workshop will open, trust, or act on the Passport.
- The strongest differentiator depended on unmerged PR #26 at audit time; the implementation is now on `main`, but its market value remains unvalidated.

## Yellow Flags

- “愛車パスポート” is memorable but not self-explanatory without an explicit maintenance-history descriptor.
- Japan-local documents and FAINES must not be treated as universal global behavior.

## Sources

- Repository sources listed above
- [PR #26](https://github.com/noah1976/mechori/pull/26)
