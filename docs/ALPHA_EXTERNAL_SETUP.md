# ALPHA_EXTERNAL_SETUP

## 目的

3〜5人の遠隔αに必要なSupabase、Google OAuth、Netlifyを、無料枠から安全に設定する手順書です。実際の管理画面は変更されるため、接続時には各公式文書を再確認します。

秘密情報、データベースパスワード、Google Client Secretをチャット、Git、文書へ貼りません。所有者がパスワード管理ツール、ローカルの`.env.local`、SupabaseまたはNetlifyの環境変数画面へ直接入力します。

## 接続状況（2026-07-17）

- Supabase Freeの`mechori-alpha`を東京リージョンに作成済み
- Project URLとPublishable keyをGit対象外の`apps/web/.env.local`へ設定済み
- 初期DBと権限修正の2マイグレーションを適用済み
- 全6テーブルでRLS有効、未ログイン時の非公開Workspaceは空応答
- 未ログイン時の招待一覧と招待関数は401拒否
- Supabase DashboardのGitHub Connectは未使用。GitHub連携はNetlify設定時に行う
- Netlify Freeへ`https://mechori-alpha.netlify.app`としてαブランチを接続済み
- Google OAuth Client、Supabase Google Provider、Site URL、ローカル・Netlify Redirect URLを設定済み
- Google OAuth callback、招待引換、参加権限確認、ログアウト、利用者別Workspace Adapterを実装済み
- 1人用招待URLの発行画面を`/settings/alpha`へ実装済み
- 所有者初期化、Googleテストユーザー追加、実アカウント2人の分離確認は未完了
- MAU最小計測のDBマイグレーションは準備済みだが未適用。適用・環境設定までは送信しない
- 愛車共有ページ用の最小公開スナップショットマイグレーションは準備済みだが未適用。適用までは共有ボタンから公開を開始しない
- α参加者向けJournal共有マイグレーションは準備済みだが未適用。適用までは投稿の共有選択を無効にする

## 順序

1. SupabaseのFreeアカウントとα用プロジェクトを作る
2. ローカルでマイグレーションとRLSを検証する
3. Google CloudでMECHORI α用OAuthクライアントを作る
4. Supabase AuthへGoogleのClient IDとSecretを登録する
5. NetlifyへGitHubリポジトリを接続し、α用環境変数を所有者が入力する
6. 所有者を初期化し、招待、ログイン、利用者分離を確認する
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

初期対象は`supabase/migrations/202607170001_remote_alpha.sql`と`supabase/migrations/202607170002_lock_down_alpha_functions.sql`です。MAU計測は`202607170003_monthly_activity.sql`、愛車共有は`202607170004_public_vehicle_shares.sql`、共同車両カタログは`202607290001_vehicle_catalog_collaboration.sql`、α参加者向けJournal共有は`202607290002_alpha_shared_journals.sql`として別承認・別適用にします。SQL Editorへ貼り付けて実行する前に、所有者とCodexで内容、対象プロジェクト、戻し方を確認します。

実行後に必要な確認:

- 全対象テーブルでRLSが有効
- 未ログインでは非公開ワークスペースを取得できない
- テスターAはテスターBの行を取得・更新できない
- `suspended`または`withdrawn`では自分のワークスペースも取得できない
- 招待テーブルをブラウザから直接一覧できない
- 使用済み招待を別アカウントが利用できない
- Ownerロールの初期付与を対象ユーザー1人だけへ手動で行う
- テスターAが共有したJournalの文字情報だけを、参加状態が有効なテスターBが取得できる
- テスターBは、Aの写真、非公開Workspace、関連整備記録、内部の車両IDを共有データから取得できない
- 未ログイン利用者と参加停止中の利用者は、α参加者向けJournal共有データを取得できない

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

初回所有者の設定は`docs/ALPHA_OWNER_BOOTSTRAP.md`に従います。Google OAuthの公開ステータスが`テスト`の間は、αテスターをGoogle Auth Platformのテストユーザーにも追加し、MECHORIの1人用招待URLと組み合わせます。Google OAuthを`本番環境`へ公開した後も、MECHORI側の1人用招待と参加権限は維持されます。

MECHORIの招待コードはURLフラグメント（`#invite=...`）で受け取り、画面で取得した直後にアドレス欄から消します。フラグメントは通常のWebリクエストへ送られないため、Netlifyのアクセスログには残りません。Googleへも送らず、OAuth往復中だけ短命のHttpOnly Cookieへ保持します。ログイン後、Supabase上の参加権限を確認できないアカウントは非公開領域へ入れません。

MECHORIはGoogle Drive、連絡先、友人一覧、投稿等へアクセスしません。GoogleのProvider tokenも保存・再利用しません。

### Google OAuthを本番環境へ公開する

