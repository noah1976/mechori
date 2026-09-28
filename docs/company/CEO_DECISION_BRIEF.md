# CEO_DECISION_BRIEF

株式会社メカリィ AI Operating System v0.1 / 2026-09-28

新企画、大型変更、新規支出、価格、検証開始、重要な方針変更の共通書式です。AI recommendationは提案であり、CEO decisionの代わりではありません。

## 書き方

- CEOの専門知識を前提にせず、結論、必要な判断、根拠、費用、未知を平易な日本語で書く。
- 専門用語には「つまり何なのか」を併記する。例: 損益分岐＝売上が実費を賄い、現金赤字にならなくなる条件。
- 重要数字には`FACT / ESTIMATE / ASSUMPTION / UNKNOWN`、出典・確認日、期間・通貨・税込／税抜、分母を付ける。分類の詳細は[FINANCIAL_GUARDRAILS](FINANCIAL_GUARDRAILS.md)へ従う。
- 根拠がない欄はUNKNOWNとし、必要な確認と意思決定への影響を書く。費用不明を無料、未回答を賛成と解釈しない。
- 期待効果は実績と分ける。現金収支とFounder時間の参考ROI（時間に見合う効果の参考評価）を混ぜない。
- 過去価格はHistorical Pricing Hypothesesとして参照するだけで、現在価格や収益計画の基準にしない。
- 実装済み、仮説採用、顧客利用、実支払、継続採算をそれぞれ別の証拠で示す。

## 記入template

- 件名:
- 作成日・担当Function:
- 状態: `DRAFT / CEO DECISION REQUIRED`
- 関連する現行Decision・仮説・PR:
- 求めるauthorizationの対象・操作・環境・費用・データ範囲:

| 項目 | 記入すること |
| --- | --- |
| Decision required / 必要判断 | CEOが今決める具体的な選択と、今回決めないこと |
| Why now / なぜ今か | 待つと何が起きるか。期限や依存の根拠 |
| Problem / 問題 | 実際に誰が何で困ったか。推測と確認事実を分ける |
| Who benefits / 受益者 | Owner、Workshop、Knowledge提供者等へ返る価値 |
| Who pays / 支払者 | 誰が決裁し、何に対価を払うか。未検証ならそのまま記載 |
| Mission impact / Missionへの影響 | 維持可能性、専門家の価値、安全・権利への効果と不利益 |
| Revenue path / 収益への経路 | 接点→実利用→具体申込→実支払→更新。どこまで証拠があるか |
| Initial cost / 初期費用 | 実支出、設定・移行・検証の費用。未知と仮定を分ける |
| Recurring cost / 継続費 | 固定費、利用量に応じる費用、無料利用負担、上限・税・為替 |
| Founder time required / 必要時間 | 初回と反復の時間。実測と仮定を分け、現金利益とは別表示 |
| Expected benefit / 期待効果 | 何が改善するか、測り方、未検証仮説 |
| Break-even condition / 損益分岐 | 必要な実売上・件数と実費。根拠がなければ算出不能 |
| Maximum downside / 最大損失 | 支出・継続費・時間・権利・安全・データの損失、停止と撤退方法。上限不明ならUNKNOWN |
| Largest uncertainty / 最大の未知 | 判断を反転させ得る未確認事項 |
| Cheapest validation / 最安の検証 | 既存手段・手作業で先に確かめる方法、範囲、停止条件、承認事項 |
| Alternatives / 代替案 | より安い・小さい方法。費用、効果、弱点の比較 |
| Do nothing option / 何もしない | 延期・保留時の費用、失う学び、既存利用者への影響 |
| AI recommendation / AI推奨 | 推奨、根拠、確信の限界、反転条件。最終判断ではない |
| CEO decision / CEO決定 | 未決定の初期値はCEO DECISION REQUIRED。承認／不採用／保留、理由、条件、対象範囲、日付をCEO回答後に記録 |

## 根拠と状態の添付欄

| 観点 | 状態 | 根拠・確認日 | 未確認・次の確認 |
| --- | --- | --- | --- |
| Implementation / 実装 | UNKNOWN | 未記入 | 未記入 |
| Product hypothesis / 価値仮説 | UNKNOWN | 未記入 | 未記入 |
| Market validation / 選択・実利用 | UNKNOWN | 未記入 | 未記入 |
| Revenue validation / 支払・継続・採算 | UNKNOWN | 未記入 | 未記入 |

| 重要数字・単位・期間・分母 | 分類 | 値 | 出典・確認日／仮定・計算式 | 判断への影響 |
| --- | --- | --- | --- | --- |
| 未記入 | UNKNOWN | 未確認 | 確認方法を記載 | 未記入 |

価格、上位AI契約の連続黒字期間、安全余裕は、CEO回答がないまま既定値を埋めません。提案の承認を、契約・公開・送信等への一括承認として扱わず、[Human Approval Gates](OPERATING_SYSTEM.md#human-approval-gates)へ戻って実行範囲を確認します。
