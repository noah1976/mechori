# Human Validation Entry v0.1

- 更新日: 2026-09-28
- CEO承認: 登録不要のTEST DATA閲覧QA＋3択Quick Feedbackの最小実装。募集・公開受付・本番DB適用・main mergeは未承認。
- 状態: `IMPLEMENTED / RECEPTION_CLOSED / DB_EXECUTION_VALIDATION_BLOCKED / HUMAN_QA_PENDING / RECRUITMENT_NOT_STARTED`
- PR #31 blocking issues resolution: `MERGE_BLOCKED / RETENTION_MIGRATION_IMPLEMENTED / LIVE_ANALYTICS_UNKNOWN`。CEO承認Bの限定Cronを未適用migration内に定義。Founderの日次purge・日次成功確認は廃止。実DB / Cron executionのPASS前に公開可能としない。受付停止を維持する。
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

`submit_human_qa_feedback`だけにanon EXECUTEを許可する。staff一覧・受付状態はactive staff条件、受付変更・手動削除はactive admin条件を関数本体でも確認する。Cron専用のprivate schemaにはanon / authenticatedのUSAGEもEXECUTEも与えない。他の既存DB機能の権限は拡張しない。

## Abuse・停止

- 一つのDB transaction advisory lockで、受付・重複・quota・insert・停止操作を直列化する。既存UUIDの再送はduplicateで、再保存しない。UIは同時送信を拒否し、通信失敗時も最初のpayload / UUIDを再利用する。
- quotaは**全体10件 / rolling 10分、100件 / rolling 24時間**。IP・cookie・fingerprintingによる個人別制限ではない。botが枠を消費して正当な参加を妨げる可能性は残る。429で入力を保持し、追加募集やquota拡大へ自動的に進まない。
- APIの`MECHORI_QA_RECEPTION`は`enabled`以外で停止、DB receptionも初期値false。双方の有効化が必要。APIだけを止めても直接RPCは止まらないため、**緊急停止は既存`/admin`でDB受付を停止**する。これによりAPI経由・直接RPCの新規保存を止める。
- CAPTCHA・新サービス・識別情報による対策は導入しない。HTTP/RPCへのリクエスト自体の費用・負荷をquotaだけで完全には抑えられない。負荷や迷惑投稿が続けばDB受付を停止し、CEOへ縮小案を戻す。

## Raw feedback保持：最大30日

