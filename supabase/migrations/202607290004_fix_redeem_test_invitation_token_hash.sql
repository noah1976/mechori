begin;

create or replace function public.redeem_test_invitation(p_raw_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.test_invitations%rowtype;
  redemption_count integer;
  computed_token_hash text;
  existing_status text;
begin
  if auth.uid() is null then
    return 'authentication_required';
  end if;
  if p_raw_token is null or char_length(p_raw_token) < 32 or char_length(p_raw_token) > 512 then
    return 'invalid_invitation';
  end if;

  computed_token_hash := encode(
    extensions.digest(convert_to(p_raw_token, 'UTF8'), 'sha256'),
    'hex'
  );

  select * into invitation
  from public.test_invitations
  where test_invitations.token_hash = computed_token_hash
  for update;

  if invitation.id is null then return 'invalid_invitation'; end if;

  select membership.status into existing_status
  from public.test_memberships membership
  where membership.user_id = auth.uid();

  if existing_status = 'active' then return 'already_redeemed'; end if;
  if existing_status is not null then return 'membership_inactive'; end if;
  if invitation.revoked_at is not null then return 'revoked'; end if;
  if now() >= invitation.expires_at then return 'expired'; end if;

  select count(*) into redemption_count
  from public.invitation_redemptions redemption
  where redemption.invitation_id = invitation.id;

  if redemption_count >= invitation.max_redemptions then return 'exhausted'; end if;

  insert into public.invitation_redemptions (invitation_id, user_id)
  values (invitation.id, auth.uid());

  insert into public.test_memberships (user_id, phase, invitation_id)
  values (auth.uid(), invitation.phase, invitation.id);

  insert into public.app_user_profiles (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  return 'redeemed';
end;
$$;

revoke all on function public.redeem_test_invitation(text)
  from public, anon, authenticated;
grant execute on function public.redeem_test_invitation(text) to authenticated;

commit;
