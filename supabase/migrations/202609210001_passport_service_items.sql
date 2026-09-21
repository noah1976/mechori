begin;

alter table public.alpha_passport_service_reports
  add column service_items jsonb,
  add column visit_notes text check (char_length(visit_notes) <= 2000),
  add constraint alpha_passport_service_reports_service_items_shape_check
    check (
      service_items is null
      or case
        when jsonb_typeof(service_items) = 'array'
          then jsonb_array_length(service_items) between 1 and 20
        else false
      end
    );

create or replace function public.submit_passport_service_report(
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
  visit_notes_value text := trim(coalesce(p_report->>'visit_notes', ''));
  service_items_input jsonb := p_report->'service_items';
  validated_items jsonb := '[]'::jsonb;
  service_item jsonb;
  item_id_value text;
  subject_value text;
  observed_condition_value text;
  work_performed_value text;
  parts_used_value text;
  result_value text;
  follow_up_note_value text;
  seen_item_ids text[] := array[]::text[];
  inspection_notes_value text := trim(coalesce(p_report->>'inspection_notes', ''));
  work_performed_legacy_value text := trim(coalesce(p_report->>'work_performed', ''));
  parts_used_legacy_value text := trim(coalesce(p_report->>'parts_used', ''));
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

  if char_length(workshop_name_value) > 120 or char_length(visit_notes_value) > 2000
  then raise exception 'report_field_too_long'; end if;

  if service_items_input is not null then
    if jsonb_typeof(service_items_input) <> 'array'
      or jsonb_array_length(service_items_input) < 1
      or jsonb_array_length(service_items_input) > 20
    then raise exception 'invalid_service_items'; end if;

    for service_item in select value from jsonb_array_elements(service_items_input)
    loop
      if jsonb_typeof(service_item) <> 'object' then raise exception 'invalid_service_item'; end if;
      item_id_value := trim(coalesce(service_item->>'id', ''));
      subject_value := trim(coalesce(service_item->>'subject', ''));
      observed_condition_value := trim(coalesce(service_item->>'observed_condition', ''));
      work_performed_value := trim(coalesce(service_item->>'work_performed', ''));
      parts_used_value := trim(coalesce(service_item->>'parts_used', ''));
      result_value := trim(coalesce(service_item->>'result', ''));
      follow_up_note_value := trim(coalesce(service_item->>'follow_up_note', ''));

      if item_id_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then raise exception 'invalid_service_item_id'; end if;
      if item_id_value = any(seen_item_ids) then raise exception 'duplicate_service_item_id'; end if;
      seen_item_ids := array_append(seen_item_ids, item_id_value);
      if subject_value = '' then raise exception 'service_item_subject_required'; end if;
      if char_length(subject_value) > 160
        or char_length(observed_condition_value) > 1000
        or char_length(work_performed_value) > 1000
        or char_length(parts_used_value) > 1000
        or char_length(result_value) > 1000
        or char_length(follow_up_note_value) > 1000
      then raise exception 'service_item_field_too_long'; end if;
      if observed_condition_value = '' and work_performed_value = '' and parts_used_value = ''
        and result_value = '' and follow_up_note_value = ''
      then raise exception 'service_item_content_required'; end if;

      validated_items := validated_items || jsonb_build_array(jsonb_build_object(
        'id', item_id_value,
        'subject', subject_value,
        'observed_condition', nullif(observed_condition_value, ''),
        'work_performed', nullif(work_performed_value, ''),
        'parts_used', nullif(parts_used_value, ''),
        'result', nullif(result_value, ''),
        'follow_up_note', nullif(follow_up_note_value, '')
      ));
    end loop;

    inspection_notes_value := coalesce(validated_items->0->>'observed_condition', '');
    work_performed_legacy_value := coalesce(validated_items->0->>'work_performed', '');
    parts_used_legacy_value := coalesce(validated_items->0->>'parts_used', '');
    result_notes_value := coalesce(validated_items->0->>'result', '');
    other_notes_value := visit_notes_value;
  else
    if char_length(inspection_notes_value) > 2000
      or char_length(work_performed_legacy_value) > 2000
      or char_length(parts_used_legacy_value) > 2000
      or char_length(result_notes_value) > 2000
      or char_length(other_notes_value) > 2000
    then raise exception 'report_field_too_long'; end if;
    if inspection_notes_value = '' and work_performed_legacy_value = '' and parts_used_legacy_value = ''
      and result_notes_value = '' and other_notes_value = ''
    then raise exception 'report_content_required'; end if;
  end if;

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
    work_performed, parts_used, result_notes, other_notes, service_items,
    visit_notes
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
    nullif(work_performed_legacy_value, ''),
    nullif(parts_used_legacy_value, ''),
    nullif(result_notes_value, ''),
    nullif(other_notes_value, ''),
    case when service_items_input is null then null else validated_items end,
    nullif(visit_notes_value, '')
  )
  returning * into created_report;

  return query select created_report.id, created_report.submitted_at;
end;
$$;

create function public.list_my_passport_service_visits()
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
  service_items jsonb,
  visit_notes text,
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
    report.result_notes, report.other_notes, report.service_items,
    report.visit_notes, report.status, report.reviewed_at,
    report.accepted_record_id
  from public.alpha_passport_service_reports report
  where (select auth.uid()) is not null
    and report.owner_user_id = (select auth.uid())
  order by report.submitted_at desc;
$$;

revoke all on function public.submit_passport_service_report(text, uuid, jsonb) from public;
revoke all on function public.list_my_passport_service_visits() from public, anon;
grant execute on function public.submit_passport_service_report(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.list_my_passport_service_visits() to authenticated;

commit;
