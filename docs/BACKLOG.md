# BACKLOG

## 運用ルール

- 1回の夜間作業では、原則としてREADYタスクを推奨順に1件だけ処理する。
- 成果物に指定された文書以外を変更しない。変更が必要になった場合はタスクを止め、依存関係または所有者確認事項として記録する。
- 完了条件をすべて満たした場合のみDONEへ移す。判断が必要な項目を推測で確定しない。
- 外部サービス接続、依存追加、データベース作成、デプロイ、課金、有料契約は、対応タスクと所有者承認なしに行わない。
- 状態は `READY`、`IN_PROGRESS`、`NEEDS_OWNER`、`BLOCKED`、`DONE` のいずれかとする。

## 暫定決定

- 初期公開は日本を中心とした少人数の招待制ベータとする。
- 内部設計とUIは日本語・英語対応を前提とする。
- 投稿の公開デフォルトは非公開とする。
- ユーザーが内容を確認し、明示的に公開する。
- 初期ベータでは、公開ナレッジ化する投稿を運営者が確認できる方式を採用する。
- 外部サービスはローカルのモック版と設計確認後、必要になったものだけ導入する。
- MVPでは有料プラン、決済、広告を導入しない。
- 将来の権限差と広告枠のみ拡張可能にする。

暫定決定を公開仕様または外部契約へ進める際は、関連文書との整合と所有者確認を行います。

## READY

### MECH-044 Vehicle Successionのβ正規化契約

- 優先度: P1
- 状態: READY
- 目的: 「クルマのカルテ」を将来実現できるよう、現在のOwnerに埋め込まれたVehicle表現から、PhysicalVehicle、VehicleRelationship、EvidenceAccessGrant、identifier assertion、rights projectionへ安全に移行できる正規化境界を設計する。
- 成果物: `docs/DATA_MODEL.md`、migration / backfill plan、既存Vehicle / Journal / Maintenance attributionの互換方針、Recovery / Transferのthreat model。
- 完了条件: legal Ownershipを保証しない語彙、identifierの非公開照合、transfer-safe EvidenceとOwner-private dataの分離、revision / provenance、duplicateの手動review方針、account deletion / withdrawalの処理境界を定義する。UI、QR、Recovery Claim、VIN収集、物理DB migrationは所有者承認とβ Gateまで実施しない。
- 依存タスク: MECH-003、MECH-038、`TRUST_AND_VERIFICATION.md`、`PRIVACY.md`
- 所有者確認の要否: 必要。実identifier、実車両、実Accountの取り扱い、DB migration、外部照合、法務確認は別途承認する。

### MECH-045 Vehicle Experience / Entryのβ正規化

- 優先度: P1
- 状態: READY
- 目的: SNS的な1 Postを最上位単位にせず、同じVehicleに関する観察、作業、写真、結果、再発、Drive等を、時間と意味のつながるExperienceへappendできるcontent modelへ移行する。
- 成果物: `VehicleExperience` / `ExperienceEntry` / Evidence projectionの物理model、Journal / Maintenance / mediaのmigration・backfill計画、private object media storage、Entry単位rights / revision / provenance、shared projection contract。
- 完了条件: 既存Journalは関係を推測せずsingleton Experienceへ移行できる。Quick Recordの保存frictionを増やさず、一括入力と後日追記、Entry単位の複数画像、Maintenanceへの明示link、same-model Evidence正規化、Vehicle Succession時のtransfer-safe projectionを表現できる。動画は互換・cost・privacy Gateを別に通す。
- 依存タスク: MECH-023、MECH-038、MECH-044、実αでの「続きを残す」需要確認
- 所有者確認の要否: 必要。DB migration、Storage移行、retention / rights、media resource guardrail、既存recordのbackfillは別途承認する。恒久的なProduct-level画像枚数capは前提にしない。
- 2026-08-24 implementation audit: 現αの`linkedRecordId` / `JournalMaintenanceLink`はJournalと既存Maintenance Recordの任意参照であり、Experience membership、Entry順、因果、複数actorの寄与を表さない。したがって「続きを残す」をJournal同士の便宜的linkとして先行実装しない。最小実装順序は、(1) Experience / Entryのstable IDとappend contract、(2) Entry / Maintenanceの明示relation、(3) entry単位rights・revision・media attachment、(4) singleton backfillと明示的continuation UIとする。既存Journalの近接日時や本文から関係を推測しない。

### MECH-046 Media normalization readiness

- 優先度: P1
- 状態: READY
- 目的: Product-levelの写真枚数capを設けず、Quick Record、詳細Journal、shared projection、将来Nativeが同じ順序付きmedia attachmentを安全に扱える基盤へ移行する。
- 現在地: `GarageJournalPost`は`media[]`と順序付き`contentBlocks`を持ち、shared publishは全`public_ready`画像を個別objectへuploadし、RPC失敗時は新規objectをcleanupする。Quick Recordは`PreparedImage | null`、`files?.[0]`、単一attachmentであり、private Workspace JSON内の`alpha_inline` data URLを正本にする。`local_blob`はorigin限定IndexedDBのlegacy fallbackである。
- 最小移行順序: (1) private object storageとattachment参照を正本化、(2) prepared media queue・順序・remove・retry、(3) journal saveとshared projectionをpartial failure / orphan cleanup込みでtransactionally整理、(4) draft / offline recovery、(5) resource guardrailとobservability、(6) Quick Record multiple picker。既存data URLや`local_blob`を無断で削除・移動しない。
- 完了条件: private / shared / draftのmedia ownership、順序、削除、retry、orphan cleanup、rights、公開停止、Native互換を明確にし、複数画像を追加してもAppData JSON肥大化・失敗時のrecord喪失・未参照objectを増やさない。動画は別Gateとする。
- 所有者確認の要否: 必要。DB migration、Storage policy / RLS、bucket lifecycle、既存media backfill、resource上限、実data migrationは別途承認する。
- 詳細設計: `docs/MEDIA_NORMALIZATION_ARCHITECTURE.md`。現行経路、目標asset / attachment / variant contract、段階移行、rollback、failure / cleanup test、manual gateをここで追跡する。

