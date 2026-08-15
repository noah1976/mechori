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

## Codexモデル選定と自走

- トークンと利用コストを常に考慮し、通常作業で高コストのモデルを安易に使用しない。
- `Luna`は文書作業、定型作業、軽微なCSS、GitHub／Netlify等の定型操作、単純な調査に使う。
- `Terra`は通常の機能実装、UI変更、コンポーネント実装、一般的なデバッグに使う。
- `Sol`はリポジトリ全体監査、アーキテクチャ、難しい設計判断、原因不明の高度なデバッグに限って使う。
- 安全な調査、実装、テスト、lint、typecheck、build、git diff確認、文書更新、commit、push、PR作成は、途中承認を求めず可能な範囲で最後まで自律的に進める。
- blockerがあっても、他に進められる安全な作業を先に完了する。単なる不確実性だけを理由に停止しない。
- 破壊的・不可逆な操作、課金、秘密情報、データ損失、security risk、mainへのmergeなど、所有者の判断が必要な事項だけ確認へ戻す。

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

### Project state checkpoint

- CodexはMECHORIの重要な作業の節目で、プロジェクト状態をMarkdownへ記録する。原則として現在の実装状態は`docs/PROJECT_STATE.md`を起点に確認し、計画は`docs/BACKLOG.md`、重要な判断は`docs/DECISIONS.md`、人間QAは`docs/ALPHA_LAUNCH_CHECKLIST.md`へ責務に応じて記録する。
- 少なくとも、大きな機能・UI変更の完了時、Pull Requestを`main`へmergeする段階、複数Backlog項目をまとめて完了した時、仕様・アーキテクチャ・収益化などの重要方針変更時、新しいP0/P1問題の発見時、大きな作業フェーズの終了時、長期中断の可能性がある時に更新を検討する。
- 状態記録には、現在の状態、完了したこと、未完了、P0/P1/P2、新たに判明した問題、重要な意思決定と理由、次に行うこと、関連PR／branch、更新日を最低限残す。
- 既存の改善・修正項目や過去の意思決定を、理由なく削除しない。方針を変更する場合は旧方針を消すだけでなく、変更理由と置き換え先を追記して追跡可能にする。

## UI/UX設計

- UI変更前に`docs/ux/`の該当文書を確認する。
- ユーザー向け用語は`docs/ux/UI_TERMINOLOGY.md`へ従う。
- 新規画面や主要導線変更時は`docs/ux/SCREEN_INVENTORY.md`または`docs/ux/USER_FLOWS.md`を更新する。
- UI実装完了と人間によるUX確認を別状態として扱う。
- 内部実装名をユーザー向け文言へそのまま表示しない。

## GitHubアカウント運用

このリポジトリ `noah1976/mechori` は個人GitHubアカウント `noah1976` の所有である。一方、このMacの通常のGitHub CLI active accountは仕事用 `noah1976insemble` を使用する。

### グローバルactive accountを変更しない

- MECHORY作業中も、Mac全体のGitHub CLI active accountは `noah1976insemble` のまま維持する。
- MECHORYのために `gh auth switch`、`gh auth login`、`gh auth logout`、`gh auth refresh` を実行しない。

### MECHORY専用token

- `noah1976/mechori` に対するGitHub API、Pull Request確認・作成などの `gh` 操作では、`MECHORI_GITHUB_TOKEN` を使用する。
- 使用時は、コマンド単位で `GH_TOKEN` として渡す。

```bash
GH_TOKEN="$MECHORI_GITHUB_TOKEN" gh api ...
GH_TOKEN="$MECHORI_GITHUB_TOKEN" gh pr view ...
GH_TOKEN="$MECHORI_GITHUB_TOKEN" gh pr create --base main ...
```

- GitHub操作の前に、tokenの値を表示せず、設定有無だけ確認する。

```bash
if [ -n "${MECHORI_GITHUB_TOKEN:-}" ]; then
  echo "MECHORI_GITHUB_TOKEN=set"
else
  echo "MECHORI_GITHUB_TOKEN=unset"
fi
```

- `MECHORI_GITHUB_TOKEN` が未設定の場合は、認証設定を変更せず、`gh auth login` 等も実行しない。GitHub書き込み操作を停止し、最終報告で未設定と伝える。
- tokenの値や一部を `AGENTS.md`、`.env`、source code、documentation、commit、log、最終報告へ出力しない。

### MECHORIでのGitHub操作

- `noah1976/mechori` に対する `gh` 操作は、必ずコマンド単位で `GH_TOKEN="$MECHORI_GITHUB_TOKEN"` を付けて行う。
- `main` へ直接pushしない。原則として作業ブランチを使用する。
- 実装確認が必要な場合は作業ブランチをpushし、`main` 向けPull Requestを作成する。
- 指示がない限りPull Requestをmergeしない。
- Netlify Deploy Previewが利用できる場合は、本番deployではなくPreviewを利用する。
- 確認目的だけでProduction deployを手動実行しない。

### 認証設定を壊さない

- SSHキーの削除、再生成、差し替えを行わない。
- GitHub CLIの保存済みアカウント、GitHubのSSH設定、Git credential設定、credential helper、remote URLを変更しない。
- 既存のGit/SSH認証環境を維持する。

### 作業終了時

- `gh auth switch` は使用しない。
- 可能であれば `gh auth status --hostname github.com` で、グローバルactive accountが意図せず変更されていないことだけ確認する。
- 認証エラーが発生しても自動修復しない。
- GitHub操作を行った場合、最終報告に以下を記載する。

```text
MECHORI GitHub authentication: repository-scoped token used
Global GitHub CLI account: unchanged
```

- `MECHORI_GITHUB_TOKEN` が未設定でGitHub操作を行わなかった場合は、次を記載する。

```text
警告: MECHORI_GITHUB_TOKEN が未設定のためGitHub操作を実行していません
```
