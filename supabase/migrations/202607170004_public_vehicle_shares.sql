begin;

create table public.alpha_public_vehicle_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id text not null,
  slug text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  make text not null check (char_length(make) between 1 and 80),
  model text not null check (char_length(model) between 1 and 120),
  model_year integer check (model_year between 1886 and 2200),
  ownership_started_year integer check (ownership_started_year between 1886 and 2200),
  ownership_started_month integer check (ownership_started_month between 1 and 12),
  owner_comment text check (char_length(owner_comment) <= 160),
  image_data_url text not null check (
    (image_data_url like 'data:image/webp;base64,%'
      or image_data_url like 'data:image/jpeg;base64,%')
    and char_length(image_data_url) <= 750000
  ),
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vehicle_id)
);

alter table public.alpha_public_vehicle_shares enable row level security;

create policy "active vehicle shares are public"
  on public.alpha_public_vehicle_shares for select to anon, authenticated
  using (is_active);

create policy "owners can read their own inactive vehicle shares"
  on public.alpha_public_vehicle_shares for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "active testers can create their vehicle shares"
  on public.alpha_public_vehicle_shares for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.test_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  );

create policy "owners can update their vehicle shares"
  on public.alpha_public_vehicle_shares for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owners can delete their vehicle shares"
  on public.alpha_public_vehicle_shares for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.alpha_public_vehicle_shares from public, anon, authenticated;
grant select (
  slug,
  make,
  model,
  model_year,
  ownership_started_year,
  ownership_started_month,
  owner_comment,
  image_data_url,
  published_at
) on public.alpha_public_vehicle_shares to anon, authenticated;
grant insert, update, delete on public.alpha_public_vehicle_shares to authenticated;

create function public.get_my_vehicle_share(p_vehicle_id text)
returns table (
  slug text,
  make text,
  model text,
  model_year integer,
  ownership_started_year integer,
  ownership_started_month integer,
  owner_comment text,
  image_data_url text,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    share.slug,
    share.make,
    share.model,
    share.model_year,
    share.ownership_started_year,
    share.ownership_started_month,
    share.owner_comment,
    share.image_data_url,
    share.published_at
  from public.alpha_public_vehicle_shares share
  where share.user_id = (select auth.uid())
    and share.vehicle_id = p_vehicle_id
    and share.is_active
  limit 1;
$$;

revoke all on function public.get_my_vehicle_share(text) from public, anon, authenticated;
grant execute on function public.get_my_vehicle_share(text) to authenticated;

comment on table public.alpha_public_vehicle_shares is
  'Explicitly published, privacy-minimized vehicle profile snapshots for alpha sharing. No maintenance details or owner identifiers.';

commit;
