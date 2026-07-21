# DATA_MODEL

## 文書の目的

MECHORIの初期MVPで必要な概念、関係、状態を、特定DBやProviderに固定せず定義します。物理テーブル、インデックス、Supabase RLSは外部接続前に別途設計します。

現行プロトタイプの型は操作確認用です。試作スキーマv9では、整備記録に加えてプロフィール公開範囲、現在・過去を含むオーナーと車両の関係、車両種別、順序付きブロックを持つGarage Journal、記録の由来、メディア参照、フォロー関係、プロフィールの表示安全関係、通報と最小モデレーション履歴を保持します。通常のJournalメディア本体はIndexedDBへ分離します。3〜5人の遠隔αに限り、初回愛車写真と簡易出来事写真はブラウザで再生成した小容量WebPを非公開Workspaceへ暫定保存し、β前に非公開Storageへ移行します。この文書を初期MVPの概念モデルの正とし、実物の整備記録で検証してから物理モデルへ進みます。

## モデルの中心

```text
User
  ├─ InvitationRedemption
  └─ Vehicle
       ├─ OdometerEpisode（メーター個体・連続期間）
       │    └─ OdometerReading（その時点の表示値）
       └─ MaintenanceEvent（1回の入庫・整備機会）
            ├─ Observation（症状・観察事項）
            ├─ MaintenanceAction（複数の点検・作業）
            │    └─ PartUsage（使用・交換した部品）
            └─ EvidenceSource（出典）

UserProfile / Vehicle / VehicleModel
  ├─ FollowRelation（フォロー）
  └─ GarageJournalPost（自由記述）
       ├─ JournalMaintenanceLink（整備記録との任意リンク）
       ├─ JournalMediaAttachment（画像・動画の参照と状態）
       │    └─ MediaPublication（公開確認済み派生ファイル）
       └─ JournalAssertionCandidate（AI等による未確認候補）

ImportSession
  ├─ TemporaryArtifact（一時原本メタデータ）
  └─ ExtractedCandidate（未確認の抽出候補）
       └─ FieldAssertion（項目ごとの値・確度・確認状態）

MaintenanceEvent
  └─ KnowledgeSubmission（共有候補）
       └─ KnowledgeCase（公開ナレッジ）

GarageJournalPost
  └─ JournalAssertionCandidate
       └─ ユーザー確認後のみ MaintenanceEvent または KnowledgeSubmission へ反映
```

個人の`MaintenanceEvent`を公開データへ直接変更しません。共有時は`KnowledgeSubmission`を作り、運営確認後に別の`KnowledgeCase`として公開します。

## 共通規則

- すべての主要概念に、推測可能な連番ではない安定した内部IDを持たせる。
- 所有者ID、作成日時、更新日時、状態を必要な概念に持たせる。
- 未入力、不明、未確認、該当なしを同じ空文字で表現しない。
- 原文、翻訳、言語非依存コードを分離する。
- 事実、原因候補、AI抽出候補、結果報告を分離する。
- 個人情報や原本文全体を監査ログへ複製しない。
- 物理削除、論理的な公開停止、匿名化、法的保全を区別する。

## 主要概念

### TestInvitation / InvitationRedemption

遠隔α・招待制βの参加者を限定するための招待と、その使用記録です。認証に成功しただけでは非公開領域へ入れず、有効な招待から参加権限を得る必要があります。

- `TestInvitation.id`: 推測困難な内部ID
- `phase`: α、β
- `tokenHash`: 十分にランダムな生トークンからサーバー側で作るハッシュ。生トークンは保存しない
- `createdByUserId` / `createdAt` / `expiresAt`
- `maxRedemptions`: αの標準は1
- `revokedAt`: 個別失効
- `InvitationRedemption.invitationId` / `userId` / `redeemedAt`

同じ利用者による再ログインは新しい使用回数として数えません。使用済み、期限切れ、失効を区別し、招待状態をOAuth Providerのプロフィール属性へ埋め込みません。