### MECH-047 Public Experience Share projection

- 優先度: P1
- 状態: DESIGN_READY / IMPLEMENTATION_BLOCKED
- 目的: 未ログイン閲覧、canonical URL、OGP、revoke / unpublish、Native OS Share Sheetを、private Workspaceやα参加者共有と混同しない匿名public projectionとして成立させる。
- 成果物: `PublicExperienceProjection`のrights / variant / audit contract、server-side metadata reader、first Entry photo → Vehicle photo → default OGP fallback、revoke test、canonical URL / deep-link compatibility。
- 完了条件: private Entry、`alpha_shared`、`local_blob`、`alpha_inline`、raw route、private profile / maintenance dataを匿名route・OGP・error responseから返さない。public viewは明示的かつrevoke可能なprojectionだけを読む。
- 依存タスク: MECH-045、MECH-046、media privacy public gate、production origin。
- 所有者確認の要否: 必要。DB migration、RLS/RPC、Storage public variant、crawler-visible route、production domain / deployment、実content公開は別途承認する。
- 詳細設計: `docs/PUBLIC_SHARE_READINESS.md`。

### MECH-038 遠隔α用Supabase Adapter・RLS・招待API

- 優先度: P0
- 状態: IN_PROGRESS
- 目的: 3〜5人の遠隔αで、認証済み利用者ごとの愛車・非公開記録・Journalを安全に永続化し、個別招待で参加を制限する。
- 成果物: Supabase用物理スキーマ案、RLSポリシーとテスト、DataProvider Adapter、期限付き個別招待API、ローカル開発用設定例
- 現在地: Google OAuth callback、1人用招待発行・引換、参加権限確認、利用者別Workspace Adapter、空の愛車登録導線、最小MAU計測マイグレーションまで実装済み。所有者初期化、計測マイグレーション適用、別利用者によるRLS統合テストは未完了。
- 追加: 参加済みユーザーが`/invite`から期限付き1人用URLを発行し、コピー、OS共有、端末内QR表示を選べる。参加者発行用DB関数の適用と、実アカウント間の招待確認が残る。
- 完了条件: 別利用者の非公開データを読めない・変更できない。期限切れ・失効・使用済み招待を拒否し、同じ利用者は再ログインできる。秘密情報をGitへ保存せず、外部未接続でも型・単体テストを実行できる。
- 依存タスク: MECH-032、MECH-037
- 所有者確認の要否: コードとローカル設定例は不要。Supabaseプロジェクト作成・接続、Google OAuth、Netlifyデプロイは必要。

### MECH-036 画面文言の多言語辞書移行

- 優先度: P1
- 状態: IN_PROGRESS
- 目的: 既存プロトタイプに残る日英の直接分岐を解消し、第三言語追加時に主要画面の未翻訳箇所を型とテストで検出できるようにする。
- 成果物: `@mechori/i18n`翻訳キー、引数付きメッセージ、日付・数値Formatter、主要画面の辞書利用、辞書完全性テスト
- 現在地: 引数付き翻訳、日付・数値Formatter、辞書キー一致テストを追加し、共通ナビ、認証、愛車登録、登録完了、簡易出来事、所有状態変更、整備履歴一覧・入力フォームを辞書へ移行済み。Garage詳細、Journal、検索、安全・公開設定には直接分岐が残る。
- 完了条件: 認証、Garage、記録、Journal、検索、安全・公開設定の主要文言に`locale === "ja"`の二択分岐がなく、新しい対応UI言語を一覧へ加えたとき不足辞書が型チェックまたはテストで失敗する。
- 依存タスク: MECH-005、MECH-007
- 所有者確認の要否: 不要。実際の第三言語翻訳と公開は対象地域・確認者の承認が必要。

### MECH-041 Professional知識循環・工場DX課題検証

- 優先度: P2
- 状態: IN_PROGRESS
- 目的: 専門店の知識価値を守りながら地域工場へ知見を届け、日常業務の再入力削減をProfessional参加の利益にできるか検証する。
- 成果物: 3〜5工場のインタビュー、工場内限定・対応経験・許諾ナレッジの手作業検証、工場間相談の価格仮説、最初の帳票ワークフロー候補、「整備士のGitHub」と技術ポートフォリオの訴求検証、著名専門家向けの権利・送客・還元・コンシェルジュ参加仮説、Professionalティザーページ、オーナーから工場への紹介導線
- 完了条件: 共有可能範囲、相談対価、知識クレジット、既存業務ソフトとの二重入力、最初に試す単一帳票、整備士が公開したい実績と公開したくない情報、転職・採用時に有用な根拠と共有形式を実案件から決める。対象国の制度適合をAIだけで確定しない。
- 現在地: α版に公開ティザーページと、作業用共有資料からURLを共有・コピーできる紹介導線を実装済み。価格、契約、外部送信は未開始。計画の正は`BUSINESS_MODEL.md`。
- 依存タスク: MECH-029、`PROFESSIONAL_PLATFORM.md`、`BUSINESS_MODEL.md`
- 所有者確認の要否: 文書整理は不要。工場への連絡、報酬提示、実データ取得、外部送信は必要。

