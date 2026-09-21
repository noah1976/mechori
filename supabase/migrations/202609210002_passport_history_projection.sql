begin;

create function public.is_valid_alpha_passport_maintenance_history(p_history jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  visit jsonb;
  item jsonb;
  part jsonb;
begin
  if p_history is null or jsonb_typeof(p_history) <> 'array'
    or jsonb_array_length(p_history) > 500
  then return false; end if;

  for visit in select value from jsonb_array_elements(p_history)
  loop
    if jsonb_typeof(visit) <> 'object'
      or visit - array[
        'service_date', 'service_date_precision', 'odometer_value', 'odometer_unit',
        'summary', 'resolution_status', 'items'
      ] <> '{}'::jsonb
      or jsonb_typeof(visit->'summary') <> 'string'
      or char_length(trim(visit->>'summary')) not between 1 and 120
      or coalesce(visit->>'service_date_precision', '') not in ('day', 'month', 'year', 'unknown')
      or jsonb_typeof(visit->'items') <> 'array'
      or jsonb_array_length(visit->'items') not between 1 and 50
    then return false; end if;

    if visit ? 'service_date' and (
      jsonb_typeof(visit->'service_date') <> 'string'
      or char_length(visit->>'service_date') > 10
    ) then return false; end if;
    if visit ? 'odometer_value' and (
      jsonb_typeof(visit->'odometer_value') <> 'number'
      or (visit->>'odometer_value')::numeric < 0
      or (visit->>'odometer_value')::numeric > 1000000000
    ) then return false; end if;
    if visit ? 'odometer_unit' and coalesce(visit->>'odometer_unit', '') not in ('km', 'mi', 'unknown')
    then return false; end if;
    if visit ? 'resolution_status' and coalesce(visit->>'resolution_status', '') not in ('resolved', 'unresolved')
    then return false; end if;

    for item in select value from jsonb_array_elements(visit->'items')
    loop
      if jsonb_typeof(item) <> 'object'
        or item - array[
          'subject', 'observed_condition', 'work_performed', 'parts', 'result', 'follow_up_note'
        ] <> '{}'::jsonb
        or jsonb_typeof(item->'subject') <> 'string'
        or char_length(trim(item->>'subject')) not between 1 and 120
        or jsonb_typeof(item->'parts') <> 'array'
        or jsonb_array_length(item->'parts') > 50
      then return false; end if;

      if item ? 'observed_condition' and (
        jsonb_typeof(item->'observed_condition') <> 'string'
        or char_length(item->>'observed_condition') > 2000
      ) then return false; end if;
      if item ? 'work_performed' and (
        jsonb_typeof(item->'work_performed') <> 'string'
        or char_length(item->>'work_performed') > 2000
      ) then return false; end if;
      if item ? 'result' and (
        jsonb_typeof(item->'result') <> 'string'
        or char_length(item->>'result') > 2000
      ) then return false; end if;
      if item ? 'follow_up_note' and (
        jsonb_typeof(item->'follow_up_note') <> 'string'
        or char_length(item->>'follow_up_note') > 2000
      ) then return false; end if;

      for part in select value from jsonb_array_elements(item->'parts')
      loop
        if jsonb_typeof(part) <> 'string' or char_length(part #>> '{}') > 300
        then return false; end if;
      end loop;
    end loop;
  end loop;
  return true;
end;
$$;

alter table public.alpha_passport_shares
  add column maintenance_history jsonb,
  add column projection_version integer not null default 1,
  add constraint alpha_passport_shares_projection_version_check
    check (projection_version in (1, 2)),
  add constraint alpha_passport_shares_history_projection_check
    check (
      (projection_version = 1 and maintenance_history is null)
      or (
        projection_version = 2
        and public.is_valid_alpha_passport_maintenance_history(maintenance_history)
      )
    );

create function public.create_passport_share_v2(
  p_token text,
  p_vehicle_id text,
  p_projection jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  history_input jsonb := p_projection->'maintenance_history';
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if not public.is_valid_alpha_passport_maintenance_history(history_input) then
    raise exception 'invalid_maintenance_history';
  end if;

  perform public.create_passport_share(p_token, p_vehicle_id, p_projection);

  update public.alpha_passport_shares
    set maintenance_history = history_input,
      projection_version = 2,
      updated_at = now()
    where user_id = current_user_id and vehicle_id = p_vehicle_id;
  if not found then raise exception 'passport_share_not_found'; end if;
  return true;
end;
$$;

create function public.get_public_passport_share_v2(p_token text)
returns table (
  make text, model text, nickname text, model_year integer, grade text,
  model_code text, specification_note text, odometer_value numeric,
  odometer_unit text, modifications text, recent_maintenance text,
  workshop_concerns text, other_notes text, updated_at timestamptz,
  projection_version integer, maintenance_history jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select share.make, share.model, share.nickname, share.model_year, share.grade,
    share.model_code, share.specification_note, share.odometer_value,
    share.odometer_unit, share.modifications, share.recent_maintenance,
    share.workshop_concerns, share.other_notes, share.updated_at,
    share.projection_version,
    case when share.projection_version = 2 then share.maintenance_history else null end
  from public.alpha_passport_shares share
  where p_token ~ '^[A-Za-z0-9_-]{43}$'
    and share.token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
    and share.is_active
  limit 1;
$$;

revoke all on function public.is_valid_alpha_passport_maintenance_history(jsonb) from public, anon, authenticated;
revoke all on function public.create_passport_share_v2(text, text, jsonb) from public, anon;
revoke all on function public.get_public_passport_share_v2(text) from public;
grant execute on function public.create_passport_share_v2(text, text, jsonb) to authenticated;
grant execute on function public.get_public_passport_share_v2(text) to anon, authenticated;

commit;
