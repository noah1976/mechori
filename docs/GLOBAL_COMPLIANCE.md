# Global Compliance Review

## Document Metadata

- **Document Status**: RESEARCH_FRAMEWORK
- **Last Reviewed**: 2026-08-13
- **Next Review**: TBD
- **Owner**: MECHORI Product Owner
- **Scope**: 地域別の法令・規制要求を、MECHORIのProduct Requirement、設計、実装、検証へ追跡するための管理基盤
- **Research State**: 具体的な法令調査は未実施

この文書は利用規約、Privacy Policy、法律解説書、法的助言ではない。既存の`PRIVACY`、`TRUST_AND_VERIFICATION`、`SAFETY`、`MODERATION`、`AI_POLICY`、`PROFESSIONAL_PLATFORM`、`DATA_MODEL`等を置き換えず、それらへ調査結果と判断を接続するCompliance Matrixである。

## Operating Principles

- 今回はWeb検索、法律調査、法的結論、実装変更を行わない。未調査項目は`RESEARCH_NEEDED`として残す。
- 将来の調査は一次資料を優先し、重大なProduct Decisionを二次資料だけで確定しない。
- AI・内部調査は法的助言ではない。正式公開前や判断が難しい事項は、必要に応じて専門家レビューへ送る。
- 法改正、公式ガイダンス、MECHORIの機能変更に応じて再確認する。
- α・βを直ちに停止する文書ではない。具体的な問題が確認された場合は、別途Product Ownerが判断する。

## Source Priority

将来の調査では、原則として次の順で確認する。

1. Legislation / official gazette
2. Regulator / government source
3. Official guidance
4. Court or official decision where relevant
5. Reputable legal commentary
6. Secondary article

重大な判断では、一次資料とその発行主体、版、日付、対象地域を記録する。情報源が未確認の場合、`Primary Source`は空欄または`TBD`とする。

## Target Regions

初期対象地域は次のとおり。地域を追加する場合は、この一覧とMatrixの`Region`を同時に更新する。

| Region | Research status | Notes |
|---|---|---|
| Japan | RESEARCH_NEEDED | 国内正式公開とα・β運用の基準地域 |
| EU / EEA | RESEARCH_NEEDED | 地域内差分と域外移転を含めて確認 |
| United Kingdom | RESEARCH_NEEDED | EU / EEAとは別に確認 |
| United States | RESEARCH_NEEDED | 州・機能・利用者属性による差分を確認 |
| Australia | RESEARCH_NEEDED | 正式公開前に確認 |
| Canada | RESEARCH_NEEDED | 連邦・地域差分を確認 |

## Research Status Model

`Status`は調査・設計・実装の状態であり、法的適合性の保証ではない。

| Status | Meaning |
|---|---|
| RESEARCH_NEEDED | 一次資料による調査が未完了 |
| RESEARCHED | 出典を記録した調査メモがある |
| PRODUCT_DECISION_NEEDED | 調査結果をProduct Policyへ反映する判断が必要 |
| DESIGN_DECIDED | Product responseと設計方針を決定済み |
| IMPLEMENTATION_NEEDED | 設計をコード、運用、契約等へ反映する必要がある |
| IMPLEMENTED | 実装・運用反映を完了した |
| VERIFIED | 指定した検証を完了した。法的保証ではない |
| LEGAL_REVIEW_NEEDED | 専門家確認なしに確定しない |
| NOT_APPLICABLE | 現行の対象、地域、機能には適用しないと整理した |

## Compliance Matrix Schema

将来の各調査項目は、少なくとも次の列で管理する。未確定の列は`TBD`、調査前は`RESEARCH_NEEDED`と記録する。

| Field | Purpose |
|---|---|
| Region | 対象地域・国・州等 |
| Topic | Children、Privacy、Location等の調査カテゴリ |
| Requirement / Question | 法令要求の断定ではなく、調査する質問 |
| Primary Source | 一次資料のURL、文書名、識別子 |
| Source Date / Version | 発行日、改訂日、版 |
| Applicability | 対象機能、利用者、地域、公開段階 |
| Product Impact | MECHORIの設計・運用への影響 |
| Existing MECHORI Design | 既存文書、データモデル、運用方針 |
| Required Change | 必要な変更、または変更不要の根拠 |
| Implementation Reference | ファイル、route、RPC、運用手順等 |
| Status | 本文のStatus Model |
| Timing | 本文のTiming Classification |
| Product Response | 本文のProduct Response Classification |
| Legal Review | 専門家確認の要否・状態 |
| Notes | 前提、未解決点、再確認条件 |

## Research Categories

以下は要求を確定した一覧ではなく、一次資料で確認するための質問領域である。