### MECH-042 写真による車両候補と世代確認

- 優先度: P1
- 状態: READY
- 目的: 愛車登録写真からメーカー・車系統・世代候補を提示し、入力負担を減らす。ただし自動確定やナンバー認識は行わない。
- 成果物: `docs/VEHICLE_IDENTITY.md`に従う候補Provider境界、本人確認UI、誤認訂正、費用・プライバシー評価、実画像テスト。
- 完了条件: 候補ゼロ・複数候補・誤認でも自由入力で登録でき、外部送信前の個別承認、候補由来、確認状態を保持できる。
- 依存タスク: MECH-003、MECH-007、実画像利用許可
- 所有者確認の要否: 必要。外部Provider、画像送信範囲、費用上限は未承認。

### MECH-043 熟練者に耐える症例比較・ケースリプレイ

- 優先度: P2
- 状態: READY
- 目的: Professionalの価値をプロフィールやランキングより先に、仕様差、判断経路、反対結果、測定、部品関係、項目別レビューを根拠付きで扱える実案件体験として検証する。
- 成果物: 仕様差分表示、DiagnosticStep・MeasurementObservation候補、改善・変化なし・再発・適合失敗の集計、項目別KnowledgeReview、工場内案件検索、音声・写真からの未確認候補入力の手作業プロトタイプ
- 完了条件: 実在する匿名化済み案件を使い、熟練整備士が一致・相違・不明、判断経路、反対結果、出典をたどれる。AIが診断、正常範囲、確認していない作業を補完しない。入力時間、再利用価値、公開可能範囲を計測する。
- 依存タスク: MECH-041、`DATA_MODEL.md`、`KNOWLEDGE_SYNTHESIS.md`、`VEHICLE_IDENTITY.md`
- 所有者確認の要否: 文書・ローカルDEMOは不要。実案件、音声、外部AI、工場への提示は個別承認が必要。

## NEEDS_OWNER

### MECH-101 初期ログイン方式

- 優先度: P0
- 状態: IN_PROGRESS
- 目的: 招待制ベータに適した本人確認、利便性、運用負荷のバランスを決める。
- 決定済みの基線: SNSで招待URLを配布し、初期ログインはSupabase AuthのGoogleを中心とする。Apple、X、メールのマジックリンクは後段候補とし、Facebookは初期導入しない。
- 成果物: 認証方式の決定記録
- 完了条件: Google OAuthの設定、招待URL、アカウント復旧、招待失効・再発行、日英UI、個人情報、運用者対応を確認し、接続内容を所有者が承認している。
- 現在地: Google OAuthとSupabase Authの接続、Netlify・localhostのURL登録、日英ログインUI、招待コードをGoogleやアクセスログへ送らない認証経路まで実装済み。Googleテストユーザー登録、所有者初期化、実アカウントでの再ログイン・失効確認が残る。
- 依存タスク: MECH-001
- 所有者確認の要否: 必要

### MECH-102 FIAT Barchettaの仕様分類粒度

- 優先度: P0
- 状態: NEEDS_OWNER
- 目的: 車両差異を安全に扱える最小分類を決める。
- 成果物: 分類方針の決定記録
- 完了条件: 年式、地域、エンジン、型式、改修差等の候補と情報源を比較し、初期粒度を所有者が承認している。
- 依存タスク: MECH-003
- 所有者確認の要否: 必要

### MECH-103 ロゴ、カラー、タイポグラフィ

- 優先度: P1
- 状態: NEEDS_OWNER
- 目的: MECHORIのブランドと安全表示に適した視覚方針を決める。
- 成果物: デザイン方向性の決定記録
- 完了条件: ロゴ、配色、文字体系、日英可読性、アクセシビリティ、安全警告との区別を確認し、所有者が承認している。
- 依存タスク: MECH-002
- 所有者確認の要否: 必要

### MECH-106 初期管理者運用の詳細

- 優先度: P0
- 状態: NEEDS_OWNER
- 目的: 公開ナレッジの確認、通報、訂正、緊急非公開化を少人数で運用できるようにする。
- 成果物: 初期管理者運用の決定記録
- 完了条件: 担当者、権限、確認基準、対応時間、エスカレーション、記録、代理対応を定め、所有者が承認している。
- 依存タスク: MECH-001、MECH-002、MECH-004
- 所有者確認の要否: 必要

## BLOCKED

以下は実装タスクではなく、所有者承認と前提資料が揃うまで開始しない外部ゲートです。

### 2026-08-15 checkpointによる再評価メモ

- `MECH-201`／`MECH-202`は、Supabase、Netlify、Production相当α、Deploy Previewがすでに実運用されているため、「外部基盤やデプロイが存在しない」という意味では古い。既存の`BLOCKED`状態は削除・DONE化せず、接続済みであることと、正式公開前の承認・法務・復旧・環境分離ゲートが残ることを分離して、次回owner確認で再評価する。
- PR #3のDeploy Preview OAuth対応は実装済みだが、iPhone Safariの実機QAは未完了である。これは`MECH-101`の認証運用確認へ追記すべき事項であり、今回DONEへ移さない。
- Garage timelineの「端末内メディアが見つかりません」再発は、原因・影響範囲が未確定のP1として`PROJECT_STATE.md`で追跡する。新しいMECH番号の採番と完了条件は、再現確認後にowner判断とする。

