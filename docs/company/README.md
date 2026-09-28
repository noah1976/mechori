# 株式会社メカリィ AI Operating System v0.1

- 更新日: 2026-09-28
- 状態: `DOCS_IMPLEMENTED / CEO_DOCUMENT_REVIEW_PENDING / OPERATING_TEST_NOT_RUN`
- 対象: 唯一の人間Founder / CEOとAIによる経営実験

「株式会社メカリィ」は架空会社としてのOperating Simulation（経営の運営実験）です。法的な株式会社設立、登記、契約主体の変更、正式な外部公開を意味しません。AI Functionは業務の責任分担であり、人格設定や自動稼働する社員ではありません。

## 読み順

| 文書 | 判断に使う内容 |
| --- | --- |
| [COMPANY_CHARTER](COMPANY_CHARTER.md) | Mission、利益の必要条件、提供者への価値、最終決定権 |
| [OPERATING_SYSTEM](OPERATING_SYSTEM.md) | 業務Function、許可範囲、モデル選定、週次会議、最初の経営テスト |
| [CEO_DECISION_BRIEF](CEO_DECISION_BRIEF.md) | 新企画、大型変更、新規支出をCEOが判断するための共通書式 |
| [FINANCIAL_GUARDRAILS](FINANCIAL_GUARDRAILS.md) | 実売上・実費、現金採算、費用上限、上位AI契約への移行判断 |

## 承認済みFoundation Auditの引継ぎ

Foundation Auditはチャット上で実施し、Founder / CEOが条件付き承認しました。本書群は、その承認と以下の修正を反映したものです。元の監査を再実施したものではありません。

- Professional / B2Bは有力な`CURRENT HYPOTHESIS`。長期の主要利益基盤として確定せず、誰が何に対価を払い、継続するかを検証する。B2Bを既定路線としてProductを最適化しない。
- 既存の料金候補は`Historical Pricing Hypotheses`（過去の価格仮説）のみ。現在価格、採用済み価格、収益計画の基準値にしない。
- 恒久的なモデル選定は仕事の性質で定義する。具体モデルへの割当は変更可能なOperational Guidance（その時点の運用指針）とする。
- 上位AI契約への移行は、その契約を含むMECHORI運営費全体と外部実売上による現金採算で判断する。連続黒字の期間と安全余裕は`CEO DECISION REQUIRED`のままにする。

## 現在地と証拠の区別

| 事項 | 状態と根拠 |
| --- | --- |
| 全車種・全地域の維持可能性、専門家の価値向上、持続的利益 | `CURRENT DECISION`。今回のCEO方針。具体的な達成効果は未検証 |
| Passportを入口にOwner → Workshop → Ownerを試す実装 | `IMPLEMENTED BUT NOT VALIDATED`。[PROJECT_STATE](../PROJECT_STATE.md)と[DECISIONS](../DECISIONS.md)に実装・既存検証の記録。Human QA待ち、実験未開始 |
| 「工場へ持ち運べる整備履歴」というPositioning | `CURRENT HYPOTHESIS`。[Positioning Decision](../strategy/positioning-2026-09/MECHORI_POSITIONING_DECISION.md)は採用待ち、α実験未実施 |
| 許諾された記録の他車再利用、Knowledge Network、Professional収益 | `CURRENT HYPOTHESIS`。本人価値、他者価値、支払、原価を別々に検証 |
| 資料整理・相談準備・結果回収による取得方式 | `CURRENT HYPOTHESIS`。[Knowledge Acquisition Review](../KNOWLEDGE_ACQUISITION_REVIEW_2026-09.md)とMECH-048は採用待ち、未実施 |
| 実売上、実費、転換、継続、Workshop支払意思 | `UNKNOWN`。監査で読んだ資料に実測の裏付けがなく、ゼロとも断定しない |

報告は次の分類を使い、参照元と確認日を付けます。

| 分類 | 意味 |
| --- | --- |
| `CURRENT DECISION` | Founder / CEOが明示的に決定した方針。顧客価値の証明ではない |
| `CURRENT HYPOTHESIS` | 検証する仮説。反証条件と次の確認を示す |
| `IMPLEMENTED BUT NOT VALIDATED` | 実装証拠はあるが、市場・収益の証拠が不足 |
| `OLD / SUPERSEDED` | 過去の判断。置換理由と参照先を保持 |
| `CONFLICTING` | 文書・証拠が食い違う。AIが勝手に一本化しない |
| `UNKNOWN` | 根拠不足または未確認。推測で埋めない |

Implementation status（実装状態）、Product hypothesis（価値の仮説）、Market validation（顧客の選択・利用の証拠）、Revenue validation（実支払・継続・採算の証拠）は別欄で管理します。実装は顧客価値の証明ではなく、利用は事業成立の証明ではなく、売上は持続的利益の証明ではありません。

## 既存文書との関係

今回のCEO明示方針は、上記の対象範囲で既存記述より優先します。[AGENTS.md](../../AGENTS.md)の安全・権限境界と、各領域の設計文書は引き続き参照します。未決定の矛盾は未決定のまま残し、無関係な仕様まで置き換えません。

- [CONSTITUTION](../CONSTITUTION.md) / [PRODUCT](../PRODUCT.md): 長期の安全・権利・本人価値。趣味車という入口を全社Missionの制限にしない。
- [BUSINESS_MODEL](../BUSINESS_MODEL.md) / [MONETIZATION](../MONETIZATION.md): 収益候補と過去仮説。B2B確定表現と旧価格は今回のCEO修正に従って読む。
- [MEASUREMENT_PLAN](../MEASUREMENT_PLAN.md) / [CONTRIBUTION_INCENTIVES](../CONTRIBUTION_INCENTIVES.md): 低頻度の実用再利用、提供者への還元、事実と人気の分離。
- [STRATEGY_REVIEW_V2](../STRATEGY_REVIEW_V2_2026-09.md): 採用待ちの提案。Native等の凍結提案を自動的に正式決定へ昇格させない。

旧Home方針、Nativeの着手条件、α写真共有の旧記述、料金・無料枠の過去スナップショット等には整合課題があります。本PRではそれらを一括改訂せず、今後のDecision Briefで必要範囲を明示します。

## 今回の範囲と次の停止点

本PRは会社文書と[PROJECT_STATE](../PROJECT_STATE.md)のcheckpointのみです。application code、DB、dependency、外部サービス設定、課金、公開、利用者・工場への連絡は変更・実行しません。

Founderによる文書レビューとmain mergeは未実施です。v0.1 merge後、別タスクの明示依頼で[最初の経営テスト](OPERATING_SYSTEM.md#最初の経営テストmerge後の別タスク)を実施します。本PRでは経営判断、価格決定、実験開始、上位AI契約の購入を行いません。