| Code | Topic | Initial questions | Priority |
|---|---|---|---|
| A | Children / Minors | minimum age、age assurance、parental consent、child privacy / safety、default visibility | HIGH |
| B | Privacy / Personal Data | data minimization、consent / lawful basis、sensitive data、profile / vehicle data、retention | HIGH |
| C | Location / Drive Log | precise / background location、route history、photo location、live sharing、retention、default privacy | HIGH |
| D | UGC / Platform Responsibility | reporting、takedown、objection / appeal、moderation、rights infringement、transparency、evidence history | HIGH |
| E | Identity / Disclosure | disclosure requests、preservation、lawful requests、user notification where applicable | MEDIUM |
| F | AI / Maintenance Information | AI summary、diagnosis boundary、repair instruction、uncertainty、sources / evidence、professional judgment | HIGH |
| G | Professional / Service Provider | business accounts、user-added provider、claims、professional content、responsibility boundary | HIGH |
| H | Advertising / Monetization | targeted advertising、minors、consent、profiling、subscriptions、paid Professional features | MEDIUM |
| I | User Rights | access、correction、deletion、portability / export、account deletion、objection / restriction | HIGH |
| J | Cross-border Data | storage location、international transfer、subprocessors | HIGH |
| K | Security / Incident Response | breach handling、reporting、logs、backup、recovery | HIGH |
| L | Terms / Consumer Protection | Terms acceptance、Privacy notice、paid services、cancellation / refund、liability representations | HIGH |

## Regional Research Register

### Japan

具体的な法令名、施行日、適用要件は今回確定しない。今後、少なくとも次の調査場所を一次資料から確認する。

- 個人情報・プライバシー
- UGC、権利侵害、通報・削除・異議申立て
- 情報流通プラットフォーム関連
- 発信者情報開示等
- 未成年者
- 消費者保護、有料サービス
- AI・整備情報に関する責任境界

全項目の初期状態は`RESEARCH_NEEDED`、Timingは原則`C`または機能依存の`D`、Legal Reviewは`TBD`とする。

### EU / EEA, United Kingdom, United States, Australia, Canada

今回の具体的要求は記載しない。各地域について、A〜Lのカテゴリを対象に、一次資料、対象地域、対象機能、公開段階、Product Response、専門家レビュー要否を個別に記録する。

## Product Response Classification

調査後の対応は、法的要求そのものと混同しないよう次の分類で記録する。

- `Global default`: 全地域共通の安全・プライバシー既定値
- `Region-specific behavior`: 地域別の仕様差
- `Feature restriction`: 特定地域・利用者・機能の制限
- `Age-based behavior`: 年齢または年齢帯に応じた挙動
- `Consent flow`: 同意、許可、確認の導線
- `Operational process`: 通報、削除、保存、開示、事故対応等の運用
- `Terms/Policy only`: 規約・ポリシー・表示の更新
- `Legal review`: 専門家確認後に判断

## Timing Classification

- `A`: Data Model / Architectureへ今から備える必要がある
- `B`: β拡大前に必要
- `C`: 該当地域の正式公開前に必要
- `D`: 特定機能の公開前に必要（Drive Log、広告、Professional等）
- `E`: 専門家確認後に判断

## Architecture-Sensitive Register

後から変更すると高コストになり得るため、具体的な実装方式を決定せず、優先調査対象として記録する。

| Area | Research question | Timing | Status |
|---|---|---|---|
| Age / age-band | 年齢または年齢帯を扱う必要性、保存範囲、確認方法 | A / B | RESEARCH_NEEDED |
| Parental consent | 保護者確認の必要性と将来の導線 | A / B | RESEARCH_NEEDED |
| Minors visibility | 未成年者の公開範囲、social interaction、既定値 | A / B | RESEARCH_NEEDED |
| Precise location | 位置情報の取得・保存・共有・削除 | A / D | RESEARCH_NEEDED |
| Drive Log | route history、background location、履歴保持 | A / D | RESEARCH_NEEDED |
| Live sharing | リアルタイム位置共有と停止・相手範囲 | A / D | RESEARCH_NEEDED |
| Account deletion | account、workspace、media、関連データの削除契約 | A / B | RESEARCH_NEEDED |
| Data export | 本人データの出力形式、範囲、実行手順 | A / B | RESEARCH_NEEDED |
| Moderation history | report、temporary hide、takedown、appeal、履歴保全 | A / B | RESEARCH_NEEDED |
| Evidence provenance | user assertion、AI整理、Professional確認、公的資料の区別 | A / B | DESIGN_DECIDED |
| AI provenance | input、source、model/rule、review、correctionの追跡 | A / B | DESIGN_DECIDED |
| User / provider distinction | User-added ProviderとProvider-confirmed informationの分離 | A / B | DESIGN_DECIDED |
| Cross-border handling | storage、transfer、subprocessor、地域別運用 | A / C | RESEARCH_NEEDED |

## Existing MECHORI Design Mapping

この表は既存設計への入口であり、各文書の内容を複製しない。