| タスクID | 優先度 | 状態 | 目的 | 成果物 | 完了条件 | 依存タスク | 所有者確認の要否 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MECH-201 | P1 | BLOCKED | 外部サービス接続 | 接続・運用記録 | 設計確認、アカウント、料金、データ取扱い、停止手順が承認済み | MECH-006 | 必要 |
| MECH-202 | P1 | BLOCKED | 本番デプロイ | 公開判定記録 | ドメイン、環境分離、法務・安全・復旧確認が承認済み | MECH-006、MECH-106 | 必要 |
| MECH-203 | P2 | BLOCKED | 決済導入 | 決済設計 | MVP終了後に料金、税務、返金、事業者が承認済み | 将来の収益検証タスク | 必要 |
| MECH-204 | P1 | BLOCKED | AI利用開始 | AI利用判定記録 | 送信データ、費用、表示、確認、評価、停止手順が承認済み | MECH-006 | 必要 |
| MECH-205 | P0 | BLOCKED | 法的文書確定 | 公開用法的文書 | 専門家確認または所有者判断が完了 | 公開仕様確定後 | 必要 |
| MECH-206 | P0 | BLOCKED | ナンバープレート自動マスキング実装 | 画像処理、確認UI、評価結果 | 実装方式、端末対応、失敗時挙動、誤検出率、原本削除、公開前レビューが承認済み | MECH-006、実物画像による評価 | 必要 |

## DONE

### MECH-040 構造化整備記録の曖昧な発生日

- 優先度: P1
- 状態: DONE
- 目的: 過去の領収書や記憶から登録する整備記録でも、存在しない正確な日付を作らず、年月ごろ・年ごろ・時期不明を保持する。
- 成果物: `MaintenanceRecord`の発生時期精度、入力・編集UI、並び順、表示、既存exact date移行、テスト
- 完了条件: 既存の正確な整備日は維持され、曖昧な時期でも費用、走行距離、作業、情報源を登録できる。検索・AI整理へは精度付きで渡される。
- 実装結果: Workspaceスキーマv12で年月日、年月、年、時期不明と任意補足を保持し、一覧、Garage時間軸、Journal参照、工場提示、編集へ反映。既存記録は年月日として自動移行する。
- 依存タスク: MECH-015、Garage記録の発生時期モデル
- 所有者確認の要否: 不要。αのWorkspace JSON内で完結し、物理DB変更は発生しない。

### MECH-037 3〜5人遠隔αの準備設計と主要日本語監査

- 優先度: P0
- 状態: DONE
- 目的: 横で説明できない3〜5人へ公開する前に、αとβの役割、限定招待、安全条件、主要導線の日本語を整理する。
- 成果物: `docs/ALPHA_PLAYBOOK.md`、更新した`docs/BETA_PLAYBOOK.md`、Provider非依存の招待判定、主要画面の文言修正、単体テスト
- 完了条件: 1人1招待、期限、失効、再ログイン、使用済み拒否を定義し、α終了条件とβ移行条件を区別する。不自然な空検索文とSNS寄りの初回説明を修正する。
- 依存タスク: MECH-028、MECH-032
- 所有者確認の要否: ローカル実装は不要。実際の外部接続・デプロイ・募集開始は必要。

### MECH-035 外部基盤採用方針とAI原価ゲート

- 優先度: P0
- 状態: DONE
- 目的: Supabase、Netlify、OpenAI APIを前提に進めつつ、接続前から費用超過とProvider密結合を防ぐ。
- 成果物: `docs/INFRASTRUCTURE_COST.md`、アーキテクチャ・AI・収益化文書更新、Provider非依存のAI原価見積り・呼出判定と単体テスト
- 完了条件: 採用方針と実接続を分離し、モデル単価をコードへ固定せず、キャッシュ、月次全体、利用者別日次原価・回数でProvider呼出を拒否できる。
- 依存タスク: MECH-006、MECH-013、MECH-027
- 所有者確認の要否: 採用方針は確認済み。接続、送信データ、秘密情報、課金、本番利用はMECH-201、MECH-202、MECH-204で別途必要。

### MECH-034 ローカル通報・公開プロフィール・画像確認フロー

- 優先度: P0
- 状態: DONE
- 目的: 外部接続前に、利用者の通報、最小モデレーション状態、プロフィール項目別公開、画像公開前ゲートを一続きで検証する。
- 成果物: `/journal/[id]/report`、`/moderation`、`/settings/privacy`、`/profile/[id]`、拡張した`/privacy-review`、共通状態遷移とテスト。
- 完了条件: 通報重複抑止、確認・一時非公開・直接URL遮断・復元、項目別プロフィール公開、複数画像候補・誤検出・手動候補・目視確認を端末内で操作できる。
- 依存タスク: MECH-007、MECH-031
- 所有者確認の要否: ローカル実装は依頼により実施。本番運用はMECH-106で別途承認が必要。

### MECH-033 端末内下書き・保存失敗リカバリー

- 優先度: P0
- 状態: DONE
- 目的: 長い整備記録とJournalを、再読み込みや端末保存失敗で失わないようにする。
- 成果物: バージョン付き下書き型、整備記録・Journalの自動保存と復元・破棄、保存失敗バナー、エラー先頭フォーカス
- 完了条件: 空フォームを保持せず、再読み込み後に文章を復元できる。Journalメディア本体は複製せず再選択を明示し、本保存成功時とDEMOリセット時に下書きを削除する。
- 依存タスク: MECH-007、MECH-015、MECH-022
- 所有者確認の要否: ローカル実装は不要。本番の保存期間、暗号化、ユーザー分離は認証・DB設計時に必要。

