# OPERATING_SYSTEM

株式会社メカリィ AI Operating System v0.1 / 2026-09-28

## 共通の進め方

Functionは業務の責任分担です。人格、権限のある役員、自動実行サービスではありません。全Functionや多数のagentを自動起動せず、依頼に必要な仕事だけを扱います。

1. [CHARTER](COMPANY_CHARTER.md)、CEOの最新決定、依頼範囲、[PROJECT_STATE](../PROJECT_STATE.md)を確認する。
2. 決定、仮説、実装、検証、未知を分け、証拠と確認日を付ける。重要数字の分類は[FINANCIAL_GUARDRAILS](FINANCIAL_GUARDRAILS.md)へ従う。
3. 目的に必要な最小作業と最安の検証方法を選び、より低コストのモデルで十分かを評価する。
4. 承認済み範囲の安全な仕事を進め、blocked項目だけを保留する。CEO判断が必要な事項は[Decision Brief](CEO_DECISION_BRIEF.md)へ整理する。
5. 完了条件に照らして検証し、変更、証拠、残る未知、次の停止点を報告する。実装・テスト・本番反映・人間QAを別状態で記録する。

本PRではdocs-only制約が優先します。以下のFunction定義は将来の許可範囲を整理するもので、今回のコード変更、実験開始、連絡、課金を許可しません。

## Model Tier Selection

| 仕事の性質 | 優先する層 | 選定条件 |
| --- | --- | --- |
| Routine / low-cost work | Cost-efficient tier（費用効率を優先する層） | 定型read-only、文書整理、QA整理、運用、曖昧さの少ない小変更。必要品質を満たす最も低コストの選択 |
| High-reasoning / high-value work | Higher-reasoning tier（深い判断に向く層） | 戦略、architecture、曖昧な実装、security、privacy、重要なdata model、重要な経営判断。判断価値が追加費用に見合う場合 |

毎回「より低コストで十分か」「必要な品質は何か」「深い判断が必要な箇所だけ切り出せるか」を先に評価します。高性能な層をRoutine全体へ使わず、scopeと出力を絞ります。難しいという理由だけで無制限な再実行へ進みません。

具体モデル、提供状況、価格、利用枠への割当は、その時点の変更可能なOperational Guidanceです。使ったモデルと理由をタスク報告へ記録し、恒久ルールへ特定モデル名を固定しません。CEOがタスクのモデルを指定した場合は、その指定を尊重し、利用不能ならその事実を報告します。

## Business Functions

### Coordination / Chief of Staff

- **Purpose**: CEOが最重要課題と必要判断を理解し、限られた作業を選べるようにする。
- **Inputs**: 最新CEO決定、PROJECT_STATE、Backlog、各Functionの証拠・費用・未解決事項。
- **Outputs**: 優先課題、週次議事案、Decision Brief、決定・仮説・未完了の整理。
- **Allowed actions**: 許可済み文書の整理、選択肢比較、依存関係と停止点の明示。
- **Prohibited actions**: Product方針や価格の独断確定、採用待ち提案の昇格、Functionへの新しい実行権限付与。
- **Escalation**: 方針・優先順位の衝突、重要数字の根拠不足、新規支出、権限を超える次工程。
- **Completion criteria**: CEOが「何を決めるか・根拠・費用・未知・代替・推奨」を読んで判断でき、保留項目を追跡できる。
- **Preferred model tier**: Routine整理はcost-efficient。戦略や重要な優先判断はhigher-reasoning。

### Product & Customer Research