ここでいう`本番環境`は、Google OAuthのテストユーザー制限を解除する設定です。MECHORIを一般公開したり、招待制を解除したり、Google Cloudの有料APIを有効にする操作ではありません。現在要求している`openid`、`userinfo.email`、`userinfo.profile`の基本スコープでGoogleログインすること自体に、利用者数に応じたGoogle OAuth料金はありません。

公開前に次を確認します。

1. Google Auth Platformの`データアクセス`が`openid`、`userinfo.email`、`userinfo.profile`だけである。
2. Authorized JavaScript originsが、使用中のMECHORI α URLとローカル開発URLだけである。
3. Authorized redirect URIが、SupabaseのGoogle Provider画面に表示されるCallback URLと一致する。
4. `https://mechori-alpha.netlify.app/privacy`をログアウト状態で開ける。
5. ホーム、プライバシーポリシー、将来の利用規約を、正式公開時には所有・確認済みの`mechori.com`へ揃える計画がある。

Google Auth Platformの画面で次を行います。

1. 対象のGoogle Cloudプロジェクトが`MECHORI Alpha`であることを確認する。
2. `Google Auth Platform`の`対象`を開く。
3. 現在の公開ステータスが`テスト`であることを確認する。
4. `アプリを公開`または`本番環境に移行`を選ぶ。
5. 確認内容を読み、`本番環境`へ変更する。
6. `クライアントID`と`クライアントシークレット`は作り直さない。SupabaseのGoogle Provider設定も変更しない。

Google側で`本番環境`になったことを確認した後だけ、NetlifyのEnvironment variablesへ次を追加または変更します。

```text
NEXT_PUBLIC_GOOGLE_OAUTH_PUBLISHING_STATUS=production
```

その後、承認済みαブランチを再デプロイします。この変数は招待画面の説明文だけを切り替え、認証方式、招待引換、参加権限、RLSを変更しません。Google側がまだ`テスト`なのに先に`production`へ変えると、画面が誤った案内をするため順序を逆にしません。

確認は、Google Auth Platformのテストユーザーへ登録していない協力者1人で行います。本人専用のMECHORI招待URLからGoogleログインし、愛車登録画面まで到達できることを確認します。招待URLなしのGoogleアカウントは、OAuthに成功してもMECHORIの非公開領域へ参加できないことも確認します。

テスト状態へ戻す場合は、Google Auth Platformを先に`テスト`へ戻し、Netlifyの値を`testing`へ戻して再デプロイします。既存のClient Secretをチャット、Git、文書へ貼りません。

Googleのブランド確認では、公開ホーム、プライバシーポリシー、利用規約、リダイレクト元のドメインが、所有・確認済みドメインに揃っていることを求められる場合があります。少人数αでOAuth公開ステータスを変更することと、`mechori.com`でブランド確認を完了することは別作業として扱います。

## 5. Netlify

公式: <https://app.netlify.com/signup>

1. 所有者のアカウントでFree登録する。
2. GitHub連携では`noah1976insemble/mechori`だけを選べるリポジトリアクセスにする。
3. α用Siteを作り、production branchをα公開に使う承認済みブランチへ限定する。`main`へ自動反映する設定にしない。
4. Base directory、build command、publish directoryは接続時の自動検出結果を確認する。MECHORIのルートbuild commandは`npm run build`。
5. Environment variablesへ`apps/web/.env.local`と同じ公開環境変数を所有者が直接入力する。Google OAuth公開ステータスは、Google Auth Platformがテスト中なら`testing`、本番環境なら`production`にする。
6. Deploy Previewと本番相当α URLのどちらを使うかを決め、Google OAuthのOriginとSupabase Redirect allow listへ同じURLを登録する。
7. デプロイ後、環境変数が画面やビルドログへ出ていないことを確認する。

月次計測を有効にする場合だけ、`202607170003_monthly_activity.sql`を内容確認後に適用し、Netlifyへ次を追加します。

```text
NEXT_PUBLIC_MECHORI_ACTIVITY_TRACKING=enabled
```

この値はDB更新前に有効化しません。計測は1利用者・1 UTC月につき1行で、MAU、Value MAU、価値行動名の集合だけを保持します。検索語、車種、記録本文、ページ履歴、滞在時間は保存しません。

Netlifyは現行Next.jsのApp Router、SSR、Route HandlerをOpenNext Adapterで自動対応します。

- Next.js: <https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/>

## 停止

- 招待停止: 対象招待を失効し、必要なら参加状態を`suspended`へ変更する
- α全体停止: Netlify Siteを停止し、Supabase AuthのGoogle Providerを無効にする
- OAuth停止: Google Cloudで対象Clientを無効化または削除する
- データ退避: 各参加者のJSON出力とDBバックアップを確認する
- データ削除: 対象利用者のWorkspace、Profile、Membership、Auth user、Storageを関連順に確認して削除する
- 課金回避: Freeのままか確認し、カード登録や自動アップグレードを行わない
