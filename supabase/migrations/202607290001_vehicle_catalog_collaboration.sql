begin;

create or replace function public.is_active_test_member(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.test_memberships membership
    where membership.user_id = p_user_id
      and membership.status = 'active'
  );
$$;

revoke all on function public.is_active_test_member(uuid) from public, anon, authenticated;
grant execute on function public.is_active_test_member(uuid) to authenticated;

create or replace function public.vehicle_catalog_name_key(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(regexp_replace(trim(p_value), '[[:space:][:punct:]]+', '', 'g'));
$$;

revoke all on function public.vehicle_catalog_name_key(text) from public, anon, authenticated;

create table public.vehicle_catalog_entities (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  entity_type text not null check (
    entity_type in (
      'corporate_group',
      'manufacturer',
      'marque',
      'sales_channel',
      'model_family',
      'market_name',
      'generation',
      'variant',
      'configuration'
    )
  ),
  canonical_name text not null check (char_length(canonical_name) between 1 and 120),
  parent_entity_id text references public.vehicle_catalog_entities(id) on delete restrict,
  marque_entity_id text references public.vehicle_catalog_entities(id) on delete restrict,
  vehicle_category text check (vehicle_category in ('car', 'motorcycle', 'moped', 'other')),
  region_code text check (region_code is null or char_length(region_code) between 2 and 35),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_entity_id is null or parent_entity_id <> id),
  check (marque_entity_id is null or marque_entity_id <> id)
);

create table public.vehicle_catalog_names (
  id uuid primary key default gen_random_uuid(),
  entity_id text not null references public.vehicle_catalog_entities(id) on delete restrict,
  name_text text not null check (char_length(name_text) between 1 and 160),
  normalized_key text not null check (char_length(normalized_key) between 1 and 160),
  locale text check (locale is null or char_length(locale) between 2 and 35),
  region_code text check (region_code is null or char_length(region_code) between 2 and 35),
  name_kind text not null check (
    name_kind in (
      'canonical',
      'localized_name',
      'historical_corporate_name',
      'abbreviation',
      'former_brand_name',
      'common_name',
      'known_typo',
      'market_name',
      'generation_name',
      'grade_name',
      'model_code'
    )
  ),
  matching_mode text not null default 'exact' check (matching_mode in ('exact', 'candidate_only')),
  verification_status text not null default 'unconfirmed' check (
    verification_status in (
      'user_confirmed',
      'document_confirmed',
      'operator_confirmed',
      'official_source',
      'unconfirmed'
    )
  ),
  source_note text check (source_note is null or char_length(source_note) <= 500),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index vehicle_catalog_names_unique_idx
  on public.vehicle_catalog_names (
    entity_id,
    normalized_key,
    name_kind,
    coalesce(locale, ''),
    coalesce(region_code, '')
  );

create index vehicle_catalog_names_lookup_idx
  on public.vehicle_catalog_names (normalized_key)
  where status = 'published';

create table public.vehicle_catalog_relations (
  id uuid primary key default gen_random_uuid(),
  from_entity_id text not null references public.vehicle_catalog_entities(id) on delete restrict,
  to_entity_id text not null references public.vehicle_catalog_entities(id) on delete restrict,
  relation_type text not null check (
    relation_type in (
      'owned_by',
      'manufactured_by',
      'sold_through',
      'succeeded_by',
      'market_name_variant',
      'oem_rebadge',
      'brand_transition',
      'licensed_continuation',
      'inspired_derivative'
    )
  ),
  region_code text check (region_code is null or char_length(region_code) between 2 and 35),
  evidence_note text check (evidence_note is null or char_length(evidence_note) <= 500),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_entity_id, to_entity_id, relation_type, region_code),
  check (from_entity_id <> to_entity_id)
);

