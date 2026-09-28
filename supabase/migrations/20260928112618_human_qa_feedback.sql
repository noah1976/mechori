begin;

-- Separate from alpha_feedback and private workspaces. No account or network identity.
create table public.human_qa_feedback (
  submission_id uuid primary key,
  task text not null check (task = 'history-reading-v1'),
  step smallint not null check (step between 0 and 3),
  version text not null check (version = 'qa-v0.1'),
  build text not null check (build = 'unknown' or build ~ '^[a-f0-9]{7,40}$'),
  source text not null check (source in ('x', 'facebook', 'direct', 'unknown')),
  device text not null check (device in ('mobile', 'tablet', 'desktop', 'unknown')),
  result text not null check (result in ('done', 'confusing', 'blocked')),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index human_qa_feedback_created_idx on public.human_qa_feedback (created_at);

create table public.human_qa_reception (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.human_qa_reception (singleton) values (true);

alter table public.human_qa_feedback enable row level security;
alter table public.human_qa_reception enable row level security;
revoke all on public.human_qa_feedback from public, anon, authenticated;
revoke all on public.human_qa_reception from public, anon, authenticated;

-- This is intentionally the only anonymous write entry. No generic table grant.
-- A global transaction lock makes duplicate, quota and kill-switch checks atomic.
create function public.submit_human_qa_feedback(
  p_submission_id uuid, p_context jsonb, p_result text, p_note text
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  normalized_note text;
begin
  if p_submission_id is null or p_submission_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_context is null or jsonb_typeof(p_context) <> 'object' or octet_length(p_context::text) > 512
    or p_result is null or p_result not in ('done', 'confusing', 'blocked') or p_note is null
  then raise exception 'invalid_qa_feedback'; end if;
  if exists (select 1 from jsonb_object_keys(p_context) key where key not in ('task', 'step', 'version', 'build', 'source', 'device'))
    or (select count(*) from jsonb_object_keys(p_context)) <> 6
    or (p_context->>'task') is distinct from 'history-reading-v1'
    or (p_context->>'version') is distinct from 'qa-v0.1'
    or jsonb_typeof(p_context->'step') is distinct from 'number'
    or coalesce(p_context->>'step', '') !~ '^[0-3]$'
    or coalesce(p_context->>'build', '') !~ '^(unknown|[a-f0-9]{7,40})$'
    or coalesce(p_context->>'source', '') not in ('x', 'facebook', 'direct', 'unknown')
    or coalesce(p_context->>'device', '') not in ('mobile', 'tablet', 'desktop', 'unknown')
    or exists (select 1 from jsonb_each(p_context) entry where entry.key <> 'step' and jsonb_typeof(entry.value) <> 'string')
  then raise exception 'invalid_qa_context'; end if;

  if octet_length(p_note) > 1200 then raise exception 'invalid_qa_note'; end if;
  normalized_note := trim(normalize(p_note, NFKC));
  if char_length(normalized_note) > 300 or normalized_note ~ '[\x00-\x08\x0B\x0C\x0E-\x1F]'
    or normalized_note ~* 'https?://|www\.|/p/|/join([?#/]|$)|(invite|token|code)[[:space:]]*=|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|([0-9]{1,3}\.){3}[0-9]{1,3}|Mozilla/|AppleWebKit/|[A-Za-z0-9_-]{32,}|\m[A-HJ-NPR-Z0-9]{17}\M|[一-龠ぁ-んァ-ヶ]{1,6}[[:space:]]?[0-9]{2,3}[[:space:]]?[ぁ-ん][[:space:]]?[0-9]{1,2}[-・ ]?[0-9]{2}'
  then raise exception 'invalid_qa_note'; end if;

  perform pg_catalog.pg_advisory_xact_lock(313101);
  if not exists (select 1 from public.human_qa_reception where singleton and enabled) then return 'closed'; end if;
  delete from public.human_qa_feedback where created_at <= now() - interval '30 days';
  if exists (select 1 from public.human_qa_feedback where submission_id = p_submission_id) then return 'duplicate'; end if;
  if (select count(*) from public.human_qa_feedback where created_at > now() - interval '10 minutes') >= 10
    or (select count(*) from public.human_qa_feedback where created_at > now() - interval '24 hours') >= 100
  then return 'rate_limited'; end if;
  insert into public.human_qa_feedback (submission_id, task, step, version, build, source, device, result, note)
  values (p_submission_id, p_context->>'task', (p_context->>'step')::smallint, p_context->>'version',
    p_context->>'build', p_context->>'source', p_context->>'device', p_result, normalized_note);
  return 'accepted';
end;
$$;

create function public.purge_human_qa_feedback()
returns bigint language plpgsql security definer set search_path = '' as $$
declare deleted_count bigint;
begin
  if auth.uid() is null or not public.is_active_test_member(auth.uid()) or not public.is_alpha_admin(auth.uid())
    then raise exception 'admin_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(313101);
  -- Daily operation with a one-day margin keeps raw retention within 30 days.
  delete from public.human_qa_feedback where created_at <= now() - interval '29 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create function public.list_human_qa_feedback()
returns table (task text, step smallint, version text, build text, source text, device text, result text, note text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_active_test_member(auth.uid()) or not public.is_alpha_staff(auth.uid())
    then raise exception 'staff_required'; end if;
  return query select feedback.task, feedback.step, feedback.version, feedback.build, feedback.source,
    feedback.device, feedback.result, feedback.note, feedback.created_at
  from public.human_qa_feedback feedback where feedback.created_at > now() - interval '30 days'
  order by feedback.created_at desc limit 100;
end;
$$;

create function public.get_human_qa_reception()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_active_test_member(auth.uid()) or not public.is_alpha_staff(auth.uid())
    then raise exception 'staff_required'; end if;
  return (select enabled from public.human_qa_reception where singleton);
end;
$$;

create function public.set_human_qa_reception(p_enabled boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_active_test_member(auth.uid()) or not public.is_alpha_admin(auth.uid())
    then raise exception 'admin_required'; end if;
  if p_enabled is null then raise exception 'invalid_reception'; end if;
  perform pg_catalog.pg_advisory_xact_lock(313101);
  update public.human_qa_reception set enabled = p_enabled where singleton;
  return p_enabled;
end;
$$;

revoke all on function public.submit_human_qa_feedback(uuid, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.purge_human_qa_feedback() from public, anon, authenticated;
revoke all on function public.list_human_qa_feedback() from public, anon, authenticated;
revoke all on function public.get_human_qa_reception() from public, anon, authenticated;
revoke all on function public.set_human_qa_reception(boolean) from public, anon, authenticated;
grant execute on function public.submit_human_qa_feedback(uuid, jsonb, text, text) to anon;
grant execute on function public.purge_human_qa_feedback() to authenticated;
grant execute on function public.list_human_qa_feedback() to authenticated;
grant execute on function public.get_human_qa_reception() to authenticated;
grant execute on function public.set_human_qa_reception(boolean) to authenticated;

comment on table public.human_qa_feedback is 'TEST QA self-reports only, no market/revenue evidence. Raw retention maximum 30 days; daily admin purge deletes rows aged 29 days, including while reception is closed.';
commit;
