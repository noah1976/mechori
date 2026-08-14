begin;

create or replace function public.can_read_alpha_shared_journal_media(
  p_path text
)
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
      split_part(p_path, '/', 1) = auth.uid()::text
      or exists (
        select 1
        from public.alpha_shared_journals shared,
          jsonb_array_elements(shared.payload->'media') media
        where shared.moderation_state = 'visible'
          and media->>'assetPath' = p_path
      )
    );
$$;

revoke all on function public.can_read_alpha_shared_journal_media(text)
  from public, anon, authenticated;
grant execute on function public.can_read_alpha_shared_journal_media(text)
  to authenticated;

drop policy if exists "active testers read shared alpha journal images"
  on storage.objects;

create policy "active testers read shared alpha journal images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'alpha-journal-media'
    and public.can_read_alpha_shared_journal_media(name)
  );

commit;
