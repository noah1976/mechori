begin;

create table public.alpha_passport_service_reports (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.alpha_passport_shares(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id text not null,
  submission_key uuid not null,
  submitted_at timestamptz not null default now(),
  service_date date,
  odometer_value numeric check (odometer_value >= 0 and odometer_value <= 1000000000),
  odometer_unit text not null default 'km' check (odometer_unit in ('km', 'mi', 'unknown')),
  workshop_name text check (char_length(workshop_name) <= 120),
  inspection_notes text check (char_length(inspection_notes) <= 2000),
  work_performed text check (char_length(work_performed) <= 2000),
  parts_used text check (char_length(parts_used) <= 2000),
  result_notes text check (char_length(result_notes) <= 2000),
  other_notes text check (char_length(other_notes) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  reviewed_at timestamptz,
  accepted_record_id text,
  unique (share_id, submission_key)
);

create index alpha_passport_service_reports_owner_status_idx
  on public.alpha_passport_service_reports (owner_user_id, status, submitted_at desc);

alter table public.alpha_passport_service_reports enable row level security;
revoke all on public.alpha_passport_service_reports from public, anon, authenticated;

create function public.submit_passport_service_report(
  p_token text,
  p_submission_key uuid,
  p_report jsonb
)
returns table (report_id uuid, submitted_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_share public.alpha_passport_shares%rowtype;
  existing_report public.alpha_passport_service_reports%rowtype;
  created_report public.alpha_passport_service_reports%rowtype;
  service_date_text text := trim(coalesce(p_report->>'service_date', ''));
  service_date_value date;
  odometer_text text := trim(coalesce(p_report->>'odometer_value', ''));
  odometer_value_value numeric;
  odometer_unit_value text := trim(coalesce(p_report->>'odometer_unit', 'km'));
  workshop_name_value text := trim(coalesce(p_report->>'workshop_name', ''));
  inspection_notes_value text := trim(coalesce(p_report->>'inspection_notes', ''));
  work_performed_value text := trim(coalesce(p_report->>'work_performed', ''));
  parts_used_value text := trim(coalesce(p_report->>'parts_used', ''));
  result_notes_value text := trim(coalesce(p_report->>'result_notes', ''));
  other_notes_value text := trim(coalesce(p_report->>'other_notes', ''));
begin
  if p_token !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'invalid_share_token'; end if;
  if p_submission_key is null then raise exception 'invalid_submission_key'; end if;
  if p_report is null or jsonb_typeof(p_report) <> 'object' then raise exception 'invalid_report'; end if;

  select share.* into target_share
  from public.alpha_passport_shares share
  where share.token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
    and share.is_active
  limit 1;
  if target_share.id is null then raise exception 'passport_share_not_found'; end if;

  select report.* into existing_report
  from public.alpha_passport_service_reports report
  where report.share_id = target_share.id
    and report.submission_key = p_submission_key
  limit 1;
  if existing_report.id is not null then
    return query select existing_report.id, existing_report.submitted_at;
    return;
  end if;

  if char_length(workshop_name_value) > 120
    or char_length(inspection_notes_value) > 2000
    or char_length(work_performed_value) > 2000
    or char_length(parts_used_value) > 2000
    or char_length(result_notes_value) > 2000
    or char_length(other_notes_value) > 2000
  then raise exception 'report_field_too_long'; end if;
  if inspection_notes_value = '' and work_performed_value = '' and parts_used_value = ''
    and result_notes_value = '' and other_notes_value = ''
  then raise exception 'report_content_required'; end if;
  if odometer_unit_value not in ('km', 'mi', 'unknown') then raise exception 'invalid_odometer_unit'; end if;

  if service_date_text <> '' then
    begin
      service_date_value := service_date_text::date;
    exception when others then
      raise exception 'invalid_service_date';
    end;
    if to_char(service_date_value, 'YYYY-MM-DD') <> service_date_text then
      raise exception 'invalid_service_date';
    end if;
  end if;
  if odometer_text <> '' then
    begin
      odometer_value_value := odometer_text::numeric;
    exception when others then
      raise exception 'invalid_odometer_value';
    end;
    if odometer_value_value < 0 or odometer_value_value > 1000000000 then
      raise exception 'invalid_odometer_value';
    end if;
  end if;
  if (
    select count(*)
    from public.alpha_passport_service_reports recent
    where recent.share_id = target_share.id
      and recent.submitted_at > now() - interval '1 hour'
  ) >= 20 then raise exception 'report_rate_limited'; end if;

  insert into public.alpha_passport_service_reports (
    share_id, owner_user_id, vehicle_id, submission_key, service_date,
    odometer_value, odometer_unit, workshop_name, inspection_notes,
    work_performed, parts_used, result_notes, other_notes
  ) values (
    target_share.id,
    target_share.user_id,
    target_share.vehicle_id,
    p_submission_key,
    service_date_value,
    odometer_value_value,
    odometer_unit_value,
    nullif(workshop_name_value, ''),
    nullif(inspection_notes_value, ''),
    nullif(work_performed_value, ''),
    nullif(parts_used_value, ''),
    nullif(result_notes_value, ''),
    nullif(other_notes_value, '')
  )
  returning * into created_report;

  return query select created_report.id, created_report.submitted_at;
end;
$$;

create function public.list_my_passport_service_reports()
returns table (
  id uuid,
  vehicle_id text,
  submitted_at timestamptz,
  service_date date,
  odometer_value numeric,
  odometer_unit text,
  workshop_name text,
  inspection_notes text,
  work_performed text,
  parts_used text,
  result_notes text,
  other_notes text,
  status text,
  reviewed_at timestamptz,
  accepted_record_id text
)
language sql
stable
security definer
set search_path = ''
as $$
  select report.id, report.vehicle_id, report.submitted_at, report.service_date,
    report.odometer_value, report.odometer_unit, report.workshop_name,
    report.inspection_notes, report.work_performed, report.parts_used,
    report.result_notes, report.other_notes, report.status, report.reviewed_at,
    report.accepted_record_id
  from public.alpha_passport_service_reports report
  where (select auth.uid()) is not null
    and report.owner_user_id = (select auth.uid())
  order by report.submitted_at desc;
$$;

create function public.accept_passport_service_report(
  p_report_id uuid,
  p_record_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_report public.alpha_passport_service_reports%rowtype;
  expected_record_id text := 'record-passport-report-' || lower(p_report_id::text);
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if p_record_id <> expected_record_id then raise exception 'invalid_record_id'; end if;

  select report.* into target_report
  from public.alpha_passport_service_reports report
  where report.id = p_report_id and report.owner_user_id = current_user_id
  for update;
  if target_report.id is null then raise exception 'report_not_found'; end if;
  if target_report.status = 'dismissed' then raise exception 'report_dismissed'; end if;
  if target_report.status = 'accepted' then
    if target_report.accepted_record_id <> p_record_id then raise exception 'report_already_accepted'; end if;
    return target_report.accepted_record_id;
  end if;

  update public.alpha_passport_service_reports
    set status = 'accepted', reviewed_at = now(), accepted_record_id = p_record_id
    where id = p_report_id;
  return p_record_id;
end;
$$;

create function public.dismiss_passport_service_report(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_status text;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  select report.status into target_status
  from public.alpha_passport_service_reports report
  where report.id = p_report_id and report.owner_user_id = current_user_id
  for update;
  if target_status is null then raise exception 'report_not_found'; end if;
  if target_status = 'accepted' then raise exception 'report_already_accepted'; end if;
  if target_status = 'dismissed' then return true; end if;

  update public.alpha_passport_service_reports
    set status = 'dismissed', reviewed_at = now()
    where id = p_report_id and owner_user_id = current_user_id;
  return true;
end;
$$;

revoke all on function public.submit_passport_service_report(text, uuid, jsonb) from public;
revoke all on function public.list_my_passport_service_reports() from public, anon;
revoke all on function public.accept_passport_service_report(uuid, text) from public, anon;
revoke all on function public.dismiss_passport_service_report(uuid) from public, anon;
grant execute on function public.submit_passport_service_report(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.list_my_passport_service_reports() to authenticated;
grant execute on function public.accept_passport_service_report(uuid, text) to authenticated;
grant execute on function public.dismiss_passport_service_report(uuid) to authenticated;

commit;