### UserProfile

認証基盤のアカウントと分離したアプリケーション上の利用者です。

主要属性:

- `id`: 内部ユーザーID
- `displayName`: 任意の表示名
- `preferredLocale`: 対応UI言語のBCP 47タグ。初期値は`ja` / `en`だが固定列挙をDB制約へ埋め込まない
- `roleAssignments`: オーナー、運営者等の権限関連
- `createdAt` / `updatedAt`
- `deletionState`: 通常、削除申請中、削除済み、法的保全
- `visibility`: 非公開、プロフィールの直接フォロワー、公開
- `displayFields`: 役割、自己紹介、愛車一般情報、所有期間、公開Journal件数

保持しない属性:

- 氏名、住所、電話番号、生年月日、免許証情報

### ConsentRecord

規約、プライバシー方針、任意の外部処理への同意をバージョン単位で記録します。

- `userId`
- `policyType`
- `policyVersion`
- `decision`: 同意、拒否、撤回
- `decidedAt`
- `regionCode`: 必要な場合のみ最小粒度

### GarageJournalPost

オーナーが自分の言葉で書く車両ブログです。構造化整備記録や公開ナレッジの正本にはしません。

- `id` / `authorUserId`
- `vehicleId`: 任意。車両個体を公開しない投稿も許容する
- `title` / `bodyOriginal` / `sourceLanguage`
- `occurredOn`: 日まで分かる場合の実際の日付
- `occurredYear` / `occurredMonth`: 年月または年だけ分かる場合の値
- `occurredPrecision`: `day`、`month`、`year`、`unknown`
- `occurredPeriodNote`: 「車検の少し前」「購入して半年後」等、本人が覚えている時期の補足
- `contentBlocks`: 段落、見出し、引用、メディア参照を順番に保持する本文正本
- `visibility`: 非公開、フォロワー、公開。初期値は非公開
- `knowledgeExtractionConsent`: ナレッジ候補抽出を許可するか
- `createdAt` / `updatedAt` / `publishedAt`
- `moderationState` / `deletionState`

本文はAI生成を前提にせず、本人の原文とブロック順序を保持します。`bodyOriginal`は検索・移行互換用にテキストブロックから導出し、表示順の正本にはしません。翻訳やAI抽出結果は別データとし、原文を上書きしません。出来事の時期は、正確な日、年月ごろ、年ごろ、時期不明を区別します。`2021年6月ごろ`を`2021-06-01`として事実保存せず、並び替え用の値と利用者へ示す精度を分離します。既存データの未設定は許容し、表示時のみ`createdAt`へフォールバックします。

ユーザー向けの`さっと記録`と`詳しく記録`は同じ`GarageJournalPost`へ保存します。`eventType`を持つ記録は軽量編集画面、順序付き本文を中心に作成した記録は詳細編集画面を使います。どちらも本人だけが更新でき、更新時は`id`、`authorUserId`、`createdAt`、既存の反応・モデレーション状態を保持して`updatedAt`を更新します。対象車両も本人所有であることを保存処理で確認します。

### ContentTranslation

Journal、整備記録、Observation、公開KnowledgeCase等の原文から作る派生翻訳です。

- `entityType` / `entityId` / `fieldCode`: 翻訳対象
- `sourceLanguage` / `targetLanguage`: BCP 47言語タグ
- `translatedText`: 翻訳文
- `sourceContentVersion`: 翻訳時点の原文版
- `method`: 機械翻訳、人間翻訳
- `reviewStatus`: 未確認、人間確認済み、却下、原文更新により期限切れ
- `providerReference` / `modelOrRuleVersion`: 外部処理を使った場合の追跡情報
- `translatedAt` / `reviewedAt` / `reviewedByUserId`

原文更新後も`sourceContentVersion`が一致しない翻訳を現行扱いしません。原文と翻訳を別の独立事例として数えません。

### JournalMaintenanceLink

