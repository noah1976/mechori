begin;

-- alpha-journal-media contains only the browser-regenerated copies attached to
-- shared Journal records. Keep the bucket private while allowing active,
-- authenticated MECHORI members to fetch those copies.
drop policy if exists "active testers read shared alpha journal images"
  on storage.objects;
drop policy if exists "active members fetch shared alpha journal images"
  on storage.objects;
drop policy if exists "active members list own shared alpha journal images"
  on storage.objects;

create policy "active members fetch shared alpha journal images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'alpha-journal-media'
    and public.is_active_test_member((select auth.uid()))
    and storage.allow_any_operation(array[
      'object.get_authenticated_info',
      'object.get_authenticated'
    ])
  );

-- Listing is required by the owner's stale-object cleanup. Do not expose a
-- complete bucket listing to other members.
create policy "active members list own shared alpha journal images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'alpha-journal-media'
    and public.is_active_test_member((select auth.uid()))
    and storage.allow_only_operation('object.list')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
