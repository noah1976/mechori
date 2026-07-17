# INFRASTRUCTURE_COST

## 採用方針

MECHORIのWeb MVPは、次の構成を採用前提とします。2026-07-17時点では設計上の採用であり、アカウント作成、秘密情報登録、外部接続、本番デプロイ、課金開始はまだ行いません。

| 領域 | 採用方針 | 初期利用 |
| --- | --- | --- |
| Web | Next.js | モバイルファーストWebアプリ |
| ホスティング | Netlify | FreeでPreview中心、正式公開は別ゲート |
| DB・認証・Storage | Supabase | Freeで検証し、RLS確認後に接続 |
| AI | OpenAI API | サーバーからだけ呼び出し、機能別ゲート・キャッシュ・原価上限を必須化 |
| DNS | ムームーDNS | `mechori.com`を維持し、公開時にNetlifyとメール用レコードを設定 |

Provider SDKを画面や共通ドメインへ直接広げません。Supabase、Netlify、OpenAIのAdapterと設定を交換可能な境界に置きます。

## 現在の無料枠の見立て

以下は契約条件ではなく、2026-07-17に公式ページを確認した設計用スナップショットです。接続時と公開前に再確認します。

### Supabase

Freeは50,000 MAU、DB 500 MB、Storage 1 GB、egress 5 GB、cached egress 5 GBを含み、非アクティブなFreeプロジェクトは1週間後に一時停止対象です。小人数の招待テストでは認証MAUより、写真・動画のStorageと転送量が先に制約になりやすいと見込みます。

参照: [Supabase Pricing](https://supabase.com/pricing)

### Netlify

Freeは月300 creditsで、追加購入のないハードリミットです。公式表では本番デプロイ1回が15 credits、帯域1 GBが20 credits、Webリクエスト10,000件が2 creditsです。単純計算では本番デプロイ20回だけで300 creditsに達するため、日常確認はDeploy Previewを使い、本番公開をまとめます。

参照: [Netlify credit-based pricing](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)

## OpenAI APIの役割分担

AIを使わなくても、登録、閲覧、手入力、履歴、構造化検索、公開ナレッジの根拠表示は動作させます。AIは次の補助だけに使います。

- 低コスト層: OCR後の項目抽出、タグ候補、重複候補、短い翻訳
- 品質優先層: 公開KnowledgeCaseだけを根拠にした検索結果の文章化
- AIを使わない層: 権限判定、RLS、検索絞り込み、費用計算、安全判定、確定保存、公開判定

モデルIDと単価は環境設定または運用設定で渡し、コードへ固定しません。低コスト層と品質優先層は別モデルを評価できるようにします。

## 呼び出し順序

1. 同じ入力版・根拠事例版・プロンプト版の保存済み結果があれば再利用する。
2. DB検索と決定的な集計だけで目的を満たせる場合はAIを呼ばない。
3. 送信対象を構造化し、不要な本文、個人情報、全履歴を除く。
4. 最大出力トークンを機能ごとに制限し、呼出前に最大原価を見積もる。
5. 利用者別日次回数、利用者別日次原価、サービス全体月次原価の全ゲートを通った場合だけ呼ぶ。
6. 上限時は検索結果・入力画面・保存済み要約へ縮退し、重要な安全情報や本人データを隠さない。
7. 成功後に実トークン、キャッシュ入力、出力、概算原価、モデル設定版を記録する。本文は原価ログへ複製しない。

OpenAI側のProject Monthly budgetは通知用のソフト上限で、超過後もAPI処理が続きます。したがってMECHORI側のハードゲートを必須とします。

参照: [OpenAI project budgets](https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform), [OpenAI rate limits](https://developers.openai.com/api/docs/guides/rate-limits)

## キャッシュ方針

- MECHORI側では、車両一致範囲、KnowledgeCase集合、プロンプト版、言語、出力契約版から再利用キーを作る。
- 内容または根拠が変わるまで同じ要約を再生成しない。
- OpenAIのPrompt Cachingを活かすため、固定指示と出力スキーマを前、利用者ごとの可変データを後ろへ置く。
- キャッシュ読取・書込トークンを分けて測り、キャッシュ自体の費用があるモデルでは純削減額を確認する。
- 即時性が不要な管理用の再整理は、品質評価後にBatch APIを候補とする。

参照: [OpenAI Prompt Caching](https://developers.openai.com/api/docs/guides/prompt-caching), [OpenAI Batch API](https://developers.openai.com/api/docs/guides/batch)

## 概算シナリオ

次は、料金感を把握するための仮定であり、モデル採用決定や利用枠の確定ではありません。為替換算は分かりやすさのため`1 USD = 150円`と仮定し、税、画像入力、OCR、Web検索、再試行、Provider変更を含みません。

| 処理 | 参考モデル単価 | 1回の仮定 | 1回の概算 |
| --- | --- | --- | ---: |
| 項目抽出・タグ候補 | GPT-5.4 nano: 入力$0.20/M、出力$1.25/M | 入力2,500、出力300 tokens | $0.000875、約0.13円 |
| 根拠付き文章化 | GPT-5.6 Luna: 入力$1.00/M、出力$6.00/M | 入力5,000、出力700 tokens | $0.0092、約1.38円 |

1 MAUあたり月3回の低コスト処理と2回の文章化を行う仮定では、キャッシュなしで次の規模です。

| MAU | 月間API概算 | 150円/USD換算 |
| ---: | ---: | ---: |
| 20 | $0.42 | 約63円 |
| 100 | $2.10 | 約315円 |
| 1,000 | $21.03 | 約3,154円 |
| 10,000 | $210.25 | 約31,538円 |

参照: [GPT-5.4 nano pricing](https://developers.openai.com/api/docs/models/gpt-5.4-nano), [GPT-5.6 Luna pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna)

## 初期運用候補

契約時に所有者が金額を確認して有効化します。現時点の推奨開始値は次の通りです。

- 個人テスト: OpenAI Project budget通知`$5/月`、MECHORI側ハード上限`$5/月`
- 80%到達: 新規生成を管理者へ警告し、高価な処理の利用状況を確認
- 100%到達: 新規Provider呼出を停止し、キャッシュと非AI機能だけ継続
- 自動再試行: 一時エラーだけ、指数バックオフ、最大回数を限定
- 自動チャージ、上限引き上げ、上位モデル追加: 所有者の明示承認まで無効

招待人数を増やす前に、`1 Value MAUあたりAI原価`、キャッシュ命中率、AIなしで完了した割合、再生成率を確認します。人数の増加だけで上限を引き上げません。
