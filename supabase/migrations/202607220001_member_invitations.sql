begin;

create or replace function public.create_member_invitation(
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
  membership_phase text;
  active_invitation_count integer;
  monthly_invitation_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select membership.phase into membership_phase
  from public.test_memberships membership
  where membership.user_id = auth.uid()
    and membership.status = 'active';

  if membership_phase is null then
    raise exception 'active_membership_required';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token_hash';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '8 days' then
    raise exception 'invalid_expiry';
  end if;

  select count(*) into active_invitation_count
  from public.test_invitations invitation
  where invitation.created_by_user_id = auth.uid()
    and invitation.revoked_at is null
    and invitation.expires_at > now()
    and (
      select count(*)
      from public.invitation_redemptions redemption
      where redemption.invitation_id = invitation.id
    ) < invitation.max_redemptions;

  if active_invitation_count >= 3 then
    raise exception 'active_invitation_limit';
  end if;

  select count(*) into monthly_invitation_count
  from public.test_invitations invitation
  where invitation.created_by_user_id = auth.uid()
    and invitation.created_at >= now() - interval '30 days';

  if monthly_invitation_count >= 10 then
    raise exception 'monthly_invitation_limit';
  end if;

  insert into public.test_invitations (
    phase,
    token_hash,
    created_by_user_id,
    expires_at,
    max_redemptions
  ) values (
    membership_phase,
    p_token_hash,
    auth.uid(),
    p_expires_at,
    1
  ) returning id into invitation_id;

  return invitation_id;
end;
$$;

revoke all on function public.create_member_invitation(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_member_invitation(text, timestamptz)
  to authenticated;

commit;
