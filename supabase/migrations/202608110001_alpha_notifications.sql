begin;

create table public.alpha_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (
    notification_type in ('journal_like', 'profile_follow', 'journal_published')
  ),
  actor_user_id uuid references auth.users(id) on delete set null,
  shared_journal_id uuid references public.alpha_shared_journals(share_id) on delete set null,
  source_key text not null check (char_length(source_key) between 1 and 320),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (recipient_user_id, source_key),
  check (actor_user_id is null or actor_user_id <> recipient_user_id)
);

create index alpha_notifications_recipient_created_idx
  on public.alpha_notifications (recipient_user_id, created_at desc, id desc);

create index alpha_notifications_recipient_unread_idx
  on public.alpha_notifications (recipient_user_id, created_at desc, id desc)
  where read_at is null;

alter table public.alpha_notifications enable row level security;

create policy "recipients can read own alpha notifications"
  on public.alpha_notifications for select to authenticated
  using ((select auth.uid()) = recipient_user_id);

create policy "recipients can update own alpha notifications"
  on public.alpha_notifications for update to authenticated
  using ((select auth.uid()) = recipient_user_id)
  with check ((select auth.uid()) = recipient_user_id);

revoke all on public.alpha_notifications from public, anon, authenticated;

create or replace function public.create_alpha_notification(
  p_recipient_user_id uuid,
  p_notification_type text,
  p_actor_user_id uuid,
  p_shared_journal_id uuid,
  p_source_key text,
  p_created_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient_user_id is null
    or p_notification_type not in ('journal_like', 'profile_follow', 'journal_published')
    or p_source_key is null
    or char_length(p_source_key) not between 1 and 320
    or p_recipient_user_id = p_actor_user_id
    or not public.is_active_test_member(p_recipient_user_id)
    or (
      p_actor_user_id is not null
      and (
        not public.is_active_test_member(p_actor_user_id)
        or public.alpha_profiles_block_each_other(p_recipient_user_id, p_actor_user_id)
      )
    ) then
    return;
  end if;

  insert into public.alpha_notifications (
    recipient_user_id,
    notification_type,
    actor_user_id,
    shared_journal_id,
    source_key,
    created_at
  ) values (
    p_recipient_user_id,
    p_notification_type,
    p_actor_user_id,
    p_shared_journal_id,
    p_source_key,
    coalesce(p_created_at, now())
  )
  on conflict (recipient_user_id, source_key) do nothing;
end;
$$;

revoke all on function public.create_alpha_notification(uuid, text, uuid, uuid, text, timestamptz)
  from public, anon, authenticated;

create or replace function public.notify_alpha_journal_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  journal_owner_id uuid;
begin
  select shared.user_id
  into journal_owner_id
  from public.alpha_shared_journals shared
  where shared.share_id = new.shared_journal_id
    and shared.moderation_state = 'visible';

  perform public.create_alpha_notification(
    journal_owner_id,
    'journal_like',
    new.user_id,
    new.shared_journal_id,
    'journal_like:' || new.shared_journal_id::text || ':' || new.user_id::text,
    new.created_at
  );
  return new;
end;
$$;

revoke all on function public.notify_alpha_journal_like()
  from public, anon, authenticated;

create trigger notify_alpha_journal_like_after_insert
after insert on public.alpha_journal_likes
for each row execute function public.notify_alpha_journal_like();

create or replace function public.notify_alpha_profile_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.create_alpha_notification(
    new.target_user_id,
    'profile_follow',
    new.follower_user_id,
    null,
    'profile_follow:' || new.follower_user_id::text,
    new.created_at
  );
  return new;
end;
$$;

revoke all on function public.notify_alpha_profile_follow()
  from public, anon, authenticated;

create trigger notify_alpha_profile_follow_after_insert
after insert on public.alpha_user_follows
for each row execute function public.notify_alpha_profile_follow();

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
    join public.alpha_public_vehicle_shares share
      on share.id = new.vehicle_share_id
      and share.is_active
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(workspace.payload->'follows') = 'array'
          then workspace.payload->'follows'
        else '[]'::jsonb
      end
    ) follow
    where follow->>'followerProfileId' = workspace.user_id::text
      and follow->>'targetType' = 'vehicle'
      and follow->>'targetId' = share.slug
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

revoke all on function public.notify_alpha_journal_published()
  from public, anon, authenticated;

create trigger notify_alpha_journal_published_after_insert
after insert on public.alpha_shared_journals
for each row execute function public.notify_alpha_journal_published();

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
    case when shared.share_id is not null and vehicle.is_active
      then trim(vehicle.make || ' ' || vehicle.model) else null end,
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
  where notification.recipient_user_id = auth.uid()
    and (
      p_before_created_at is null
      or (notification.created_at, notification.id) < (p_before_created_at, p_before_id)
    )
  order by notification.created_at desc, notification.id desc
  limit bounded_limit;
end;
$$;

create or replace function public.count_my_unread_alpha_notifications()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint
  from public.alpha_notifications notification
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and notification.recipient_user_id = auth.uid()
    and notification.read_at is null;
$$;

create or replace function public.mark_alpha_notification_read(
  p_notification_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null or not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;

  update public.alpha_notifications notification
  set read_at = coalesce(notification.read_at, now())
  where notification.id = p_notification_id
    and notification.recipient_user_id = auth.uid();

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.mark_all_alpha_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null or not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;

  update public.alpha_notifications notification
  set read_at = now()
  where notification.recipient_user_id = auth.uid()
    and notification.read_at is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.list_my_alpha_notifications(timestamptz, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.count_my_unread_alpha_notifications()
  from public, anon, authenticated;
revoke all on function public.mark_alpha_notification_read(uuid)
  from public, anon, authenticated;
revoke all on function public.mark_all_alpha_notifications_read()
  from public, anon, authenticated;

grant execute on function public.list_my_alpha_notifications(timestamptz, uuid, integer)
  to authenticated;
grant execute on function public.count_my_unread_alpha_notifications()
  to authenticated;
grant execute on function public.mark_alpha_notification_read(uuid)
  to authenticated;
grant execute on function public.mark_all_alpha_notifications_read()
  to authenticated;

comment on table public.alpha_notifications is
  'Private alpha notification source shared by the Web center and future Native push delivery. Clients cannot insert rows.';

commit;
