# SECURITY

## 基本方針

最小権限、秘密情報の保護、本番データと開発環境の分離、監査可能性を重視します。

## 原則

- 秘密情報をGitへ保存しない。
- 本番データを開発環境へコピーしない。
- Supabase RLS を前提に設計する。
- APIキーは失効・ローテーションできる前提で扱う。
- 外部サービスの差し替えを想定する。
- 利用量と費用上限を確認してから導入する。

## 初期実装

- `.env` と `.env.*` をGit管理外にする。
- 環境変数の例は `.env.example` に限定する。
- ユーザー権限、管理者権限、有料機能権限を将来分離できるようにする。

## Software Supply Chain・開発ツール境界

依存packageだけでなく、repositoryを開く・CIを実行する・AI coding agentを接続する行為もcredentialと実行権限の境界です。MCP Registry掲載、署名済みlockfile、OIDC Trusted Publishingだけを安全性の保証として扱いません。

### 導入前の静的preflight

未知の外部repo、MCP、IDE extension、AI agent plugin、dependencyを導入・clone・workspace open・実行する前に、read-onlyで次を確認します。

- `.codex`、`.claude`、`.vscode`、`.github/workflows`、`.gemini`、`.cursor`、`.opencode`、`.mcp.json`などのagent / IDE / MCP設定
- `package.json` / lockfile、package lifecycle scripts、shell / setup script、`binding.gyp`とnode-gyp等native build hook
- Git hooks、devcontainer、外部download、`eval`、base64 decode後の実行、credential discovery、filesystem-wide scan、永続化設定
- GitHub Actionsのtrigger、checkout対象、permissions、secrets、OIDC token発行、deploy credential

新しいdependency、MCP、external repo、GitHub Action / OIDC変更は明示承認を要します。commit messageだけでdependency updateを信頼せず、manifest、lockfile、source repository、実行設定を照合します。

### GitHub Actions / OIDC

`pull_request_target`、`issue_comment`、`workflow_run`と、forkまたはexternal PR由来codeのcheckout、`id-token: write`、`contents: write`、`packages: write`、deployment / cloud credentialの組合せをhigh-riskとしてreviewします。OIDC Trusted Publishingは、credentialを発行するworkflowの権限設計を不要にしません。CodeQL等のsecurity workflowも通常workflowと同じく改変対象として監査します。

### 不審な証拠を見つけた場合

known IOC、不明な実行設定、MCP、native build hook、GitHub Actions変更、永続化、malicious dependencyの疑いを見つけた場合は、script、install、test、build、workflowを実行しません。証拠を削除・改変せず、network accessを増やさず、侵害の可能性として扱います。

credential rotationは感染疑い端末で直ちに開始しません。順序は、network isolate → token monitor / persistence停止・除去 → 必要なforensic preservation / clean rebuild → clean deviceからGitHub / package registry / cloud / CI / AI API / SSH / Supabase / Netlify等のcredential rotationとします。Trinitite系ではtoken monitorがtoken invalidationを検知した際にhome directoryやDocumentsの削除を試みるdead-man behaviorが報告されているためです。実際の隔離・rotation・外部設定変更は所有者の判断と別手順で行います。

## Supply-chain incident status（2026-08-31）

- **Current status**: 悪性versionの配布は停止済みで、通常の新規installによる感染リスクは大きく低下した。ただし、incident window中に該当versionを取得した端末・CI、lockfile、npm / CI cacheからの再利用可能性は引き続き監査対象であり、incident resolvedとは扱わない。
- **Reported package status**: `@7nohe/openapi-react-query-codegen`の報告された悪性version群はnpmから削除済みで、current latestは安全版`3.0.2`へ戻ったとされる。関連するCritical advisoryは[GHSA-9pvf-vcx3-x239](https://github.com/advisories/GHSA-9pvf-vcx3-x239)を参照する。
- **MECHORI audit result**: 前回のread-only監査では、当該package、指定された悪性version、既知IOC、指定永続化path、trackedなIDE / agent / MCP設定、GitHub Actions、`binding.gyp`は検出されなかった。この結果は維持するが、package削除だけで安全性を確定しない。
- **追加host IOC**: `~/Library/LaunchAgents/com.user.systemd-detect-fash.plist`、`~/Library/LaunchAgents/com.user.sysvinit-detect-fash.plist`、`~/.local/share/diaper/poopy.py`、`~/.config/sysvinit-detect-fash/`、`/var/tmp/.shit`、`trinnyyyy-*`。既存のIOCも削除せず監査対象として維持する。
- **Response remains**: IOC、repository configuration、MCP、native build hook、Actions / OIDC、dependency、cacheを確認する。credential compromiseが疑われる場合の順序は、`network isolate → token monitor / persistence停止・除去 → 必要なforensic preservation / clean rebuild → clean deviceからcredential rotation`とし、感染疑い端末上で直ちにrotationを開始しない。未知MCP・dependency・external repoのexplicit approval gateも維持する。

## 将来拡張

- セキュリティ事故対応手順
- 漏えい時の報告判断
- バックアップ
- 復元テスト
- サービス終了時のデータ出力・削除
- 監査ログ
- ログ保存期間

## 公開前対応

- RLSテスト
- 本番環境の秘密情報棚卸し
- バックアップ・復元テスト
- 監査ログの保存方針
- APIキーのローテーション手順
- 費用上限の確認

## 未確定

- 初期認証方式
- 管理者権限の付与方法
- バックアップ頻度
- ログ保存期間
