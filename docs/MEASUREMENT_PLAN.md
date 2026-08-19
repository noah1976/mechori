# MEASUREMENT_PLAN

## 文書の目的

MECHORIの初期検証を、登録者数や感想だけで判断しないための指標、算出式、記録方法を定義します。P0 / Founder TestとM1 / Closed Alphaでは内部の月次最小イベントを主指標とし、外部分析はGoogle Tag Manager経由のGA4とMicrosoft Clarityに限定します。

## 原則

- 指標を改善するために、不要な氏名、住所、正確な位置、VIN、ナンバー、自由本文を分析ログへ複製しない。
- 投稿件数を増やすことと、本人価値・情報品質を分ける。
- 整備は低頻度なのでDAUを成長目標にしない。MAUを継続の母数とし、月内に価値へ到達したValue Reach MAUと、価値を利用または蓄積したValue Action MAUを必ず併記する。
- 数値が悪いときに、分母や期間を後から変更して合格扱いにしない。
- AI要約の閲覧を検索成功とせず、根拠と一致範囲へ到達できたかを測る。
- GA4・Clarityへ、利用者ID、メールアドレス、車種、整備本文、Journal本文、検索語、部品番号、費用、画像内容をカスタム属性として送らない。
- Clarityの画面記録ではアプリ全体を明示的にマスクし、非公開内容を送信しない。初期は静的UIも含めてマスクし、必要な箇所だけを後から個別審査する。
- GTMで新しいタグ、変数、広告連携、User-ID連携、外部送信先を追加するときは、送信項目と目的を確認してから公開する。

## 共通の単位

### 整備記録の確認状態

確認状態は、身分証明書等による本人確認やKYCとは区別します。現時点では測定用語を定義するものであり、詳細なデータモデルや実装方式は確定しません。

- `利用者確認済み`: 入力した利用者自身が、記録内容を確認した状態
- `資料確認済み`: 整備明細、記録簿、領収書等の資料によって内容を確認した状態
- `工場確認済み`: 実際に作業した工場または担当者が、記録内容を確認した状態
- `未確認`: 記憶、推測、AI抽出候補等を含み、裏付けが完了していない状態

一つの記録に複数の確認根拠が関係する可能性があります。初期指標の記録件数は、特記がない限り、少なくとも`利用者確認済み`である記録を対象とします。`資料確認済み`と`工場確認済み`は、より強い裏付けとして別途観察します。

### Activated Owner

招待または登録から7日以内に、次をすべて完了した利用者です。

1. 車両を1台以上登録した。
2. 整備記録またはJournalを1件以上保存した。

### Recorded Vehicle

利用者確認済みの整備記録を1件以上持つ実車両です。DEMO車両、削除済み車両、記録のない車両は含めません。

### Meaningful Reuse

初回保存とは別の日に、次のいずれかを完了した利用です。

- 2件目以降の整備記録またはJournalを保存
- 未解決記録へ結果を追記
- 車両履歴または工場提示を表示・出力
- 症状検索を実行し、根拠または情報不足状態を確認
- プライバシー確認済み内容を本人操作で共有

単なるページ再読込や言語切替は含めません。

### Evidence Intake / Enrichment / Completed Evidence Loop

`Evidence Intake`は、Quick Record、Journal、Maintenance Record等によって、Vehicleへ本文、写真、作業事実等が最初に保存された状態です。保存数だけではEvidenceの品質や再利用成立を示しません。

`Evidence Enrichment`は、保存後に走行距離、使用部品、作業情報、症状、確認状態、結果等が、本人確認を保って追加された状態です。Quick Recordの投稿前必須にはせず、post-save enrichmentと後日の編集を含めます。

`Completed Evidence Loop`は、同じVehicle・記録・Evidenceについて、初回保存とは別に検索、閲覧、履歴共有、工場提示等のMeaningful Reuseが発生し、その後の対応・作業と、改善、変化なし、再発、未解決等の結果が追記された状態です。単なる閲覧、Like、AI要約生成だけでは完了に含めません。詳細なevent contractと集計窓は実データを確認してから固定します。

