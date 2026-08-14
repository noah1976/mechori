# MECHORI Codex 作業ルール

MECHORI（メカリィ）は、車両メンテナンス記録を構造化し、同型車・同年式・同仕様の整備事例を検索できるナレッジサービスです。一般的な車SNS、写真共有SNS、故障診断サービスではありません。

## 最重要原則

- 故障診断、修理指示、整備書または専門家の代替を提供しない。
- 「原因」「必ず直る」「交換してください」などの断定を避け、「原因候補」「確認箇所」「改善報告」などを使う。
- 投稿者の事実、推測、AI整理、メカニック確認済み、公的資料、解決済み、未解決を区別する。
- Privacy by Design とデータ最小化を優先し、不要な個人情報を取得・保存しない。
- 所有者の承認なしに、有料契約、課金開始、本番デプロイ、本番DB変更、外部AIへ送るデータ範囲変更を行わない。
- 秘密情報をチャット、Git、文書、ログへ貼り付けるよう依頼しない。必要な場合は、所有者が対象サービスの管理画面またはローカル環境へ直接入力するための詳細手順を提示する。
- `main` ブランチへ直接コミットまたはマージしない。
- 実在しない整備事例、部品番号、車両仕様を、テストデータ以外として生成しない。

## 今後の実装方針

- Web初期MVPはスマートフォン向けWebアプリを想定する。
- 採用前提は Next.js、Supabase、Netlify、OpenAI API、将来 Expo / React Native。ただしアカウント作成、導入・接続、課金、本番利用は個別承認後に行う。
- 業務ロジック、データ型、入力検証、多言語コード、API処理をNext.js固有実装へ密結合しない。
- 将来のネイティブアプリ、AI、OCR、課金、モデレーション、法的対応を拡張できる構造を優先する。

## Cost constraint

MECHORIに信頼できる収益化の見通しが立つまで、継続的なサービス運用費を月額5,000円以内に維持する。

この予算には、ホスティング、データベース、ストレージ、認証、メール、AI・OCR API、監視、解析、およびその他の継続的な本番サービス費用を含む。Mac本体と、プロダクト所有者のChatGPT・Codex利用料は開発費とし、この上限には含めない。

- 無料枠、キャッシュ、バッチ処理、利用上限、予算アラート、標準的で移行可能な技術を優先する。
- 総額が月額5,000円以内と見込まれる場合でも、プロダクト所有者の明示的な承認なしに、有料プランの有効化、継続課金サービスの追加、従量課金サービスの導入を行わない。
- 事前承認なしに、月額5,000円を超える可能性がある構成を実装または有効化しない。
- 有料サービスを提案する際は、月額固定費と従量費の見積もり、無料枠の上限、より安価な代替案、導入を延期する場合の影響を簡潔に示す。

信頼できる収益化の見通しとは、有料ベータへの具体的な関心または申込があること、もしくは広告、Owner Plus、Professionalの収益で追加運用費を賄える合理的な予測があることを指す。

月額5,000円は目標額ではなく、必ず事前承認を必要とする上限として扱う。

## 参照文書