### MECH-032 ローカル認証モックと未ログイン境界

- 優先度: P0
- 状態: DONE
- 目的: 外部認証導入前に、公開閲覧、招待登録、ログイン、ログアウト、保護画面の境界を画面で検証する。
- 成果物: Provider非依存の認証型、localStorageセッション、`/auth`、公開画面制御、保護画面リダイレクト、単体・ブラウザ検証
- 完了条件: 未ログインでは公開ホーム・検索・公開Journalだけを表示し、認証モック後は元の保護画面へ戻る。ログアウト後は個人領域を再び遮断し、メールを保存せず外部サービスへ接続しない。
- 依存タスク: MECH-001、MECH-022
- 所有者確認の要否: ローカルモックは不要。本番Provider、本人確認、RLS、招待運用はMECH-101で必要。

### MECH-031 プロフィールのミュート・ブロック

- 優先度: P0
- 状態: DONE
- 目的: フォロー解除だけに頼らず、利用者が自分のフィードと接点を安全に制御できるようにする。
- 成果物: localStorage試作スキーマv7（後続MECH-034でv8へ移行）、共通状態遷移、フィード・Journal詳細の操作、表示管理、旧データ移行
- 完了条件: ミュートはフォローを維持して投稿を隠す。ブロックはプロフィール・個別車両フォローを解除し、投稿・候補・直接閲覧を抑止する。車種フォローは維持し、どちらも解除できる。公開範囲判定を直接URLにも適用する。
- 依存タスク: MECH-022
- 所有者確認の要否: ローカル実装は不要。本番の双方向制御とRLS契約はMECH-101および本番設計時に必要。

### MECH-030 多車種α・オーナー＋愛車プロフィール・予防的インサイト設計

- 優先度: P0
- 状態: DONE
- 目的: 多車種の友人αを正しく観察し、見せるSNS体験と根拠付き知識基盤を同じ車両関係モデルへ接続する。
- 成果物: `docs/BUSINESS_GROWTH.md`、`docs/SOCIAL_LAYER.md`、`docs/PREVENTIVE_INSIGHTS.md`、localStorage試作スキーマv6、My Garage表示
- 完了条件: αを単一車種へ限定せず、オーナー全体・個別車両・車種のフォローを分離し、車齢・所有歴を信頼度から分離して表示する。予防的な確認候補は実例分布と出典に拘束し、現在メーター値だけで断定しない。
- 依存タスク: MECH-018、MECH-022、MECH-026
- 所有者確認の要否: 文書・ローカル実装は不要。αの対象者と実募集開始は必要。

### MECH-029 Professional課題インタビュー設計

- 優先度: P1
- 状態: DONE
- 目的: 機能を作り込む前に、専門外車種を受ける工場の調査負荷、受託判断、支払理由を確認する。
- 成果物: `docs/PROFESSIONAL_DISCOVERY.md`
- 完了条件: 対象工場、実タスク聞き取り、現行調査時間、情報不足時の対応、価格提示方法、採用・不採用基準を定義済み。
- 依存タスク: MECH-026
- 所有者確認の要否: 文書作成は不要。工場への連絡と価格提示は必要。

### MECH-028 招待制ベータ募集・観察手順

- 優先度: P0
- 状態: DONE
- 目的: 最初の10〜20人を単なる登録者ではなく、記録・検索・再訪を観察できる協力者として迎える。
- 成果物: `docs/BETA_PLAYBOOK.md`
- 完了条件: 対象者、募集経路、説明文、初回操作、観察項目、聞き取り、離脱時対応、個人情報・安全上の注意を定義済み。
- 依存タスク: MECH-026、MECH-027
- 所有者確認の要否: 文書作成は不要。実際の募集開始と外部送信文面は必要。

### MECH-027 初期検証の計測設計

- 優先度: P0
- 状態: DONE
- 目的: 登録者数だけでなく、初回価値、記録作成、再利用、検索成功、結果追記を同じ定義で測れるようにする。
- 成果物: `docs/MEASUREMENT_PLAN.md`
- 完了条件: M0〜M2の指標、算出式、イベント候補、個人情報を増やさない計測方針、手動集計方法を定義済み。後続の所有者承認により、GTM経由のGA4・Clarityを補助計測として導入する。
- 依存タスク: MECH-026
- 所有者確認の要否: 不要。実際の分析サービス導入は別途承認を得る。

### MECH-026 事業成長・初期100人・収益化ゲート設計

- 優先度: P0
- 状態: DONE
- 目的: ターゲット、獲得導線、初回価値、継続、課金を一続きの検証計画にする。
- 成果物: `docs/BUSINESS_GROWTH.md`、`docs/MONETIZATION.md`、`docs/ROADMAP.md`
- 完了条件: M0〜M4、初期100人の獲得仮説、主要指標、Owner Plus・Professional・広告の開始条件、失敗時の判断を定義済み。
- 依存タスク: MECH-009、MECH-010、MECH-013、MECH-018、MECH-024
- 所有者確認の要否: 必要。数値はベータ前の仮説として実利用後に更新する。

### MECH-025 正式名称MECHORIへの変更

- 優先度: P0
- 状態: DONE
- 目的: 正式名称、表示、コード識別子をMECHORI（メカリィ）へ統一する。
- 成果物: 文書、画面表示、npmパッケージ名、共有文、エクスポート名の更新
- 完了条件: 旧名称の表示が残らず、旧localStorageキーとJournalメディアを失わず読める互換処理がある。
- 依存タスク: なし
- 所有者確認の要否: 完了。`mechori.com`取得済み。

