begin;

-- The private workspace remains the source of truth for a vehicle owner's
-- member-discovery preference. This projection is never an external share.
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

  delete from public.alpha_member_vehicle_discoveries discovery
  where discovery.user_id = p_user_id
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
    is_active,
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
    case lower(coalesce(vehicle->>'memberDiscoveryEnabled', 'true'))
      when 'false' then false
      else true
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
    is_active = excluded.is_active,
    updated_at = now();
end;
$$;

-- Existing follows continue to resolve after an owner opts out of new
-- discovery. The relationship itself is never removed by this preference.
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

-- A discovery opt-out prevents new search discovery, not notifications for an
-- already-followed vehicle's public record.
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

-- Platform admins may reuse the same safe member candidate contract before an
-- organization exists. Organization managers remain scoped to their own org.
create or replace function public.search_professional_member_candidates(
  p_organization_id uuid,
  p_query text,
  p_limit integer default 20
)
returns table (
  user_id uuid,
  public_profile_id uuid,
  display_name text,
  public_username text,
  profile_image_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  with input as (
    select lower(regexp_replace(trim(coalesce(p_query, '')), '^@+', '')) as query,
      least(greatest(coalesce(p_limit, 20), 1), 20) as result_limit
  )
  select profile.user_id, profile.public_profile_id, profile.display_name,
    profile.public_username, profile.profile_image_path
  from public.app_user_profiles profile
  join public.test_memberships alpha_membership
    on alpha_membership.user_id = profile.user_id and alpha_membership.status = 'active'
  cross join input
  where auth.uid() is not null
    and (
      public.is_alpha_admin(auth.uid())
      or (
        p_organization_id is not null
        and public.can_manage_professional_organization(p_organization_id, auth.uid())
      )
    )
    and char_length(input.query) between 1 and 80
    and (
      p_organization_id is null
      or not exists (
        select 1 from public.professional_organization_memberships membership
        where membership.organization_id = p_organization_id
          and membership.user_id = profile.user_id
      )
    )
    and (
      position(input.query in lower(profile.display_name)) > 0
      or position(input.query in lower(coalesce(profile.public_username, ''))) > 0
    )
  order by profile.display_name, profile.user_id
  limit (select result_limit from input);
$$;

create or replace function public.admin_create_professional_organization(
  p_name text,
  p_slug text,
  p_founding_garage boolean default false,
  p_provider_id uuid default null,
  p_owner_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id uuid;
  normalized_name text := trim(coalesce(p_name, ''));
  normalized_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if auth.uid() is null or not public.is_alpha_admin(auth.uid()) then
    raise exception 'admin_required';
  end if;
  if char_length(normalized_name) not between 1 and 120 then
    raise exception 'invalid_organization_name';
  end if;
  if normalized_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'invalid_organization_slug';
  end if;
  if p_owner_user_id is null then
    raise exception 'initial_owner_required';
  end if;
  if not public.is_active_test_member(p_owner_user_id) then
    raise exception 'member_not_available';
  end if;
  if p_provider_id is not null and not exists (
    select 1 from public.service_providers provider
    where provider.id = p_provider_id and provider.status <> 'inactive'
  ) then
    raise exception 'provider_not_available';
  end if;

  insert into public.professional_organizations (
    name, slug, founding_garage, created_by_user_id
  ) values (
    normalized_name, normalized_slug, coalesce(p_founding_garage, false), auth.uid()
  ) returning id into organization_id;

  insert into public.professional_organization_memberships (
    organization_id, user_id, role_code, created_by_user_id
  ) values (organization_id, p_owner_user_id, 'owner', auth.uid());

  if p_provider_id is not null then
    insert into public.service_provider_organization_links (
      organization_id, service_provider_id, is_primary
    ) values (organization_id, p_provider_id, true);
  end if;

  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'professional_organization_created', 'professional_organization',
    organization_id::text,
    jsonb_build_object(
      'name', normalized_name,
      'foundingGarage', coalesce(p_founding_garage, false),
      'initialOwnerUserId', p_owner_user_id
    )
  );
  if p_provider_id is not null then
    insert into public.app_admin_audit_logs (
      actor_user_id, action, target_type, target_id, detail
    ) values (
      auth.uid(), 'professional_provider_link_changed', 'professional_organization',
      organization_id::text, jsonb_build_object('from', null, 'to', p_provider_id)
    );
  end if;
  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'professional_member_added', 'professional_organization',
    organization_id::text, jsonb_build_object('userId', p_owner_user_id, 'role', 'owner')
  );
  return organization_id;
end;
$$;

comment on function public.sync_alpha_member_vehicle_discoveries(uuid) is
  'Projects owner-controlled active-member discovery only. It never creates or changes an external vehicle share.';
comment on function public.admin_create_professional_organization(text, text, boolean, uuid, uuid) is
  'Creates an organization atomically with one required active alpha OWNER membership.';

commit;
