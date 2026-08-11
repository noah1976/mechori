begin;

alter table public.alpha_public_vehicle_shares
  add column nickname text check (nickname is null or char_length(nickname) between 1 and 80);

grant select (nickname) on public.alpha_public_vehicle_shares to anon, authenticated;

drop function if exists public.search_alpha_public_owners(text);
create function public.search_alpha_public_owners(p_query text)
returns table (
  public_profile_id uuid,
  display_name text,
  public_username text,
  vehicle_count bigint,
  representative_vehicle_target_id text,
  representative_vehicle_slug text,
  representative_vehicle_make text,
  representative_vehicle_model text,
  representative_vehicle_year integer,
  viewer_follows_target boolean,
  target_follows_viewer boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.public_profile_id,
    profile.display_name,
    profile.public_username,
    count(share.id) as vehicle_count,
    representative.slug as representative_vehicle_target_id,
    representative.slug as representative_vehicle_slug,
    representative.make as representative_vehicle_make,
    representative.model as representative_vehicle_model,
    representative.model_year as representative_vehicle_year,
    exists (
      select 1
      from public.alpha_user_follows viewer_follow
      where viewer_follow.follower_user_id = auth.uid()
        and viewer_follow.target_user_id = profile.user_id
    ) as viewer_follows_target,
    exists (
      select 1
      from public.alpha_user_follows target_follow
      where target_follow.follower_user_id = profile.user_id
        and target_follow.target_user_id = auth.uid()
    ) as target_follows_viewer
  from public.app_user_profiles profile
  join public.test_memberships membership
    on membership.user_id = profile.user_id
    and membership.status = 'active'
  join public.alpha_public_vehicle_shares share
    on share.user_id = profile.user_id
    and share.is_active
  left join lateral (
    select
      candidate.slug,
      candidate.make,
      candidate.model,
      candidate.model_year
    from public.alpha_public_vehicle_shares candidate
    where candidate.user_id = profile.user_id
      and candidate.is_active
    order by candidate.published_at desc, candidate.slug
    limit 1
  ) representative on true
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and profile.user_id <> auth.uid()
    and char_length(trim(coalesce(p_query, ''))) between 1 and 80
    and not public.alpha_profiles_block_each_other(auth.uid(), profile.user_id)
    and (
      position(lower(regexp_replace(trim(p_query), '^@+', '')) in lower(profile.display_name)) > 0
      or position(lower(regexp_replace(trim(p_query), '^@+', '')) in coalesce(profile.public_username, '')) > 0
    )
  group by
    profile.user_id,
    profile.public_profile_id,
    profile.display_name,
    profile.public_username,
    representative.slug,
    representative.make,
    representative.model,
    representative.model_year
  order by lower(profile.display_name), profile.public_profile_id
  limit 20;
$$;

create or replace function public.search_alpha_public_vehicles(p_query text)
returns table (
  owner_public_profile_id uuid,
  owner_display_name text,
  owner_public_username text,
  vehicle_target_id text,
  vehicle_slug text,
  make text,
  model text,
  nickname text,
  model_year integer,
  image_data_url text,
  viewer_follows_owner boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with input as (
    select lower(trim(coalesce(p_query, ''))) as query
  )
  select
    profile.public_profile_id as owner_public_profile_id,
    profile.display_name as owner_display_name,
    profile.public_username as owner_public_username,
    share.slug as vehicle_target_id,
    share.slug as vehicle_slug,
    share.make,
    share.model,
    share.nickname,
    share.model_year,
    share.image_data_url,
    exists (
      select 1
      from public.alpha_user_follows owner_follow
      where owner_follow.follower_user_id = auth.uid()
        and owner_follow.target_user_id = profile.user_id
    ) as viewer_follows_owner
  from public.alpha_public_vehicle_shares share
  join public.app_user_profiles profile
    on profile.user_id = share.user_id
  join public.test_memberships membership
    on membership.user_id = share.user_id
    and membership.status = 'active'
  cross join input
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and share.is_active
    and profile.user_id <> auth.uid()
    and char_length(input.query) between 1 and 80
    and not public.alpha_profiles_block_each_other(auth.uid(), profile.user_id)
    and (
      position(input.query in lower(share.make)) > 0
      or position(input.query in lower(share.model)) > 0
      or position(input.query in lower(coalesce(share.nickname, ''))) > 0
      or position(input.query in coalesce(share.model_year::text, '')) > 0
      or position(input.query in lower(profile.display_name)) > 0
      or position(input.query in coalesce(profile.public_username, '')) > 0
    )
  order by lower(share.make), lower(share.model), share.model_year nulls last, share.slug
  limit 20;
$$;

revoke all on function public.search_alpha_public_owners(text)
  from public, anon, authenticated;
revoke all on function public.search_alpha_public_vehicles(text)
  from public, anon, authenticated;
grant execute on function public.search_alpha_public_owners(text)
  to authenticated;
grant execute on function public.search_alpha_public_vehicles(text)
  to authenticated;

comment on function public.search_alpha_public_vehicles(text) is
  'Searches active, non-blocked alpha members with explicitly public vehicle snapshots by public vehicle and owner fields.';

commit;