`Monthly Completed Evidence Loops`は長期North Star候補です。現αでは母数とKnowledge密度が小さいため唯一のKPIにせず、実際に複数のLoopを継続観測でき、入力元・再利用・結果追記を重複なく集計できる段階で主要経営指標への昇格を検討します。

現αでは、既存指標を優先しながら次をLeading Indicatorとして観察します。

- Quick Record保存成功とFirst Record Time
- 2件目の記録、再訪、30-day Meaningful Reuse
- post-save enrichmentまたは後日構造化追記
- 他者の記録閲覧と、根拠付き検索・工場提示等の再利用
- 結果・再発・未解決の追記
- α共有投稿の削除、公開範囲変更希望、写真公開への不安・後悔の定性Feedback

投稿後の後悔等は、現時点で新しいAnalytics基盤や自由本文収集を決定しません。削除・設定変更等の既存事実と人間QA・Feedbackで確認し、必要性とPrivacyを確認してから計測方法を決めます。

### αテスター由来の価値表現

α版テストユーザーから、次の定性Feedbackが得られています。人数や一致率を記録していないため、需要検証済みとは扱いません。

- 「整備士にとってのGitHub（ポートフォリオ）」
- 「クルマのカルテ（オーナーが変わっても残る整備記録）」

今後は、これらの言葉を誘導せずに、整備士が案件・確認・結果を技術実績として残したいか、Ownerが許可したVehicle履歴を譲渡・入庫時に引き継ぎたいか、そのために実際の記録・共有・再利用を行うかを定性・行動の両面で確認します。表現への共感だけをProduct-Market Fitや支払意思の証拠にしません。

### MAU / Value Reach MAU / Value Action MAU

`MAU`は暦月内に、ログイン済みで1回以上セッションを開始した重複しない利用者です。ログイン画面の表示、未ログインの公開ページ閲覧、運営者による代理操作は含めません。

`Value Reach MAU`は同じ暦月内に、次のいずれかへ本人操作で到達した重複しない利用者です。

- 愛車プロフィールまたは自分のGarageを表示
- 車両履歴を表示
- 症状・部品・車種ナレッジの検索結果を表示
- フォロー車両・車種・プロフィールの更新フィードを表示

`Value Reach MAU`は、価値への到達と導線を診断する指標です。到達しただけで、継続的な価値利用が成立したとは判断しません。

`Value Action MAU`は同じ暦月内に、次のいずれかを本人操作で行った重複しない利用者です。

- 整備記録またはJournalを保存・追記
- 未解決記録へ結果を追記
- 車両履歴を工場提示・出力・共有
- 根拠付き検索を実行し、その結果を評価
- 愛車を追加

`Value Reach MAU / MAU`は月次価値到達率として導線の診断に使います。`Value Action MAU`および`Value Action MAU / MAU`を、継続的な価値利用を判断する主要指標とします。通知を開いただけ、認証更新、言語切替、同一画面の再読込は、どちらにも含めません。DAU/MAUは異常な一日集中やキャンペーン依存を見つける診断値に限定し、開発目標にはしません。

P0 / Founder TestとM1 / Closed Alphaでは月次率が大きく振れるため、Value Reach MAUとValue Action MAUの人数と理由を併記します。`3-month Value Return`も観察し、単月の話題性と継続を分けます。

P0 / Founder TestとM1 / Closed Alphaでは`monthly_user_activity`へ利用者・UTC月ごとに最大1行だけ保存します。記録するのは最初と最後のセッション時刻、最後の価値行動時刻、実行済み価値イベント名だけです。閲覧ページ、車種、検索語、整備本文、Journal本文、画像、滞在時間、端末広告IDは保存しません。計測はマイグレーション適用後に環境設定で明示的に有効化し、未適用時は機能を止めず計測だけ行いません。

