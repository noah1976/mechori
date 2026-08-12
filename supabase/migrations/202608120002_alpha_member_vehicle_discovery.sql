begin;

-- Alpha-only discovery is deliberately separate from the anonymous external
-- share page. It contains only the minimum vehicle identity fields.
create table public.alpha_member_vehicle_discoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_vehicle_id text not null check (char_length(source_vehicle_id) between 1 and 160),
  make text not null check (char_length(make) between 1 and 80),
  model text not null check (char_length(model) between 1 and 120),
  nickname text check (nickname is null or char_length(nickname) between 1 and 80),
  model_year integer check (model_year between 1886 and 2200),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_vehicle_id)
);

create index alpha_member_vehicle_discoveries_active_owner_idx
  on public.alpha_member_vehicle_discoveries (user_id, updated_at desc)
  where is_active;

alter table public.alpha_member_vehicle_discoveries enable row level security;
revoke all on public.alpha_member_vehicle_discoveries from public, anon, authenticated;

create or replace function public.sync_alpha_member_vehicle_discoveries(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'user_id_required';
  end if;

  if not public.is_active_test_member(p_user_id) then
    update public.alpha_member_vehicle_discoveries
    set is_active = false, updated_at = now()
    where user_id = p_user_id
      and is_active;
    return;
  end if;

  update public.alpha_member_vehicle_discoveries discovery
  set is_active = false, updated_at = now()
  where discovery.user_id = p_user_id
    and discovery.is_active
    and not exists (
      select 1
      from public.alpha_private_workspaces workspace
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(workspace.payload->'vehicles') = 'array'
            then workspace.payload->'vehicles'
          else '[]'::jsonb
        end
      ) vehicle
      where workspace.user_id = p_user_id
        and trim(vehicle->>'id') = discovery.source_vehicle_id
    );

  insert into public.alpha_member_vehicle_discoveries (
    user_id,
    source_vehicle_id,
    make,
    model,
    nickname,
    model_year,
    updated_at
  )
  select
    workspace.user_id,
    trim(vehicle->>'id'),
    trim(vehicle->>'make'),
    trim(vehicle->>'model'),
    case
      when char_length(trim(coalesce(vehicle->>'nickname', ''))) between 1 and 80
        then trim(vehicle->>'nickname')
      else null
    end,
    case
      when coalesce(vehicle->>'year', '') ~ '^[0-9]{4}$'
        and (vehicle->>'year')::integer between 1886 and 2200
        then (vehicle->>'year')::integer
      else null
    end,
    now()
  from public.alpha_private_workspaces workspace
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(workspace.payload->'vehicles') = 'array'
        then workspace.payload->'vehicles'
      else '[]'::jsonb
    end
  ) vehicle
  where workspace.user_id = p_user_id
    and char_length(trim(coalesce(vehicle->>'id', ''))) between 1 and 160
    and char_length(trim(coalesce(vehicle->>'make', ''))) between 1 and 80
    and char_length(trim(coalesce(vehicle->>'model', ''))) between 1 and 120
  on conflict (user_id, source_vehicle_id)
  do update set
    make = excluded.make,
    model = excluded.model,
    nickname = excluded.nickname,
    model_year = excluded.model_year,
    updated_at = now();
end;
$$;

create or replace function public.sync_alpha_member_vehicle_discoveries_after_workspace_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_alpha_member_vehicle_discoveries(new.user_id);
  return new;
end;
$$;

create trigger sync_alpha_member_vehicle_discoveries_after_workspace_write
after insert or update of payload on public.alpha_private_workspaces
for each row execute function public.sync_alpha_member_vehicle_discoveries_after_workspace_write();

create or replace function public.sync_alpha_member_vehicle_discoveries_after_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_alpha_member_vehicle_discoveries(new.user_id);
  return new;
end;
$$;

create trigger sync_alpha_member_vehicle_discoveries_after_membership_change
after insert or update of status on public.test_memberships
for each row execute function public.sync_alpha_member_vehicle_discoveries_after_membership_change();

-- The alpha exception is applied once to existing active participants. The
-- source workspace remains private and no external share row is created.
select public.sync_alpha_member_vehicle_discoveries(workspace.user_id)
from public.alpha_private_workspaces workspace
join public.test_memberships membership
  on membership.user_id = workspace.user_id
  and membership.status = 'active';

update public.alpha_member_vehicle_discoveries
set is_active = true, updated_at = now()
where exists (
  select 1
  from public.test_memberships membership
  where membership.user_id = alpha_member_vehicle_discoveries.user_id
    and membership.status = 'active'
);

