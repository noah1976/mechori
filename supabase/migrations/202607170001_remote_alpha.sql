begin;

create extension if not exists pgcrypto with schema extensions;

create table public.app_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_code text not null check (role_code in ('owner', 'alpha_admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role_code)
);

create table public.test_invitations (
  id uuid primary key default gen_random_uuid(),
  phase text not null check (phase in ('alpha', 'beta')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  revoked_at timestamptz,
  check (expires_at > created_at)
);

create table public.invitation_redemptions (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.test_invitations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (invitation_id, user_id)
);

create table public.test_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phase text not null check (phase in ('alpha', 'beta')),
  status text not null default 'active' check (status in ('active', 'suspended', 'withdrawn')),
  invitation_id uuid not null references public.test_invitations(id) on delete restrict,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'MECHORI User' check (char_length(display_name) between 1 and 80),
  preferred_locale text not null default 'ja' check (char_length(preferred_locale) between 2 and 35),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Alpha-only persistence boundary. Normalize vehicle and maintenance entities before beta.
create table public.alpha_private_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null check (schema_version > 0),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object')
);

create index invitation_redemptions_invitation_idx
  on public.invitation_redemptions (invitation_id);

alter table public.app_user_roles enable row level security;
alter table public.test_invitations enable row level security;
alter table public.invitation_redemptions enable row level security;
alter table public.test_memberships enable row level security;
alter table public.app_user_profiles enable row level security;
alter table public.alpha_private_workspaces enable row level security;

create policy "users can read their own roles"
  on public.app_user_roles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can read their own redemption"
  on public.invitation_redemptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can read their own membership"
  on public.test_memberships for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can read their own profile"
  on public.app_user_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can update their own profile"
  on public.app_user_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "active testers can read their private workspace"
  on public.alpha_private_workspaces for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.test_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  );

create policy "active testers can create their private workspace"
  on public.alpha_private_workspaces for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.test_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  );

create policy "active testers can update their private workspace"
  on public.alpha_private_workspaces for update to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.test_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  )
  with check ((select auth.uid()) = user_id);

revoke all on public.test_invitations from anon, authenticated;
revoke insert, update, delete on public.app_user_roles from anon, authenticated;
revoke insert, update, delete on public.invitation_redemptions from anon, authenticated;
revoke insert, update, delete on public.test_memberships from anon, authenticated;
revoke insert, delete on public.app_user_profiles from anon, authenticated;
revoke delete on public.alpha_private_workspaces from anon, authenticated;

create or replace function public.is_test_operator(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_user_roles role
    where role.user_id = p_user_id
      and role.role_code in ('owner', 'alpha_admin')
  );
$$;

revoke all on function public.is_test_operator(uuid) from public, anon, authenticated;

create or replace function public.create_test_invitation(
  p_token_hash text,
  p_phase text,
  p_expires_at timestamptz,
  p_max_redemptions integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
begin
  if auth.uid() is null or not public.is_test_operator(auth.uid()) then
    raise exception 'operator_required';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token_hash';
  end if;

  insert into public.test_invitations (
    phase,
    token_hash,
    created_by_user_id,
    expires_at,
    max_redemptions
  ) values (
    p_phase,
    p_token_hash,
    auth.uid(),
    p_expires_at,
    p_max_redemptions
  ) returning id into invitation_id;

  return invitation_id;
end;
$$;

create or replace function public.redeem_test_invitation(p_raw_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.test_invitations%rowtype;
  redemption_count integer;
  token_hash text;
  existing_status text;
begin
  if auth.uid() is null then
    return 'authentication_required';
  end if;
  if p_raw_token is null or char_length(p_raw_token) < 32 or char_length(p_raw_token) > 512 then
    return 'invalid_invitation';
  end if;

  token_hash := encode(extensions.digest(convert_to(p_raw_token, 'UTF8'), 'sha256'), 'hex');

  select * into invitation
  from public.test_invitations
  where test_invitations.token_hash = token_hash
  for update;

  if invitation.id is null then return 'invalid_invitation'; end if;

  select membership.status into existing_status
  from public.test_memberships membership
  where membership.user_id = auth.uid();

  if existing_status = 'active' then return 'already_redeemed'; end if;
  if existing_status is not null then return 'membership_inactive'; end if;
  if invitation.revoked_at is not null then return 'revoked'; end if;
  if now() >= invitation.expires_at then return 'expired'; end if;

  select count(*) into redemption_count
  from public.invitation_redemptions redemption
  where redemption.invitation_id = invitation.id;

  if redemption_count >= invitation.max_redemptions then return 'exhausted'; end if;

  insert into public.invitation_redemptions (invitation_id, user_id)
  values (invitation.id, auth.uid());

  insert into public.test_memberships (user_id, phase, invitation_id)
  values (auth.uid(), invitation.phase, invitation.id);

  insert into public.app_user_profiles (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  return 'redeemed';
end;
$$;

revoke all on function public.create_test_invitation(text, text, timestamptz, integer)
  from public, anon, authenticated;
revoke all on function public.redeem_test_invitation(text)
  from public, anon, authenticated;

grant execute on function public.is_test_operator(uuid) to authenticated;
grant execute on function public.create_test_invitation(text, text, timestamptz, integer) to authenticated;
grant execute on function public.redeem_test_invitation(text) to authenticated;

comment on table public.alpha_private_workspaces is
  'Temporary per-user persistence for the 3-5 person remote alpha. Must be normalized before beta.';

commit;
