# MECHORI Positioning Decision
*Skill: startup-positioning | Generated: 2026-09-22*

## 1. Current positioning problem

MECHORI has several true or plausible identities—maintenance log, 愛車パスポート, Workshop handoff, SNS, Knowledge Network, and Professional Network—but presenting them together obscures the immediate job.

**[Data | FACT]** The current `main` supports an Owner→Workshop→Owner roundtrip, but not public Knowledge or a Professional Network. **[Data | FACT]** PR #26 was OPEN and unmerged when this positioning audit was conducted; it has since been merged into `main` as `d289f67be6fd0a3f59ad8d639c5014bfabcb765b`. It adds past maintenance history to the Workshop projection and refreshes it after accepted work. **[Assumption | HYPOTHESIS]** That latest loop will create enough value to change behavior; the merge changed implementation status, not validation status.

The positioning problem is therefore to make the testable present loop legible without using the long-term vision as borrowed proof.

## 2. Best-fit customer

**過去整備が紙・明細・写真・メモに散在し、新しい／追加の工場へ履歴を伝える必要がある、長期所有の趣味車・旧車・希少車・輸入車Owner**。

This is narrower than “car enthusiasts.” The triggering situation—an upcoming visit where vehicle history matters—makes the value immediate and observable.

## 3. Primary competitive alternative

**LINE／口頭で今回を伝え、紙・明細・写真で過去を持つ運用**.

It is a bundle, not one product. It wins on familiarity and low effort. MECHORI wins only if continuity across visits is worth the additional workflow.

## 4. Entry category

**愛車の整備履歴パスポート**

Plain-language descriptor:

> **工場へ持ち運べる整備履歴**

English working category:

> **Vehicle Maintenance Passport**

This is a subcategory of maintenance records / digital service history, not a new market category.

## 5. Primary value promise

> **過去の整備を次の工場へ渡し、今回の整備を次回へ残す。**

Outcome version:

> **次の整備で、愛車の説明をゼロからやり直さない。**

## 6. Why MECHORI instead of LINE / paper / invoices

If the Passport contains only the current consultation, LINE is enough for most users. MECHORI's defensible reason begins when:

1. selected past maintenance travels with the current concern;
2. the Workshop can return structured work against the same vehicle context;
3. the Owner reviews it before it becomes history; and
4. that result is available for the next Workshop.

Paper and invoices can provide stronger source artifacts, so MECHORI should not replace or dismiss them. Its role is to make the relevant chronology usable at the handoff and to keep the returned outcome from becoming another isolated document.

**Decision:** PR #26's difference is meaningful enough to test but not proven sufficient to switch. The positioning must be stated as continuity, not “better messaging.”

## 7. What NOT to lead with

- Automotive SNS.
- 整備Knowledge Network.
- 整備士のGitHub / Mechanic Professional Network.
- AI, LLM, Knowledge Graph, Evidence Graph, UGC, or data moat.
- Vehicle Health Record or diagnostic language.
- Vehicle History Service, complete history, official history, or verified history.
- Workshop CRM/DMS, invoice, or repair-information replacement.
- Global scale or Professional revenue.

These are either wrong comparisons, internal concepts, or future hypotheses.

## 8. Long-term platform thesis

**[Assumption | HYPOTHESIS]** The Passport is a plausible supply-and-reuse wedge for a global maintenance Knowledge Network because it sits where old evidence is consumed and new outcome evidence is created. With explicit permission, provenance, verification states, and safe separation of customer/private information, repeated roundtrips could help the next Owner and unfamiliar Workshop; contributions could later support mechanic portfolios and Professional collaboration.

This connection is conditional, not automatic. The thesis fails if Workshops do not read or return records, Owners do not reuse them, evidence cannot be normalized without losing context or rights, or contributors receive no value.

Long-term expression:

> 整備で生まれた経験を、次のOwner、次のMechanic、次世代へ残し、場所に関係なく趣味グルマを維持しやすくする。

“整備士にとってのGitHub” remains an internal/Professional thesis until contribution, reputation, rights, and career value are demonstrated.

## 9. Positioning risks