create function public.search_alpha_member_owners(p_query text)
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
    count(discovery.id) as vehicle_count,
    representative.id::text as representative_vehicle_target_id,
    representative.id::text as representative_vehicle_slug,
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
  join public.alpha_member_vehicle_discoveries discovery
    on discovery.user_id = profile.user_id
    and discovery.is_active
  left join lateral (
    select candidate.id, candidate.make, candidate.model, candidate.model_year
    from public.alpha_member_vehicle_discoveries candidate
    where candidate.user_id = profile.user_id
      and candidate.is_active
    order by candidate.updated_at desc, candidate.id
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
    representative.id,
    representative.make,
    representative.model,
    representative.model_year
  order by lower(profile.display_name), profile.public_profile_id
  limit 20;
$$;

create function public.search_alpha_member_vehicles(p_query text)
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
    profile.public_profile_id,
    profile.display_name,
    profile.public_username,
    discovery.id::text,
    discovery.id::text,
    discovery.make,
    discovery.model,
    discovery.nickname,
    discovery.model_year,
    null::text as image_data_url,
    exists (
      select 1
      from public.alpha_user_follows owner_follow
      where owner_follow.follower_user_id = auth.uid()
        and owner_follow.target_user_id = profile.user_id
    ) as viewer_follows_owner
  from public.alpha_member_vehicle_discoveries discovery
  join public.app_user_profiles profile
    on profile.user_id = discovery.user_id
  join public.test_memberships membership
    on membership.user_id = discovery.user_id
    and membership.status = 'active'
  cross join input
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and discovery.is_active
    and profile.user_id <> auth.uid()
    and char_length(input.query) between 1 and 80
    and not public.alpha_profiles_block_each_other(auth.uid(), profile.user_id)
    and (
      position(input.query in lower(discovery.make)) > 0
      or position(input.query in lower(discovery.model)) > 0
      or position(input.query in lower(coalesce(discovery.nickname, ''))) > 0
      or position(input.query in coalesce(discovery.model_year::text, '')) > 0
      or position(input.query in lower(profile.display_name)) > 0
      or position(input.query in coalesce(profile.public_username, '')) > 0
    )
  order by lower(discovery.make), lower(discovery.model), discovery.model_year nulls last, discovery.id
  limit 20;
$$;

create function public.get_alpha_member_owner(p_public_profile_id uuid)
returns table (
  public_profile_id uuid,
  display_name text,
  public_username text,
  vehicle_target_id text,
  vehicle_slug text,
  make text,
  model text,
  model_year integer,
  ownership_started_year integer,
  ownership_started_month integer,
  owner_comment text,
  image_data_url text,
  published_at timestamptz
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
    discovery.id::text,
    discovery.id::text,
    discovery.make,
    discovery.model,
    discovery.model_year,
    null::integer,
    null::integer,
    null::text,
    null::text,
    discovery.updated_at
  from public.app_user_profiles profile
  join public.test_memberships membership
    on membership.user_id = profile.user_id
    and membership.status = 'active'
  join public.alpha_member_vehicle_discoveries discovery
    on discovery.user_id = profile.user_id
    and discovery.is_active
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and profile.public_profile_id = p_public_profile_id
    and profile.user_id <> auth.uid()
    and not public.alpha_profiles_block_each_other(auth.uid(), profile.user_id)
  order by discovery.updated_at desc, discovery.id;
$$;

-- Username resolution remains profile-based so a public Garage route does not
-- disappear merely because the owner has no discoverable vehicle yet.
create function public.resolve_alpha_member_profile(p_public_username text)
returns table (
  public_profile_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.public_profile_id
  from public.app_user_profiles profile
  join public.test_memberships membership
    on membership.user_id = profile.user_id
    and membership.status = 'active'
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and profile.user_id <> auth.uid()
    and char_length(trim(coalesce(p_public_username, ''))) between 1 and 80
    and lower(profile.public_username) = lower(regexp_replace(trim(p_public_username), '^@+', ''))
    and not public.alpha_profiles_block_each_other(auth.uid(), profile.user_id)
  limit 1;
$$;

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
    vehicle.id::text,
    vehicle.id::text,
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
    select discovery.id, discovery.make, discovery.model, discovery.model_year
    from public.alpha_member_vehicle_discoveries discovery
    where discovery.user_id = related.related_user_id
      and discovery.is_active
    order by discovery.updated_at desc, discovery.id
    limit 1
  ) vehicle on true
  where related.related_user_id <> auth.uid()
    and not public.alpha_profiles_block_each_other(owner_user_id, related.related_user_id)
    and not public.alpha_profiles_block_each_other(auth.uid(), related.related_user_id)
  order by related.created_at desc, lower(profile.display_name), profile.public_profile_id;
end;
$$;

drop function if exists public.list_my_alpha_followed_vehicles();
create function public.list_my_alpha_followed_vehicles()
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
    select
      follow->>'targetId' as vehicle_target_id,
      max(workspace.updated_at) as followed_at
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
    group by follow->>'targetId'
  ), resolved_vehicles as (
    select
      followed.vehicle_target_id,
      discovery.id::text as vehicle_slug,
      discovery.make,
      discovery.model,
      discovery.model_year,
      null::text as image_data_url,
      discovery.user_id,
      followed.followed_at
    from followed_vehicle_ids followed
    join public.alpha_member_vehicle_discoveries discovery
      on discovery.id::text = followed.vehicle_target_id
      and discovery.is_active

    union all

    select
      followed.vehicle_target_id,
      share.slug as vehicle_slug,
      share.make,
      share.model,
      share.model_year,
      share.image_data_url,
      share.user_id,
      followed.followed_at
    from followed_vehicle_ids followed
    join public.alpha_public_vehicle_shares share
      on share.slug = followed.vehicle_target_id
      and share.is_active
  )
  select
    vehicle.vehicle_target_id,
    vehicle.vehicle_slug,
    vehicle.make,
    vehicle.model,
    vehicle.model_year,
    vehicle.image_data_url,
    profile.public_profile_id,
    profile.display_name,
    profile.public_username,
    exists (
      select 1
      from public.alpha_user_follows owner_follow
      where owner_follow.follower_user_id = auth.uid()
        and owner_follow.target_user_id = vehicle.user_id
    ),
    vehicle.followed_at
  from resolved_vehicles vehicle
  join public.app_user_profiles profile
    on profile.user_id = vehicle.user_id
  join public.test_memberships membership
    on membership.user_id = vehicle.user_id
    and membership.status = 'active'
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and vehicle.user_id <> auth.uid()
    and not public.alpha_profiles_block_each_other(auth.uid(), vehicle.user_id)
  order by vehicle.followed_at desc, lower(vehicle.make), lower(vehicle.model), vehicle.vehicle_slug;
$$;

create or replace function public.notify_alpha_journal_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.moderation_state <> 'visible' then
    return new;
  end if;

  with recipient_candidates as (
    select follow.follower_user_id as recipient_user_id
    from public.alpha_user_follows follow
    where follow.target_user_id = new.user_id

    union

    select workspace.user_id
    from public.alpha_private_workspaces workspace
    left join public.alpha_public_vehicle_shares share
      on share.id = new.vehicle_share_id
      and share.is_active
    left join public.alpha_member_vehicle_discoveries discovery
      on discovery.user_id = new.user_id
      and discovery.source_vehicle_id = new.payload->>'vehicleId'
      and discovery.is_active
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(workspace.payload->'follows') = 'array'
          then workspace.payload->'follows'
        else '[]'::jsonb
      end
    ) follow
    where follow->>'followerProfileId' = workspace.user_id::text
      and follow->>'targetType' = 'vehicle'
      and (
        (share.id is not null and follow->>'targetId' = share.slug)
        or (discovery.id is not null and follow->>'targetId' = discovery.id::text)
      )
  )
  insert into public.alpha_notifications (
    recipient_user_id,
    notification_type,
    actor_user_id,
    shared_journal_id,
    source_key,
    created_at
  )
  select distinct
    candidate.recipient_user_id,
    'journal_published',
    new.user_id,
    new.share_id,
    'journal_published:' || new.user_id::text || ':' || new.journal_id,
    new.published_at
  from recipient_candidates candidate
  where candidate.recipient_user_id <> new.user_id
    and public.is_active_test_member(candidate.recipient_user_id)
    and not public.alpha_profiles_block_each_other(candidate.recipient_user_id, new.user_id)
  on conflict (recipient_user_id, source_key) do nothing;

  return new;
