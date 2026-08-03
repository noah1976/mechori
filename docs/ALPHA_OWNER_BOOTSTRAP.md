# ALPHA_OWNER_BOOTSTRAP

## 目的

最初のMECHORI所有者アカウントだけを、Google Auth、Supabase Auth、α参加権限、招待発行権限へ安全に接続します。一般テスターにはこの手順を使いません。

秘密情報、Google Client Secret、DBパスワード、メールアドレスをチャット、Git、文書へ貼りません。SupabaseのユーザーUUIDも、所有者がDashboard内だけで扱います。

## 初回だけ必要な手順

1. Google OAuthがテスト中の場合だけ、Google Auth Platformの`対象`で、所有者が使うGoogleアカウントをテストユーザーへ追加する。
2. `https://mechori-alpha.netlify.app/auth`で`Googleで続ける`を選ぶ。
3. 初回は「有効な招待URLが必要です」と戻る。これは正常で、Supabase AuthenticationにはGoogleユーザーが作成される。
4. Supabase Dashboardの`Authentication` → `Users`で、自分のユーザーUUIDをコピーする。
5. Supabase SQL Editorで、下の`00000000-...`だけを自分のUUIDへ置き換えて実行する。
6. 同じGoogleアカウントで再度ログインし、`/garage`の空状態が表示されることを確認する。
7. `/settings/alpha`を開き、テスターごとに1本ずつ招待URLを発行する。

`owner`ロールのアカウントは`/admin`も利用できます。参加者の表示名または`@username`で本人を確認し、理由へ`Founding Tester協力`等を入力すると、Owner Plus相当の無償利用権を無期限または期限付きで付与できます。付与・停止・ロール変更・フィードバック対応は監査ログへ追記されます。最初の2名へ自動付与はせず、本人を確認して1名ずつ操作します。

## 所有者初期化SQL

対象が`mechori-alpha`であることを確認し、UUID以外は変更しません。再実行時、すでに有効な参加権限があれば追加招待は作成しません。

```sql
do $$
declare
  target_user_id uuid := '00000000-0000-0000-0000-000000000000';
  bootstrap_invitation_id uuid;
  existing_status text;
begin
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'target_auth_user_not_found';
  end if;

  insert into public.app_user_roles (user_id, role_code)
  values (target_user_id, 'owner')
  on conflict do nothing;

  insert into public.app_user_profiles (user_id)
  values (target_user_id)
  on conflict do nothing;

  select status into existing_status
  from public.test_memberships
  where user_id = target_user_id;

  if existing_status is null then
    insert into public.test_invitations (
      phase,
      token_hash,
      created_by_user_id,
      expires_at,
      max_redemptions
    ) values (
      'alpha',
      encode(extensions.digest(convert_to(gen_random_uuid()::text, 'UTF8'), 'sha256'), 'hex'),
      target_user_id,
      now() + interval '30 days',
      1
    ) returning id into bootstrap_invitation_id;

    insert into public.invitation_redemptions (invitation_id, user_id)
    values (bootstrap_invitation_id, target_user_id);

    insert into public.test_memberships (user_id, phase, invitation_id)
    values (target_user_id, 'alpha', bootstrap_invitation_id);
  elsif existing_status <> 'active' then
    raise exception 'existing_membership_is_not_active';
  end if;
end;
$$;
```

## テスターを1人追加するたびに行うこと

1. Google OAuthがテスト中の場合だけ、Google Auth Platformの`対象`へ、その人のGoogleアカウントをテストユーザーとして追加する。
2. MECHORI上部の`招待`または`/invite`で新しい1人用URLを発行する。運営用の`/settings/alpha`から発行してもよい。
3. 普段のSNSまたはメッセージで本人だけへ送る。共通URLとして投稿しない。
4. 本人がログイン、愛車登録、非公開整備記録1件を完了したことを確認する。

招待URLは発行直後にコピー、OSの共有画面、QRコード表示を選べます。QRコードはブラウザ内で生成され、外部のQR生成サービスへ招待URLを送りません。Google OAuthがテストモードの間だけ、招待URLとは別に手順1のテストユーザー追加が必要です。

Googleのテストモードでは認可が期限切れになる場合があります。ログインできなくなったときは、まずAudienceのテストユーザーとGoogle側の再認可を確認します。
