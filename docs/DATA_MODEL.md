# DATA_MODEL

## 文書の目的

MECHORYの初期MVPで必要な概念、関係、状態を、特定DBやProviderに固定せず定義します。物理テーブル、インデックス、Supabase RLSは外部接続前に別途設計します。

現行プロトタイプの型は操作確認用です。この文書を初期MVPの概念モデルの正とし、実物の整備記録で検証してから物理モデルへ進みます。

## モデルの中心

```text
User
  └─ Vehicle
       ├─ OdometerEpisode（メーター個体・連続期間）
       │    └─ OdometerReading（その時点の表示値）
       └─ MaintenanceEvent（1回の入庫・整備機会）
            ├─ Observation（症状・観察事項）
            ├─ MaintenanceAction（複数の点検・作業）
            │    └─ PartUsage（使用・交換した部品）
            └─ EvidenceSource（出典）

ImportSession
  ├─ TemporaryArtifact（一時原本メタデータ）
  └─ ExtractedCandidate（未確認の抽出候補）
       └─ FieldAssertion（項目ごとの値・確度・確認状態）

MaintenanceEvent
  └─ KnowledgeSubmission（共有候補）
       └─ KnowledgeCase（公開ナレッジ）
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

### UserProfile

認証基盤のアカウントと分離したアプリケーション上の利用者です。

主要属性:

- `id`: 内部ユーザーID
- `displayName`: 任意の表示名
- `preferredLocale`: `ja` / `en`
- `roleAssignments`: オーナー、運営者等の権限関連
- `createdAt` / `updatedAt`
- `deletionState`: 通常、削除申請中、削除済み、法的保全

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

### Vehicle

ユーザーが管理する車両個体です。公開車両マスタとは分離します。

- `id` / `ownerUserId`
- `makeName` / `modelName`
- `modelYear`
- `engineDescriptor`
- `transmissionDescriptor`
- `steeringPosition`
- `marketRegion`
- `variantDescriptor`
- `specificationState`: 確認済み、ユーザー入力、不明
- `visibility`: 初期値は非公開
- `createdAt` / `updatedAt`

保持しない属性:

- VIN・車台番号全文、ナンバープレート、正確な保管場所、常時位置情報

将来、車種マスタを追加する場合は、ユーザー車両の入力原文を失わずに参照IDを追加します。未確認仕様をマスタ値で自動補完しません。

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
