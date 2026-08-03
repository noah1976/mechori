begin;

alter table public.app_user_profiles
  add column profile_image_path text;

alter table public.app_user_profiles
  add constraint app_user_profiles_profile_image_path_check
  check (
    profile_image_path is null
    or (
      char_length(profile_image_path) <= 240
      and profile_image_path !~ '\.\.'
      and profile_image_path ~ '^[0-9a-f-]{36}/avatar-[A-Za-z0-9_.-]+\.(jpg|webp)$'
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'alpha-profile-images',
  'alpha-profile-images',
  false,
  225280,
  array['image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "active testers read allowed alpha profile images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'alpha-profile-images'
    and public.is_active_test_member((select auth.uid()))
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.app_user_profiles profile
        join public.test_memberships membership
          on membership.user_id = profile.user_id
          and membership.status = 'active'
        where profile.profile_image_path = storage.objects.name
          and not public.alpha_profiles_block_each_other(
            (select auth.uid()),
            profile.user_id
          )
      )
    )
  );

create policy "active testers upload own alpha profile images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'alpha-profile-images'
    and public.is_active_test_member((select auth.uid()))
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ ('^' || (select auth.uid())::text || '/avatar-[A-Za-z0-9_.-]+\.(jpg|webp)$')
  );

create policy "active testers delete own alpha profile images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'alpha-profile-images'
    and public.is_active_test_member((select auth.uid()))
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function public.get_my_alpha_profile_image()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.profile_image_path
  from public.app_user_profiles profile
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and profile.user_id = auth.uid();
$$;

create or replace function public.update_my_alpha_profile_image(
  p_profile_image_path text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_path text := nullif(trim(coalesce(p_profile_image_path, '')), '');
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;
  if normalized_path is not null and (
    char_length(normalized_path) > 240
    or normalized_path !~ (
      '^' || auth.uid()::text || '/avatar-[A-Za-z0-9_.-]+\.(jpg|webp)$'
    )
    or normalized_path ~ '\.\.'
    or not exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'alpha-profile-images'
        and object.name = normalized_path
    )
  ) then
    raise exception 'invalid_profile_image_path';
  end if;

  update public.app_user_profiles profile
  set profile_image_path = normalized_path, updated_at = now()
  where profile.user_id = auth.uid();

  update public.alpha_private_workspaces workspace
  set
    payload = jsonb_set(
      workspace.payload,
      '{profiles}',
      coalesce(
        (
          select jsonb_agg(
            case
              when item->>'id' = auth.uid()::text then
                case
                  when normalized_path is null then item - 'profileImagePath'
                  else item || jsonb_build_object('profileImagePath', normalized_path)
                end
              else item
            end
          )
          from jsonb_array_elements(
            case
              when jsonb_typeof(workspace.payload->'profiles') = 'array'
                then workspace.payload->'profiles'
              else '[]'::jsonb
            end
          ) item
        ),
        '[]'::jsonb
      ),
      true
    ),
    updated_at = now()
  where workspace.user_id = auth.uid();

  return normalized_path;
end;
$$;

create or replace function public.get_alpha_public_profile_images(
  p_public_profile_ids uuid[] default null
)
returns table (
  public_profile_id uuid,
  profile_image_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.public_profile_id, profile.profile_image_path
  from public.app_user_profiles profile
  join public.test_memberships membership
    on membership.user_id = profile.user_id
    and membership.status = 'active'
  where auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and profile.profile_image_path is not null
    and (
      p_public_profile_ids is null
      or profile.public_profile_id = any(p_public_profile_ids)
    )
    and (
      profile.user_id = auth.uid()
      or not public.alpha_profiles_block_each_other(auth.uid(), profile.user_id)
    )
  order by profile.public_profile_id
  limit 100;
$$;

revoke all on function public.get_my_alpha_profile_image()
  from public, anon, authenticated;
revoke all on function public.update_my_alpha_profile_image(text)
  from public, anon, authenticated;
revoke all on function public.get_alpha_public_profile_images(uuid[])
  from public, anon, authenticated;

grant execute on function public.get_my_alpha_profile_image()
  to authenticated;
grant execute on function public.update_my_alpha_profile_image(text)
  to authenticated;
grant execute on function public.get_alpha_public_profile_images(uuid[])
  to authenticated;

commit;
