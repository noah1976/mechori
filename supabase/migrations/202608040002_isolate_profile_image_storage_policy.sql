begin;

-- storage.objects combines permissive SELECT policies across private buckets.
-- Keep the block graph private while giving Storage one path-scoped predicate
-- that it can safely execute for profile-image fetches.
create or replace function public.can_read_alpha_profile_image(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and (
      (storage.foldername(p_path))[1] = auth.uid()::text
      or exists (
        select 1
        from public.app_user_profiles profile
        join public.test_memberships membership
          on membership.user_id = profile.user_id
          and membership.status = 'active'
        where profile.profile_image_path = p_path
          and not public.alpha_profiles_block_each_other(
            auth.uid(),
            profile.user_id
          )
      )
    );
$$;

revoke all on function public.can_read_alpha_profile_image(text)
  from public, anon, authenticated;
grant execute on function public.can_read_alpha_profile_image(text)
  to authenticated;

drop policy if exists "active testers read allowed alpha profile images"
  on storage.objects;
drop policy if exists "active members fetch allowed alpha profile images"
  on storage.objects;

create policy "active members fetch allowed alpha profile images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'alpha-profile-images'
    and public.can_read_alpha_profile_image(name)
    and storage.allow_any_operation(array[
      'object.get_authenticated_info',
      'object.get_authenticated'
    ])
  );

commit;
