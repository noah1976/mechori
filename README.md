# MECHORY

MECHORY（メカリィ）は、車両メンテナンスの記録と事例を、同じ車種・年式・仕様のオーナーやメカニックが検索しやすい形で蓄積するナレッジサービスです。

- 英字名: MECHORY
- 日本語読み: メカリィ
- タグライン: Fix. Share. Drive on.
- 日本語表現: 直して、シェアして、また走ろう。

MECHORY は「Mech」と「Memory / History」を組み合わせたブランド名です。

## このリポジトリの現在地

この段階では、アプリケーションコード、データベース、外部サービス接続、依存パッケージの導入は行っていません。今後の Codex 作業で参照する初期設計文書と恒常ルールだけを置いています。

## 目的

世界中の整備記録、故障事例、部品情報、解決事例を、言語の壁を越えて検索できる車両メンテナンスナレッジ基盤を構築します。

初期実証車種は FIAT Barchetta とします。ただし、内部構造は他メーカー、他車種、バイク等へ拡張できる前提で設計します。

## 重要な非ゴール

MECHORY は、一般的な車SNS、写真共有SNS、故障診断サービスではありません。整備情報を参考情報として整理・共有するサービスであり、故障診断、修理指示、整備書または専門家の代替を提供しません。

## ドキュメント

- `AGENTS.md`: Codex が毎回参照する恒常ルール
- `docs/PRODUCT.md`: プロダクト方針
- `docs/MVP_SCOPE.md`: 初期MVPの範囲
- `docs/ARCHITECTURE.md`: 将来実装に向けた設計方針
- `docs/PRIVACY.md`: Privacy by Design とデータ最小化
- `docs/SAFETY.md`: 整備情報の安全性原則
- `docs/LEGAL_READINESS.md`: ユーザー権利・法的要請への準備
- `docs/MODERATION.md`: UGC とモデレーション
- `docs/SECURITY.md`: セキュリティ・運用
- `docs/AI_POLICY.md`: AI利用方針
- `docs/MONETIZATION.md`: 収益化と費用方針
- `docs/TAX_READINESS_JP.md`: 日本税務への将来準備
- `docs/DESIGN_DIRECTION.md`: デザイン方向性
- `docs/DECISIONS.md`: 決定記録
- `docs/ROADMAP.md`: ロードマップ
- `docs/BACKLOG.md`: バックログ
- `docs/PROJECT_STATE.md`: 現在地
- `docs/NIGHTLY_REPORT_TEMPLATE.md`: 夜間作業報告テンプレート

## 次の推奨ステップ

1. 所有者が未確定事項を確認する。
2. 技術スタックとリポジトリ構成の初期方針を決める。
3. 依存パッケージ導入前に、無料枠・費用・停止方法を確認する。
4. 初期MVPのデータモデル案を文書化する。
5. コード実装は、所有者の承認後に専用ブランチで開始する。