Garage Journalと整備記録を任意で関連付けます。

- `journalPostId` / `maintenanceEventId`
- `displayFields`: 日付、走行距離、整備箇所、作業等から投稿者が表示を許可した項目
- `createdAt`

関連付けだけで非公開MaintenanceEventを公開しません。Journal上に表示する定型情報は、投稿者が項目単位で確認します。

### JournalMediaAttachment

Garage Journalへ添える写真、画像、動画のメタデータです。ファイル本体をJournal本文やlocalStorageへ埋め込みません。

- `id` / `journalPostId`
- `kind`: 画像、動画
- `storageObjectId`: 非公開原本または公開用派生ファイルへの内部参照
- `mimeType` / `sizeBytes`
- `altText`: 内容の説明
- `privacyState`: 非公開のみ、処理待ち、目視確認待ち、公開可能、公開停止
- `createdAt` / `deletedAt`

公開用派生ファイルは原本と別IDにし、原本への公開URLを作りません。動画はフレーム、音声、メタデータの確認状態を別途追跡できる構造とします。

### JournalAssertionCandidate

Garage Journal本文から抽出した、まだ事実ではない候補です。

- `id` / `journalPostId`
- `assertionType`: 症状、原因候補、確認箇所、作業、部品、結果、その他
- `candidateValue` / `sourceTextRange`
- `extractionMethod`: AI、規則、手動
- `verificationStatus`: 未確認、本人確認済み、却下
- `targetType`: 整備記録追記候補、共有ナレッジ候補、検索関連付け
- `createdAt` / `reviewedAt`

AI抽出だけでMaintenanceEventやKnowledgeCaseを更新しません。

### FollowRelation

利用者が継続して見たい対象を記録します。

- `followerUserId`
- `targetType`: プロフィール、車両、車種
- `targetId`
- `createdAt`

フォロー数やフォロワー数は、KnowledgeCaseの信頼度、検索順位、Professional確認へ利用しません。

### ProfileSafetyRelation

利用者本人だけが参照する、プロフィール単位の表示・安全関係です。

- `actorUserId` / `targetUserId`
- `relationType`: ミュート、ブロック
- `createdAt`

ミュートはフォローを維持してフィード表示だけを抑止します。ブロックは対象プロフィールと対象者の個別車両へのフォローを解除し、対象者の投稿・候補・直接閲覧を抑止します。車種フォローは維持します。件数や状態を公開プロフィール、ナレッジ信頼度、検索順位へ利用しません。

### ContentReport / ModerationEvent

Journalへの通報と、その後の操作を本文から分離します。

- `reporterUserId` / `targetType` / `targetId`
- `reason`: 個人情報、危険な断定、嫌がらせ、権利侵害、スパム、その他
- `details`: 任意、文字数制限付き
- `status`: 受付、確認中、修正依頼中、一時非公開、問題なし終了
- `ModerationEvent`: 操作主体、操作種別、日時

操作履歴へJournal本文や通報詳細を複製しません。一時非公開は削除と分け、復元可能な公開停止状態として扱います。本番の運営権限と監査保管は物理DB・RLS設計時に確定します。

### Vehicle

ユーザーが管理する車両個体です。公開車両マスタとは分離します。

