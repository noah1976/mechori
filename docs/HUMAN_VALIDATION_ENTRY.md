# Human Validation Entry v0.1

- 更新日: 2026-09-28
- CEO承認: 登録不要のTEST DATA閲覧QA＋3択Quick Feedbackの最小実装。募集・公開受付・本番DB適用・main mergeは未承認。
- 状態: `IMPLEMENTED / RECEPTION_CLOSED / DB_EXECUTION_VALIDATION_BLOCKED / HUMAN_QA_PENDING / RECRUITMENT_NOT_STARTED`
- 関連: MECH-049（P1）、[Human Validation Pipeline](HUMAN_VALIDATION_PIPELINE_2026-09.md)、[PROJECT_STATE §41](PROJECT_STATE.md#41-2026-09-28-human-validation-entry-v01-checkpoint)

## 参加とEvidence

```text
X / Facebook / direct（投稿・募集は別承認）
  → /qa?src=x または /qa?src=facebook（secretなしの共通URL）
  → TEST DATA・10分程度・登録不要・途中終了可の説明
  → 履歴の読取課題1つ、操作は最大3つ
  → 同じ画面の3択＋任意300文字 → 受付結果 → 終了
```

Founderの個別DM・招待発行・ログイン説明はこのQAには不要。実際の愛車で試したい人への既存α案内は構想だけを表示し、自動招待・membership・連絡先取得をしない。

データは手書きのexplicit TEST fixtureのみ。ログイン状態にかかわらず、`/qa`ではworkspace・通知providerをmountせず、実Garage / Journal / Passportを読み込まない。共有の履歴表示componentを再利用するが、Passport roundtrip公開デモではない。

結果はA Technical QA / B Usability・Comprehension QAの自己申告。次へ進む操作・「できた」だけからTechnical PASSを認定しない。C Product Use Observation / D Market Validation / E Revenue Validationへ自動昇格しない。機会なしはUNKNOWN。sourceは入口の自己申告で個人・人数・支援量を確定できず、x / facebookはFOUNDER NETWORK BIAS。重複UUID制御も同一人物の再参加判定ではない。

「Passportを守らない。Missionを守る。」課題版とTEST fixtureを独立させ、将来の別Entry Hypothesisにも流用できる小さい境界にする。CRM・survey builder・campaign・新analytics・AI・自動α参加は追加しない。

## 保存境界

| 対象 | v0.1 |
| --- | --- |
| 保存するもの | ランダムsubmission UUID（再送専用）、固定task、操作段階0〜3、版、server build SHAまたはunknown、source、coarse device、3択、任意本文、受付時刻 |
| source | x / facebook / direct / unknown。未指定はdirect、不正値はunknown |
| device | 画面幅によるmobile / tablet / desktop / unknown。端末機種、OS、full UAを読まない |
| 保存しないもの | IP、full UA、user ID、email、SNS handle、VIN、ナンバー、raw URL、invite / Passport token、実α data |
| 本文 | 300文字、NFKC正規化。空欄可。明らかなURL・連絡先・token・VIN等と制御文字は拒否。任意文の完全な匿名性を保証する判定器ではないため、入力前にも個人情報を書かない旨を表示 |
| 閲覧 | activeなα staff / adminだけの限定RPC。tableへanon / authenticatedの直接権限なし、RLS有効 |
| 送信 | same-originの`POST /api/qa-feedback` → public-keyの限定anon RPC。ユーザーsession・service-role keyは使わない |

APIはJSONのみ、streaming body上限2,048 bytes、timeout・一般化した失敗応答。RPCにも型・項目allowlist・文字数・本文検証を置く。public keyは秘密ではなく、直接RPC呼出しは可能な設計なので、DBの検証・quota・kill switchが最終境界になる。

`submit_human_qa_feedback`だけにanon EXECUTEを許可する。staff一覧・受付状態はactive staff条件、受付変更・削除はactive admin条件を関数本体でも確認する。他の既存DB機能の権限は拡張しない。

## Abuse・停止

- 一つのDB transaction advisory lockで、受付・重複・quota・insert・停止操作を直列化する。既存UUIDの再送はduplicateで、再保存しない。UIは同時送信を拒否し、通信失敗時も最初のpayload / UUIDを再利用する。
- quotaは**全体10件 / rolling 10分、100件 / rolling 24時間**。IP・cookie・fingerprintingによる個人別制限ではない。botが枠を消費して正当な参加を妨げる可能性は残る。429で入力を保持し、追加募集やquota拡大へ自動的に進まない。
- APIの`MECHORI_QA_RECEPTION`は`enabled`以外で停止、DB receptionも初期値false。双方の有効化が必要。APIだけを止めても直接RPCは止まらないため、**緊急停止は既存`/admin`でDB受付を停止**する。これによりAPI経由・直接RPCの新規保存を止める。
- CAPTCHA・新サービス・識別情報による対策は導入しない。HTTP/RPCへのリクエスト自体の費用・負荷をquotaだけで完全には抑えられない。負荷や迷惑投稿が続けばDB受付を停止し、CEOへ縮小案を戻す。

## Raw feedback保持：最大30日

新しいschemaだけを対象にする。既存alpha_feedback・アカウントは削除しない。匿名集計を自動保存する別tableは作らない。

**開始前にFounder / adminが毎日24時間以内に実行できる担当・時間を決める。** `/admin` →「画面QAの結果」→「29日経過したQA結果を削除」。`purge_human_qa_feedback`は29日経過分を削除し、日次間隔の1日を余裕にする。受付停止後も、最後の保存分の削除まで継続する。削除成功と件数・実行日時だけを運用記録へ残し、本文・UUIDをGitや外部AIへ複製しない。送信RPCも30日経過分を削除し、staff一覧は30日未満だけを返すが、非表示や受付停止だけでは削除完了としない。

日次処理を守れない場合は開始しない。運用中に未実施が判明したらDB受付を止め、admin purgeを実行し、超過の有無をCEOへ報告する。自動schedulerは今回追加しない。バックアップや既存hosting / Supabaseのaccess logsはこのtable削除で消去されるとは限らず、その保存範囲・保持期限は未確認。公開前に既存基盤で確認し、必要な設定変更は別承認へ戻す。

## Analytics / capability URL

既存dataLayerへ`qa_entry_view / qa_started / qa_step_completed / qa_feedback_submitted / qa_completed`だけを追加。payloadは固定task・版・step・source・coarse device・3択までで、本文・UUID・時刻・URL・identityを送らない。

既存issueとしてraw `/p/[token]`がpage_viewへ渡る経路をソースで確認。central helperをroute patternへ正規化し、任意payload項目を落とす。feedbackのfromも正規化する。capability・auth・invite画面、secret query / fragment、secret referrerではGTM bootstrapを止める。GTM読み込み済み画面からcapabilityへhistory遷移するとfresh documentへ切り替える。noscript iframeはfragment判定を迂回するため除去し、全routeへ`Referrer-Policy: no-referrer`を指定する。Passport Ownerの共有tokenは表示DOM / link hrefへ置かず、明示したコピー・共有・新規タブ操作だけで使う。auth callbackはerror messageをlogへ出さない。

`/qa`のqueryは正しいsrc値だけをGTM対象にし、別query・不正src・fragmentではGTMをロードしない。custom eventは常にsourceをallowlist化する。

実際のGTM containerの第三者送信・後から追加されるhistory listener・click計測・録画tagの動作は**UNKNOWN / 未検証**。dataLayerの単体テスト成功だけでlive送信の不存在を証明しない。公開前に既存containerのURL自動取得・click href・本文録画を確認し、token・本文・PIIの不要送信があれば開始しない。ここではcontainer設定を変更していない。

共有tokenは閲覧routeのrequest targetと、正当な既存共有RPCには必要。hostingの受信access logへ入る可能性は残るため、providerの記録・保持確認も公開前ゲート。URL方式全体は再設計しない。

## Validationと公開前ゲート

- PASS: lint、全workspace typecheck / tests、production build。重点13件でpayload・source・size・malformed input・失敗応答・secret URL正規化とbootstrapを検証。
- PASS: ローカルChromiumの390 / 412 / 1280px、focus、履歴展開、途中終了、空本文、通信失敗・429、同一payload再送、200%文字拡大。API成功・429はmock。cookie / localStorageのprivate sentinelとprovider境界を確認したが、実αアカウントのログイン済み実機QAとは別。
- PASS: localhostでproduction buildの`/qa`表示・no-referrer header・実APIの初期停止503を確認。build後のbootstrapは安全なQA URLでのみGTM読込を試み、不正source・invite fragmentでは試みない。すべての外部requestを遮断した検証であり、実GTM tagの送信を確認したものではない。
- **BLOCKED**: actual PostgreSQLのmigration / RLS / RPC / rate / 並行送信 / purge実行。Supabase CLIとローカルDBがなく、Docker daemonに接続不可。`node scripts/human-qa-db-test.mjs`は既にcacheされたofficial Postgres imageだけを使う隔離テストで、imageをpullせず、remote DBにも接続しない。利用可能なローカル環境でこれを通すことが公開前条件。
- 未実施: Preview、iPhone Safari、Android Chrome実機、実αログインでのTEST固定、staff / non-staff境界、本番header、実GTM送信、運用中の保持確認。Human QA checklistとしてこれらと通信失敗・入力保持を確認する。

本番migrationは未適用。適用・main merge・公開受付・SNS / DM / recruitment・費用や外部設定は別承認。DB検証、日次保持担当、GTM / platform log確認がそろうまで停止値を維持する。新しい外部サービス・dependency・継続契約はなし。既存サービスの実費はUNKNOWN、0円運営とは認定しない。
