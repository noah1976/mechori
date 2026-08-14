begin;

alter table public.app_user_profiles
  add column public_profile_id uuid not null default gen_random_uuid();

alter table public.app_user_profiles
  add constraint app_user_profiles_public_profile_id_key
  unique (public_profile_id);

alter table public.alpha_shared_journals
  add column public_profile_id uuid
    references public.app_user_profiles(public_profile_id) on delete set null,
  add column vehicle_share_id uuid
    references public.alpha_public_vehicle_shares(id) on delete set null;

create index alpha_shared_journals_public_profile_idx
  on public.alpha_shared_journals (public_profile_id, published_at desc)
  where moderation_state = 'visible';

create index alpha_shared_journals_vehicle_share_idx
  on public.alpha_shared_journals (vehicle_share_id, published_at desc)
  where moderation_state = 'visible';

update public.alpha_shared_journals shared
set public_profile_id = profile.public_profile_id
from public.app_user_profiles profile
where profile.user_id = shared.user_id;

with workspace_journals as (
  select
    workspace.user_id,
    journal->>'id' as journal_id,
    journal->>'vehicleId' as vehicle_id
  from public.alpha_private_workspaces workspace
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(workspace.payload->'journals') = 'array'
        then workspace.payload->'journals'
      else '[]'::jsonb
    end
  ) journal
)
update public.alpha_shared_journals shared
set vehicle_share_id = share.id
from workspace_journals workspace_journal
join public.alpha_public_vehicle_shares share
  on share.user_id = workspace_journal.user_id
  and share.vehicle_id = workspace_journal.vehicle_id
  and share.is_active
where shared.user_id = workspace_journal.user_id
  and shared.journal_id = workspace_journal.journal_id;

create or replace function public.refresh_alpha_shared_vehicle_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active then
    update public.alpha_shared_journals shared
    set vehicle_share_id = new.id
    from public.alpha_private_workspaces workspace
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(workspace.payload->'journals') = 'array'
          then workspace.payload->'journals'
        else '[]'::jsonb
      end
    ) journal
    where workspace.user_id = new.user_id
      and journal->>'id' = shared.journal_id
      and journal->>'vehicleId' = new.vehicle_id
      and shared.user_id = new.user_id;
  else
    update public.alpha_shared_journals shared
    set vehicle_share_id = null
    where shared.vehicle_share_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.refresh_alpha_shared_vehicle_link()
  from public, anon, authenticated;

create trigger refresh_alpha_shared_vehicle_link_after_publish
after insert or update of is_active
on public.alpha_public_vehicle_shares
for each row
execute function public.refresh_alpha_shared_vehicle_link();

create or replace function public.publish_alpha_shared_journal(
  p_journal_id text,
  p_author_display_name text,
  p_payload jsonb,
  p_published_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  shared_id uuid;
  resolved_public_profile_id uuid;
  resolved_vehicle_share_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;
  if p_journal_id is null or char_length(trim(p_journal_id)) not between 1 and 160 then
    raise exception 'invalid_journal_id';
  end if;
  if p_author_display_name is null
    or char_length(trim(p_author_display_name)) not between 1 and 80 then
    raise exception 'invalid_author_display_name';
  end if;
  if p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or p_payload->>'schemaVersion' <> '1'
    or not public.is_valid_alpha_shared_media(p_payload->'media')
    or jsonb_typeof(p_payload->'contentBlocks') is distinct from 'array'
    or p_payload ?| array[
      'vehicleId',
      'vehicleTargetId',
      'linkedRecordId',
      'displayFields',
      'knowledgeExtractionConsent',
      'storageKey'
    ]
    or exists (
      select 1
      from jsonb_array_elements(p_payload->'media') media
      where media->>'assetPath' not like (auth.uid()::text || '/%')
    )
    or octet_length(p_payload::text) > 65536 then
    raise exception 'invalid_shared_payload';
  end if;

  select profile.public_profile_id
  into resolved_public_profile_id
  from public.app_user_profiles profile
  where profile.user_id = auth.uid();

  select share.id
  into resolved_vehicle_share_id
  from public.alpha_private_workspaces workspace
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(workspace.payload->'journals') = 'array'
        then workspace.payload->'journals'
      else '[]'::jsonb
    end
  ) journal
  join public.alpha_public_vehicle_shares share
    on share.user_id = workspace.user_id
    and share.vehicle_id = journal->>'vehicleId'
    and share.is_active
  where workspace.user_id = auth.uid()
    and journal->>'id' = trim(p_journal_id)
  limit 1;

  insert into public.alpha_shared_journals (
    user_id,
    journal_id,
    public_profile_id,
    vehicle_share_id,
    author_display_name,
    payload,
    published_at,
    updated_at
  ) values (
    auth.uid(),
    trim(p_journal_id),
    resolved_public_profile_id,
    resolved_vehicle_share_id,
    trim(p_author_display_name),
    p_payload,
    coalesce(p_published_at, now()),
    now()
  )
  on conflict (user_id, journal_id)
  do update set
    public_profile_id = excluded.public_profile_id,
    vehicle_share_id = excluded.vehicle_share_id,
    author_display_name = excluded.author_display_name,
    payload = excluded.payload,
    published_at = excluded.published_at,
    updated_at = now()
  where alpha_shared_journals.moderation_state = 'visible'
  returning share_id into shared_id;

  if shared_id is null then
    raise exception 'shared_journal_hidden';
  end if;
  return shared_id;