- `id` / `ownerUserId`
- `vehicleCategory`: 自動車、オートバイ、原付、その他。クルマとバイクで別モデルを作らない
- `makeName` / `modelName`: ユーザー入力を正本として必須。マスタ候補の有無を問わない
- `makeInput` / `modelInput`: ユーザー入力原文。正規化後も保持する
- `brandId`: 既知メーカーの世界共通ID。表示は原則アルファベット表記
- `modelFamilyId`: 市場別名称をまたぐ車系統。検索・車種フォローの基本単位
- `generationId`: 年式・型式等で確認できた世代。不明を許容
- `variantId`: 同一世代内の機関・駆動系等を区別する仕様系統。不明を許容し、個別グレード名とは分ける
- `marketNameId` / `marketRegion`: ヴィッツ／YARIS等の市場別販売名と対象地域
- `VehicleModelRelation`: 市場名差、OEM姉妹車、ブランド移管、正規継承、着想・派生を、関係元・関係先・関係種別で保持するカタログ上の辺
- `identityMatchStatus`: `matched_alias`、`brand_only`、`unmatched`。写真候補は確認前にここへ昇格しない
- `specificationMatchStatus`: `confirmed_model_code`、`conflicting_inputs`、`grade_candidate`、`generation_candidate`、`unmatched`
- `modelYear`: 不明を許容
- `grade` / `modelCode` / `nickname`: 任意。初回登録の完了条件にしない
- `engineDescriptor`
- `transmissionDescriptor`
- `steeringPosition`
- `marketRegion`
- `variantDescriptor`
- `relationshipType`: 現在所有、過去所有、未設定、家族所有、共同管理
- `ownershipStartedYear` / `ownershipStartedMonth`: 日は保持せず、不明を許容
- `ownershipEndedYear` / `ownershipEndedMonth`: 過去所有時のみ。不明を許容
- `ownershipPeriodNote`: 年代や「春ごろ」等の曖昧な時期を本人の表現のまま保持。日付へ推測変換しない
- `primaryUse` / `dispositionReason`: 任意の用途、手放した理由
- `odometerContext`: 現在値、所有終了時、所有中の途中、不明を区別する
- `specificationState`: 確認済み、ユーザー入力、不明
- `visibility`: 初期値は非公開
- `createdAt` / `updatedAt`

保持しない属性:

- VIN・車台番号全文、ナンバープレート、正確な保管場所、常時位置情報

車種カタログは、ユーザー車両の入力原文を失わずに参照IDを追加します。未確認仕様をマスタ値で自動補完しません。メーカー表記、翻字、同一市場名、市場別名称、車系統、世代、仕様系統、個別グレードを同じ文字列置換で処理しません。メーカーをまたぐ車両は単純な別名配列へ潰さず、`VehicleModelRelation`の種別に応じて検索範囲と確度を変えます。

愛車登録は`makeName`と`modelName`だけで完了でき、車種マスタ参照、型式、正確な年式、エンジン等を完了条件にしません。自由入力車種も登録直後から整備記録、Journal、プロフィール、検索範囲に使用できます。正規化候補の確認状態は検索品質の属性であり、ユーザー車両の有効・無効を表しません。

現在所有車を手放した場合もVehicleを削除・複製せず、`relationshipType`を過去所有へ変更します。車両IDを維持するため、写真、MaintenanceEvent、GarageJournalPost、フォロー参照はそのまま残ります。誤操作や再取得時は現在所有へ戻せます。既存v8以前の車両は、明示的な過去所有情報がない限り自動車・現在所有として読み替えます。

過去車のMaintenanceEventには`evidenceBasis`を持たせ、作業当時の記録、明細・領収書、写真・整備記録簿、後日の記憶、不明を区別します。これは投稿者確認や公開状態と別軸であり、検索・集計・AI整理で同じ確度として数えないための入力です。

公開プロフィールでは`オーナー表示名 / 車両`を一つの発信単位として扱います。所有期間は本人が公開を選んだ場合だけ表示し、信頼度や整備能力の評価へ利用しません。車齢は初度登録日がない限りモデル年からの概算であることを明示します。

### OdometerEpisode

メーター交換、修理、リセット、桁あふれ、単位変更等を考慮し、同じ表示値の連続性を持つ期間を表します。車両1台に複数のEpisodeを持てます。

- `id` / `vehicleId`
- `startedAt` / `endedAt`: 不明を許容
- `episodeReason`: 初期メーター、交換、修理、リセット、桁あふれ、単位変更、不明
- `previousEpisodeId`: 前のメーター期間との関連
- `continuityState`: 連続性確認済み、一部推定、不明
- `changeEvidenceSourceId`: 交換記録等がある場合
- `notes`: 個人情報を含まない範囲の経緯

