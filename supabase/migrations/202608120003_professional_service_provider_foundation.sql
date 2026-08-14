begin;

create table public.service_providers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  locality text check (locality is null or char_length(locality) between 1 and 120),
  status text not null default 'unverified'
    check (status in ('unverified', 'active', 'inactive')),
  source text not null default 'user_submitted'
    check (source in ('user_submitted', 'admin_created')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_providers_search_idx
  on public.service_providers (lower(display_name), lower(coalesce(locality, '')))
  where status <> 'inactive';

create table public.professional_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null unique
    check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  founding_garage boolean not null default false,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_provider_organization_links (
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  service_provider_id uuid not null references public.service_providers(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (organization_id, service_provider_id)
);

create unique index professional_organization_primary_provider_idx
  on public.service_provider_organization_links (organization_id)
  where is_primary;

create table public.professional_organization_memberships (
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_code text not null check (role_code in ('owner', 'staff')),
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index professional_memberships_user_idx
  on public.professional_organization_memberships (user_id, organization_id);

alter table public.service_providers enable row level security;
alter table public.professional_organizations enable row level security;
alter table public.service_provider_organization_links enable row level security;
alter table public.professional_organization_memberships enable row level security;

revoke all on public.service_providers from public, anon, authenticated;
revoke all on public.professional_organizations from public, anon, authenticated;
revoke all on public.service_provider_organization_links from public, anon, authenticated;
revoke all on public.professional_organization_memberships from public, anon, authenticated;

create or replace function public.can_view_professional_organization(
  p_organization_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and (
    public.is_alpha_admin(p_user_id)
    or (public.is_active_test_member(p_user_id) and exists (
      select 1
      from public.professional_organization_memberships membership
      where membership.organization_id = p_organization_id
        and membership.user_id = p_user_id
    ))
  );
$$;

create or replace function public.can_manage_professional_organization(
  p_organization_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and (
    public.is_alpha_admin(p_user_id)
    or (public.is_active_test_member(p_user_id) and exists (
      select 1
      from public.professional_organization_memberships membership
      join public.professional_organizations organization
        on organization.id = membership.organization_id
      where membership.organization_id = p_organization_id
        and membership.user_id = p_user_id
        and membership.role_code = 'owner'
        and organization.status = 'active'
    ))
  );
$$;

revoke all on function public.can_view_professional_organization(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.can_manage_professional_organization(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.search_service_providers(
  p_query text,
  p_limit integer default 20
)
returns table (
  id uuid,
  display_name text,
  locality text,
  status text,
  source text
)
language sql
stable
security definer
set search_path = ''
as $$
  with input as (
    select lower(trim(coalesce(p_query, ''))) as query,
      least(greatest(coalesce(p_limit, 20), 1), 20) as result_limit
  )
  select provider.id, provider.display_name, provider.locality,
    provider.status, provider.source
  from public.service_providers provider
  cross join input
  where auth.uid() is not null
    and (public.is_active_test_member(auth.uid()) or public.is_alpha_admin(auth.uid()))
    and char_length(input.query) between 1 and 100
    and provider.status <> 'inactive'
    and (
      position(input.query in lower(provider.display_name)) > 0
      or position(input.query in lower(coalesce(provider.locality, ''))) > 0
    )
  order by
    case when lower(provider.display_name) = input.query then 0 else 1 end,
    provider.display_name,
    provider.id
  limit (select result_limit from input);
$$;

create or replace function public.create_user_service_provider(
  p_display_name text,
  p_locality text default null
)
returns table (
  id uuid,
  display_name text,
  locality text,
  status text,
  source text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider public.service_providers%rowtype;
  normalized_name text := trim(coalesce(p_display_name, ''));
  normalized_locality text := nullif(trim(coalesce(p_locality, '')), '');
begin
  if auth.uid() is null or not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;
  if char_length(normalized_name) not between 1 and 120 then
    raise exception 'invalid_provider_name';
  end if;
  if normalized_locality is not null and char_length(normalized_locality) > 120 then
    raise exception 'invalid_provider_locality';
  end if;

  insert into public.service_providers (
    display_name, locality, status, source, created_by_user_id
  ) values (
    normalized_name, normalized_locality, 'unverified', 'user_submitted', auth.uid()
  ) returning * into provider;

  return query select provider.id, provider.display_name, provider.locality,
    provider.status, provider.source;
end;
$$;

create or replace function public.get_my_professional_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
      public.is_alpha_admin(auth.uid())
      or (public.is_active_test_member(auth.uid()) and exists (
        select 1 from public.professional_organization_memberships membership
        where membership.user_id = auth.uid()
      ))
    );
$$;

create or replace function public.admin_update_service_provider(
  p_provider_id uuid,
  p_display_name text,
  p_locality text,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := trim(coalesce(p_display_name, ''));
  normalized_locality text := nullif(trim(coalesce(p_locality, '')), '');
begin
  if auth.uid() is null or not public.is_alpha_admin(auth.uid()) then
    raise exception 'admin_required';
  end if;
  if char_length(normalized_name) not between 1 and 120 then raise exception 'invalid_provider_name'; end if;
  if normalized_locality is not null and char_length(normalized_locality) > 120 then raise exception 'invalid_provider_locality'; end if;
  if p_status not in ('unverified', 'active', 'inactive') then raise exception 'invalid_provider_status'; end if;
  update public.service_providers provider
  set display_name = normalized_name, locality = normalized_locality,
      status = p_status, updated_at = now()
  where provider.id = p_provider_id;
  if not found then return false; end if;
  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'service_provider_updated', 'service_provider', p_provider_id::text,
    jsonb_build_object('displayName', normalized_name, 'locality', normalized_locality, 'status', p_status)
  );
  return true;
end;
$$;

create or replace function public.list_my_professional_organizations()
returns table (
  id uuid,
  name text,
  slug text,
  status text,
  founding_garage boolean,
  provider_id uuid,
  provider_name text,
  provider_locality text,
  my_role text,
  member_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select organization.id, organization.name, organization.slug,
    organization.status, organization.founding_garage,
    provider.id, provider.display_name, provider.locality,
    membership.role_code,
    (select count(*) from public.professional_organization_memberships count_membership
      where count_membership.organization_id = organization.id)
  from public.professional_organizations organization
  left join public.professional_organization_memberships membership
    on membership.organization_id = organization.id and membership.user_id = auth.uid()
  left join public.service_provider_organization_links provider_link
    on provider_link.organization_id = organization.id and provider_link.is_primary
  left join public.service_providers provider on provider.id = provider_link.service_provider_id
  where auth.uid() is not null
    and (
      public.is_alpha_admin(auth.uid())
      or (public.is_active_test_member(auth.uid()) and membership.user_id is not null)
    )
  order by organization.name, organization.id;
$$;

create or replace function public.list_professional_organization_members(
  p_organization_id uuid
)
returns table (
  user_id uuid,
  public_profile_id uuid,
  display_name text,
  public_username text,
  profile_image_path text,
  role_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  select membership.user_id, profile.public_profile_id, profile.display_name,
    profile.public_username, profile.profile_image_path, membership.role_code
  from public.professional_organization_memberships membership
  join public.app_user_profiles profile on profile.user_id = membership.user_id
  where auth.uid() is not null
    and public.can_view_professional_organization(p_organization_id, auth.uid())
    and membership.organization_id = p_organization_id
  order by case membership.role_code when 'owner' then 0 else 1 end,
    profile.display_name, membership.user_id;
$$;

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
    and public.can_manage_professional_organization(p_organization_id, auth.uid())
    and char_length(input.query) between 1 and 80
    and not exists (
      select 1 from public.professional_organization_memberships membership
      where membership.organization_id = p_organization_id
        and membership.user_id = profile.user_id
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
  if p_provider_id is not null and not exists (
    select 1 from public.service_providers provider
    where provider.id = p_provider_id and provider.status <> 'inactive'
  ) then
    raise exception 'provider_not_available';
  end if;
  if p_owner_user_id is not null and not public.is_active_test_member(p_owner_user_id) then
    raise exception 'member_not_available';
  end if;

  insert into public.professional_organizations (
    name, slug, founding_garage, created_by_user_id
  ) values (
    normalized_name, normalized_slug, coalesce(p_founding_garage, false), auth.uid()
  ) returning id into organization_id;

  if p_provider_id is not null then
    insert into public.service_provider_organization_links (
      organization_id, service_provider_id, is_primary
    ) values (organization_id, p_provider_id, true);
  end if;
  if p_owner_user_id is not null then
    insert into public.professional_organization_memberships (
      organization_id, user_id, role_code, created_by_user_id
    ) values (organization_id, p_owner_user_id, 'owner', auth.uid());
  end if;

  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'professional_organization_created', 'professional_organization',
    organization_id::text,
    jsonb_build_object('name', normalized_name, 'foundingGarage', coalesce(p_founding_garage, false))
  );
  if p_provider_id is not null then
    insert into public.app_admin_audit_logs (
      actor_user_id, action, target_type, target_id, detail
    ) values (
      auth.uid(), 'professional_provider_link_changed', 'professional_organization',
      organization_id::text, jsonb_build_object('from', null, 'to', p_provider_id)
    );
  end if;
  if p_owner_user_id is not null then
    insert into public.app_admin_audit_logs (
      actor_user_id, action, target_type, target_id, detail
    ) values (
      auth.uid(), 'professional_member_added', 'professional_organization',
      organization_id::text, jsonb_build_object('userId', p_owner_user_id, 'role', 'owner')
    );
  end if;
  return organization_id;
end;
$$;

create or replace function public.update_professional_organization(
  p_organization_id uuid,
  p_name text,
  p_slug text,
  p_status text,
  p_founding_garage boolean,
  p_provider_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_organization public.professional_organizations%rowtype;
  normalized_name text := trim(coalesce(p_name, ''));
  normalized_slug text := lower(trim(coalesce(p_slug, '')));
  actor_is_admin boolean := public.is_alpha_admin(auth.uid());
  current_provider_id uuid;
begin
  if auth.uid() is null or not public.can_manage_professional_organization(p_organization_id, auth.uid()) then
    raise exception 'organization_owner_required';
  end if;
  select * into current_organization
  from public.professional_organizations organization
  where organization.id = p_organization_id for update;
  if current_organization.id is null then return false; end if;
  select link.service_provider_id into current_provider_id
  from public.service_provider_organization_links link
  where link.organization_id = p_organization_id and link.is_primary;

  if char_length(normalized_name) not between 1 and 120 then
    raise exception 'invalid_organization_name';
  end if;
  if normalized_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'invalid_organization_slug';
  end if;
  if p_status not in ('active', 'inactive') then raise exception 'invalid_organization_status'; end if;
  if not actor_is_admin and (
    p_status is distinct from current_organization.status
    or p_founding_garage is distinct from current_organization.founding_garage
    or p_provider_id is distinct from current_provider_id
  ) then
    raise exception 'admin_required_for_platform_fields';
  end if;
  if p_provider_id is not null and not exists (
    select 1 from public.service_providers provider
    where provider.id = p_provider_id and provider.status <> 'inactive'
  ) then raise exception 'provider_not_available'; end if;

  update public.professional_organizations organization
  set name = normalized_name,
      slug = normalized_slug,
      status = p_status,
      founding_garage = p_founding_garage,
      updated_at = now()
  where organization.id = p_organization_id;

  if actor_is_admin then
    delete from public.service_provider_organization_links link
    where link.organization_id = p_organization_id and link.is_primary;
    if p_provider_id is not null then
      insert into public.service_provider_organization_links (
        organization_id, service_provider_id, is_primary
      ) values (p_organization_id, p_provider_id, true)
      on conflict (organization_id, service_provider_id)
      do update set is_primary = true;
    end if;
  end if;

  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'professional_organization_updated', 'professional_organization',
    p_organization_id::text,
    jsonb_build_object('name', normalized_name, 'status', p_status,
      'foundingGarage', p_founding_garage, 'providerId', p_provider_id)
  );
  if p_status is distinct from current_organization.status then
    insert into public.app_admin_audit_logs (actor_user_id, action, target_type, target_id, detail)
    values (auth.uid(), 'professional_organization_status_changed', 'professional_organization',
      p_organization_id::text, jsonb_build_object('from', current_organization.status, 'to', p_status));
  end if;
  if p_founding_garage is distinct from current_organization.founding_garage then
    insert into public.app_admin_audit_logs (actor_user_id, action, target_type, target_id, detail)
    values (auth.uid(), 'founding_garage_changed', 'professional_organization',
      p_organization_id::text, jsonb_build_object('enabled', p_founding_garage));
  end if;
  if p_provider_id is distinct from current_provider_id then
    insert into public.app_admin_audit_logs (actor_user_id, action, target_type, target_id, detail)
    values (auth.uid(), 'professional_provider_link_changed', 'professional_organization',
      p_organization_id::text, jsonb_build_object('from', current_provider_id, 'to', p_provider_id));
  end if;
  return true;
end;
$$;

create or replace function public.add_professional_organization_member(
  p_organization_id uuid,
  p_user_id uuid,
  p_role_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.can_manage_professional_organization(p_organization_id, auth.uid()) then
    raise exception 'organization_owner_required';
  end if;
  if p_role_code not in ('owner', 'staff') then raise exception 'invalid_organization_role'; end if;
  if not public.is_active_test_member(p_user_id) then raise exception 'member_not_available'; end if;
  insert into public.professional_organization_memberships (
    organization_id, user_id, role_code, created_by_user_id
  ) values (p_organization_id, p_user_id, p_role_code, auth.uid())
  on conflict (organization_id, user_id) do nothing;
  if not found then return false; end if;
  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'professional_member_added', 'professional_organization',
    p_organization_id::text, jsonb_build_object('userId', p_user_id, 'role', p_role_code)
  );
  return true;
end;
$$;

create or replace function public.change_professional_organization_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role text;
begin
  if auth.uid() is null or not public.can_manage_professional_organization(p_organization_id, auth.uid()) then
    raise exception 'organization_owner_required';
  end if;
  if p_role_code not in ('owner', 'staff') then raise exception 'invalid_organization_role'; end if;
  perform 1 from public.professional_organizations organization
  where organization.id = p_organization_id for update;
  select membership.role_code into current_role
  from public.professional_organization_memberships membership
  where membership.organization_id = p_organization_id and membership.user_id = p_user_id
  for update;
  if current_role is null then return false; end if;
  if current_role = 'owner' and p_role_code = 'staff' and (
    select count(*) from public.professional_organization_memberships membership
    where membership.organization_id = p_organization_id and membership.role_code = 'owner'
  ) <= 1 then raise exception 'last_owner_required'; end if;
  update public.professional_organization_memberships membership
  set role_code = p_role_code, updated_at = now()
  where membership.organization_id = p_organization_id and membership.user_id = p_user_id;
  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'professional_member_role_changed', 'professional_organization',
    p_organization_id::text, jsonb_build_object('userId', p_user_id, 'role', p_role_code)
  );
  return true;
end;
$$;

create or replace function public.remove_professional_organization_member(
  p_organization_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role text;
begin
  if auth.uid() is null or not public.can_manage_professional_organization(p_organization_id, auth.uid()) then
    raise exception 'organization_owner_required';
  end if;
  perform 1 from public.professional_organizations organization
  where organization.id = p_organization_id for update;
  select membership.role_code into current_role
  from public.professional_organization_memberships membership
  where membership.organization_id = p_organization_id and membership.user_id = p_user_id
  for update;
  if current_role is null then return false; end if;
  if current_role = 'owner' and (
    select count(*) from public.professional_organization_memberships membership
    where membership.organization_id = p_organization_id and membership.role_code = 'owner'
  ) <= 1 then raise exception 'last_owner_required'; end if;
  delete from public.professional_organization_memberships membership
  where membership.organization_id = p_organization_id and membership.user_id = p_user_id;
  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'professional_member_removed', 'professional_organization',
    p_organization_id::text, jsonb_build_object('userId', p_user_id, 'role', current_role)
  );
  return true;
end;
$$;

revoke all on function public.search_service_providers(text, integer) from public, anon, authenticated;
revoke all on function public.create_user_service_provider(text, text) from public, anon, authenticated;
revoke all on function public.get_my_professional_access() from public, anon, authenticated;
revoke all on function public.admin_update_service_provider(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.list_my_professional_organizations() from public, anon, authenticated;
revoke all on function public.list_professional_organization_members(uuid) from public, anon, authenticated;
revoke all on function public.search_professional_member_candidates(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.admin_create_professional_organization(text, text, boolean, uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_professional_organization(uuid, text, text, text, boolean, uuid) from public, anon, authenticated;
revoke all on function public.add_professional_organization_member(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.change_professional_organization_member_role(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.remove_professional_organization_member(uuid, uuid) from public, anon, authenticated;

grant execute on function public.search_service_providers(text, integer) to authenticated;
grant execute on function public.create_user_service_provider(text, text) to authenticated;
grant execute on function public.get_my_professional_access() to authenticated;
grant execute on function public.admin_update_service_provider(uuid, text, text, text) to authenticated;
grant execute on function public.list_my_professional_organizations() to authenticated;
grant execute on function public.list_professional_organization_members(uuid) to authenticated;
grant execute on function public.search_professional_member_candidates(uuid, text, integer) to authenticated;
grant execute on function public.admin_create_professional_organization(text, text, boolean, uuid, uuid) to authenticated;
grant execute on function public.update_professional_organization(uuid, text, text, text, boolean, uuid) to authenticated;
grant execute on function public.add_professional_organization_member(uuid, uuid, text) to authenticated;
grant execute on function public.change_professional_organization_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_professional_organization_member(uuid, uuid) to authenticated;

comment on table public.service_providers is
  'Minimal service-location identities used for maintenance attribution. User-submitted rows are not verified endorsements.';
comment on table public.professional_organizations is
  'MECHORI-managed professional tenant. Founding Garage belongs here, not to a provider or user.';
comment on table public.professional_organization_memberships is
  'Many-to-many organization membership; platform roles remain separate.';

commit;
