begin;

create or replace function public.list_alpha_connection_people(
  p_owner_public_profile_id uuid default null,
  p_relationship text default 'following'
)
returns table (
  public_profile_id uuid,
  display_name text,
  public_username text,
  representative_vehicle_target_id text,
  representative_vehicle_slug text,
  representative_vehicle_make text,
  representative_vehicle_model text,
  representative_vehicle_year integer,
  viewer_follows_target boolean,
  target_follows_viewer boolean,
  followed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  owner_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;
  if coalesce(p_relationship, '') not in ('following', 'followers') then
    raise exception 'invalid_connection_relationship';
  end if;

  if p_owner_public_profile_id is null then
    owner_user_id := auth.uid();
  else
    select profile.user_id
    into owner_user_id
    from public.app_user_profiles profile
    join public.test_memberships membership
      on membership.user_id = profile.user_id
      and membership.status = 'active'
    where profile.public_profile_id = p_owner_public_profile_id;
  end if;

  if owner_user_id is null then
    raise exception 'profile_not_found';
  end if;
  if public.alpha_profiles_block_each_other(auth.uid(), owner_user_id) then
    raise exception 'profile_unavailable';
  end if;

  return query
  with related_users as (
    select
      case
        when p_relationship = 'following' then follow.target_user_id
        else follow.follower_user_id
      end as related_user_id,
      follow.created_at
    from public.alpha_user_follows follow
    where (
      p_relationship = 'following'
      and follow.follower_user_id = owner_user_id
    ) or (
      p_relationship = 'followers'
      and follow.target_user_id = owner_user_id
    )
  )
  select
    profile.public_profile_id,
    profile.display_name,
    profile.public_username,
    vehicle.slug,
    vehicle.slug,
    vehicle.make,
    vehicle.model,
    vehicle.model_year,
    exists (
      select 1
      from public.alpha_user_follows viewer_follow
      where viewer_follow.follower_user_id = auth.uid()
        and viewer_follow.target_user_id = related.related_user_id
    ),
    exists (
      select 1
      from public.alpha_user_follows target_follow
      where target_follow.follower_user_id = related.related_user_id
        and target_follow.target_user_id = auth.uid()
    ),
    related.created_at
  from related_users related
  join public.app_user_profiles profile
    on profile.user_id = related.related_user_id
  join public.test_memberships membership
    on membership.user_id = related.related_user_id
    and membership.status = 'active'
  left join lateral (
    select
      share.slug,
      share.make,
      share.model,
      share.model_year
    from public.alpha_public_vehicle_shares share
    where share.user_id = related.related_user_id
      and share.is_active
    order by share.published_at desc, share.slug
    limit 1
  ) vehicle on true
  where related.related_user_id <> auth.uid()
    and not public.alpha_profiles_block_each_other(owner_user_id, related.related_user_id)
    and not public.alpha_profiles_block_each_other(auth.uid(), related.related_user_id)
  order by related.created_at desc, lower(profile.display_name), profile.public_profile_id;
end;
$$;

create or replace function public.list_my_alpha_followed_vehicles()
returns table (
  vehicle_target_id text,
  vehicle_slug text,
  make text,
  model text,
  model_year integer,
  image_data_url text,
  owner_public_profile_id uuid,
  owner_display_name text,
  owner_public_username text,
  viewer_follows_owner boolean,
  followed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with followed_vehicle_ids as (
    select distinct
      follow->>'targetId' as vehicle_target_id,
      workspace.updated_at as followed_at
    from public.alpha_private_workspaces workspace
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(workspace.payload->'follows') = 'array'
          then workspace.payload->'follows'
        else '[]'::jsonb
      end
    ) follow
    where workspace.user_id = auth.uid()
      and follow->>'followerProfileId' = auth.uid()::text
      and follow->>'targetType' = 'vehicle'
      and nullif(follow->>'targetId', '') is not null
  )
  select
    followed.vehicle_target_id,
    share.slug,
    share.make,
    share.model,
    share.model_year,
    share.image_data_url,
    profile.public_profile_id,
    profile.display_name,
    profile.public_username,
    exists (
      select 1
      from public.alpha_user_follows owner_follow
      where owner_follow.follower_user_id = auth.uid()
        and owner_follow.target_user_id = share.user_id
    ),
    max(followed.followed_at)
  from followed_vehicle_ids followed
  join public.alpha_public_vehicle_shares share
    on share.slug = followed.vehicle_target_id
    and share.is_active
  join public.app_user_profiles profile
    on profile.user_id = share.user_id
  join public.test_memberships membership
    on membership.user_id = share.user_id
    and membership.status = 'active'
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and share.user_id <> auth.uid()
    and not public.alpha_profiles_block_each_other(auth.uid(), share.user_id)
  group by
    followed.vehicle_target_id,
    share.slug,
    share.make,
    share.model,
    share.model_year,
    share.image_data_url,
    share.user_id,
    profile.public_profile_id,
    profile.display_name,
    profile.public_username
  order by max(followed.followed_at) desc, lower(share.make), lower(share.model), share.slug;
$$;

revoke all on function public.list_alpha_connection_people(uuid, text)
  from public, anon, authenticated;
revoke all on function public.list_my_alpha_followed_vehicles()
  from public, anon, authenticated;

grant execute on function public.list_alpha_connection_people(uuid, text)
  to authenticated;
grant execute on function public.list_my_alpha_followed_vehicles()
  to authenticated;

comment on function public.list_alpha_connection_people(uuid, text) is
  'Returns active, non-blocked alpha users related to an active member. Mutual status is derived from user follows.';
comment on function public.list_my_alpha_followed_vehicles() is
  'Returns currently public vehicle shares for the caller vehicle follows stored in the caller workspace.';

commit;