1. **Insufficient delta from LINE:** the Workshop ignores history or prefers chat/call.
2. **Setup burden:** digitizing old records costs more than the immediate benefit.
3. **Trust ambiguity:** Owner-entered, invoice-backed, Workshop-returned, and verified information are confused.
4. **Category ambiguity:** “Passport” sounds like a profile or official document.
5. **Low-frequency trigger:** Workshop change and complex repairs may be too infrequent for retention.
6. **Premature B2B framing:** Workshop tool expectations outrun the α.
7. **Vision overreach:** Knowledge and Professional narratives hide the absence of observed reuse.
8. **Global mismatch:** Japanese inspection and FAINES practices are assumed to generalize.

## 10. Evidence still needed

- Unaided Owner and Workshop restatement of what the Passport does.
- Whether a Workshop finds at least one past-history item useful in a real intake.
- Time and effort versus LINE/oral/paper intake.
- Workshop completion and Owner acceptance behavior.
- Later reuse of the returned record.
- Trust interpretation: Owner-entered versus Workshop-returned versus verified.
- Preference for the next relevant visit, not hypothetical interest.
- Segment differences: same-Workshop versus multi-Workshop, hobby/older/imported versus mainstream.
- Market-specific category language outside Japan.

## 11. Recommended α positioning experiment

### One experiment: blind real-handoff and delayed choice

Use the current α with the history-enabled implementation now on `main`, after its normal safety and human-QA gates; do not add a feature for this experiment.

1. Recruit **[Assumption] five** best-fit Owners who have a real upcoming or recent Workshop conversation and at least some past history; include **[Assumption] at least three** actual Workshop recipients.
2. Before explanation, show the Owner-facing Passport and then the Workshop URL. Ask each person: “これは何をするサービスだと思いますか？” and record the first answer verbatim.
3. Have the Owner use the link for the real handoff. Ask the Workshop to identify whether any past item changed, shortened, or clarified the intake, then return the current work through the existing form.
4. Have the Owner review and add the return to Garage. Do not coach terminology.
5. **[Assumption] Seven to fourteen days later**, ask the Owner to choose for the next relevant visit: Passport, their prior LINE/paper method, both, or neither—and why. Ask them to restate the difference from LINE.

Decision rule, treated as an experiment assumption rather than proof of PMF:

- **Continue this positioning** if at least **[Assumption] three of five** Owners unaided describe both “past history goes to the Workshop” and “the returned result remains for next time,” at least **[Assumption] two of three** Workshops identify concrete handoff value without high input burden, and at least **[Assumption] three of five** Owners choose Passport or Passport+current method for the next relevant visit.
- **Simplify or reposition** if people describe it only as a record app, profile, or message link; if Workshops do not use the history; or if the return step is skipped.

This single experiment tests category comprehension, LINE differentiation, Workshop value, and reuse intent without creating a feature backlog.

## 12. Two-sentence MECHORI description

> MECHORIは、趣味車・旧車などを長く乗るオーナーのための、工場へ持ち運べる愛車の整備履歴パスポートです。過去の整備と今回の相談を共有し、工場から返った作業内容をオーナーが確認して次回へ残すことで、「入庫のたびに説明をゼロからやり直す」を減らします。

## Decision status

**POSITIONING RECOMMENDATION READY / ADOPTION PENDING / α EXPERIMENT NOT RUN**.

This document recommends how to position the current hypothesis. It does not declare product-market fit, Workshop validation, Knowledge Network formation, Professional revenue, or global adoption.

## Data gaps

The gaps in section 10 are decision-critical. Research confidence is **Medium for strategic coherence, Low-to-Medium for market validation**.

## Red Flags

- PR #26 was unmerged at audit time and is now merged into `main`; the recommended entry position still depends on its history-enabled difference, whose market value remains unvalidated.
- If later reuse does not occur, the Passport does not compound into the long-term thesis.

## Yellow Flags

- The segment is intentionally narrow and must be expanded only after the handoff job is demonstrated.
- “愛車” may need localized or less enthusiast-coded language in future markets.

## Sources

- All files in this directory
- Repository sources listed in `intake.md`
- [PR #26](https://github.com/noah1976/mechori/pull/26)
- [CARFAX Car Care](https://www.carfax.com/Service/)
- [Digital Servicebook](https://www.digital-servicebook.com/en/)
- [FAINES overview](https://faines.jaspa.or.jp/enduser/static/menu/guide)
