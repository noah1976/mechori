begin;

alter table public.app_user_profiles
  add column bio text not null default '',
  add column content_policy_version text,
  add column content_policy_accepted_at timestamptz;

alter table public.app_user_profiles
  add constraint app_user_profiles_bio_check
  check (char_length(bio) <= 300);

alter table public.app_user_roles
  drop constraint if exists app_user_roles_role_code_check;

alter table public.app_user_roles
  add constraint app_user_roles_role_code_check
  check (role_code in ('owner', 'alpha_admin', 'admin', 'moderator', 'support'));

create table public.alpha_journal_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  shared_journal_id uuid not null
    references public.alpha_shared_journals(share_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shared_journal_id)
);

create index alpha_journal_likes_journal_idx
  on public.alpha_journal_likes (shared_journal_id, created_at);

create table public.alpha_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('liked', 'confusing', 'broken', 'missing', 'other')),
  content text not null check (char_length(content) between 1 and 4000),
  page_path text not null default '' check (char_length(page_path) <= 500),
  app_build text not null default '' check (char_length(app_build) <= 120),
  user_agent text not null default '' check (char_length(user_agent) <= 500),
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'planned', 'resolved', 'closed')),
  admin_note text not null default '' check (char_length(admin_note) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index alpha_feedback_status_idx
  on public.alpha_feedback (status, created_at desc);
create index alpha_feedback_user_rate_idx
  on public.alpha_feedback (user_id, created_at desc);

create table public.app_user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('free', 'owner_plus')),
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  source text not null
    check (source in ('billing', 'admin_grant', 'founding_tester', 'free_trial', 'campaign', 'migration')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  granted_by_user_id uuid references auth.users(id) on delete set null,
  reason text not null default '' check (char_length(reason) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create unique index app_user_entitlements_one_active_plan_idx
  on public.app_user_entitlements (user_id)
  where status = 'active';
create index app_user_entitlements_user_idx
  on public.app_user_entitlements (user_id, created_at desc);

create table public.app_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(action) between 1 and 120),
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id text not null check (char_length(target_id) between 1 and 200),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

create index app_admin_audit_logs_created_idx
  on public.app_admin_audit_logs (created_at desc);

alter table public.alpha_journal_likes enable row level security;
alter table public.alpha_feedback enable row level security;
alter table public.app_user_entitlements enable row level security;
alter table public.app_admin_audit_logs enable row level security;

revoke all on public.alpha_journal_likes from public, anon, authenticated;
revoke all on public.alpha_feedback from public, anon, authenticated;
revoke all on public.app_user_entitlements from public, anon, authenticated;
revoke all on public.app_admin_audit_logs from public, anon, authenticated;
revoke update on public.app_user_profiles from authenticated;

create or replace function public.is_alpha_staff(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_user_roles role
    where role.user_id = p_user_id
      and role.role_code in ('owner', 'alpha_admin', 'admin', 'moderator', 'support')
  );
$$;

create or replace function public.is_alpha_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_user_roles role
    where role.user_id = p_user_id
      and role.role_code in ('owner', 'alpha_admin', 'admin')
  );
$$;

