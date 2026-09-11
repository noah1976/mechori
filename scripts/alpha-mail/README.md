# MECHORI α tester向け暫定メールツール

## Purpose

Native PushがまだないWeb α期間に、Founder / CodexがローカルMacから明示的に起動し、有効なα testerへ個別メールを送るための一時的な運用ツールです。MECHORI本体、Netlify、cron、GitHub Actionsからは実行しません。Native移行後は頻度を下げるか、このdirectoryごと削除できます。

宛先は別の住所録へ複製しません。Supabaseのactiveな`alpha` membershipとAuth userをローカル実行時にread-onlyで照合し、Googleログインのemailを取得します。`owner` role、停止・離脱済みmembership、Google identityを確認できないuserは送信対象にしません。

Founderが指定した件名とplain text本文を原文どおり送ります。校正、署名、挨拶、unsubscribe文、URL等を自動追加しません。通常は本文に `https://mechori.com/` を含めてください。HTML版は受信互換性のため同じ本文をescapeしたものだけを機械的に添えます。

## Setup

1. `.env.alpha-mail.example`を参考に、Git管理外の`.env.alpha-mail`をrepository rootへ作成します。
2. Resendを未設定の場合は、FounderがResend accountを作成し、Dashboardに表示された手順でsender domainをverifyします。DNS値は推測せず、Dashboardが実際に示した値だけを使用します。
3. ResendでSending accessのAPI keyを作成し、可能なら送信domainへscopeして`RESEND_API_KEY`へ設定します。
4. Supabase Dashboardでこのローカル運用専用のSecret API keyを用意し、project URLとともに設定します。Secret keyはRLSをbypassできるため、ブラウザ、アプリenv、Netlify、Git、チャットへ置きません。

```dotenv
RESEND_API_KEY=re_...
MECHORI_ALPHA_MAIL_FROM=MECHORI <alpha@mail.mechori.com>
MECHORI_ALPHA_MAIL_REPLY_TO=founder@example.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

`MECHORI_ALPHA_MAIL_REPLY_TO`は任意です。実際に確認できるaddressだけを設定してください。API keyとaddressの実値をGit、チャット、ログへ残さないでください。

本文ファイルはGit管理外の`tmp/`にUTF-8で置く運用を推奨します。

## Dry run（標準）

```bash
npm run alpha:mail -- \
  --subject "MECHORI更新しました" \
  --body-file "tmp/mechori-alpha-mail.txt"
```

`--send`がない限りResend API callは行いません。Supabaseから現在の対象者をread-onlyで解決し、件名、本文、sender、件数、redact済み宛先をpreviewします。dry-runではResend API keyは不要ですが、Supabase secret keyは必要です。

## Founderへのtest send

```bash
npm run alpha:mail -- \
  --subject "test" \
  --body-file "tmp/mechori-alpha-mail-test.txt" \
  --test-to "founder@example.com" \
  --send
```

`--test-to`指定時はその1addressだけへ送り、Supabaseのtester一覧は取得しません。

## 全testerへの送信

Founderが同じ依頼内で明確に「メールして」「送って」「送信して」と指示した場合だけ、dry-run内容を確認して次を実行します。

```bash
npm run alpha:mail -- \
  --subject "MECHORI更新しました" \
  --body-file "tmp/mechori-alpha-mail.txt" \
  --send
```

CLIは重複addressを除き、1recipientずつ順番に送ります。1件が失敗しても残りを続行し、最後に成功・失敗件数を表示します。失敗が1件以上あればprocessは非zeroで終了します。

## Security / consent

- tester addressはactiveなα membershipとGoogle login identityから実行時に取得し、local住所録やGitへ複製しません。
- tester同士のaddressは共有せず、CC / BCC一括送信もしません。
- Resend / Supabase key、request body、宛先全文、API error bodyをlogへ出しません。
- α参加状態とメール連絡同意が将来分かれる場合は、正式Notification Systemでconsent fieldを設計します。この暫定CLIはactive α testerへのFounder手動連絡だけに使います。
- α連絡をmarketing newsletterへ転用しません。自動unsubscribe、tracking、schedulerはこの暫定ツールの対象外です。
- Resend / Supabase account、billing、DNS、API key生成は自動化しません。
