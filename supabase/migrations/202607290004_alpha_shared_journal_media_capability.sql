begin;

create or replace function public.alpha_shared_journal_media_available()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and public.is_active_test_member(auth.uid())
    and exists (
      select 1
      from storage.buckets bucket
      where bucket.id = 'alpha-journal-media'
        and bucket.public = false
        and bucket.file_size_limit = 524288
        and bucket.allowed_mime_types = array[
          'image/jpeg',
          'image/png',
          'image/webp'
        ]::text[]
    );
$$;

revoke all on function public.alpha_shared_journal_media_available()
  from public, anon, authenticated;
grant execute on function public.alpha_shared_journal_media_available()
  to authenticated;

commit;
