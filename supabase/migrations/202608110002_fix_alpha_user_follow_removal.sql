begin;

-- Keep the target resolved from the public profile separate from the
-- alpha_user_follows.target_user_id column used by the delete predicate.
create or replace function public.set_alpha_user_follow(
  p_target_public_profile_id uuid,
  p_follow boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_target_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;

  select profile.user_id
  into resolved_target_user_id
  from public.app_user_profiles profile
  join public.test_memberships membership
    on membership.user_id = profile.user_id
    and membership.status = 'active'
  where profile.public_profile_id = p_target_public_profile_id;

  if resolved_target_user_id is null then
    raise exception 'profile_not_found';
  end if;
  if resolved_target_user_id = auth.uid() then
    raise exception 'cannot_follow_self';
  end if;

  if coalesce(p_follow, false) then
    if public.alpha_profiles_block_each_other(auth.uid(), resolved_target_user_id) then
      raise exception 'profile_unavailable';
    end if;
    insert into public.alpha_user_follows (
      follower_user_id,
      target_user_id
    ) values (
      auth.uid(),
      resolved_target_user_id
    )
    on conflict (follower_user_id, target_user_id) do nothing;
    return true;
  end if;

  delete from public.alpha_user_follows follow
  where follow.follower_user_id = auth.uid()
    and follow.target_user_id = resolved_target_user_id;
  return false;
end;
$$;

revoke all on function public.set_alpha_user_follow(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_alpha_user_follow(uuid, boolean)
  to authenticated;

commit;