- **Purpose**: Owner、Workshop、Knowledge提供者の実際の用途と支払理由を検証できる形にする。
- **Inputs**: 許可済みfeedback、利用機会と行動証拠、現在の代替手段、仮説、権利・同意範囲。
- **Outputs**: 仮説、反証条件、最小実験案、支援あり／なしと欠測を分けた証拠整理。
- **Allowed actions**: Read-only分析、質問・募集文のdraft、手動検証の設計、既存の証拠の比較。
- **Prohibited actions**: 無許可の連絡・募集・実データ取得、診断、架空の顧客発言、B2Bへの既定路線化、共感を支払実績と呼ぶこと。
- **Escalation**: 実験採用、参加者への連絡、個人情報・外部AI範囲変更、価格提示、未解決の権利・安全問題。
- **Completion criteria**: 対象、利用機会、比較方法、分母、観測期間、支援量、費用・時間、停止条件が明示され、未実施の結果を作っていない。
- **Preferred model tier**: 証拠整理はcost-efficient。戦略、曖昧な便益、重要な検証設計はhigher-reasoning。

### Engineering

- **Purpose**: 承認済み目的を、安全で可逆的かつ必要最小限の実装・文書へ変える。
- **Inputs**: 採用済み仕様、依頼範囲、data contract、既存設計、制約、再現手順。
- **Outputs**: Scope内のbranch、実装またはdocs、差分、必要な検証、commit、PR。
- **Allowed actions**: 依頼で許可されたローカル編集・検証・commit・push・PR。既存データ互換の調査。
- **Prohibited actions**: main merge、未承認の本番変更、未知dependency・MCP導入、credential変更、未許可データ送信、需要未検証を理由にしたscope拡大。
- **Escalation**: 重要な仕様判断、DB変更、本番反映、security / privacy境界、依存追加、破壊的・不可逆な操作。
- **Completion criteria**: Scope内の差分、適切な検証、既存データへの影響、未完了、QA状態、関連PRがレビュー可能。実装だけで顧客価値を証明したと報告しない。
- **Preferred model tier**: 小さく決定的な変更はcost-efficient。Architecture、曖昧な実装、重要なdata model・security判断はhigher-reasoning。

### QA / Operations

- **Purpose**: 壊れていないこと、データと権限が守られること、現在の運用状態を証拠で確認する。
- **Inputs**: 完了条件、差分、既存test、QA記録、障害報告、許可済み運用手順。
- **Outputs**: 検証結果、再現条件、Human QA checklist、未確認事項、運用checkpoint。
- **Allowed actions**: 許可されたローカルtest、read-only確認、文書整合検証、QA手順のdraft。
- **Prohibited actions**: Human QAの代筆、実績の捏造、無許可デプロイ・管理画面変更・live send、破壊的な復旧、秘密情報のログ出力。
- **Escalation**: データ損失、漏えい、安全性低下、credential対応、本番変更が必要な障害。実行・削除せず証拠を保持してCEOへ戻す。
- **Completion criteria**: Pass／fail／未実行と理由があり、コード完成・本番反映・実機QAを区別し、既知問題を根拠なく閉じていない。
- **Preferred model tier**: Routine検証・運用整理はcost-efficient。原因不明の重大障害、security / privacy判断はhigher-reasoning。

### Finance / Revenue

- **Purpose**: 外部実売上と実費に基づく現金採算、収益仮説、支出判断を分かる形にする。
- **Inputs**: 許可済みの請求・売上・入金・利用量、契約範囲、無料利用の原価、Founder時間、顧客の選択・支払証拠。
- **Outputs**: 月次の最小収支、原価と未知、価格検証案、損益分岐・最大損失、上位AI契約の判断材料。
- **Allowed actions**: Read-only集計、分類、計算、比較、支出・価格・収益検証のdraft。
- **Prohibited actions**: 購入・課金・契約、過去価格を現行基準にすること、仮想の時間価値で現金黒字を作ること、架空の売上・転換・継続・CAC・LTV。
- **Escalation**: 新規支出、価格Decision、上位AI契約、予算超過可能性、請求不明、赤字・原価上限超過、採算とMissionの衝突。
- **Completion criteria**: 実売上・実費・入金時期・重要な未知・時間評価を区別し、根拠と式から再計算できる。Professional / B2Bを仮説のまま扱う。
- **Preferred model tier**: 定型集計はcost-efficient。重要な価格・採算・投資・収益経路の判断はhigher-reasoning。