メーター交換回数に上限を設けず、表示値の減少だけで異常・虚偽・改ざんと判定しません。

### OdometerReading

整備時点等に実際に表示されていた値を、推定累積走行距離と分けて記録します。

- `id` / `vehicleId` / `odometerEpisodeId`
- `displayedValue`
- `unit`: `km` / `mi` / 不明
- `recordedAt`
- `verificationStatus`
- `evidenceSourceId`
- `contextState`: 通常、交換直前、交換直後、桁あふれ後、単位変更、不明

必要な場合だけ、別の`CumulativeDistanceEstimate`として累積走行距離の推定値または範囲を持ちます。推定値は表示値として扱わず、計算根拠と「確認済み・推定・不明」の確度を併記します。

### MaintenanceEvent

1回の入庫、車検、点検、DIY整備等の整備機会です。複数作業の親になります。

- `id` / `vehicleId` / `ownerUserId`
- `serviceDate`: 日付と精度。年・月までしか分からない場合を扱える
- `odometerReadingId`: その整備時点のメーター表示値。未記録を許容
- `summary`: ユーザーが確認した概要
- `providerType`: 本人、整備工場、不明。個人名は保存しない
- `costSummary`: 通貨、税込・税別不明を含む状態
- `resolutionStatus`: 解決済み、未解決、一部解決、該当なし、不明
- `sourceLanguage`
- `verificationStatus`
- `visibility`: 非公開、共有候補作成済み等。公開状態はKnowledgeCase側で扱う
- `createdAt` / `updatedAt`

### Observation

症状、警告表示、音、漏れ、点検時の指摘等、確認された観察事項です。

- `id` / `maintenanceEventId`
- `observationType`: 症状、警告、点検指摘、定期整備理由、その他
- `originalText` / `sourceLanguage`
- `normalizedCode`: 将来の言語非依存コード。未分類を許容
- `factState`: ユーザー確認済み、抽出候補、推測、判別不能
- `occurredContext`: 必要最小限の自由記述。正確な位置情報を含めない

症状がない定期整備では、Observationを必須にしません。

### MaintenanceAction

点検、調整、交換、修理等の個別作業です。1つのMaintenanceEventに複数紐付きます。

- `id` / `maintenanceEventId`
- `actionType`: 点検、交換、調整、修理、清掃、測定、その他
- `originalText` / `sourceLanguage`
- `normalizedCode`: 未分類を許容
- `causeCandidateText`: 断定した原因ではなく候補
- `checksPerformedText`
- `resultText`
- `resolutionStatus`
- `hazardTags`
- `hazardLevel`: `LOW` / `CAUTION` / `CRITICAL`
- `verificationStatus`
- `displayOrder`

### PartUsage

MaintenanceActionに関連する部品、消耗品、油脂等です。

- `id` / `maintenanceActionId`
- `partNameOriginal`
- `manufacturerOriginal`
- `partNumberOriginal`
- `usageType`: 交換、取付、取外し、補充、確認、その他
- `quantity` / `unit`: 不明を許容
- `partNumberVerification`: 未入力、要確認、ユーザー確認済み、資料確認済み
- `sourceFieldAssertionId`: 取込候補との関連

部品番号は1文字違いの影響が大きいため、AI推測だけで確認済みにしません。

### EvidenceSource

情報の出典と利用権限を追跡します。原本を保存しない場合も最小限のメタデータを持てます。

- `id`
- `sourceType`: 手入力、本人所有資料、公的資料、許諾済み投稿、メカニック記録、DEMO
- `ownerUserId`: 個人記録の場合
- `referenceUri`: 公開資料等で必要な場合のみ
- `rightsBasis`: 本人作成、本人所有、許諾、引用、公的情報等
- `capturedAt`
- `originalRetentionState`: 未保存、一時保存中、削除済み、例外保全
- `temporaryArtifactId`: 一時原本がある場合のみ