GA4とClarityは導線・表示崩れ・操作上の詰まりを把握する補助計測であり、MAU・Value Reach MAU・Value Action MAUの正本にはしません。GTMコンテナはNetlifyへ配信する全ページで読み込みますが、ローカル開発では読み込まず、公開するタグは分析目的に限定し、広告・リマーケティング用途には使いません。EU圏を対象にする前に、同意管理と各タグの発火条件を実装・確認します。

### Evidence-backed Search Success

次のすべてを満たす検索セッションです。

1. 検索対象車両または検索範囲が明示されている。
2. 根拠事例が1件以上ある、または情報不足が明示されている。
3. 根拠ありの場合、主張から出典へ移動できる。
4. 利用者が「次に確認する手掛かりになった」「情報不足が分かった」のいずれかを選ぶ。

「必ず直ると思った」は成功評価として用いません。

## 指標と算出式

| 指標 | 算出式 | M1仮目標 | M2仮目標 |
| --- | --- | ---: | ---: |
| Activation Rate | Activated Owner / 登録者 | 60% | 65% |
| MAU | 月内にログインセッションを開始した重複なし利用者 | 人数を観察 | 前月比と獲得理由を確認 |
| Value Reach MAU Rate | Value Reach MAU / MAU | 観察 | 観察 |
| Value Action MAU Rate | Value Action MAU / MAU | 50% | 60% |
| 3-month Value Return | 3か月前と当月の両方でValue Action MAUである利用者 / 3か月前のValue Action MAU | 観察 | 30% |
| 30-day Meaningful Reuse | 30日以内のMeaningful Reuse利用者 / Activated Owner | 40% | 45% |
| 90-day Meaningful Reuse | 90日以内のMeaningful Reuse利用者 / Activated Owner | 観察 | 30% |
| First Record Time | 登録から最初の保存までの時間の中央値 | 計測 | 短縮傾向 |
| Records per Recorded Vehicle | 利用者確認済み記録 / Recorded Vehicle | 3件以上 | 4件以上 |
| Result Follow-up Rate | 結果追記された未解決記録 / 追記期限を迎えた未解決記録 | 観察 | 25% |
| Completed Evidence Loops | 再利用後に対応・作業と結果追記まで確認できたEvidence Loop | 定性・件数観察 | 定義を固定して件数観察 |
| Search Success Rate | Evidence-backed Search Success / 評価された検索 | 40% | 50% |
| Organic Acquisition Share | 個別勧誘以外の登録 / 全登録 | 観察 | 20%以上 |
| Owner Plus Intent | 具体価格で有料参加意思を示した人数 | 観察 | 10人 |
| Professional Design Partners | 実タスク検証へ参加する工場 | 1〜2拠点 | 3拠点 |

目標は仮説です。M1開始前に期間と分母を固定し、M1終了後に理由を記録してM2目標を更新します。

## AI/OCR原価計測（β）

AI・OCRの通常利用は無料の基本体験として扱い、βでは課金売上を急がず、実費性処理の上限を判断できる最小限の計測を先に整えます。通常利用を超える追加枠を将来設ける場合も、決済を先行させず、実際に上限へ到達する利用者が現れてから導入を判断します。

利用者ごとに、次の情報を内部計測できるようにします。

- 利用者を特定しすぎない内部ID
- 処理種別（AI整理、要約、翻訳、OCR等）
- 入力・出力の量または回数
- 処理結果、処理日時、推定原価
- 無料枠、追加枠、現在の上限利用量
- 失敗した処理は利用枠を消費しないこと
- `platform_super_admin`による枠の追加・免除、理由、実施者、日時

本文、画像、秘密情報、アクセストークン、メールアドレスを計測値へ複製しません。上限管理と免除は監査可能にし、原価が月額上限を超える可能性のある設定は所有者の明示承認なしに有効化しません。

## 最小イベント辞書

