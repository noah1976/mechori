# ALPHA_EXTERNAL_SETUP

## 目的

3〜5人の遠隔αに必要なSupabase、Google OAuth、Netlifyを、無料枠から安全に設定する手順書です。実際の管理画面は変更されるため、接続時には各公式文書を再確認します。

秘密情報、データベースパスワード、Google Client Secretをチャット、Git、文書へ貼りません。所有者がパスワード管理ツール、ローカルの`.env.local`、SupabaseまたはNetlifyの環境変数画面へ直接入力します。

## 順序

1. SupabaseのFreeアカウントとα用プロジェクトを作る
2. ローカルでマイグレーションとRLSを検証する
3. Google CloudでMECHORI α用OAuthクライアントを作る
4. Supabase AuthへGoogleのClient IDとSecretを登録する
5. ローカルで招待、ログイン、利用者分離を確認する
6. NetlifyへGitHubリポジトリを接続し、α用環境変数を所有者が入力する
7. 1人目の招待URLで本番相当テストを行う
8. 問題がなければ残り2〜4人へ個別URLを送る

## 1. Supabase登録

公式: <https://supabase.com/dashboard>

1. 所有者自身のアカウントでSupabaseへサインインする。
2. Free PlanのOrganizationを作る。課金プランへ変更しない。
3. `New project`を選ぶ。
4. Project nameは`mechori-alpha`等、α環境だと分かる名前にする。
5. Regionは日本のテスターに最も近い利用可能リージョンを選び、選択結果を接続記録へ残す。
6. Database passwordは十分に長いランダム値を生成し、パスワード管理ツールへ保存する。チャットへ送らない。
7. プロジェクト作成後、Project URLとPublishable keyの表示場所だけを確認する。

Freeは現在、50,000 MAU、500MB DB、1GB Storage、5GB egressです。1週間の低活動で一時停止されるため、α期間中の再開手順を確認します。料金・上限は契約時に公式料金ページで再確認します。

- 料金: <https://supabase.com/pricing>
- Free停止: <https://supabase.com/docs/guides/platform/free-project-pausing>

## 2. ローカル環境変数

`apps/web/.env.example`を見ながら、所有者のローカル環境に`apps/web/.env.local`を作ります。`.env.local`はGitの対象外です。

```text
NEXT_PUBLIC_MECHORI_RUNTIME=alpha
NEXT_PUBLIC_SUPABASE_URL=SupabaseのProject URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SupabaseのPublishable key
```

Publishable keyはブラウザで使う公開キーですが、RLSなしで安全になるわけではありません。Secret keyまたは旧`service_role` keyを`NEXT_PUBLIC_`変数へ入れてはいけません。αの初期実装ではSecret keyをWebアプリへ登録しません。

## 3. DBとRLS

対象ファイルは`supabase/migrations/202607170001_remote_alpha.sql`です。SQL Editorへ貼り付けて実行する前に、所有者とCodexで内容、対象プロジェクト、戻し方を確認します。

実行後に必要な確認:

- 全対象テーブルでRLSが有効
- 未ログインでは非公開ワークスペースを取得できない
- テスターAはテスターBの行を取得・更新できない
- `suspended`または`withdrawn`では自分のワークスペースも取得できない
- 招待テーブルをブラウザから直接一覧できない
- 使用済み招待を別アカウントが利用できない
- Ownerロールの初期付与を対象ユーザー1人だけへ手動で行う

RLS公式: <https://supabase.com/docs/guides/database/postgres/row-level-security>

## 4. Google OAuth

公式: <https://supabase.com/docs/guides/auth/social-login/auth-google>

1. Google Cloud / Google Auth PlatformでMECHORI α専用プロジェクトを作る。
2. Audienceはαテスターだけが利用できるテスト設定から開始する。
3. Data Accessは`openid`、`userinfo.email`、`userinfo.profile`だけにする。
4. Web applicationのOAuth clientを作る。
5. Authorized JavaScript originsへローカルURLとNetlify α URLだけを登録する。
6. Authorized redirect URIsへSupabase DashboardのGoogle Provider画面に表示されるCallback URLを登録する。
7. Google Client IDとClient SecretをSupabase DashboardのGoogle Providerへ直接入力する。
8. Client Secretをチャット、Git、Netlifyの公開変数へ貼らない。

MECHORIはGoogle Drive、連絡先、友人一覧、投稿等へアクセスしません。GoogleのProvider tokenも保存・再利用しません。

## 5. Netlify

公式: <https://app.netlify.com/signup>

1. 所有者のアカウントでFree登録する。
2. GitHub連携では`noah1976insemble/mechori`だけを選べるリポジトリアクセスにする。
3. α用Siteを作り、production branchをα公開に使う承認済みブランチへ限定する。`main`へ自動反映する設定にしない。
4. Base directory、build command、publish directoryは接続時の自動検出結果を確認する。MECHORIのルートbuild commandは`npm run build`。
5. Environment variablesへ`apps/web/.env.local`と同じ3項目を所有者が直接入力する。
6. Deploy Previewと本番相当α URLのどちらを使うかを決め、Google OAuthのOriginとSupabase Redirect allow listへ同じURLを登録する。
7. デプロイ後、環境変数が画面やビルドログへ出ていないことを確認する。

Netlifyは現行Next.jsのApp Router、SSR、Route HandlerをOpenNext Adapterで自動対応します。

- Next.js: <https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/>

## 停止

- 招待停止: 対象招待を失効し、必要なら参加状態を`suspended`へ変更する
- α全体停止: Netlify Siteを停止し、Supabase AuthのGoogle Providerを無効にする
- OAuth停止: Google Cloudで対象Clientを無効化または削除する
- データ退避: 各参加者のJSON出力とDBバックアップを確認する
- データ削除: 対象利用者のWorkspace、Profile、Membership、Auth user、Storageを関連順に確認して削除する
- 課金回避: Freeのままか確認し、カード登録や自動アップグレードを行わない