### ImportSession

紙・PDF・画像等を、確認済み記録へ変換する1回の処理単位です。

- `id` / `ownerUserId` / `vehicleId`
- `inputType`: PDF、画像、CSV、音声、その他
- `processingLocation`: 端末内、ローカル、承認済み外部Provider
- `status`: 作成、取込中、OCR済み、構造化済み、確認待ち、確定済み、一部失敗、失敗、破棄
- `pageCount`
- `providerReferences`: Provider固有情報を正規化した参照
- `usageMetrics`: ページ数、処理量、費用。本文を含めない
- `createdAt` / `expiresAt` / `completedAt`

### TemporaryArtifact

原本そのものではなく、一時処理対象を追跡するメタデータです。

- `id` / `importSessionId`
- `storageProvider`
- `artifactType`
- `temporaryLocationReference`: 公開URLにしない
- `containsPersonalDataCandidate`
- `deletionDeadline`
- `deletionState`: 未削除、削除処理中、削除済み、削除失敗、法的保全
- `deletedAt`

原本を標準で恒久保存しません。バックアップ対象からの除外可否もProvider導入前に確認します。

### ExtractedCandidate

OCR・AI・手動インポートで作られた、まだ事実ではない整備イベント候補です。

- `id` / `importSessionId`
- `candidateType`: MaintenanceEvent、MaintenanceAction、PartUsage
- `suggestedParentId`
- `sourcePageReferences`
- `status`: 未確認、確認中、確認済み、却下、統合済み、分割済み
- `modelOrRuleVersion`: AIまたは抽出ルールを使った場合
- `createdAt` / `confirmedAt` / `confirmedByUserId`

### FieldAssertion

抽出候補の項目ごとに、値、出典位置、確度、確認状態を保持します。

- `id` / `extractedCandidateId`
- `fieldCode`
- `rawExtractedText`
- `suggestedValue`
- `sourcePage` / `sourceRegionReference`
- `confidence`: Providerの数値をそのまま信頼せず、表示用区分へ正規化する
- `inferenceState`: 読取、推測、判別不能、手入力
- `verificationState`: 未確認、要確認、ユーザー確認済み、却下
- `correctedValue`

### KnowledgeSubmission

個人記録から明示的に作る共有候補です。

- `id` / `sourceMaintenanceEventId` / `submittedByUserId`
- `selectedFields`
- `anonymizationState`
- `hazardReviewState`
- `rightsReviewState`
- `status`: 下書き、提出済み、運営確認中、訂正依頼、承認、見送り、取消
- `submittedAt` / `reviewedAt`

### KnowledgeCase

公開検索の対象となる共有ナレッジです。個人記録の正本とは別に管理します。

- `id`
- `knowledgeSubmissionId`: 内部関連。公開APIへ不用意に出さない
- `vehicleApplicability`: メーカー、車種、年式範囲、エンジン、仕様と確認状態
- `observations`
- `causeCandidates`
- `checksReported`
- `actionsReported`
- `partsReported`
- `outcomeReports`
- `sourceSummary`
- `verificationSummary`
- `hazardTags` / `hazardLevel`
- `publicationStatus`: 運営確認中、公開、訂正中、一時非公開、削除
- `publishedAt` / `lastReviewedAt` / `updatedAt`

KnowledgeCaseは「正しい修理方法」を表すものではなく、確認範囲を示した参考事例です。

### RevisionEvent / AuditEvent

内容の訂正履歴と、権限を伴う運営操作を分離します。

- `RevisionEvent`: 対象、変更項目、変更理由、変更前後への参照、実行者区分、日時
- `AuditEvent`: 公開、非公開化、匿名化、削除、法的保全等の操作種別、対象ID、実行者ID、理由コード、日時、結果

本文全体や個人情報を監査ログへ重複保存しません。

### MediaAsset / SensitiveRegionReview