将来サーバー計測する場合も、次の最小項目に限定します。

共通属性:

- `event_id`: 重複防止用ID
- `anonymous_actor_id`: 内部ユーザーIDとは分離した分析用ID
- `session_id`: 短期セッションID
- `occurred_at`: UTC日時
- `app_version`: 画面・仕様の版
- `locale`: 計測時点の対応UI言語コード。初期は`ja`または`en`。投稿原文言語や本文は含めない
- `referral_channel`: 許可された列挙値

イベント候補:

| イベント | 記録する最小属性 | 記録しないもの |
| --- | --- | --- |
| `invite_accepted` | 招待経路コード | 招待者名、メッセージ本文 |
| `session_started` | 月・アプリ版 | 閲覧ページ、滞在時間、端末広告ID |
| `vehicle_created` | 車両種別、モデル内部ID | VIN、ナンバー、自由記述 |
| `maintenance_saved` | 非公開/確認待ち、作業数 | 症状本文、部品番号、費用 |
| `journal_saved` | 公開範囲、ブロック数、メディア有無 | 本文、画像、動画 |
| `history_viewed` | 月・アプリ版 | 履歴内容、車両情報、閲覧時間 |
| `history_reused` | 工場提示、JSON出力、共有の種別 | 出力・共有内容 |
| `knowledge_searched` | 車種スコープ、結果状態、出典数 | 検索原文 |
| `search_feedback_given` | 手掛かり、情報不足、役立たず | 自由回答本文 |
| `result_followed_up` | 解決、未解決、反対結果 | 整備内容本文 |
| `share_initiated` | 共有種別、公開確認状態 | 共有先アカウント |
| `garage_viewed` | 月・アプリ版 | 車種名、車両情報、閲覧時間 |
| `feed_viewed` | 月・アプリ版 | 閲覧した投稿ID、滞在時間 |
| `paid_interest_recorded` | プラン候補、提示価格ID、意思 | 決済情報、自由会話全文 |

Value Reach MAUは、`garage_viewed`、`feed_viewed`、`history_viewed`、検索結果が表示された`knowledge_searched`等から判定します。Value Action MAUは、`vehicle_created`、`maintenance_saved`、`journal_saved`、`result_followed_up`、`history_reused`、または根拠付き検索と同一セッションで記録された`search_feedback_given`等から判定します。イベント名だけで本文や車両情報を追加収集しません。

自由回答は分析イベントへ入れず、本人同意を得たインタビューメモとしてアクセス制限・削除期限を分けます。

M1では、車種名だけで結論を出さず、本人が自己選択した次の粗い区分で比較します。区分は複数選択を許容し、広告プロファイルには使いません。

- 旧車・ネオクラシック / 現行車
- 国産 / 輸入
- DIYあり / 工場整備中心
- 趣味車 / 日常車 / 両方
- 単数所有 / 複数台・バイク併有

各区分の人数が少ない間は率を優劣ランキングとして公表せず、インタビューと合わせて次の検証クラスターを選ぶためだけに使います。

## P0 / Founder Testの手動計測

所有者自身の検証では、表計算や分析サービスを新設せず、1回ごとに次を記録します。

```text
実施日
対象資料・操作
開始時刻 / 終了時刻
完了できたか
迷った箇所
手入力した項目数
修正した候補数
後で再利用した場面
検索で得られた根拠数
情報不足だった点
```

実際の整備内容や個人情報をこの計測表へ重複保存しません。記録IDだけを参照します。

## M1の週次レビュー

毎週、次だけを15〜30分で確認します。

1. 新規登録、Activated Owner、Recorded Vehicle、MAU、Value Reach MAU、Value Action MAU
2. 最初の記録までに止まった画面
3. 2回目利用が発生した理由
4. 検索ゼロ件と、役立たなかった検索
5. 公開確認、通報、プライバシー、安全上の問題
6. 運営者が個別対応に使った時間

