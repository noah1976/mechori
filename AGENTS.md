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

## 参照文書

- プロダクト方針: `docs/PRODUCT.md`
- MVP範囲: `docs/MVP_SCOPE.md`
- アーキテクチャ: `docs/ARCHITECTURE.md`
- 主要画面: `docs/SCREENS.md`
- 初期データモデル: `docs/DATA_MODEL.md`
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
- 収益化・費用: `docs/MONETIZATION.md`
- 事業成長・初期獲得・検証指標: `docs/BUSINESS_GROWTH.md`
- 初期検証の計測定義: `docs/MEASUREMENT_PLAN.md`
- 招待制ベータ運用: `docs/BETA_PLAYBOOK.md`
- Professional課題検証: `docs/PROFESSIONAL_DISCOVERY.md`
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