CEOの後続承認により、日次manual方式を既存Supabase内の限定Cronへ置き換える。2026-09-28にavailable project informationをread-onlyで確認: `mechori-alpha`はACTIVE_HEALTHY / Free / PostgreSQL 17.6、`pg_cron` default 1.6.4が利用可能・installed_versionはnull。DB設定のSELECTでもpg_cron preload済み、`cron.database_name=postgres`、`cron.launch_active_jobs=on`、`cron.log_run=on`、`cron.timezone=GMT`を確認した。migrationやjobは実行していない。既存project内のSQL-only jobであり、新しい有料契約・外部scheduler・HTTP・credentialを必要としない。実費全体を0円と認定するものではない。[Cron公式](https://supabase.com/docs/guides/cron)、[Install](https://supabase.com/docs/guides/cron/install)

新しいschemaだけを対象にする。既存alpha_feedback・アカウントは削除しない。匿名集計を自動保存する別tableは作らない。

| 項目 | 自動retention |
| --- | --- |
| Job名 | `mechori-human-qa-retention` |
| Schedule | `17 * * * *`（GMT / UTC毎時17分） |
| 処理 | `mechori_qa_internal.purge_expired_feedback()`が29日経過した`human_qa_feedback`だけを削除 |
| 境界 | 引数なし / SECURITY INVOKER / 空search_path / 固定table / advisory transaction lock 313101。既存DB job ownerで実行し、新しいroleや他tableへのgrantを追加しない。private schemaとfunctionはPUBLIC / anon / authenticatedからrevoke |
| 受付停止後 | receptionを参照しないため削除を継続。API停止・新規送信の有無に依存しない |
| 日次業務 | purgeも成功確認も不要 |
| 本番 | extension有効化・job登録は未実施。別途production apply承認が必要 |

未適用の同migrationに`CREATE EXTENSION IF NOT EXISTS pg_cron`とjob登録を定義。extensionやscheduler条件が成立しなければmigrationが失敗し、retentionなしでQAだけを適用しない。既存admin purge RPCの`auth.uid()` / active admin guardは変更せず、Cronからも呼ばない。admin手動purgeは障害時の救済だけに残す。

実験開始前・終了時（延長時やproject休止を予定する場合も）に、既存DashboardのCron Historyでactive / schedule / 最新成功を確認し、以下で失敗・超過を確認する。毎日の確認業務や新監視systemは作らない。運用記録は状態・時刻・件数だけで、本文・UUIDを外部へ複製しない。[実行履歴](https://supabase.com/docs/guides/cron/quickstart#inspecting-job-runs)

```sql
select jobid, jobname, schedule, active from cron.job
where jobname = 'mechori-human-qa-retention';
select r.status, r.start_time, r.end_time
from cron.job_run_details r join cron.job j using (jobid)
where j.jobname = 'mechori-human-qa-retention'
order by r.start_time desc limit 10;
select count(*) as overdue_raw_feedback from public.human_qa_feedback
where created_at <= now() - interval '30 days';
```

成功が直近2時間以内にない、job停止・失敗、超過ありの場合は開始しない／受付停止を維持し、active adminの既存手動purgeで救済・削除件数を確認してCEOへ報告する。日次手動へ戻さない。終了後も残存rawが消えるまでjobを無効化しない。DB休止・長期障害ではCronも動かず最大30日を保証できない。Free projectの自動pauseが削除完了前に起こり得る条件を開始前に確認し、無課金・日次業務なしで保持を守れなければ`RETENTION OPTION C REQUIRED`へ戻す。[Free project pause](https://supabase.com/docs/guides/platform/free-project-pausing)

staff一覧の非表示や受付停止だけでは削除完了としない。Cron実行履歴は本文を含まない既存運用metadataで、他jobの履歴やその保持設定は変更しない。バックアップや既存hosting / Supabaseのaccess logsはtable削除で消去されるとは限らず、保存範囲・保持期限は未確認。公開前に確認し、必要な設定変更は別承認へ戻す。

## Analytics / capability URL

既存dataLayerへ`qa_entry_view / qa_started / qa_step_completed / qa_feedback_submitted / qa_completed`だけを追加。payloadは固定task・版・step・source・coarse device・3択までで、本文・UUID・時刻・URL・identityを送らない。

既存issueとしてraw `/p/[token]`がpage_viewへ渡る経路をソースで確認。central helperをroute patternへ正規化し、任意payload項目を落とす。feedbackのfromも正規化する。capability・auth・invite画面、secret query / fragment、secret referrerではGTM bootstrapを止める。GTM読み込み済み画面からcapabilityへhistory遷移するとfresh documentへ切り替える。noscript iframeはfragment判定を迂回するため除去。Passport Ownerの共有tokenは表示DOM / link hrefへ置かず、明示したコピー・共有・新規タブ操作だけで使う。auth callbackはerror messageをlogへ出さない。

後続CEO指示によりgeneric long-token判定を撤去。Vehicle / record / journal / profile IDは長さでcapability扱いせず、通常history遷移・GTMを維持する。既知の`/p`・`/v`・auth・join・invite routeとinvite / token / OAuth code / state等のquery・fragment、秘密を含むreturnToを判定する。通常fragmentも長さだけでは停止しない。malformed URLはfail closed。`/qa`は正しいsrc値のみ許可し、別query・不正src・fragmentでGTMをロードしない。

Referrer-Policyは通常routeを`strict-origin`に変更。通常の参照元originを維持しつつ、same-originを含めpath / query / fragmentを一切送らず、未知のquery上のsecretもRefererにしない。`/p/*`・`/v/*`・join / invite・auth子routeは`no-referrer`。`/auth`自体はnative formのOriginを保ち既存CSRF guardを維持するため`strict-origin`。共有・認証先URLとcookie / PKCE / membershipは変更しない。

実際のGTM containerの第三者送信・後から追加されるhistory listener・click計測・録画tagの動作は**UNKNOWN / 未検証**。dataLayerの単体テスト成功だけでlive送信の不存在を証明しない。公開前に既存containerのURL自動取得・click href・本文録画を確認し、token・本文・PIIの不要送信があれば開始しない。ここではcontainer設定を変更していない。

CEO Human ActionのGTM確認は次の最大5項目を維持する。実tokenでなくTEST値で確認する。

1. Page URL / Location / Path / Referrer変数とGA4の自動収集。
2. history listener / Enhanced Measurementとsecretへの遷移。
3. click URL / href / text変数。
4. custom HTML / JS / form / custom eventでFeedback・QA noteを取得しないこと。
5. Clarityのmask / unmask・録画対象・URL取得／secret route除外。

共有tokenは閲覧routeのrequest targetと、正当な既存共有RPCには必要。hostingの受信access logへ入る可能性は残るため、providerの記録・保持確認も公開前ゲート。URL方式全体は再設計しない。

## Validationと公開前ゲート

- 後続blocker修正後: 全490 tests（対象50件含む）、lint / typecheck / build / runner syntax / diff checkはPASS。実localhost headersとauth Originを確認。compiled bootstrapの通常ID・secret遷移はapp hydrationを隔離して検証し、実αログイン後のUX QAとは区別する。実DB / CronはBLOCKED、live GTMはUNKNOWN。
- PASS: lint、全workspace typecheck / tests、production build。重点13件でpayload・source・size・malformed input・失敗応答・secret URL正規化とbootstrapを検証。
- PASS: ローカルChromiumの390 / 412 / 1280px、focus、履歴展開、途中終了、空本文、通信失敗・429、同一payload再送、200%文字拡大。API成功・429はmock。cookie / localStorageのprivate sentinelとprovider境界を確認したが、実αアカウントのログイン済み実機QAとは別。
- PASS: localhostでproduction buildの`/qa`表示・no-referrer header・実APIの初期停止503を確認。build後のbootstrapは安全なQA URLでのみGTM読込を試み、不正source・invite fragmentでは試みない。すべての外部requestを遮断した検証であり、実GTM tagの送信を確認したものではない。
- **BLOCKED**: actual PostgreSQLのmigration / RLS / RPC / rate / 並行送信 / purge / Cron実行。Docker daemonに接続不可。`node scripts/human-qa-db-test.mjs`はcacheされたofficial Postgres imageだけを使い、pull・package install・remote DB接続をしない。full testにはpg_cronを含む既存cacheが必要で、なければBLOCKED。`--core-only`はscheduler部分を除外した関数・権限診断だけで、exit 2 / full migration BLOCKEDを返す。登録確認だけでなく実worker実行を通すことがmerge前条件。
- 未実施: Preview、iPhone Safari、Android Chrome実機、実αログインでのTEST固定、staff / non-staff境界、本番header、実GTM送信、運用中の保持確認。Human QA checklistとしてこれらと通信失敗・入力保持を確認する。

本番migrationは未適用。適用・main merge・公開受付・SNS / DM / recruitment・費用や外部設定は別承認。DB / Cron検証、保持の成立条件、GTM / platform log確認がそろうまで停止値を維持する。新しい外部サービス・dependency・継続契約はなし。既存サービスの実費はUNKNOWN、0円運営とは認定しない。
