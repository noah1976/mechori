begin;

create table public.alpha_passport_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id text not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  make text not null check (char_length(make) between 1 and 80),
  model text not null check (char_length(model) between 1 and 120),
  nickname text check (char_length(nickname) <= 120),
  model_year integer check (model_year between 1886 and 2200),
  grade text check (char_length(grade) <= 120),
  model_code text check (char_length(model_code) <= 120),
  specification_note text check (char_length(specification_note) <= 500),
  odometer_value numeric check (odometer_value >= 0),
  odometer_unit text not null default 'km' check (odometer_unit in ('km', 'mi', 'unknown')),
  modifications text check (char_length(modifications) <= 2000),
  recent_maintenance text check (char_length(recent_maintenance) <= 2000),
  workshop_concerns text check (char_length(workshop_concerns) <= 2000),
  other_notes text check (char_length(other_notes) <= 2000),
  is_active boolean not null default true,
  shared_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vehicle_id)
);

alter table public.alpha_passport_shares enable row level security;
revoke all on public.alpha_passport_shares from public, anon, authenticated;

create policy "owners can read passport share state"
  on public.alpha_passport_shares for select to authenticated
  using ((select auth.uid()) = user_id);

create function public.create_passport_share(
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
  calculated_hash text;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if p_token !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'invalid_share_token'; end if;
  if char_length(p_vehicle_id) < 1 or char_length(p_vehicle_id) > 200 then
    raise exception 'invalid_vehicle_id';
  end if;
  if not exists (
    select 1 from public.test_memberships membership
    where membership.user_id = current_user_id and membership.status = 'active'
  ) then raise exception 'active_membership_required'; end if;

  calculated_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  insert into public.alpha_passport_shares (
    user_id, vehicle_id, token_hash, make, model, nickname, model_year, grade,
    model_code, specification_note, odometer_value, odometer_unit, modifications,
    recent_maintenance, workshop_concerns, other_notes, is_active, shared_at, updated_at
  ) values (
    current_user_id,
    p_vehicle_id,
    calculated_hash,
    left(coalesce(p_projection->>'make', ''), 80),
    left(coalesce(p_projection->>'model', ''), 120),
    nullif(left(coalesce(p_projection->>'nickname', ''), 120), ''),
    nullif(p_projection->>'model_year', '')::integer,
    nullif(left(coalesce(p_projection->>'grade', ''), 120), ''),
    nullif(left(coalesce(p_projection->>'model_code', ''), 120), ''),
    nullif(left(coalesce(p_projection->>'specification_note', ''), 500), ''),
    nullif(p_projection->>'odometer_value', '')::numeric,
    case when p_projection->>'odometer_unit' in ('km', 'mi', 'unknown')
      then p_projection->>'odometer_unit' else 'km' end,
    nullif(left(coalesce(p_projection->>'modifications', ''), 2000), ''),
    nullif(left(coalesce(p_projection->>'recent_maintenance', ''), 2000), ''),
    nullif(left(coalesce(p_projection->>'workshop_concerns', ''), 2000), ''),
    nullif(left(coalesce(p_projection->>'other_notes', ''), 2000), ''),
    true,
    now(),
    now()
  )
  on conflict (user_id, vehicle_id) do update set
    token_hash = excluded.token_hash,
    make = excluded.make,
    model = excluded.model,
    nickname = excluded.nickname,
    model_year = excluded.model_year,
    grade = excluded.grade,
    model_code = excluded.model_code,
    specification_note = excluded.specification_note,
    odometer_value = excluded.odometer_value,
    odometer_unit = excluded.odometer_unit,
    modifications = excluded.modifications,
    recent_maintenance = excluded.recent_maintenance,
    workshop_concerns = excluded.workshop_concerns,
    other_notes = excluded.other_notes,
    is_active = true,
    shared_at = now(),
    updated_at = now();
  return true;
end;
$$;

create function public.revoke_passport_share(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if p_token !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'invalid_share_token'; end if;
  update public.alpha_passport_shares
    set is_active = false, updated_at = now()
    where user_id = (select auth.uid())
      and token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

create function public.get_public_passport_share(p_token text)
returns table (
  make text, model text, nickname text, model_year integer, grade text,
  model_code text, specification_note text, odometer_value numeric,
  odometer_unit text, modifications text, recent_maintenance text,
  workshop_concerns text, other_notes text, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select share.make, share.model, share.nickname, share.model_year, share.grade,
    share.model_code, share.specification_note, share.odometer_value,
    share.odometer_unit, share.modifications, share.recent_maintenance,
    share.workshop_concerns, share.other_notes, share.updated_at
  from public.alpha_passport_shares share
  where p_token ~ '^[A-Za-z0-9_-]{43}$'
    and share.token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
    and share.is_active
  limit 1;
$$;

revoke all on function public.create_passport_share(text, text, jsonb) from public, anon;
revoke all on function public.revoke_passport_share(text) from public, anon;
revoke all on function public.get_public_passport_share(text) from public;
grant execute on function public.create_passport_share(text, text, jsonb) to authenticated;
grant execute on function public.revoke_passport_share(text) to authenticated;
grant execute on function public.get_public_passport_share(text) to anon, authenticated;

commit;
