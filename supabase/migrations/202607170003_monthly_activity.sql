begin;

-- Operator checks are only needed inside security-definer functions.
revoke execute on function public.is_test_operator(uuid) from authenticated;

create table public.monthly_user_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  first_session_at timestamptz not null,
  last_session_at timestamptz not null,
  last_value_at timestamptz,
  value_event_names text[] not null default '{}',
  primary key (user_id, month_start),
  check (month_start = date_trunc('month', month_start)::date),
  check (
    value_event_names <@ array[
      'garage_viewed',
      'feed_viewed',
      'history_reused',
      'knowledge_searched',
      'vehicle_created',
      'maintenance_saved',
      'journal_saved',
      'result_followed_up'
    ]::text[]
  )
);

alter table public.monthly_user_activity enable row level security;
revoke all on public.monthly_user_activity from public, anon, authenticated;

create or replace function public.record_monthly_activity(p_event_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_month date := date_trunc('month', now() at time zone 'UTC')::date;
  value_event boolean := p_event_name = any(array[
    'garage_viewed',
    'feed_viewed',
    'history_reused',
    'knowledge_searched',
    'vehicle_created',
    'maintenance_saved',
    'journal_saved',
    'result_followed_up'
  ]::text[]);
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_event_name <> 'session_started' and not value_event then
    raise exception 'unsupported_activity_event';
  end if;

  insert into public.monthly_user_activity (
    user_id,
    month_start,
    first_session_at,
    last_session_at,
    last_value_at,
    value_event_names
  ) values (
    auth.uid(),
    current_month,
    now(),
    now(),
    case when value_event then now() end,
    case when value_event then array[p_event_name]::text[] else '{}'::text[] end
  )
  on conflict (user_id, month_start) do update set
    last_session_at = now(),
    last_value_at = case
      when value_event then now()
      else monthly_user_activity.last_value_at
    end,
    value_event_names = case
      when value_event and not p_event_name = any(monthly_user_activity.value_event_names)
        then monthly_user_activity.value_event_names || p_event_name
      else monthly_user_activity.value_event_names
    end;
end;
$$;

revoke all on function public.record_monthly_activity(text) from public, anon, authenticated;
grant execute on function public.record_monthly_activity(text) to authenticated;

create or replace function public.get_alpha_monthly_metrics(p_month date)
returns table (month_start date, mau bigint, value_mau bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_test_operator(auth.uid()) then
    raise exception 'operator_required';
  end if;
  if p_month <> date_trunc('month', p_month)::date then
    raise exception 'month_start_required';
  end if;

  return query
    select
      p_month,
      count(*),
      count(*) filter (where activity.last_value_at is not null)
    from public.monthly_user_activity activity
    where activity.month_start = p_month;
end;
$$;

revoke all on function public.get_alpha_monthly_metrics(date) from public, anon, authenticated;
grant execute on function public.get_alpha_monthly_metrics(date) to authenticated;

comment on table public.monthly_user_activity is
  'One privacy-minimized row per tester per UTC month. Stores no page, vehicle, query, journal, or maintenance content.';

commit;