原本と公開用派生画像を分離し、画像のプライバシー確認状態を追跡します。

- `MediaAsset`: 原本またはマスク済み派生画像、メタデータ除去状態、検出状態、目視確認状態
- `SensitiveRegionReview`: ナンバープレート、他車両ナンバー、顔、住所、書類上の個人情報等の候補
- `status`: 検出済み、不可逆マスク済み、ユーザー確認済み誤検出
- `redactionMethod`: solid fill、破壊的再描画、crop

ナンバープレートの認識文字列や顔特徴量は保持しません。公開条件は`docs/MEDIA_PRIVACY.md`を参照します。

### KnowledgeSynthesis

症状検索で採用した公開KnowledgeCaseと、集計結果を結び付ける一時的な出力契約です。

- 使用した公開事例ID
- 車両一致範囲
- 根拠付きの原因候補、確認箇所、対応
- 改善、変化なし、悪化、未解決、不明の件数
- 独立出典数
- 危険ポリシー
- 情報不足状態

AIの自由回答を正本データとして保存しません。必要な処理履歴はAI監査情報として分離し、出力契約は`docs/KNOWLEDGE_SYNTHESIS.md`を参照します。

## 状態遷移

### 取込候補

```text
作成 → OCR済み → 構造化済み → 確認待ち
  → 確認済み → 非公開の個人記録として確定
  → 却下 / 破棄
```

どの途中状態からも、失敗、一部失敗、再処理へ移行できます。再処理で確認済み値を黙って上書きしません。

### 個人記録と共有

```text
非公開個人記録
  → 共有候補下書き
  → 提出済み
  → 運営確認中
  → 公開ナレッジ
```

個人記録の削除と公開ナレッジの非公開化・匿名化は別々に処理します。

### 公開ナレッジ

```text
運営確認中 → 公開
運営確認中 → 訂正依頼 / 見送り
公開 → 訂正中 / 一時非公開 / 削除
一時非公開 → 再確認 → 公開または削除
```

## ユーザー単位の出力・削除

- `ownerUserId`からVehicle、MaintenanceEvent、ImportSession、TemporaryArtifact、KnowledgeSubmissionを特定できるようにする。
- データ出力は個人記録、確認履歴、共有候補、同意履歴を機械可読形式で生成できる境界を持つ。
- アカウント削除では、非公開記録と一時原本を原則削除する。
- KnowledgeCaseは投稿者との関連解除と十分な匿名化が可能な場合だけ保持を検討する。
- 法的保全は対象、根拠、期限、閲覧権限を通常削除と分離する。

## 現行プロトタイプとの差分

- `MaintenanceRecord`を`MaintenanceEvent`と複数の`MaintenanceAction`へ分ける。
- 症状を必須文字列にせず、複数のObservationとして扱う。
- 部品をEvent直下ではなくActionへ関連付ける。
- 表示用の`matchScope`文字列を、車両適用範囲の構造化データから生成する。
- `visibility`だけで個人記録と公開ナレッジを表さず、KnowledgeSubmissionとKnowledgeCaseを分ける。
- OCR・AI候補をMaintenanceEventへ直接保存せず、ImportSession、ExtractedCandidate、FieldAssertionを経由する。
- 単一の`odometerKm`を累積走行距離とみなさず、メーター期間、表示値、推定累積走行距離を分離する。

この差分は次の実装タスクで段階的に反映します。現行localStorageデータは検証用のため、本番移行対象にしません。

## NEEDS_OWNER

- FIAT Barchettaの仕様分類粒度と、その信頼できる情報源
- 初期ベータで登録できる車両数
- 費用を項目別に持つか、イベント合計だけにするか
- 整備工場名を保存・公開できる条件
- 共有ナレッジの匿名化後保持とアカウント削除時の扱い
- 初期管理者の権限分離と監査閲覧範囲
- 一時原本の保持時間と例外保存条件
- メーター交換前後の値が不明な場合に、推定累積走行距離を表示する条件