create table public.vehicle_catalog_suggestions (
  id uuid primary key default gen_random_uuid(),
  submitted_by_user_id uuid not null references auth.users(id) on delete cascade,
  source_vehicle_id text check (
    source_vehicle_id is null or char_length(source_vehicle_id) between 1 and 120
  ),
  suggestion_kind text not null check (
    suggestion_kind in ('vehicle_identity', 'name_alias', 'correction', 'relationship')
  ),
  vehicle_category text not null check (vehicle_category in ('car', 'motorcycle', 'moped', 'other')),
  make_input text not null check (char_length(make_input) between 1 and 120),
  model_input text not null check (char_length(model_input) between 1 and 160),
  grade_input text check (grade_input is null or char_length(grade_input) <= 160),
  model_code_input text check (model_code_input is null or char_length(model_code_input) <= 120),
  model_year integer check (model_year is null or model_year between 1886 and 2200),
  proposed_make_name text check (
    proposed_make_name is null or char_length(proposed_make_name) <= 120
  ),
  proposed_model_name text check (
    proposed_model_name is null or char_length(proposed_model_name) <= 160
  ),
  proposed_name text check (proposed_name is null or char_length(proposed_name) <= 160),
  proposed_name_kind text check (
    proposed_name_kind is null or proposed_name_kind in (
      'canonical',
      'localized_name',
      'historical_corporate_name',
      'abbreviation',
      'former_brand_name',
      'common_name',
      'known_typo',
      'market_name',
      'generation_name',
      'grade_name',
      'model_code'
    )
  ),
  target_entity_id text references public.vehicle_catalog_entities(id) on delete restrict,
  evidence_basis text not null check (
    evidence_basis in (
      'vehicle_itself',
      'service_document',
      'owners_manual',
      'official_brochure',
      'official_website',
      'recalled_later',
      'other',
      'unknown'
    )
  ),
  evidence_note text check (evidence_note is null or char_length(evidence_note) <= 500),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'pending' check (
    status in ('pending', 'needs_information', 'accepted', 'rejected', 'withdrawn')
  ),
  reviewer_note text check (reviewer_note is null or char_length(reviewer_note) <= 1000),
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicle_catalog_suggestions_queue_idx
  on public.vehicle_catalog_suggestions (status, created_at);

create index vehicle_catalog_suggestions_submitter_idx
  on public.vehicle_catalog_suggestions (submitted_by_user_id, created_at desc);

create table public.vehicle_catalog_review_events (
  revision bigint generated always as identity primary key,
  suggestion_id uuid not null references public.vehicle_catalog_suggestions(id) on delete restrict,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (
    action in (
      'needs_information',
      'accepted',
      'rejected',
      'published_name',
      'published_entity'
    )
  ),
  target_entity_id text references public.vehicle_catalog_entities(id) on delete restrict,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.vehicle_catalog_entities enable row level security;
alter table public.vehicle_catalog_names enable row level security;
alter table public.vehicle_catalog_relations enable row level security;
alter table public.vehicle_catalog_suggestions enable row level security;
alter table public.vehicle_catalog_review_events enable row level security;

create policy "active testers can read published catalog entities"
  on public.vehicle_catalog_entities for select to authenticated
  using (
    (
      status = 'published'
      and public.is_active_test_member((select auth.uid()))
    )
    or public.is_test_operator((select auth.uid()))
  );

create policy "active testers can read published catalog names"
  on public.vehicle_catalog_names for select to authenticated
  using (
    (
      status = 'published'
      and public.is_active_test_member((select auth.uid()))
    )
    or public.is_test_operator((select auth.uid()))
  );

create policy "active testers can read published catalog relations"
  on public.vehicle_catalog_relations for select to authenticated
  using (
    (
      status = 'published'
      and public.is_active_test_member((select auth.uid()))
    )
    or public.is_test_operator((select auth.uid()))
  );

create policy "testers can read their own catalog suggestions"
  on public.vehicle_catalog_suggestions for select to authenticated
  using (
    submitted_by_user_id = (select auth.uid())
    or public.is_test_operator((select auth.uid()))
  );

create policy "active testers can submit catalog suggestions"
  on public.vehicle_catalog_suggestions for insert to authenticated
  with check (
    submitted_by_user_id = (select auth.uid())
    and public.is_active_test_member((select auth.uid()))
    and status = 'pending'
    and reviewed_by_user_id is null
  );

create policy "operators can read catalog review events"
  on public.vehicle_catalog_review_events for select to authenticated
  using (public.is_test_operator((select auth.uid())));

revoke insert, update, delete on public.vehicle_catalog_entities from anon, authenticated;
revoke insert, update, delete on public.vehicle_catalog_names from anon, authenticated;
revoke insert, update, delete on public.vehicle_catalog_relations from anon, authenticated;
revoke update, delete on public.vehicle_catalog_suggestions from anon, authenticated;
revoke insert, update, delete on public.vehicle_catalog_review_events from anon, authenticated;

grant select on public.vehicle_catalog_entities to authenticated;
grant select on public.vehicle_catalog_names to authenticated;
grant select on public.vehicle_catalog_relations to authenticated;
grant select, insert on public.vehicle_catalog_suggestions to authenticated;
grant select on public.vehicle_catalog_review_events to authenticated;

create or replace function public.review_vehicle_catalog_suggestion(
  p_suggestion_id uuid,
  p_decision text,
  p_reviewer_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_status text;
begin
  if auth.uid() is null or not public.is_test_operator(auth.uid()) then
    raise exception 'operator_required';
  end if;
  if p_decision not in ('needs_information', 'accepted', 'rejected') then
    raise exception 'invalid_decision';
  end if;
  if p_reviewer_note is not null and char_length(p_reviewer_note) > 1000 then
    raise exception 'reviewer_note_too_long';
  end if;

  next_status := case
    when p_decision = 'needs_information' then 'needs_information'
    else p_decision
  end;

  update public.vehicle_catalog_suggestions
  set status = next_status,
      reviewer_note = nullif(trim(p_reviewer_note), ''),
      reviewed_by_user_id = auth.uid(),
      updated_at = now()
  where id = p_suggestion_id
    and status in ('pending', 'needs_information');

  if not found then
    raise exception 'suggestion_not_reviewable';
  end if;

  insert into public.vehicle_catalog_review_events (
    suggestion_id,
    reviewer_user_id,
    action,
    note
  ) values (
    p_suggestion_id,
    auth.uid(),
    p_decision,
    nullif(trim(p_reviewer_note), '')
  );

  return next_status;
end;
$$;

create or replace function public.publish_vehicle_catalog_name_suggestion(
  p_suggestion_id uuid,
  p_target_entity_id text,
  p_name_text text,
  p_name_kind text,
  p_matching_mode text default 'exact',
  p_locale text default null,
  p_region_code text default null,
  p_source_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  published_name_id uuid;
begin
  if auth.uid() is null or not public.is_test_operator(auth.uid()) then
    raise exception 'operator_required';
  end if;
  if p_name_kind not in (
    'canonical',
    'localized_name',
    'historical_corporate_name',
    'abbreviation',
    'former_brand_name',
    'common_name',
    'known_typo',
    'market_name',
    'generation_name',
    'grade_name',
    'model_code'
  ) then
    raise exception 'invalid_name_kind';
  end if;
  if p_matching_mode not in ('exact', 'candidate_only') then
    raise exception 'invalid_matching_mode';
  end if;
  if char_length(trim(p_name_text)) < 1 or char_length(trim(p_name_text)) > 160 then
    raise exception 'invalid_name';
  end if;
  if not exists (
    select 1 from public.vehicle_catalog_entities entity
    where entity.id = p_target_entity_id
      and entity.status = 'published'
  ) then
    raise exception 'published_target_required';
  end if;
  if not exists (
    select 1 from public.vehicle_catalog_suggestions suggestion
    where suggestion.id = p_suggestion_id
      and suggestion.status in ('pending', 'needs_information')
  ) then
    raise exception 'suggestion_not_reviewable';
  end if;

  insert into public.vehicle_catalog_names (
    entity_id,
    name_text,
    normalized_key,
    locale,
    region_code,
    name_kind,
    matching_mode,
    verification_status,
    source_note,
    status,
    created_by_user_id,
    reviewed_by_user_id
  ) values (
    p_target_entity_id,
    trim(p_name_text),
    public.vehicle_catalog_name_key(p_name_text),
    nullif(trim(p_locale), ''),
    nullif(trim(p_region_code), ''),
    p_name_kind,
    p_matching_mode,
    'operator_confirmed',
    nullif(trim(p_source_note), ''),
    'published',
    auth.uid(),
    auth.uid()
  )
  on conflict (
    entity_id,
    normalized_key,
    name_kind,
    (coalesce(locale, '')),
    (coalesce(region_code, ''))
  )
  do update set
    name_text = excluded.name_text,
    matching_mode = excluded.matching_mode,
    verification_status = excluded.verification_status,
    source_note = excluded.source_note,
    status = 'published',
    reviewed_by_user_id = auth.uid(),
    updated_at = now()
  returning id into published_name_id;

  update public.vehicle_catalog_suggestions
  set status = 'accepted',
      target_entity_id = p_target_entity_id,
      reviewer_note = nullif(trim(p_source_note), ''),
      reviewed_by_user_id = auth.uid(),
      updated_at = now()
  where id = p_suggestion_id;

  insert into public.vehicle_catalog_review_events (
    suggestion_id,
    reviewer_user_id,
    action,
    target_entity_id,
    note
  ) values (
    p_suggestion_id,
    auth.uid(),
    'published_name',
    p_target_entity_id,
    nullif(trim(p_source_note), '')
  );

  return published_name_id;
end;
$$;

create or replace function public.publish_vehicle_catalog_entity_suggestion(
  p_suggestion_id uuid,
  p_entity_id text,
  p_entity_type text,
  p_canonical_name text,
  p_parent_entity_id text default null,
  p_marque_entity_id text default null,
  p_vehicle_category text default null,
  p_region_code text default null,
  p_name_kind text default 'canonical',
  p_matching_mode text default 'exact',
  p_reviewer_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  suggestion public.vehicle_catalog_suggestions%rowtype;
  source_name text;
  source_name_kind text;
begin
  if auth.uid() is null or not public.is_test_operator(auth.uid()) then
    raise exception 'operator_required';
  end if;
  if p_entity_id !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid_entity_id';
  end if;
  if p_entity_type not in (
    'corporate_group',
    'manufacturer',
    'marque',
    'sales_channel',
    'model_family',
    'market_name',
    'generation',
    'variant',
    'configuration'
  ) then
    raise exception 'invalid_entity_type';
  end if;
  if p_name_kind not in (
    'canonical',
    'localized_name',
    'historical_corporate_name',
    'abbreviation',
    'former_brand_name',
    'common_name',
    'known_typo',
    'market_name',
    'generation_name',
    'grade_name',
    'model_code'
  ) then
    raise exception 'invalid_name_kind';
  end if;
  if p_matching_mode not in ('exact', 'candidate_only') then
    raise exception 'invalid_matching_mode';
  end if;
  if char_length(trim(p_canonical_name)) < 1 or char_length(trim(p_canonical_name)) > 120 then
    raise exception 'invalid_canonical_name';
  end if;
  if p_vehicle_category is not null
    and p_vehicle_category not in ('car', 'motorcycle', 'moped', 'other') then
    raise exception 'invalid_vehicle_category';
  end if;
  select * into suggestion
  from public.vehicle_catalog_suggestions catalog_suggestion
  where catalog_suggestion.id = p_suggestion_id
    and catalog_suggestion.status in ('pending', 'needs_information')
  for update;

  if suggestion.id is null then
    raise exception 'suggestion_not_reviewable';
  end if;
  if exists (
    select 1 from public.vehicle_catalog_entities entity
    where entity.id = p_entity_id
  ) then
    raise exception 'entity_id_already_exists';
  end if;

  insert into public.vehicle_catalog_entities (
    id,
    entity_type,
    canonical_name,
    parent_entity_id,
    marque_entity_id,
    vehicle_category,
    region_code,
    status,
    created_by_user_id,
    reviewed_by_user_id
  ) values (
    p_entity_id,
    p_entity_type,
    trim(p_canonical_name),
    nullif(trim(p_parent_entity_id), ''),
    nullif(trim(p_marque_entity_id), ''),
    p_vehicle_category,
    nullif(trim(p_region_code), ''),
    'published',
    auth.uid(),
    auth.uid()
  );

  insert into public.vehicle_catalog_names (
    entity_id,
    name_text,
    normalized_key,
    locale,
    region_code,
    name_kind,
    matching_mode,
    verification_status,
    source_note,
    status,
    created_by_user_id,
    reviewed_by_user_id
  ) values (
    p_entity_id,
    trim(p_canonical_name),
    public.vehicle_catalog_name_key(p_canonical_name),
    null,
    nullif(trim(p_region_code), ''),
    p_name_kind,
    p_matching_mode,
    'operator_confirmed',
    nullif(trim(p_reviewer_note), ''),
    'published',
    auth.uid(),
    auth.uid()
  );

  source_name := case
    when p_entity_type = 'marque' then suggestion.make_input
    when p_entity_type in ('model_family', 'market_name') then suggestion.model_input
    when p_entity_type in ('variant', 'configuration') then suggestion.grade_input
    else suggestion.proposed_name
  end;
  source_name_kind := case
    when p_entity_type = 'marque' then 'localized_name'
    when p_entity_type in ('model_family', 'market_name') then 'market_name'
    when p_entity_type in ('variant', 'configuration') then 'grade_name'
    else 'common_name'
  end;

  if source_name is not null
    and char_length(trim(source_name)) between 1 and 160
    and public.vehicle_catalog_name_key(source_name)
      <> public.vehicle_catalog_name_key(p_canonical_name) then
    insert into public.vehicle_catalog_names (
      entity_id,
      name_text,
      normalized_key,
      locale,
      region_code,
      name_kind,
      matching_mode,
      verification_status,
      source_note,
      status,
      created_by_user_id,
      reviewed_by_user_id
    ) values (
      p_entity_id,
      trim(source_name),
      public.vehicle_catalog_name_key(source_name),
      null,
      nullif(trim(p_region_code), ''),
      source_name_kind,
      p_matching_mode,
      'operator_confirmed',
      nullif(trim(p_reviewer_note), ''),
      'published',
      auth.uid(),
      auth.uid()
    )
    on conflict (
      entity_id,
      normalized_key,
      name_kind,
      (coalesce(locale, '')),
      (coalesce(region_code, ''))
    ) do nothing;
  end if;

  update public.vehicle_catalog_suggestions
  set status = 'accepted',
      target_entity_id = p_entity_id,
      reviewer_note = nullif(trim(p_reviewer_note), ''),
      reviewed_by_user_id = auth.uid(),
      updated_at = now()
  where id = p_suggestion_id;

  insert into public.vehicle_catalog_review_events (
    suggestion_id,
    reviewer_user_id,
    action,
    target_entity_id,
    note
  ) values (
    p_suggestion_id,
    auth.uid(),
    'published_entity',
    p_entity_id,
    nullif(trim(p_reviewer_note), '')
  );

  return p_entity_id;
end;
$$;

create or replace function public.publish_vehicle_catalog_model_suggestion(
  p_suggestion_id uuid,
  p_family_entity_id text,
  p_market_name_entity_id text,
  p_marque_entity_id text,
  p_canonical_model_name text,
  p_region_code text default null,
  p_matching_mode text default 'exact',
  p_reviewer_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  suggestion public.vehicle_catalog_suggestions%rowtype;
  family_exists boolean;
begin
  if auth.uid() is null or not public.is_test_operator(auth.uid()) then
    raise exception 'operator_required';
  end if;
  if p_family_entity_id !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or p_market_name_entity_id !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid_entity_id';
  end if;
  if p_family_entity_id = p_market_name_entity_id then
    raise exception 'distinct_entity_ids_required';
  end if;
  if p_matching_mode not in ('exact', 'candidate_only') then
    raise exception 'invalid_matching_mode';
  end if;
  if char_length(trim(p_canonical_model_name)) < 1
    or char_length(trim(p_canonical_model_name)) > 120 then
    raise exception 'invalid_canonical_name';
  end if;
  if not exists (
    select 1
    from public.vehicle_catalog_entities entity
    where entity.id = p_marque_entity_id
      and entity.entity_type = 'marque'
      and entity.status = 'published'
  ) then
    raise exception 'published_marque_required';
  end if;

  select * into suggestion
  from public.vehicle_catalog_suggestions catalog_suggestion
  where catalog_suggestion.id = p_suggestion_id
    and catalog_suggestion.status in ('pending', 'needs_information')
  for update;

  if suggestion.id is null then
    raise exception 'suggestion_not_reviewable';
  end if;

  select exists (
    select 1
    from public.vehicle_catalog_entities entity
    where entity.id = p_family_entity_id
  ) into family_exists;

  if family_exists and not exists (
    select 1
    from public.vehicle_catalog_entities entity
    where entity.id = p_family_entity_id
      and entity.entity_type = 'model_family'
      and entity.status = 'published'
  ) then
    raise exception 'published_model_family_required';
  end if;
  if exists (
    select 1
    from public.vehicle_catalog_entities entity
    where entity.id = p_market_name_entity_id
  ) then
    raise exception 'market_name_entity_id_already_exists';
  end if;

  if not family_exists then
    insert into public.vehicle_catalog_entities (
      id,
      entity_type,
      canonical_name,
      vehicle_category,
      status,
      created_by_user_id,
      reviewed_by_user_id
    ) values (
      p_family_entity_id,
      'model_family',
      trim(p_canonical_model_name),
      suggestion.vehicle_category,
      'published',
      auth.uid(),
      auth.uid()
    );

    insert into public.vehicle_catalog_names (
      entity_id,
      name_text,
      normalized_key,
      name_kind,
      matching_mode,
      verification_status,
      source_note,
      status,
      created_by_user_id,
      reviewed_by_user_id
    ) values (
      p_family_entity_id,
      trim(p_canonical_model_name),
      public.vehicle_catalog_name_key(p_canonical_model_name),
      'canonical',
      'candidate_only',
      'operator_confirmed',
      nullif(trim(p_reviewer_note), ''),
      'published',
      auth.uid(),
      auth.uid()
    );
  end if;

  insert into public.vehicle_catalog_entities (
    id,
    entity_type,
    canonical_name,
    parent_entity_id,
    marque_entity_id,
    vehicle_category,
    region_code,
    status,
    created_by_user_id,
    reviewed_by_user_id
  ) values (
    p_market_name_entity_id,
    'market_name',
    trim(p_canonical_model_name),
    p_family_entity_id,
    p_marque_entity_id,
    suggestion.vehicle_category,
    nullif(trim(p_region_code), ''),
    'published',
    auth.uid(),
    auth.uid()
  );

  insert into public.vehicle_catalog_names (
    entity_id,
    name_text,
    normalized_key,
    region_code,
    name_kind,
    matching_mode,
    verification_status,
    source_note,
    status,
    created_by_user_id,
    reviewed_by_user_id
  ) values (
    p_market_name_entity_id,
    trim(p_canonical_model_name),
    public.vehicle_catalog_name_key(p_canonical_model_name),
    nullif(trim(p_region_code), ''),
    'market_name',
    p_matching_mode,
    'operator_confirmed',
    nullif(trim(p_reviewer_note), ''),
    'published',
    auth.uid(),
    auth.uid()
  );

  if public.vehicle_catalog_name_key(suggestion.model_input)
    <> public.vehicle_catalog_name_key(p_canonical_model_name) then
    insert into public.vehicle_catalog_names (
      entity_id,
      name_text,
      normalized_key,
      region_code,
      name_kind,
      matching_mode,
      verification_status,
      source_note,
      status,
      created_by_user_id,
      reviewed_by_user_id
    ) values (
      p_market_name_entity_id,
      trim(suggestion.model_input),
      public.vehicle_catalog_name_key(suggestion.model_input),
      nullif(trim(p_region_code), ''),
      'market_name',
      p_matching_mode,
      'operator_confirmed',
      nullif(trim(p_reviewer_note), ''),
      'published',
      auth.uid(),
      auth.uid()
    )
    on conflict (
      entity_id,
      normalized_key,
      name_kind,
      (coalesce(locale, '')),
      (coalesce(region_code, ''))
    ) do nothing;
  end if;

  update public.vehicle_catalog_suggestions
  set status = 'accepted',
      target_entity_id = p_market_name_entity_id,
      reviewer_note = nullif(trim(p_reviewer_note), ''),
      reviewed_by_user_id = auth.uid(),
      updated_at = now()
  where id = p_suggestion_id;

  insert into public.vehicle_catalog_review_events (
    suggestion_id,
    reviewer_user_id,
    action,
    target_entity_id,
    note
  ) values (
    p_suggestion_id,
    auth.uid(),
    'published_entity',
    p_market_name_entity_id,
    nullif(trim(p_reviewer_note), '')
  );

  return p_market_name_entity_id;
end;
$$;

revoke all on function public.review_vehicle_catalog_suggestion(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.publish_vehicle_catalog_name_suggestion(
  uuid, text, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.publish_vehicle_catalog_entity_suggestion(
  uuid, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.publish_vehicle_catalog_model_suggestion(
  uuid, text, text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.review_vehicle_catalog_suggestion(uuid, text, text)
  to authenticated;
grant execute on function public.publish_vehicle_catalog_name_suggestion(
  uuid, text, text, text, text, text, text, text
) to authenticated;
grant execute on function public.publish_vehicle_catalog_entity_suggestion(
  uuid, text, text, text, text, text, text, text, text, text, text
) to authenticated;
grant execute on function public.publish_vehicle_catalog_model_suggestion(
  uuid, text, text, text, text, text, text, text
) to authenticated;

insert into public.vehicle_catalog_entities (
  id,
  entity_type,
  canonical_name,
  status
) values
  ('fiat', 'marque', 'FIAT', 'published'),
  ('nissan', 'marque', 'NISSAN', 'published'),
  ('prince', 'marque', 'PRINCE', 'published'),
  ('honda', 'marque', 'HONDA', 'published'),
  ('toyota', 'marque', 'TOYOTA', 'published'),
  ('lexus', 'marque', 'LEXUS', 'published'),
  ('suzuki', 'marque', 'SUZUKI', 'published'),
  ('mazda', 'marque', 'MAZDA', 'published'),
  ('eunos', 'marque', 'EUNOS', 'published'),
  ('efini', 'marque', 'ɛ̃FINI', 'published'),
  ('autozam', 'marque', 'AUTOZAM', 'published'),
  ('subaru', 'marque', 'SUBARU', 'published'),
  ('mg', 'marque', 'MG', 'published'),
  ('bertone', 'marque', 'BERTONE', 'published'),
  ('alfa-romeo', 'marque', 'ALFA ROMEO', 'published'),
  ('vespa', 'marque', 'VESPA', 'published'),
  ('lotus', 'marque', 'LOTUS', 'published'),
  ('caterham', 'marque', 'CATERHAM', 'published'),
  ('birkin', 'marque', 'BIRKIN', 'published'),
  ('opel', 'marque', 'OPEL', 'published'),
  ('vauxhall', 'marque', 'VAUXHALL', 'published'),
  ('peugeot', 'marque', 'PEUGEOT', 'published'),
  ('citroen', 'marque', 'CITROËN', 'published'),
  ('renault', 'marque', 'RENAULT', 'published'),
  ('lancia', 'marque', 'LANCIA', 'published'),
  ('subaru-corporation', 'manufacturer', 'SUBARU CORPORATION', 'published'),
  ('mazda-motor-corporation', 'manufacturer', 'MAZDA MOTOR CORPORATION', 'published'),
  ('toyota-motor-corporation', 'manufacturer', 'TOYOTA MOTOR CORPORATION', 'published'),
  ('peugeot-205', 'model_family', '205', 'published'),
  (
    'peugeot-205-global',
    'market_name',
    '205',
    'published'
  ),
  ('peugeot-205-gen1', 'generation', '205 Generation 1', 'published'),
  ('peugeot-205-standard', 'variant', '205 Standard', 'published'),
  ('peugeot-205-gti', 'variant', '205 GTI', 'published'),
  ('peugeot-205-gti-1-6', 'configuration', '205 GTI 1.6', 'published'),
  ('peugeot-205-gti-1-9', 'configuration', '205 GTI 1.9', 'published'),
  ('peugeot-205-turbo-16', 'variant', '205 Turbo 16', 'published');

update public.vehicle_catalog_entities
set parent_entity_id = 'peugeot-205',
    marque_entity_id = 'peugeot',
    vehicle_category = 'car',
    region_code = 'global'
where id = 'peugeot-205-global';

update public.vehicle_catalog_entities
set parent_entity_id = 'peugeot-205',
    vehicle_category = 'car'
where id = 'peugeot-205-gen1';

update public.vehicle_catalog_entities
set parent_entity_id = 'peugeot-205-gen1',
    vehicle_category = 'car'
where id in ('peugeot-205-standard', 'peugeot-205-gti', 'peugeot-205-turbo-16');

update public.vehicle_catalog_entities
set parent_entity_id = 'peugeot-205-gti',
    vehicle_category = 'car'
where id in ('peugeot-205-gti-1-6', 'peugeot-205-gti-1-9');

insert into public.vehicle_catalog_names (
  entity_id,
  name_text,
  normalized_key,
  locale,
  name_kind,
  matching_mode,
  verification_status,
  status
)
select
  seed.entity_id,
  seed.name_text,
  public.vehicle_catalog_name_key(seed.name_text),
  seed.locale,
  seed.name_kind,
  seed.matching_mode,
  'operator_confirmed',
  'published'
from (
  values
    ('fiat', 'FIAT', 'en', 'canonical', 'exact'),
    ('fiat', 'フィアット', 'ja', 'localized_name', 'exact'),
    ('nissan', 'NISSAN', 'en', 'canonical', 'exact'),
    ('nissan', '日産', 'ja', 'localized_name', 'exact'),
    ('nissan', 'ニッサン', 'ja', 'localized_name', 'exact'),
    ('prince', 'PRINCE', 'en', 'canonical', 'exact'),
    ('prince', 'プリンス', 'ja', 'localized_name', 'exact'),
    ('honda', 'HONDA', 'en', 'canonical', 'exact'),
    ('honda', 'ホンダ', 'ja', 'localized_name', 'exact'),
    ('toyota', 'TOYOTA', 'en', 'canonical', 'exact'),
    ('toyota', 'トヨタ', 'ja', 'localized_name', 'exact'),
    ('lexus', 'LEXUS', 'en', 'canonical', 'exact'),
    ('lexus', 'レクサス', 'ja', 'localized_name', 'exact'),
    ('suzuki', 'SUZUKI', 'en', 'canonical', 'exact'),
    ('suzuki', 'スズキ', 'ja', 'localized_name', 'exact'),
    ('mazda', 'MAZDA', 'en', 'canonical', 'exact'),
    ('mazda', 'マツダ', 'ja', 'localized_name', 'exact'),
    ('eunos', 'EUNOS', 'en', 'canonical', 'exact'),
    ('eunos', 'ユーノス', 'ja', 'localized_name', 'exact'),
    ('efini', 'ɛ̃FINI', 'en', 'canonical', 'exact'),
    ('efini', 'アンフィニ', 'ja', 'localized_name', 'exact'),
    ('autozam', 'AUTOZAM', 'en', 'canonical', 'exact'),
    ('autozam', 'オートザム', 'ja', 'localized_name', 'exact'),
    ('subaru', 'SUBARU', 'en', 'canonical', 'exact'),
    ('subaru', 'スバル', 'ja', 'localized_name', 'exact'),
    ('subaru', '富士重工', 'ja', 'historical_corporate_name', 'candidate_only'),
    ('subaru', '富士重工業', 'ja', 'historical_corporate_name', 'candidate_only'),
    ('mg', 'MG', 'en', 'canonical', 'exact'),
    ('mg', 'エムジー', 'ja', 'localized_name', 'exact'),
    ('bertone', 'BERTONE', 'en', 'canonical', 'exact'),
    ('bertone', 'ベルトーネ', 'ja', 'localized_name', 'exact'),
    ('alfa-romeo', 'ALFA ROMEO', 'en', 'canonical', 'exact'),
    ('alfa-romeo', 'アルファロメオ', 'ja', 'localized_name', 'exact'),
    ('vespa', 'VESPA', 'en', 'canonical', 'exact'),
    ('vespa', 'ベスパ', 'ja', 'localized_name', 'exact'),
    ('lotus', 'LOTUS', 'en', 'canonical', 'exact'),
    ('lotus', 'ロータス', 'ja', 'localized_name', 'exact'),
    ('caterham', 'CATERHAM', 'en', 'canonical', 'exact'),
    ('caterham', 'ケータハム', 'ja', 'localized_name', 'exact'),
    ('birkin', 'BIRKIN', 'en', 'canonical', 'exact'),
    ('birkin', 'バーキン', 'ja', 'localized_name', 'exact'),
    ('opel', 'OPEL', 'en', 'canonical', 'exact'),
    ('opel', 'オペル', 'ja', 'localized_name', 'exact'),
    ('vauxhall', 'VAUXHALL', 'en', 'canonical', 'exact'),
    ('vauxhall', 'ボクスホール', 'ja', 'localized_name', 'exact'),
    ('peugeot', 'PEUGEOT', 'en', 'canonical', 'exact'),
    ('peugeot', 'プジョー', 'ja', 'localized_name', 'exact'),
    ('citroen', 'CITROËN', 'en', 'canonical', 'exact'),
    ('citroen', 'CITROEN', 'en', 'common_name', 'exact'),
    ('citroen', 'シトロエン', 'ja', 'localized_name', 'exact'),
    ('renault', 'RENAULT', 'en', 'canonical', 'exact'),
    ('renault', 'ルノー', 'ja', 'localized_name', 'exact'),
    ('lancia', 'LANCIA', 'en', 'canonical', 'exact'),
    ('lancia', 'ランチア', 'ja', 'localized_name', 'exact'),
    ('subaru-corporation', 'SUBARU CORPORATION', 'en', 'canonical', 'exact'),
    ('subaru-corporation', '富士重工業', 'ja', 'historical_corporate_name', 'exact'),
    ('mazda-motor-corporation', 'MAZDA MOTOR CORPORATION', 'en', 'canonical', 'exact'),
    ('toyota-motor-corporation', 'TOYOTA MOTOR CORPORATION', 'en', 'canonical', 'exact'),
    ('peugeot-205', '205', null, 'canonical', 'exact'),
    ('peugeot-205-global', '205', null, 'market_name', 'exact'),
    ('peugeot-205-gen1', '205', null, 'generation_name', 'candidate_only'),
    ('peugeot-205-standard', 'Standard', 'en', 'grade_name', 'candidate_only'),
    ('peugeot-205-gti', 'GTI', 'en', 'grade_name', 'exact'),
    ('peugeot-205-gti', 'GT-i', 'en', 'grade_name', 'exact'),
    ('peugeot-205-gti-1-6', 'GTI 1.6', 'en', 'grade_name', 'exact'),
    ('peugeot-205-gti-1-9', 'GTI 1.9', 'en', 'grade_name', 'exact'),
    ('peugeot-205-turbo-16', 'Turbo 16', 'en', 'grade_name', 'exact'),
    ('peugeot-205-turbo-16', 'T16', 'en', 'grade_name', 'exact')
) as seed(entity_id, name_text, locale, name_kind, matching_mode);

insert into public.vehicle_catalog_relations (
  from_entity_id,
  to_entity_id,
  relation_type,
  status
) values
  ('subaru', 'subaru-corporation', 'manufactured_by', 'published'),
  ('mazda', 'mazda-motor-corporation', 'manufactured_by', 'published'),
  ('eunos', 'mazda-motor-corporation', 'manufactured_by', 'published'),
  ('efini', 'mazda-motor-corporation', 'manufactured_by', 'published'),
  ('autozam', 'mazda-motor-corporation', 'manufactured_by', 'published'),
  ('toyota', 'toyota-motor-corporation', 'manufactured_by', 'published'),
  ('lexus', 'toyota-motor-corporation', 'manufactured_by', 'published');

comment on table public.vehicle_catalog_entities is
  'Moderated vehicle identity graph. Marque, manufacturer, sales channel, model, generation, variant, and configuration remain distinct.';
comment on table public.vehicle_catalog_suggestions is
  'Private tester proposals. A suggestion never changes the published catalog until an operator reviews it.';
comment on column public.vehicle_catalog_names.matching_mode is
  'candidate_only names may suggest a match but must never silently normalize owner input.';

commit;