### MECH-024 note型Journalと出典付き検索要約

- 優先度: P0
- 状態: DONE
- 目的: 投稿と読まれることを楽しくしながら、その内容を検証可能な知識検索へつなげる。
- 成果物: 順序付きJournalブロック、任意位置の画像・動画、物語と整備記録の分岐、根拠付きDEMO要約、出典リンク
- 完了条件: Journal本文をAIが生成せず、整備記録だけでも成立する。検索要約の確認箇所、原因候補、対応、部品が公開事例へ追跡でき、出典外情報を補完しないテストがある。
- 依存タスク: MECH-013、MECH-022、MECH-023
- 所有者確認の要否: 必要。投稿編集の楽しさ、ホームの温度感、要約の読みやすさを操作確認する。

### MECH-023 Garage Journalの画像・動画添付

- 優先度: P0
- 状態: DONE
- 目的: 本人の自由記述に写真・画像・動画を添え、所有体験を文章だけに限定しない。
- 成果物: Journalメディア型、IndexedDB MediaProvider、複数ファイル選択・説明・削除・表示UI、公開前プライバシーゲート
- 完了条件: 画像・動画をブラウザ内へ保存し再読込後も表示できる。実ファイルは外部送信せず、自動マスキング等が未実装の間は非公開投稿だけ許可する。旧Journalはメディアなしで自動移行する。
- 依存タスク: MECH-014、MECH-022
- 所有者確認の要否: 不要。公開用メディア処理はMECH-206までBLOCKEDを維持する。

### MECH-022 Garage Journal・フォローのローカル体験

- 優先度: P0
- 状態: DONE
- 目的: 事務的な整備記録に加え、本人の言葉で残して見てもらう継続動機を、ナレッジ信頼度と分離して検証する。
- 成果物: `docs/SOCIAL_LAYER.md`に沿ったローカルDEMO、共通型と状態テスト、画面検証
- 完了条件: 自由記述Journal、整備記録の任意リンク、非公開初期値、プロフィール・車両・車種のDEMOフォロー、時系列フィードが動作する。AI本文生成、実AI抽出、コメント、DM、ランキングを実装しない。人気指標がナレッジ信頼度へ影響しないテストがある。
- 依存タスク: MECH-003、MECH-010、MECH-014
- 所有者確認の要否: 必要。名称、フィード密度、Journalと整備記録の見せ方を操作確認する。

### MECH-021 工場向け車両履歴

- 優先度: P0
- 状態: DONE
- 目的: オーナーの入力を、専門外の工場にも見せられる過去経緯へ変換する。
- 成果物: `/garage/service-brief`、印刷・PDF用表示
- 完了条件: 車両仕様、未解決事項、過去作業を表示し、VIN・ナンバー・住所を含めず、診断・整備指示ではないと明示する。
- 依存タスク: MECH-018
- 所有者確認の要否: 必要。実際に工場へ見せたい情報の過不足を確認する。

### MECH-020 抽出結果確認DEMO

- 優先度: P0
- 状態: DONE
- 目的: 実PDFがなくても、OCR・AI候補を人が修正・確認・除外する操作を検証する。
- 成果物: `/import/review-demo`、確認進捗と非公開下書きゲート、共通ロジックテスト
- 完了条件: 未確認項目がある限り確定できず、候補の修正値と除外を明示的に保持し、実データ・外部通信・AI処理を行わない。
- 依存タスク: MECH-008
- 所有者確認の要否: 必要。実帳票を入手後、原本との並列表示と確認時間を検証する。

### MECH-019 所有者データのローカル出力

- 優先度: P1
- 状態: DONE
- 目的: 集合知への共有や課金と無関係に、自分の整備履歴を持ち出せる価値を提供する。
- 成果物: バージョン付きJSON出力、出力構造テスト
- 完了条件: ユーザー操作時だけ端末へ保存し、外部サービスへ送信しない。出力データは実行中状態から複製される。
- 依存タスク: MECH-003、MECH-007
- 所有者確認の要否: 不要。人が読むPDFと工場共有は別タスクとする。

### MECH-018 オーナー履歴価値ループ

- 優先度: P0
- 状態: DONE
- 目的: DIY・工場整備を問わず、記録した本人へ即時の整理価値と継続理由を返す。
- 成果物: `docs/OWNER_VALUE_LOOP.md`、`/garage/history`、History Level・節目・安全な共有文
- 完了条件: 履歴整理の表示を信頼・能力評価から分離し、共有文に走行距離、費用、正確な日付、症状を含めないテストがある。
- 依存タスク: MECH-010、MECH-011
- 所有者確認の要否: 必要。Level名称と条件、バッジの楽しさを利用テスト後に調整する。

### MECH-017 画像プライバシー確認UI

- 優先度: P1
- 状態: DONE
- 目的: 実検出Provider導入前に、候補のマスクと目視確認、公開不可理由の操作性をローカルで検証する。
- 成果物: `/privacy-review` のDEMO確認画面、`packages/core/src/media-privacy.ts`の状態テスト
- 完了条件: 原本、目視未確認、未マスク候補が公開不可と表示され、外部通信や実画像保存を行わない。
- 依存タスク: MECH-014
- 所有者確認の要否: 必要。候補領域は疑似表示であり、実画像検出はMECH-206まで行わない。

### MECH-015 整備イベント・複数作業・メーター期間のローカル操作