利用者ごとの順位表は作りません。個別に連絡する場合は、テスト参加同意の範囲内で行います。

## 判断ルール

- Activation Rateが40%未満なら、募集人数を増やさず初回入力を直す。
- Meaningful Reuseが低ければ、通知を増やす前に本人へ返る履歴価値を見直す。
- MAUだけが伸びValue Reach MAU Rateが下がる場合は、キャンペーンや通知を成功扱いせず、月内に戻った目的と到達できなかった価値を確認する。
- Value Reach MAU Rateは維持されてもValue Action MAU Rateが下がる場合は、閲覧到達を成功扱いせず、保存、追記、履歴再利用、検索評価、愛車追加のどこで止まったかを確認する。
- `3-month Value Return`は、3か月前にValue Action MAUだった利用者を母集団とし、そのうち当月にもValue Action MAUとなった割合を測るコホート指標とする。値が低ければ、投稿頻度を上げる機能ではなく、履歴再利用、検索、未解決追記、記録追加のどれが再訪理由にならなかったかを調べる。
- 検索成功率が低ければ、生成文を増やさず車種を絞って出典を集める。
- 入力件数だけ伸び、結果追記がない場合は、未解決記録のフォロー導線を直す。
- サポート時間が利用者増加に比例して増える場合は、一般公開を遅らせる。

## 将来の外部分析導入条件

- M1の手動集計で、必要なイベントが実際に使われた。
- 無料または低コストの選択肢、保存地域、保持期間、削除、同意を比較した。
- 広告識別子や不要な行動追跡を使わない。
- 所有者が費用とデータ取扱いを承認した。

導入時は`docs/EXTERNAL_SERVICE_CHECKLIST.md`に従います。

## ローカルプロトタイプの計測

現行Web試作は、外部分析SDKへ送らず、匿名の端末内ID、イベント名、UTC日時、アプリ版だけを別のlocalStorage領域へ保存します。自由本文、車種名、記録ID、検索語、画像、プロフィールIDは保存しません。

- 同一日の`session_started`、`garage_viewed`、`feed_viewed`、`history_reused`は重複保存しない。
- 最大500件、最大400日を上限とする。
- DEMOリセット時に削除する。
- この端末内実装はイベント定義と画面導線の検証用であり、複数利用者の本番MAU集計には使用しない。

## Authenticated Home Feed-firstのα仮説

Following FeedをAuthenticated Homeのfirst surfaceに置くのは、記録や整備の用事がない日にも再訪理由、Evidence discovery、Meaningful Reuseが生まれるかを確かめるためである。WAU / MAUの改善は実測前の仮説であり、Feed閲覧数だけを成功指標にしない。

- 既存の`feed_viewed`、Journal detail open、Like、`garage_viewed`、Quick Record start / save、2回目session / recordの時系列を、個人本文・Vehicle identifierを増やさず確認する。
- Feed閲覧が増えても、detail open、Garage visit、記録、結果追記、Meaningful Reuseへつながらなければ、単なる消費時間を成功扱いにしない。
- αの少人数では数値を一般化せず、再訪理由と「他Owner / Vehicleの記録から役立ったこと」を短いinterviewで補完する。

## α Signature Experienceの仮説

Quick Record保存後の履歴previewとReference Garageは、投稿数を増やすためのgamificationではなく、記録がVehicle Evidenceへ育つ価値を理解できるかを確認する実験である。Evidence GraphやAI extractionの実装・効果を意味しない。

- 既存の`journal_saved`、`garage_viewed`、`history_reused`だけを継続して扱い、新しい外部分析serviceは導入しない。
- Human QAでは「保存直後に何が残ったと理解したか」「Reference Garageを見て自分も記録を続けたいと思ったか」「説明なしで次の行動が分かったか」を尋ねる。
- 数値が少ないαでは、Reference Garageの閲覧数だけを成功とせず、2件目の記録、任意enrichment、後日のGarage再訪と定性回答を合わせて判断する。
