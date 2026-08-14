begin;

create or replace function public.list_my_active_member_invitations()
returns table (
  id uuid,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invitation.id,
    invitation.created_at,
    invitation.expires_at
  from public.test_invitations invitation
  where auth.uid() is not null
    and invitation.created_by_user_id = auth.uid()
    and invitation.revoked_at is null
    and invitation.expires_at > now()
    and (
      select count(*)
      from public.invitation_redemptions redemption
      where redemption.invitation_id = invitation.id
    ) < invitation.max_redemptions
  order by invitation.created_at desc;
$$;

create or replace function public.revoke_my_member_invitation(
  p_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  update public.test_invitations invitation
  set revoked_at = now()
  where invitation.id = p_invitation_id
    and invitation.created_by_user_id = auth.uid()
    and invitation.revoked_at is null
    and not exists (
      select 1
      from public.invitation_redemptions redemption
      where redemption.invitation_id = invitation.id
    );

  return found;
end;
$$;

revoke all on function public.list_my_active_member_invitations()
  from public, anon, authenticated;
revoke all on function public.revoke_my_member_invitation(uuid)
  from public, anon, authenticated;

grant execute on function public.list_my_active_member_invitations()
  to authenticated;
grant execute on function public.revoke_my_member_invitation(uuid)
  to authenticated;

commit;