- 優先度: P0
- 状態: DONE
- 目的: 旧プロトタイプの単一MaintenanceRecordを、初期概念モデルへ段階的に置き換える。
- 成果物: localStorage DataProvider v2、追加・編集・表示、自動移行、テスト
- 完了条件: 1イベントに複数作業を登録でき、メーター交換回数に上限がなく、表示値の逆行を拒否せず経緯確認へ送る。
- 依存タスク: MECH-003、MECH-012
- 所有者確認の要否: 必要。旧localStorageは起動時にv2へ自動移行し、画面上で使い勝手を確認する。

### MECH-016 KnowledgeSynthesis検索結果UI

- 優先度: P0
- 状態: DONE
- 目的: 症状検索で、原因候補、確認箇所、対応、反対結果、安全警告を根拠とともに読めるか検証する。
- 成果物: ローカルDEMO検索結果画面、日英表示、レスポンシブ確認
- 完了条件: 独立件数、未解決・反対結果、情報不足、CRITICAL警告を表示し、DEMOと明示する。390 x 844と1440 x 900で横方向のはみ出しがない。
- 依存タスク: MECH-005、MECH-013
- 所有者確認の要否: 必要。実データやAIは使用していない。

### MECH-006 外部サービス導入前チェックリスト

- 優先度: P1 / 推奨順序6
- 状態: DONE
- 目的: 外部サービスを必要性、データ、費用、法務、安全、撤退可能性の観点で評価できるようにする。
- 成果物: `docs/EXTERNAL_SERVICE_CHECKLIST.md`
- 完了条件: DB、ホスティング、AI、OCR、画像、メール、Expoを共通基準で確認できる。
- 依存タスク: MECH-003
- 所有者確認の要否: 不要。実サービスの契約・接続・有料枠利用は別途明示承認を得る。

### MECH-005 日本語／英語の基本用語集

- 優先度: P1 / 推奨順序5
- 状態: DONE
- 目的: UI、データ設計、検索、安全表示で使う基本用語の日英対応を統一する。
- 成果物: `docs/GLOSSARY_JA_EN.md`
- 完了条件: 車両、整備、走行距離、出典、公開、安全、プランの基本語と使用注意を定義済み。
- 依存タスク: MECH-003、MECH-004
- 所有者確認の要否: 不要。車種固有語は信頼できる出典確認後に追加する。

### MECH-014 画像プライバシー公開ゲート

- 優先度: P0
- 状態: DONE
- 目的: ナンバープレート等の自動検出を過信せず、安全条件が揃わない画像公開を共通ロジックで拒否する。
- 成果物: `docs/MEDIA_PRIVACY.md`、`packages/core/src/media-privacy.ts`
- 完了条件: 原本、メタデータ未除去、検出未完了、目視未確認、未解決候補を公開不可にするテストがある。
- 依存タスク: MECH-003、MECH-008
- 所有者確認の要否: 不要。実検出Providerと精度評価はMECH-206としてBLOCKEDを維持する。

### MECH-013 根拠付きナレッジ要約契約

- 優先度: P0
- 状態: DONE
- 目的: 症状検索をAI診断にせず、公開集合知の根拠付き集計・文章化として提供する。
- 成果物: `docs/KNOWLEDGE_SYNTHESIS.md`、`packages/core/src/knowledge-synthesis.ts`
- 完了条件: 公開事例限定、独立出典、反対結果、安全ポリシー、根拠検証、情報不足状態をテストしている。
- 依存タスク: MECH-003、MECH-011
- 所有者確認の要否: 必要。実データで一致範囲と最低事例数を決める。

### MECH-004 危険領域タグ

- 優先度: P0 / 推奨順序4
- 状態: DONE
- 目的: 誤情報が重大事故につながり得る整備領域を識別し、表示・確認・公開判断に利用できるようにする。
- 成果物: `docs/HAZARD_TAGS.md`、`packages/core/src/hazards.ts`
- 完了条件: タグ候補、最低危険度、複数タグ、警告表示、運営確認、専門家確認、法令表示、訂正方法を定義し、引き下げを防ぐテストがある。
- 依存タスク: MECH-001、MECH-003
- 所有者確認の要否: 必要。公開前に整備・法務の専門家確認を行う。

### MECH-012 走行距離・メーター履歴設計

- 優先度: P0
- 状態: DONE
- 目的: メーター交換等で表示値が減少する旧車の履歴を、虚偽や入力エラーと誤判定せず記録する。
- 成果物: `docs/DATA_MODEL.md`、`docs/SCREENS.md`、`docs/IMPORT_PIPELINE.md`、`docs/TRUST_AND_VERIFICATION.md`、`packages/core/src/odometer.ts`
- 完了条件: メーター期間、表示値、推定累積距離が分離され、逆行を事情確認として扱うテストがある。
- 依存タスク: MECH-003、MECH-008
- 所有者確認の要否: 完了。実車の具体例でUI文言を後続確認する。

### MECH-011 信頼性・虚偽対策の初期設計

- 優先度: P0
- 状態: DONE
- 目的: インセンティブ目的の虚偽を抑えながら、異常値だけで正当な記録を排除しない確認工程を定義する。
- 成果物: `docs/TRUST_AND_VERIFICATION.md`
- 完了条件: 証拠、整合性、複数報告、反証、訂正、異議申立て、AIの根拠制限を定義済み。
- 依存タスク: MECH-003
- 所有者確認の要否: 必要。ベータ運用で閾値と表示を検証する。

### MECH-010 入力インセンティブ設計