create or replace function public.get_my_alpha_profile()
returns table (
  public_profile_id uuid,
  display_name text,
  public_username text,
  bio text,
  content_policy_version text,
  content_policy_accepted_at timestamptz
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
    profile.bio,
    profile.content_policy_version,
    profile.content_policy_accepted_at
  from public.app_user_profiles profile
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and profile.user_id = auth.uid();
$$;

create or replace function public.update_my_alpha_profile(
  p_display_name text,
  p_public_username text,
  p_bio text
)
returns table (
  public_profile_id uuid,
  display_name text,
  public_username text,
  bio text,
  content_policy_version text,
  content_policy_accepted_at timestamptz
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
  normalized_bio text := trim(coalesce(p_bio, ''));
  contact_scan_bio text;
  bio_digits text;
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
  if char_length(normalized_bio) > 300 or normalized_bio ~ '<[^>]+>' then
    raise exception 'invalid_profile_bio';
  end if;
  contact_scan_bio := translate(
    normalized_bio,
    '０１２３４５６７８９＠．＋－（）　',
    '0123456789@.+-() '
  );
  if contact_scan_bio ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' then
    raise exception 'profile_bio_contact_information';
  end if;
  bio_digits := regexp_replace(
    coalesce(substring(contact_scan_bio from '(\+?[0-9][0-9 ()-]{7,}[0-9])'), ''),
    '[^0-9]',
    '',
    'g'
  );
  if contact_scan_bio ~ '(\+?[0-9][0-9 ()-]{7,}[0-9])'
    and char_length(bio_digits) between 9 and 15 then
    raise exception 'profile_bio_contact_information';
  end if;

  update public.app_user_profiles profile
  set
    display_name = normalized_display_name,
    public_username = normalized_public_username,
    bio = normalized_bio,
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
                  'publicUsername', normalized_public_username,
                  'bio', normalized_bio
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
  set author_display_name = normalized_display_name, updated_at = now()
  where shared.user_id = auth.uid();

  return query select * from public.get_my_alpha_profile();
exception
  when unique_violation then
    raise exception 'public_username_taken';
end;
$$;

create or replace function public.accept_alpha_content_policy(p_version text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_at timestamptz := now();
  normalized_version text := trim(coalesce(p_version, ''));
begin
  if auth.uid() is null or not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;
  if normalized_version <> 'alpha-public-content-v1' then
    raise exception 'unsupported_policy_version';
  end if;
  update public.app_user_profiles profile
  set content_policy_version = normalized_version,
      content_policy_accepted_at = accepted_at,
      updated_at = accepted_at
  where profile.user_id = auth.uid();
  return accepted_at;
end;
$$;

create or replace function public.get_alpha_public_profile(p_public_profile_id uuid)
returns table (
  public_profile_id uuid,
  display_name text,
  public_username text,
  bio text
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
    profile.bio
  from public.app_user_profiles profile
  join public.test_memberships membership
    on membership.user_id = profile.user_id and membership.status = 'active'
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and profile.public_profile_id = p_public_profile_id
    and profile.user_id <> auth.uid()
    and not public.alpha_profiles_block_each_other(auth.uid(), profile.user_id);
$$;

create or replace function public.list_alpha_journal_reactions()
returns table (
  share_id uuid,
  journal_id text,
  appreciation_count bigint,
  liked_by_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    shared.share_id,
    shared.journal_id,
    count(like_row.user_id) as appreciation_count,
    bool_or(like_row.user_id = auth.uid()) as liked_by_me
  from public.alpha_shared_journals shared
  left join public.alpha_journal_likes like_row
    on like_row.shared_journal_id = shared.share_id
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and shared.moderation_state = 'visible'
    and not public.alpha_profiles_block_each_other(auth.uid(), shared.user_id)
    and exists (
      select 1 from public.test_memberships membership
      where membership.user_id = shared.user_id and membership.status = 'active'
    )
  group by shared.share_id, shared.journal_id
  order by shared.published_at desc;
$$;

create or replace function public.set_alpha_journal_like(
  p_share_id uuid,
  p_liked boolean
)
returns table (appreciation_count bigint, liked_by_me boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  journal_owner uuid;
begin
  if auth.uid() is null or not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;
  select shared.user_id into journal_owner
  from public.alpha_shared_journals shared
  join public.test_memberships membership
    on membership.user_id = shared.user_id and membership.status = 'active'
  where shared.share_id = p_share_id
    and shared.moderation_state = 'visible'
    and not public.alpha_profiles_block_each_other(auth.uid(), shared.user_id);
  if journal_owner is null then raise exception 'journal_not_available'; end if;
  if journal_owner = auth.uid() then raise exception 'cannot_like_own_journal'; end if;

  if p_liked then
    insert into public.alpha_journal_likes (user_id, shared_journal_id)
    values (auth.uid(), p_share_id)
    on conflict do nothing;
  else
    delete from public.alpha_journal_likes
    where user_id = auth.uid() and shared_journal_id = p_share_id;
  end if;

  return query
  select count(*)::bigint, exists (
    select 1 from public.alpha_journal_likes mine
    where mine.shared_journal_id = p_share_id and mine.user_id = auth.uid()
  )
  from public.alpha_journal_likes all_likes
  where all_likes.shared_journal_id = p_share_id;
end;
$$;

create or replace function public.submit_alpha_feedback(
  p_kind text,
  p_content text,
  p_page_path text,
  p_app_build text,
  p_user_agent text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  feedback_id uuid;
  normalized_content text := trim(coalesce(p_content, ''));
begin
  if auth.uid() is null or not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;
  if p_kind not in ('liked', 'confusing', 'broken', 'missing', 'other') then
    raise exception 'invalid_feedback_kind';
  end if;
  if char_length(normalized_content) not between 1 and 4000 then
    raise exception 'invalid_feedback_content';
  end if;
  if (
    select count(*) from public.alpha_feedback feedback
    where feedback.user_id = auth.uid()
      and feedback.created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'feedback_rate_limited';
  end if;

  insert into public.alpha_feedback (
    user_id, kind, content, page_path, app_build, user_agent
  ) values (
    auth.uid(), p_kind, normalized_content,
    left(coalesce(p_page_path, ''), 500),
    left(coalesce(p_app_build, ''), 120),
    left(coalesce(p_user_agent, ''), 500)
  ) returning id into feedback_id;
  return feedback_id;
end;
$$;

create or replace function public.get_my_active_entitlement()
returns table (plan_code text, source text, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select entitlement.plan_code, entitlement.source, entitlement.starts_at, entitlement.ends_at
  from public.app_user_entitlements entitlement
  where auth.uid() is not null
    and entitlement.user_id = auth.uid()
    and entitlement.status = 'active'
    and entitlement.starts_at <= now()
    and (entitlement.ends_at is null or entitlement.ends_at > now())
  order by case entitlement.plan_code when 'owner_plus' then 1 else 2 end
  limit 1;
$$;

create or replace function public.admin_alpha_dashboard()
returns table (
  active_users bigint,
  registered_vehicles bigint,
  journal_posts bigint,
  new_feedback bigint,
  active_owner_plus bigint,
  shared_journals bigint,
  is_admin boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.test_memberships where status = 'active'),
    (
      select coalesce(sum(jsonb_array_length(
        case when jsonb_typeof(workspace.payload->'vehicles') = 'array'
          then workspace.payload->'vehicles' else '[]'::jsonb end
      )), 0)::bigint
      from public.alpha_private_workspaces workspace
      join public.test_memberships membership
        on membership.user_id = workspace.user_id and membership.status = 'active'
    ),
    (
      select coalesce(sum(jsonb_array_length(
        case when jsonb_typeof(workspace.payload->'journals') = 'array'
          then workspace.payload->'journals' else '[]'::jsonb end
      )), 0)::bigint
      from public.alpha_private_workspaces workspace
      join public.test_memberships membership
        on membership.user_id = workspace.user_id and membership.status = 'active'
    ),
    (select count(*) from public.alpha_feedback where status = 'new'),
    (select count(*) from public.app_user_entitlements
      where status = 'active' and plan_code = 'owner_plus'
        and starts_at <= now() and (ends_at is null or ends_at > now())),
    (select count(*) from public.alpha_shared_journals where moderation_state = 'visible'),
    public.is_alpha_admin(auth.uid())
  where auth.uid() is not null and public.is_alpha_staff(auth.uid());
$$;

create or replace function public.admin_list_alpha_feedback()
returns table (
  id uuid,
  public_profile_id uuid,
  display_name text,
  kind text,
  content text,
  page_path text,
  app_build text,
  status text,
  admin_note text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select feedback.id, profile.public_profile_id, profile.display_name,
    feedback.kind, feedback.content, feedback.page_path, feedback.app_build,
    feedback.status, feedback.admin_note, feedback.created_at, feedback.updated_at
  from public.alpha_feedback feedback
  join public.app_user_profiles profile on profile.user_id = feedback.user_id
  where auth.uid() is not null and public.is_alpha_staff(auth.uid())
  order by feedback.created_at desc
  limit 300;
$$;

create or replace function public.admin_update_alpha_feedback(
  p_feedback_id uuid,
  p_status text,
  p_admin_note text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_alpha_staff(auth.uid()) then
    raise exception 'staff_required';
  end if;
  if p_status not in ('new', 'reviewing', 'planned', 'resolved', 'closed') then
    raise exception 'invalid_feedback_status';
  end if;
  update public.alpha_feedback feedback
  set status = p_status,
      admin_note = left(trim(coalesce(p_admin_note, '')), 4000),
      updated_at = now()
  where feedback.id = p_feedback_id;
  if not found then return false; end if;
  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'feedback_updated', 'feedback', p_feedback_id::text,
    jsonb_build_object('status', p_status)
  );
  return true;
end;
$$;

create or replace function public.admin_list_alpha_users()
returns table (
  user_id uuid,
  public_profile_id uuid,
  display_name text,
  public_username text,
  membership_status text,
  phase text,
  plan_code text,
  active_entitlement_id uuid,
  entitlement_source text,
  entitlement_starts_at timestamptz,
  entitlement_ends_at timestamptz,
  staff_roles text[],
  registered_vehicles bigint,
  journal_posts bigint,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select membership.user_id, profile.public_profile_id, profile.display_name,
    profile.public_username, membership.status, membership.phase,
    coalesce(entitlement.plan_code, 'free'),
    entitlement.id,
    entitlement.source,
    entitlement.starts_at,
    entitlement.ends_at,
    coalesce((
      select array_agg(role.role_code order by role.role_code)
      from public.app_user_roles role
      where role.user_id = membership.user_id
        and role.role_code in ('admin', 'moderator', 'support')
    ), '{}'::text[]),
    coalesce(jsonb_array_length(
      case when jsonb_typeof(workspace.payload->'vehicles') = 'array'
        then workspace.payload->'vehicles' else '[]'::jsonb end
    ), 0)::bigint,
    coalesce(jsonb_array_length(
      case when jsonb_typeof(workspace.payload->'journals') = 'array'
        then workspace.payload->'journals' else '[]'::jsonb end
    ), 0)::bigint,
    membership.joined_at
  from public.test_memberships membership
  join public.app_user_profiles profile on profile.user_id = membership.user_id
  left join lateral (
    select item.id, item.plan_code, item.source, item.starts_at, item.ends_at
    from public.app_user_entitlements item
    where item.user_id = membership.user_id and item.status = 'active'
      and item.starts_at <= now() and (item.ends_at is null or item.ends_at > now())
    order by case item.plan_code when 'owner_plus' then 1 else 2 end
    limit 1
  ) entitlement on true
  left join public.alpha_private_workspaces workspace
    on workspace.user_id = membership.user_id
  where auth.uid() is not null and public.is_alpha_staff(auth.uid())
  order by membership.joined_at desc;
$$;

create or replace function public.admin_grant_alpha_entitlement(
  p_user_id uuid,
  p_plan_code text,
  p_source text,
  p_ends_at timestamptz,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  entitlement_id uuid;
begin
  if auth.uid() is null or not public.is_alpha_admin(auth.uid()) then
    raise exception 'admin_required';
  end if;
  if p_plan_code not in ('free', 'owner_plus') then raise exception 'invalid_plan_code'; end if;
  if p_source not in ('billing', 'admin_grant', 'founding_tester', 'free_trial', 'campaign', 'migration') then
    raise exception 'invalid_entitlement_source';
  end if;
  if p_ends_at is not null and p_ends_at <= now() then raise exception 'invalid_entitlement_end'; end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 1 and 1000 then
    raise exception 'invalid_entitlement_reason';
  end if;

  update public.app_user_entitlements entitlement
  set status = 'revoked', updated_at = now()
  where entitlement.user_id = p_user_id
    and entitlement.status = 'active';

  insert into public.app_user_entitlements (
    user_id, plan_code, source, ends_at, granted_by_user_id, reason
  ) values (
    p_user_id, p_plan_code, p_source, p_ends_at, auth.uid(), trim(p_reason)
  ) returning id into entitlement_id;

  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'entitlement_granted', 'user', p_user_id::text,
    jsonb_build_object('planCode', p_plan_code, 'source', p_source, 'entitlementId', entitlement_id)
  );
  return entitlement_id;
end;
$$;

create or replace function public.admin_revoke_alpha_entitlement(
  p_entitlement_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_alpha_admin(auth.uid()) then
    raise exception 'admin_required';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 1 and 1000 then
    raise exception 'invalid_entitlement_reason';
  end if;
  update public.app_user_entitlements entitlement
  set status = 'revoked', updated_at = now()
  where entitlement.id = p_entitlement_id and entitlement.status = 'active';
  if not found then return false; end if;
  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'entitlement_revoked', 'entitlement', p_entitlement_id::text,
    jsonb_build_object('reason', trim(p_reason))
  );
  return true;
end;
$$;

create or replace function public.admin_set_alpha_staff_role(
  p_user_id uuid,
  p_role_code text,
  p_enabled boolean,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_alpha_admin(auth.uid()) then
    raise exception 'admin_required';
  end if;
  if p_role_code not in ('admin', 'moderator', 'support') then
    raise exception 'invalid_assignable_role';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 1 and 1000 then
    raise exception 'invalid_role_change_reason';
  end if;
  if p_enabled then
    insert into public.app_user_roles (user_id, role_code)
    values (p_user_id, p_role_code) on conflict do nothing;
  else
    delete from public.app_user_roles
    where user_id = p_user_id and role_code = p_role_code;
  end if;
  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'staff_role_changed', 'user', p_user_id::text,
    jsonb_build_object('roleCode', p_role_code, 'enabled', p_enabled, 'reason', trim(p_reason))
  );
  return true;
end;
$$;

revoke all on function public.is_alpha_staff(uuid) from public, anon, authenticated;
revoke all on function public.is_alpha_admin(uuid) from public, anon, authenticated;
revoke all on function public.get_my_alpha_profile() from public, anon, authenticated;
revoke all on function public.update_my_alpha_profile(text, text, text) from public, anon, authenticated;
revoke all on function public.accept_alpha_content_policy(text) from public, anon, authenticated;
revoke all on function public.get_alpha_public_profile(uuid) from public, anon, authenticated;
revoke all on function public.list_alpha_journal_reactions() from public, anon, authenticated;
revoke all on function public.set_alpha_journal_like(uuid, boolean) from public, anon, authenticated;
revoke all on function public.submit_alpha_feedback(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.get_my_active_entitlement() from public, anon, authenticated;
revoke all on function public.admin_alpha_dashboard() from public, anon, authenticated;
revoke all on function public.admin_list_alpha_feedback() from public, anon, authenticated;
revoke all on function public.admin_update_alpha_feedback(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_list_alpha_users() from public, anon, authenticated;
revoke all on function public.admin_grant_alpha_entitlement(uuid, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.admin_revoke_alpha_entitlement(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_set_alpha_staff_role(uuid, text, boolean, text) from public, anon, authenticated;

grant execute on function public.get_my_alpha_profile() to authenticated;
grant execute on function public.update_my_alpha_profile(text, text, text) to authenticated;
grant execute on function public.accept_alpha_content_policy(text) to authenticated;
grant execute on function public.get_alpha_public_profile(uuid) to authenticated;
grant execute on function public.list_alpha_journal_reactions() to authenticated;
grant execute on function public.set_alpha_journal_like(uuid, boolean) to authenticated;
grant execute on function public.submit_alpha_feedback(text, text, text, text, text) to authenticated;
grant execute on function public.get_my_active_entitlement() to authenticated;
grant execute on function public.admin_alpha_dashboard() to authenticated;
grant execute on function public.admin_list_alpha_feedback() to authenticated;
grant execute on function public.admin_update_alpha_feedback(uuid, text, text) to authenticated;
grant execute on function public.admin_list_alpha_users() to authenticated;
grant execute on function public.admin_grant_alpha_entitlement(uuid, text, text, timestamptz, text) to authenticated;
grant execute on function public.admin_revoke_alpha_entitlement(uuid, text) to authenticated;
grant execute on function public.admin_set_alpha_staff_role(uuid, text, boolean, text) to authenticated;

comment on table public.alpha_journal_likes is
  'Alpha appreciation reactions. Popularity is not a trust or technical-accuracy signal.';
comment on table public.alpha_feedback is
  'Private in-app alpha feedback, visible only through staff-checked RPCs.';
comment on table public.app_user_entitlements is
  'Time-bounded or indefinite access grants. This table does not implement payments.';
comment on table public.app_admin_audit_logs is
  'Append-only audit trail for privileged alpha operations.';

commit;