- プロダクト・事業・設計・実装の長期原則: `docs/CONSTITUTION.md`
- プロダクト方針: `docs/PRODUCT.md`
- MVP範囲: `docs/MVP_SCOPE.md`
- アーキテクチャ: `docs/ARCHITECTURE.md`
- 主要画面: `docs/SCREENS.md`
- 初期データモデル: `docs/DATA_MODEL.md`
- 車両名・市場名の正規化: `docs/VEHICLE_IDENTITY.md`
- 取込パイプライン: `docs/IMPORT_PIPELINE.md`
- 信頼性と確認: `docs/TRUST_AND_VERIFICATION.md`
- 危険領域タグ: `docs/HAZARD_TAGS.md`
- ナレッジ要約: `docs/KNOWLEDGE_SYNTHESIS.md`
- 画像プライバシー: `docs/MEDIA_PRIVACY.md`
- 日英基本用語: `docs/GLOSSARY_JA_EN.md`
- 多言語・EU展開: `docs/MULTILINGUAL.md`
- 外部サービス導入前確認: `docs/EXTERNAL_SERVICE_CHECKLIST.md`
- 外部基盤・費用: `docs/INFRASTRUCTURE_COST.md`
- プラン権限: `docs/PLAN_ENTITLEMENTS.md`
- 入力インセンティブ: `docs/CONTRIBUTION_INCENTIVES.md`
- ソーシャル・Garage Journal: `docs/SOCIAL_LAYER.md`
- プライバシー: `docs/PRIVACY.md`
- 安全性: `docs/SAFETY.md`
- 法務準備: `docs/LEGAL_READINESS.md`
- モデレーション: `docs/MODERATION.md`
- セキュリティ: `docs/SECURITY.md`
- AI方針: `docs/AI_POLICY.md`
- 第三者AI学習・クローラー方針: `docs/AI_CRAWLING_POLICY.md`
- 収益化・費用: `docs/MONETIZATION.md`
- 事業モデル・価格・Professional獲得・国際展開: `docs/BUSINESS_MODEL.md`
- 事業成長・初期獲得・検証指標: `docs/BUSINESS_GROWTH.md`
- 初期検証の計測定義: `docs/MEASUREMENT_PLAN.md`
- 招待制ベータ運用: `docs/BETA_PLAYBOOK.md`
- 3〜5人遠隔α運用: `docs/ALPHA_PLAYBOOK.md`
- 遠隔αの外部基盤設定: `docs/ALPHA_EXTERNAL_SETUP.md`
- 遠隔αの初回所有者設定: `docs/ALPHA_OWNER_BOOTSTRAP.md`
- Professional課題検証: `docs/PROFESSIONAL_DISCOVERY.md`
- Professional将来基盤・工場DX: `docs/PROFESSIONAL_PLATFORM.md`
- 日本税務準備: `docs/TAX_READINESS_JP.md`
- デザイン: `docs/DESIGN_DIRECTION.md`
- 決定記録: `docs/DECISIONS.md`
- ロードマップ: `docs/ROADMAP.md`
- バックログ: `docs/BACKLOG.md`
- 現在地: `docs/PROJECT_STATE.md`
- 夜間報告: `docs/NIGHTLY_REPORT_TEMPLATE.md`

## 夜間作業の扱い

自由に判断してよい: 関数・コンポーネント分割、型定義、テスト、軽微なリファクタリング、アクセシビリティ改善、確定仕様を実現する技術選択。

翌朝報告する: 新規依存パッケージ、DB項目追加、API構成変更、ディレクトリ構成変更、暫定的な仕様判断。

承認なしに行わない: 製品方針変更、無料・有料区分変更、個人情報取得範囲変更、外部AIへ送るデータ変更、本番デプロイ、本番DB変更、破壊的マイグレーション、有料サービス契約、課金開始、整備情報の創作、故障診断機能、法務・税務判断の確定。

## 夜間無人実行

- 原則として途中質問で全作業を止めず、ブロックされた項目だけを保留して安全に進められる作業を続ける。
- 安全性、可逆性、既存データとの互換性を優先し、仮定した判断と確認事項は最終報告へまとめる。
- データ損失、課金開始、またはセキュリティ低下の可能性がある場合は作業を止め、プロダクト所有者へ判断を戻す。

## 検証と報告

- 変更後は原則として lint、typecheck、test、build を実行し、未実行または失敗した項目は理由とともに報告する。
- デプロイ後にCodex自身がブラウザやComputer Useで見た目を確認せず、本番URLと人間が確認するためのQAチェックリストを提示する。
- 外部サービスの管理画面設定は、明示的な承認と操作依頼がない限り変更しない。

## AI実装原則

- AIは診断者ではなく、根拠のある情報を整理する編集者として扱う。
- 根拠のない推測を整備情報へ混ぜず、型式、部品番号、締付トルク、配線、修理手順を推測で生成しない。
- 根拠がなければ「分からない」を選び、将来のAI機能は必ず参照元へ戻れる構造にする。

## 状態管理

- 機能実装を完了したCodexタスクは、同じコミットで `docs/PROJECT_STATE.md` と必要に応じて `docs/ALPHA_LAUNCH_CHECKLIST.md` を更新する。
- コード完成、テスト成功、本番反映、人間QA完了を別の状態として扱う。
- 人間QA未実施の機能を「完了」と報告しない。
- 本番実機で再現する不具合は、テスト成功だけを根拠に解決済みとしない。
- 最終報告には、対応したP番号と新しい状態を記載する。

## UI/UX設計

- UI変更前に`docs/ux/`の該当文書を確認する。
- ユーザー向け用語は`docs/ux/UI_TERMINOLOGY.md`へ従う。
- 新規画面や主要導線変更時は`docs/ux/SCREEN_INVENTORY.md`または`docs/ux/USER_FLOWS.md`を更新する。
- UI実装完了と人間によるUX確認を別状態として扱う。
- 内部実装名をユーザー向け文言へそのまま表示しない。
