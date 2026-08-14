begin;

create table public.alpha_shared_journals (
  share_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_id text not null check (char_length(journal_id) between 1 and 160),
  author_display_name text not null check (char_length(author_display_name) between 1 and 80),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload->>'schemaVersion' = '1'
    and jsonb_typeof(payload->'media') is not distinct from 'array'
    and payload->'media' is not distinct from '[]'::jsonb
    and jsonb_typeof(payload->'contentBlocks') is not distinct from 'array'
    and not (
      payload ?| array[
        'vehicleId',
        'vehicleTargetId',
        'linkedRecordId',
        'displayFields',
        'knowledgeExtractionConsent',
        'storageKey'
      ]
    )
    and octet_length(payload::text) <= 65536
  ),
  moderation_state text not null default 'visible'
    check (moderation_state in ('visible', 'temporarily_hidden')),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, journal_id)
);

create index alpha_shared_journals_feed_idx
  on public.alpha_shared_journals (published_at desc)
  where moderation_state = 'visible';

alter table public.alpha_shared_journals enable row level security;

create policy "active testers can read visible shared journals"
  on public.alpha_shared_journals for select to authenticated
  using (
    moderation_state = 'visible'
    and exists (
      select 1
      from public.test_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  );

revoke all on public.alpha_shared_journals from public, anon, authenticated;
grant select (
  share_id,
  journal_id,
  author_display_name,
  payload,
  published_at,
  updated_at
) on public.alpha_shared_journals to authenticated;

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
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not exists (
    select 1
    from public.test_memberships membership
    where membership.user_id = auth.uid()
      and membership.status = 'active'
  ) then
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
    or jsonb_typeof(p_payload->'media') is distinct from 'array'
    or p_payload->'media' is distinct from '[]'::jsonb
    or jsonb_typeof(p_payload->'contentBlocks') is distinct from 'array'
    or p_payload ?| array[
      'vehicleId',
      'vehicleTargetId',
      'linkedRecordId',
      'displayFields',
      'knowledgeExtractionConsent',
      'storageKey'
    ]
    or octet_length(p_payload::text) > 65536 then
    raise exception 'invalid_shared_payload';
  end if;

  insert into public.alpha_shared_journals (
    user_id,
    journal_id,
    author_display_name,
    payload,
    published_at,
    updated_at
  ) values (
    auth.uid(),
    trim(p_journal_id),
    trim(p_author_display_name),
    p_payload,
    coalesce(p_published_at, now()),
    now()
  )
  on conflict (user_id, journal_id)
  do update set
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

create or replace function public.withdraw_alpha_shared_journal(p_journal_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  delete from public.alpha_shared_journals shared
  where shared.user_id = auth.uid()
    and shared.journal_id = p_journal_id;

  get diagnostics removed_count = row_count;
  return removed_count > 0;
end;
$$;

revoke all on function public.publish_alpha_shared_journal(text, text, jsonb, timestamptz)
  from public, anon, authenticated;
revoke all on function public.withdraw_alpha_shared_journal(text)
  from public, anon, authenticated;

grant execute on function public.publish_alpha_shared_journal(text, text, jsonb, timestamptz)
  to authenticated;
grant execute on function public.withdraw_alpha_shared_journal(text)
  to authenticated;

comment on table public.alpha_shared_journals is
  'P0-only privacy-minimized copies of journals explicitly shared with signed-in active testers. Private workspaces and linked maintenance records are not exposed.';

commit;