- 優先度: P0
- 状態: DONE
- 目的: 工場整備を含むオーナーにも、承認欲求以外の記録価値と健全な貢献評価を提供する。
- 成果物: `docs/CONTRIBUTION_INCENTIVES.md`
- 完了条件: 個人便益、履歴評価、貢献バッジ、SNS共有、悪用防止を定義済み。
- 依存タスク: MECH-001、MECH-003
- 所有者確認の要否: 必要。名称と獲得基準は利用テスト後に確定する。

### MECH-009 プラン権限設計

- 優先度: P0
- 状態: DONE
- 目的: Free、Owner Plus、Professionalの検索範囲と提供クライアントを、決済・画面から独立して管理する。
- 成果物: `docs/PLAN_ENTITLEMENTS.md`、`packages/core/src/entitlements.ts`
- 完了条件: Free 2台という当時の仮説、所有車両検索、未登録車種検索、Professional Web業務検索を設定可能な権限として定義し、テストがある。
- 2026-08-16再評価: Entitlement境界の実装完了は維持するが、Free 2台のProduct仮説はEvidence supplyを阻害するためsupersededとし、登録台数によるPaywallを廃止した。DONEは権限設計に対する状態であり、2台制限のProduct採用を意味しない。未接続の`maxOwnedVehicles` prototypeと対応testは後続のcode cleanup対象。
- 依存タスク: MECH-003
- 所有者確認の要否: 必要。価格と利用枠は未確定。

### MECH-002 主要画面一覧

- 優先度: P0 / 推奨順序2
- 状態: DONE
- 目的: MVPのユーザーフローと画面責務を明確にする。
- 成果物: `docs/SCREENS.md`
- 完了条件: 主要画面、状態、安全・確認導線、WebとExpoの境界を一覧化済み。
- 依存タスク: MECH-001
- 所有者確認の要否: 不要。未確定事項は文書末尾に記録済み。

### MECH-003 初期データモデル

- 優先度: P0 / 推奨順序3
- 状態: DONE
- 目的: プライバシー、安全、権限、出典、確認、監査に必要な概念と関係を定義する。
- 成果物: `docs/DATA_MODEL.md`
- 完了条件: 概念モデル、状態遷移、個人記録と共有ナレッジの分離、取込候補、出力・削除・匿名化を記載し、物理DBや特定Providerに固定していない。
- 依存タスク: MECH-001、MECH-002
- 所有者確認の要否: 必要。NEEDS_OWNER項目は実物資料と運用判断を得てから確定する。

### MECH-008 インポートパイプライン設計

- 優先度: P0
- 状態: DONE
- 目的: 紙・PDF・画像を確認済みの非公開整備履歴へ変換する工程とProvider境界を定義する。
- 成果物: `docs/IMPORT_PIPELINE.md`
- 完了条件: 原本取得、OCR、個人情報候補除去、構造化、確認、非公開保存、原本削除、再処理、費用計測を定義し、実物資料がない段階で確定しない事項を明示済み。
- 依存タスク: MECH-003
- 所有者確認の要否: 必要。帳票入手後に精度と保持時間を決定する。

### MECH-001 初期MVPのユーザーストーリー

- 優先度: P0 / 推奨順序1
- 状態: DONE
- 目的: 招待制ベータで誰が何を達成するかを、実装判断に使える粒度で定義する。
- 成果物: `docs/USER_STORIES.md`
- 完了条件: オーナー、メカニック、運営者の主要ストーリー、受入観点、対象外、日本語・英語UI、非公開デフォルト、ユーザー確認、運営確認の前提を記載済み。
- 依存タスク: なし
- 所有者確認の要否: 不要。未確定事項は `NEEDS_OWNER` として記録済み。

### MECH-007 ローカルWebプロトタイプ

- 優先度: P0
- 状態: DONE
- 目的: 主要体験と設計境界を、外部接続なしでブラウザ操作できる状態にする。
- 成果物: `apps/web`、`packages/core`、`packages/shared`、`packages/i18n`、README、検証結果
- 完了条件: 主要画面、手動追加・編集、検索、日英切替、localStorage保存が動作し、lint、型チェック、テスト、buildが成功済み。モバイル・デスクトップ表示と主要操作もブラウザで確認済み。
- 依存タスク: MECH-001
- 所有者確認の要否: 必要。画面構成と暫定デザインを確認する。

### MECH-104 プロトタイプ用モノレポ構成

- 優先度: P0
- 状態: DONE
- 目的: Webと将来共有するロジックの配置境界を検証する。
- 成果物: npm workspacesによる `apps/web` と `packages/*` の構成
- 完了条件: UI、ドメイン、Provider、i18nが分離されている。本番構成の最終確定ではない。
- 依存タスク: MECH-001
- 所有者確認の要否: 参照会話の実装指示によりプロトタイプ範囲で承認済み。

### MECH-105 プロトタイプ用パッケージマネージャ

- 優先度: P0
- 状態: DONE
- 目的: 所有者が `npm install` と `npm run dev` で起動できるようにする。
- 成果物: npm workspaces設定
- 完了条件: npm scriptsとlockfileで再現可能な状態にする。
- 依存タスク: MECH-104
- 所有者確認の要否: 参照会話の実装指示によりプロトタイプ範囲で承認済み。

### MECH-000 初期プロジェクト設計

- 優先度: P0
- 状態: DONE
- 目的: コード実装前のプロジェクト方針とCodex恒常ルールを定める。
- 成果物: 初期設計文書一式、`AGENTS.md`
- 完了条件: 初期文書と恒常ルールが作成され、コード、依存、データベース、外部接続を追加していない。
- 依存タスク: なし
- 所有者確認の要否: 完了済み