end;
$$;

create or replace function public.list_my_alpha_notifications(
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 21
)
returns table (
  notification_id uuid,
  notification_type text,
  actor_public_profile_id uuid,
  actor_display_name text,
  actor_public_username text,
  journal_id text,
  vehicle_label text,
  target_available boolean,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bounded_limit integer := least(greatest(coalesce(p_limit, 21), 1), 51);
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'invalid_notification_cursor';
  end if;

  return query
  select
    notification.id,
    notification.notification_type,
    case when actor_membership.user_id is not null
      and not public.alpha_profiles_block_each_other(auth.uid(), notification.actor_user_id)
      then actor_profile.public_profile_id else null end,
    case when actor_membership.user_id is not null
      and not public.alpha_profiles_block_each_other(auth.uid(), notification.actor_user_id)
      then actor_profile.display_name else null end,
    case when actor_membership.user_id is not null
      and not public.alpha_profiles_block_each_other(auth.uid(), notification.actor_user_id)
      then actor_profile.public_username else null end,
    case when shared.share_id is not null then shared.journal_id else null end,
    case
      when shared.share_id is not null
        and (vehicle.is_active or discovery.is_active)
        then trim(coalesce(vehicle.make, discovery.make) || ' ' || coalesce(vehicle.model, discovery.model))
      else null
    end,
    case
      when notification.notification_type = 'profile_follow'
        then actor_membership.user_id is not null
          and not public.alpha_profiles_block_each_other(auth.uid(), notification.actor_user_id)
      else shared.share_id is not null
    end,
    notification.created_at,
    notification.read_at
  from public.alpha_notifications notification
  left join public.app_user_profiles actor_profile
    on actor_profile.user_id = notification.actor_user_id
  left join public.test_memberships actor_membership
    on actor_membership.user_id = notification.actor_user_id
    and actor_membership.status = 'active'
  left join public.alpha_shared_journals shared
    on shared.share_id = notification.shared_journal_id
    and shared.moderation_state = 'visible'
    and exists (
      select 1 from public.test_memberships author_membership
      where author_membership.user_id = shared.user_id
        and author_membership.status = 'active'
    )
    and not public.alpha_profiles_block_each_other(auth.uid(), shared.user_id)
  left join public.alpha_public_vehicle_shares vehicle
    on vehicle.id = shared.vehicle_share_id
  left join public.alpha_member_vehicle_discoveries discovery
    on discovery.user_id = shared.user_id
    and discovery.source_vehicle_id = shared.payload->>'vehicleId'
    and discovery.is_active
  where notification.recipient_user_id = auth.uid()
    and (
      p_before_created_at is null
      or (notification.created_at, notification.id) < (p_before_created_at, p_before_id)
    )
  order by notification.created_at desc, notification.id desc
  limit bounded_limit;
end;
$$;

revoke all on function public.sync_alpha_member_vehicle_discoveries(uuid)
  from public, anon, authenticated;
revoke all on function public.sync_alpha_member_vehicle_discoveries_after_workspace_write()
  from public, anon, authenticated;
revoke all on function public.sync_alpha_member_vehicle_discoveries_after_membership_change()
  from public, anon, authenticated;
revoke all on function public.search_alpha_member_owners(text)
  from public, anon, authenticated;
revoke all on function public.search_alpha_member_vehicles(text)
  from public, anon, authenticated;
revoke all on function public.get_alpha_member_owner(uuid)
  from public, anon, authenticated;
revoke all on function public.resolve_alpha_member_profile(text)
  from public, anon, authenticated;
revoke all on function public.list_alpha_connection_people(uuid, text)
  from public, anon, authenticated;
revoke all on function public.list_my_alpha_followed_vehicles()
  from public, anon, authenticated;
revoke all on function public.notify_alpha_journal_published()
  from public, anon, authenticated;
revoke all on function public.list_my_alpha_notifications(timestamptz, uuid, integer)
  from public, anon, authenticated;

grant execute on function public.search_alpha_member_owners(text)
  to authenticated;
grant execute on function public.search_alpha_member_vehicles(text)
  to authenticated;
grant execute on function public.get_alpha_member_owner(uuid)
  to authenticated;
grant execute on function public.resolve_alpha_member_profile(text)
  to authenticated;
grant execute on function public.list_alpha_connection_people(uuid, text)
  to authenticated;
grant execute on function public.list_my_alpha_followed_vehicles()
  to authenticated;
grant execute on function public.list_my_alpha_notifications(timestamptz, uuid, integer)
  to authenticated;

comment on table public.alpha_member_vehicle_discoveries is
  'Alpha-only vehicle discovery projection. Existing active alpha participant vehicles are initially discoverable to active alpha participants; newly added vehicles remain private until a future vehicle-level discovery setting enables them. External anonymous sharing remains alpha_public_vehicle_shares.';

comment on function public.search_alpha_member_vehicles(text) is
  'Searches alpha-only vehicle discovery fields for active, non-blocked alpha participants. It never exposes a private workspace or external share state.';

commit;