| Compliance area | Existing source of truth | Review question |
|---|---|---|
| Privacy and data minimization | `docs/PRIVACY.md`, `docs/DATA_MODEL.md` | Vehicle、profile、media、recordの最小化・保持・削除・出力を地域別に確認する |
| Trust and evidence | `docs/TRUST_AND_VERIFICATION.md`, `docs/DATA_MODEL.md` | User assertion、AI候補、Professional確認、公的資料を混同しない運用を確認する |
| Safety and AI boundary | `docs/SAFETY.md`, `docs/AI_POLICY.md`, `docs/KNOWLEDGE_SYNTHESIS.md` | AIを診断者・整備士・保証者として扱わない表示・出力境界を確認する |
| UGC and moderation | `docs/MODERATION.md`, `docs/SAFETY.md` | report、temporary hide、block、appeal、moderation/correction historyを地域別要求へ対応付ける |
| Professional | `docs/PROFESSIONAL_PLATFORM.md`, `docs/PROFESSIONAL_DISCOVERY.md` | Organization、Provider、membership、Founding Garage、claim境界を確認する |
| Social and visibility | `docs/SOCIAL_LAYER.md`, `docs/PRIVACY.md` | Follow、Vehicle Discovery、record visibility、private data leakを確認する |
| Business and paid features | `docs/MONETIZATION.md`, `docs/BUSINESS_MODEL.md` | Professional、広告、subscriptions、refund等を正式公開前に確認する |
| User-facing policy | `docs/ALPHA_PLAYBOOK.md`, `docs/ALPHA_LAUNCH_CHECKLIST.md` | α・β・正式公開の段階と表示、運用、確認事項を対応付ける |

## AI and Professional Safety Principle

これは法的義務の断定ではなく、既存MECHORIのProduct Safety / Trust Principleとして追跡する。

- MECHORI AIは整備士・整備工場の代わりに実車の故障診断を行わない。
- AIは過去事例を整理し、類似事例、可能性、Evidenceを提示する。
- 「原因はこれ」「この部品を交換すべき」と不当に断定しない。
- 実車確認をした専門家の判断を尊重する。
- AI整理と実際の整備結果が異なる場合、その差分もEvidenceとして扱う。
- AI回答を工場への要求、診断書、保証として扱わせない。
- User-created Provider recordとProvider-confirmed informationを混同しない。

既存の詳細な境界は`docs/SAFETY.md`、`docs/AI_POLICY.md`、`docs/TRUST_AND_VERIFICATION.md`、`docs/PROFESSIONAL_PLATFORM.md`を正本とする。

## Drive Log Compliance Gate

将来Native版で予定するDrive Logは、公開実装前にCompliance Reviewを通す。想定するDrive Mode、route recording、stop/location、photo/memory、任意のリアルタイム友人共有、trip completion、distance/history、Web閲覧について、次を個別に確認する。

- precise / background location
- route history、photo geolocation、real-time sharing
- minorsとsocial interaction
- default visibility、retention、deletion、export

Native実装前は`RESEARCH_NEEDED`または`LEGAL_REVIEW_NEEDED`の項目を残したまま公開へ進めない。これはNative開発を禁止するものではなく、公開機能のGateである。

## UGC, Provider Disputes, and Minors

将来、「この工場でひどい整備をされた」というUser記録と、「事実と違う／権利侵害だ」というProvider側の主張が生じ得る。地域別調査では、既存のreport、temporary hide、takedown、appeal、moderation history、correction historyへどの要求を対応付けるかを記録する。今回、申立ての法的評価や削除基準は決めない。

Children / Minorsについて、MECHORIの年齢制限、年齢確認、保護者同意、公開既定値、位置情報、social interaction、広告の扱いは`PRODUCT_DECISION_NEEDED`とする。今回「何歳以上」等のProduct Policyは決定しない。

## Release Gates

- **Before broader international release**: Global Compliance Review required
- **Before Native Drive Log public release**: Location / minors / sharing Compliance Review required
- **Before advertising**: Advertising / profiling / minors review required
- **Before Professional monetization**: Professional / consumer / payment review required

αの継続利用をこの文書だけで停止しない。β拡大や地域別正式公開の判断では、対象地域、機能、一次資料、Product Decision、実装、検証、必要な専門家確認を追跡可能にする。

## Review Workflow

1. Region、feature、topicを決め、Requirement / Questionとして記録する。
2. 一次資料を確認し、source date/versionと適用範囲を記録する。
3. Product Impact、既存設計、必要変更、Timing、Product ResponseをProduct Ownerが整理する。
4. `LEGAL_REVIEW_NEEDED`の項目は専門家確認なしに確定しない。
5. Implementation Reference、検証結果、再確認日を更新する。
6. 法改正、機能追加、対象地域追加時に対象Matrixを再確認する。

## Open Decisions

- 地域別の初期公開対象と正式公開時期
- 年齢ポリシー、年齢確認、未成年者向け既定値
- 地域別の同意・通知・削除・出力運用
- Drive Logの位置情報保持・共有・削除
- 広告、Professional課金、越境データ処理の導入条件
- 専門家レビューの対象、時期、記録方法
