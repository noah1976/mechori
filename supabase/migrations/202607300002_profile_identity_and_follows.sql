begin;

alter table public.app_user_profiles
  add column public_username text;

alter table public.app_user_profiles
  add constraint app_user_profiles_public_username_check
  check (
    public_username is null
    or (
      public_username = lower(public_username)
      and public_username ~ '^[a-z0-9_]{3,30}$'
    )
  );

create unique index app_user_profiles_public_username_unique_idx
  on public.app_user_profiles (lower(public_username))
  where public_username is not null;

create table public.alpha_user_follows (
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  source_invitation_id uuid references public.test_invitations(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (follower_user_id, target_user_id),
  check (follower_user_id <> target_user_id)
);

create index alpha_user_follows_target_idx
  on public.alpha_user_follows (target_user_id, created_at desc);

alter table public.alpha_user_follows enable row level security;
revoke all on public.alpha_user_follows from public, anon, authenticated;

create or replace function public.alpha_profiles_block_each_other(
  p_left_user_id uuid,
  p_right_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with profile_ids as (
    select
      left_profile.public_profile_id::text as left_public_profile_id,
      right_profile.public_profile_id::text as right_public_profile_id
    from public.app_user_profiles left_profile
    cross join public.app_user_profiles right_profile
    where left_profile.user_id = p_left_user_id
      and right_profile.user_id = p_right_user_id
  )
  select exists (
    select 1
    from profile_ids ids
    join public.alpha_private_workspaces workspace
      on workspace.user_id in (p_left_user_id, p_right_user_id)
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(workspace.payload->'profileSafetyRelations') = 'array'
          then workspace.payload->'profileSafetyRelations'
        else '[]'::jsonb
      end
    ) relation
    where relation->>'type' = 'block'
      and (
        (
          workspace.user_id = p_left_user_id
          and relation->>'targetProfileId' = ids.right_public_profile_id
        )
        or (
          workspace.user_id = p_right_user_id
          and relation->>'targetProfileId' = ids.left_public_profile_id
        )
      )
  );
$$;

revoke all on function public.alpha_profiles_block_each_other(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.alpha_workspace_follows_vehicle(
  p_user_id uuid,
  p_vehicle_target_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.alpha_private_workspaces workspace
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(workspace.payload->'follows') = 'array'
          then workspace.payload->'follows'
        else '[]'::jsonb
      end
    ) follow
    where workspace.user_id = p_user_id
      and follow->>'followerProfileId' = p_user_id::text
      and follow->>'targetType' = 'vehicle'
      and follow->>'targetId' = p_vehicle_target_id
  );
$$;

revoke all on function public.alpha_workspace_follows_vehicle(uuid, text)
  from public, anon, authenticated;

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
    and not public.alpha_profiles_block_each_other(auth.uid(), shared.user_id)
    and exists (
      select 1
      from public.test_memberships membership
      where membership.user_id = shared.user_id
        and membership.status = 'active'
    )
  order by shared.published_at desc
  limit 100;
$$;

create or replace function public.get_my_public_profile_identity()
returns table (
  public_profile_id uuid,
  display_name text,
  public_username text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.public_profile_id,
    profile.display_name,
    profile.public_username
  from public.app_user_profiles profile
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and profile.user_id = auth.uid();
$$;

create or replace function public.update_my_public_profile_identity(
  p_display_name text,
  p_public_username text
)
returns table (
  public_profile_id uuid,
  display_name text,
  public_username text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_display_name text := trim(coalesce(p_display_name, ''));
  normalized_public_username text := lower(
    regexp_replace(trim(coalesce(p_public_username, '')), '^@+', '')
  );
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;
  if char_length(normalized_display_name) not between 1 and 80 then
    raise exception 'invalid_display_name';
  end if;
  if normalized_public_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'invalid_public_username';
  end if;

  update public.app_user_profiles profile
  set
    display_name = normalized_display_name,
    public_username = normalized_public_username,
    updated_at = now()
  where profile.user_id = auth.uid();

  update public.alpha_private_workspaces workspace
  set
    payload = jsonb_set(
      workspace.payload,
      '{profiles}',
      coalesce(
        (
          select jsonb_agg(
            case
              when item->>'id' = auth.uid()::text then
                item || jsonb_build_object(
                  'displayName', normalized_display_name,
                  'publicUsername', normalized_public_username
                )
              else item
            end
          )
          from jsonb_array_elements(
            case
              when jsonb_typeof(workspace.payload->'profiles') = 'array'
                then workspace.payload->'profiles'
              else '[]'::jsonb
            end
          ) item
        ),
        '[]'::jsonb
      ),
      true
    ),
    updated_at = now()
  where workspace.user_id = auth.uid();

  update public.alpha_shared_journals shared
  set
    author_display_name = normalized_display_name,
    updated_at = now()
  where shared.user_id = auth.uid();

  return query
  select
    profile.public_profile_id,
    profile.display_name,
    profile.public_username
  from public.app_user_profiles profile
  where profile.user_id = auth.uid();
exception
  when unique_violation then
    raise exception 'public_username_taken';
end;
$$;

create or replace function public.list_my_alpha_user_follows()
returns table (
  target_public_profile_id uuid,
  followed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select target_profile.public_profile_id, follow.created_at
  from public.alpha_user_follows follow
  join public.app_user_profiles target_profile
    on target_profile.user_id = follow.target_user_id
  join public.test_memberships target_membership
    on target_membership.user_id = follow.target_user_id
    and target_membership.status = 'active'
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and follow.follower_user_id = auth.uid()
    and not public.alpha_profiles_block_each_other(
      follow.follower_user_id,
      follow.target_user_id
    )
  order by follow.created_at, target_profile.public_profile_id;
$$;

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
  target_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;

  select profile.user_id
  into target_user_id
  from public.app_user_profiles profile
  join public.test_memberships membership
    on membership.user_id = profile.user_id
    and membership.status = 'active'
  where profile.public_profile_id = p_target_public_profile_id;

  if target_user_id is null then
    raise exception 'profile_not_found';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'cannot_follow_self';
  end if;

  if coalesce(p_follow, false) then
    if public.alpha_profiles_block_each_other(auth.uid(), target_user_id) then
      raise exception 'profile_unavailable';
    end if;
    insert into public.alpha_user_follows (
      follower_user_id,
      target_user_id
    ) values (
      auth.uid(),
      target_user_id
    )
    on conflict (follower_user_id, target_user_id) do nothing;
    return true;
  end if;

  delete from public.alpha_user_follows follow
  where follow.follower_user_id = auth.uid()
    and follow.target_user_id = target_user_id;
  return false;
end;
$$;

insert into public.alpha_user_follows (
  follower_user_id,
  target_user_id,
  source_invitation_id,
  created_at
)
select
  membership.user_id,
  invitation.created_by_user_id,
  invitation.id,
  membership.joined_at
from public.test_memberships membership
join public.test_invitations invitation
  on invitation.id = membership.invitation_id
join public.app_user_profiles invitee_profile
  on invitee_profile.user_id = membership.user_id
join public.app_user_profiles inviter_profile
  on inviter_profile.user_id = invitation.created_by_user_id
where membership.status = 'active'
  and membership.user_id <> invitation.created_by_user_id
  and not public.alpha_profiles_block_each_other(
    membership.user_id,
    invitation.created_by_user_id
  )
on conflict (follower_user_id, target_user_id) do nothing;

insert into public.alpha_user_follows (
  follower_user_id,
  target_user_id,
  source_invitation_id,
  created_at
)
select
  invitation.created_by_user_id,
  membership.user_id,
  invitation.id,
  membership.joined_at
from public.test_memberships membership
join public.test_invitations invitation
  on invitation.id = membership.invitation_id
join public.app_user_profiles invitee_profile
  on invitee_profile.user_id = membership.user_id
join public.app_user_profiles inviter_profile
  on inviter_profile.user_id = invitation.created_by_user_id
where membership.status = 'active'
  and membership.user_id <> invitation.created_by_user_id
  and not public.alpha_profiles_block_each_other(
    membership.user_id,
    invitation.created_by_user_id
  )
on conflict (follower_user_id, target_user_id) do nothing;

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
  if invitation.created_by_user_id = auth.uid() then return 'invalid_invitation'; end if;

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

  insert into public.alpha_user_follows (
    follower_user_id,
    target_user_id,
    source_invitation_id
  ) values (
    auth.uid(),
    invitation.created_by_user_id,
    invitation.id
  )
  on conflict (follower_user_id, target_user_id) do nothing;

  insert into public.alpha_user_follows (
    follower_user_id,
    target_user_id,
    source_invitation_id
  ) values (
    invitation.created_by_user_id,
    auth.uid(),
    invitation.id
  )
  on conflict (follower_user_id, target_user_id) do nothing;

  return 'redeemed';
end;
$$;

drop function if exists public.search_alpha_public_owners(text);
create function public.search_alpha_public_owners(p_query text)
returns table (
  public_profile_id uuid,
  display_name text,
  public_username text,
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
    profile.public_username,
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
    and not public.alpha_profiles_block_each_other(auth.uid(), profile.user_id)
    and (
      position(
        lower(regexp_replace(trim(p_query), '^@+', ''))
        in lower(profile.display_name)
      ) > 0
      or position(
        lower(regexp_replace(trim(p_query), '^@+', ''))
        in coalesce(profile.public_username, '')
      ) > 0
    )
  group by
    profile.public_profile_id,
    profile.display_name,
    profile.public_username
  order by lower(profile.display_name), profile.public_profile_id
  limit 20;
$$;

drop function if exists public.get_alpha_public_owner(uuid);
create function public.get_alpha_public_owner(p_public_profile_id uuid)
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
    and not public.alpha_profiles_block_each_other(auth.uid(), profile.user_id)
  order by share.published_at desc, share.slug;
$$;

create or replace function public.suggest_alpha_public_owners(
  p_limit integer default 10
)
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
volatile
security definer
set search_path = ''
as $$
  with candidates as (
    select
      profile.user_id,
      profile.public_profile_id,
      profile.display_name,
      profile.public_username
    from public.app_user_profiles profile
    join public.test_memberships membership
      on membership.user_id = profile.user_id
      and membership.status = 'active'
    where auth.uid() is not null
      and public.is_active_test_member(auth.uid())
      and profile.user_id <> auth.uid()
      and not public.alpha_profiles_block_each_other(auth.uid(), profile.user_id)
      and not exists (
        select 1
        from public.alpha_user_follows follow
        where follow.follower_user_id = auth.uid()
          and follow.target_user_id = profile.user_id
      )
      and exists (
        select 1
        from public.alpha_public_vehicle_shares share
        where share.user_id = profile.user_id
          and share.is_active
          and not public.alpha_workspace_follows_vehicle(
            auth.uid(),
            share.slug
          )
      )
    order by random()
    limit least(greatest(coalesce(p_limit, 10), 1), 10)
  )
  select
    candidate.public_profile_id,
    candidate.display_name,
    candidate.public_username,
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
  from candidates candidate
  join public.alpha_public_vehicle_shares share
    on share.user_id = candidate.user_id
    and share.is_active
  order by lower(candidate.display_name), share.published_at desc;
$$;

revoke all on function public.get_my_public_profile_identity()
  from public, anon, authenticated;
revoke all on function public.list_alpha_shared_journals()
  from public, anon, authenticated;
revoke all on function public.update_my_public_profile_identity(text, text)
  from public, anon, authenticated;
revoke all on function public.list_my_alpha_user_follows()
  from public, anon, authenticated;
revoke all on function public.set_alpha_user_follow(uuid, boolean)
  from public, anon, authenticated;
revoke all on function public.redeem_test_invitation(text)
  from public, anon, authenticated;
revoke all on function public.search_alpha_public_owners(text)
  from public, anon, authenticated;
revoke all on function public.get_alpha_public_owner(uuid)
  from public, anon, authenticated;
revoke all on function public.suggest_alpha_public_owners(integer)
  from public, anon, authenticated;

grant execute on function public.get_my_public_profile_identity()
  to authenticated;
grant execute on function public.list_alpha_shared_journals()
  to authenticated;
grant execute on function public.update_my_public_profile_identity(text, text)
  to authenticated;
grant execute on function public.list_my_alpha_user_follows()
  to authenticated;
grant execute on function public.set_alpha_user_follow(uuid, boolean)
  to authenticated;
grant execute on function public.redeem_test_invitation(text)
  to authenticated;
grant execute on function public.search_alpha_public_owners(text)
  to authenticated;
grant execute on function public.get_alpha_public_owner(uuid)
  to authenticated;
grant execute on function public.suggest_alpha_public_owners(integer)
  to authenticated;

comment on column public.app_user_profiles.public_username is
  'Case-normalized public identifier. Authentication and relations continue to use immutable UUIDs.';
comment on table public.alpha_user_follows is
  'User-level follows, separate from vehicle follows stored in the alpha workspace.';
comment on function public.suggest_alpha_public_owners(integer) is
  'Returns up to ten random, discoverable, not-yet-followed alpha owners and their public vehicles.';

commit;