end;
$$;

revoke all on function public.publish_alpha_shared_journal(text, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.publish_alpha_shared_journal(text, text, jsonb, timestamptz)
  to authenticated;

create or replace function public.search_alpha_public_owners(p_query text)
returns table (
  public_profile_id uuid,
  display_name text,
  vehicle_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.public_profile_id,
    profile.display_name,
    count(share.id) as vehicle_count
  from public.app_user_profiles profile
  join public.test_memberships membership
    on membership.user_id = profile.user_id
    and membership.status = 'active'
  join public.alpha_public_vehicle_shares share
    on share.user_id = profile.user_id
    and share.is_active
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and profile.user_id <> auth.uid()
    and char_length(trim(coalesce(p_query, ''))) between 1 and 80
    and position(lower(trim(p_query)) in lower(profile.display_name)) > 0
  group by profile.public_profile_id, profile.display_name
  order by lower(profile.display_name), profile.public_profile_id
  limit 20;
$$;

create or replace function public.get_alpha_public_owner(p_public_profile_id uuid)
returns table (
  public_profile_id uuid,
  display_name text,
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
    share.slug as vehicle_target_id,
    share.slug as vehicle_slug,
    share.make,
    share.model,
    share.model_year,
    share.ownership_started_year,
    share.ownership_started_month,
    share.owner_comment,
    share.image_data_url,
    share.published_at
  from public.app_user_profiles profile
  join public.test_memberships membership
    on membership.user_id = profile.user_id
    and membership.status = 'active'
  join public.alpha_public_vehicle_shares share
    on share.user_id = profile.user_id
    and share.is_active
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and profile.public_profile_id = p_public_profile_id
    and profile.user_id <> auth.uid()
  order by share.published_at desc, share.slug;
$$;

create or replace function public.list_alpha_shared_journals()
returns table (
  share_id uuid,
  journal_id text,
  public_profile_id uuid,
  vehicle_target_id text,
  author_display_name text,
  payload jsonb,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    shared.share_id,
    shared.journal_id,
    shared.public_profile_id,
    case when share.is_active then share.slug else null end as vehicle_target_id,
    shared.author_display_name,
    shared.payload,
    shared.published_at,
    shared.updated_at
  from public.alpha_shared_journals shared
  left join public.alpha_public_vehicle_shares share
    on share.id = shared.vehicle_share_id
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and shared.moderation_state = 'visible'
    and exists (
      select 1
      from public.test_memberships membership
      where membership.user_id = shared.user_id
        and membership.status = 'active'
    )
  order by shared.published_at desc
  limit 100;
$$;

revoke all on function public.search_alpha_public_owners(text)
  from public, anon, authenticated;
revoke all on function public.get_alpha_public_owner(uuid)
  from public, anon, authenticated;
revoke all on function public.list_alpha_shared_journals()
  from public, anon, authenticated;

grant execute on function public.search_alpha_public_owners(text)
  to authenticated;
grant execute on function public.get_alpha_public_owner(uuid)
  to authenticated;
grant execute on function public.list_alpha_shared_journals()
  to authenticated;

comment on column public.app_user_profiles.public_profile_id is
  'Opaque identifier exposed to active testers instead of the authentication user id.';
comment on function public.search_alpha_public_owners(text) is
  'Searches active alpha owners by display name only when they have an explicitly published vehicle.';
comment on function public.get_alpha_public_owner(uuid) is
  'Returns only explicitly published vehicle snapshots for one active alpha owner.';

commit;