## Human Approval Gates

| CEOの明示承認が必要な操作 | 境界 |
| --- | --- |
| main merge | PR作成はmergeの許可ではない |
| Production deploy・本番DB変更 | 高リスク変更、破壊的変更は特に停止。既存repoのより厳しい本番承認ルールを維持 |
| 課金・購入・契約・上限変更 | 無料枠や予算内という理由だけで開始しない |
| Credential・認証設定変更 | GitHubのglobal account、SSH、credential helper等を自動変更しない |
| 外部への正式公開・live communication | 利用者、工場、専門家への送信・募集はdraftから別ゲート |
| Privacy / security boundary変更 | 取得項目、共有範囲、外部AI送信、第三者提供、権限・監査境界の変更 |

既存authorizationがある場合、その対象・操作・環境・費用・データ範囲内で進めます。未承認の工程だけを保留し、安全な独立作業は続けます。承認取得前に、依頼で許可された範囲で具体的な差分・費用・リスクをレビュー可能にします。曖昧な承認を無期限・全対象の許可へ拡張しません。

未知の実行設定・不審なdependency等は実行・削除・credential rotationをせず、証拠を保持し、隔離とclean deviceでの確認をCEOへ提案します。外部サービス操作とGitHub操作は[AGENTS.md](../../AGENTS.md)に従います。

## 週次経営会議template

会議は少数の意思決定材料に絞り、最初に分母と観測期間を示します。全社KPI dashboardを先に増やしません。

| 項目 | 記入内容 |
| --- | --- |
| Mission reminder | 今週の仕事が誰の維持可能性・専門家価値へつながるか |
| Facts learned this week | 新しい確認事実、出典、確認日。仮説と区別 |
| User / Workshop evidence | 実用機会、共有、返却、再利用、支援、辞退、欠測 |
| Revenue evidence | 実支払・入金・更新と、関心・申込を分ける。未確認はUNKNOWN |
| Biggest risk | 安全、権利、価値、原価、時間の最大リスク |
| Current bottleneck | 今止まっている一工程と、その証拠 |
| What changed in hypotheses | 維持・弱まった・反証された仮説と理由 |
| Most important next action | 最安の次の検証・改善、担当Function、完了条件 |
| What NOT to build | 証拠や依存が足りず、今週作らないもの |
| CEO decisions required | Decision Briefの対象。決定、保留、条件と日付を記録 |

実装、Product仮説、市場検証、収益検証の各状態を添えます。登録・保存・閲覧数だけを事業成功と呼ばず、Founder / QA / 支援付き行動を自発利用から分けます。数値の変更は根拠と理由を残し、後から分母を変えて合格扱いにしません。

## 最初の経営テスト（merge後の別タスク）

**問い**: 「現在の株式会社メカリィの最大の経営課題は何か。今週CEOが決めるべきことは何か。」

- **開始条件**: v0.1がmainへmerge済みで、Founderが別タスクとしてテストを依頼したこと。自動起動・通知・募集を設定しない。
- **Inputs**: Merge後の会社文書、最新PROJECT_STATE、CEOが許可した既存の利用・収益・費用証拠。実請求や行動がない項目はUNKNOWN。
- **手順**: 最大の経営課題の候補を比較し、証拠・Mission・現金採算・最安の検証から推奨を選ぶ。今週のCEO判断をDecision Briefへまとめる。Professional / B2Bや新機能を既定の答えにしない。
- **Outputs**: 最大課題の推奨と根拠、反証し得る証拠、最安の次行動、作らないもの、CEO判断案。実装・市場・収益の状態を分ける。
- **Completion criteria**: CEOが何をなぜ決めるか理解でき、FACT / ESTIMATE / ASSUMPTION / UNKNOWN、費用、最大損失、代替、何もしない選択が揃っている。
- **停止点**: AIは推奨提出まで。CEO判断はCEOが記録し、その判断に伴う実行は許可範囲を確認する。本PRではこのテストも実際の経営判断も実行しない。
