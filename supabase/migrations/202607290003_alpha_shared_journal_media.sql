begin;

create or replace function public.is_valid_alpha_shared_media(p_media jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_media is null or jsonb_typeof(p_media) <> 'array' then
    return false;
  end if;
  if jsonb_array_length(p_media) > 6 then
    return false;
  end if;
  return not exists (
      select 1
      from jsonb_array_elements(p_media) media
      where jsonb_typeof(media) <> 'object'
        or media->>'kind' <> 'image'
        or media->>'source' <> 'alpha_shared'
        or media->>'privacyState' <> 'public_ready'
        or media->>'isDemo' <> 'false'
        or media ? 'storageKey'
        or coalesce(media->>'id', '') !~ '^[A-Za-z0-9_-]{1,160}$'
        or coalesce(media->>'assetPath', '') !~ '^[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+$'
        or char_length(coalesce(media->>'assetPath', '')) > 500
        or media->>'assetPath' like '%..%'
        or coalesce(media->>'mimeType', '') not in (
          'image/jpeg',
          'image/png',
          'image/webp'
        )
        or case
          when jsonb_typeof(media->'sizeBytes') = 'number'
            then (media->>'sizeBytes')::numeric not between 1 and 524288
          else true
        end
        or jsonb_typeof(media->'altText') <> 'string'
        or char_length(media->>'altText') > 500
        or jsonb_typeof(media->'createdAt') <> 'string'
    );
end
$$;

revoke all on function public.is_valid_alpha_shared_media(jsonb)
  from public, anon, authenticated;

alter table public.alpha_shared_journals
  drop constraint alpha_shared_journals_payload_check;

alter table public.alpha_shared_journals
  add constraint alpha_shared_journals_payload_check check (
    jsonb_typeof(payload) = 'object'
    and payload->>'schemaVersion' = '1'
    and public.is_valid_alpha_shared_media(payload->'media')
    and jsonb_typeof(payload->'contentBlocks') is not distinct from 'array'
    and not (
      payload ?| array[
        'vehicleId',
        'vehicleTargetId',
        'linkedRecordId',
        'displayFields',
        'knowledgeExtractionConsent',
        'storageKey'
      ]
    )
    and octet_length(payload::text) <= 65536
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'alpha-journal-media',
  'alpha-journal-media',
  false,
  524288,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "active testers read shared alpha journal images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'alpha-journal-media'
    and public.is_active_test_member((select auth.uid()))
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.alpha_shared_journals shared,
          jsonb_array_elements(shared.payload->'media') media
        where shared.moderation_state = 'visible'
          and media->>'assetPath' = storage.objects.name
      )
    )
  );

create policy "active testers upload own alpha journal images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'alpha-journal-media'
    and public.is_active_test_member((select auth.uid()))
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "active testers update own alpha journal images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'alpha-journal-media'
    and public.is_active_test_member((select auth.uid()))
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'alpha-journal-media'
    and public.is_active_test_member((select auth.uid()))
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "active testers delete own alpha journal images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'alpha-journal-media'
    and public.is_active_test_member((select auth.uid()))
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function public.publish_alpha_shared_journal(
  p_journal_id text,
  p_author_display_name text,
  p_payload jsonb,
  p_published_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  shared_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.is_active_test_member(auth.uid()) then
    raise exception 'active_membership_required';
  end if;
  if p_journal_id is null or char_length(trim(p_journal_id)) not between 1 and 160 then
    raise exception 'invalid_journal_id';
  end if;
  if p_author_display_name is null
    or char_length(trim(p_author_display_name)) not between 1 and 80 then
    raise exception 'invalid_author_display_name';
  end if;
  if p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or p_payload->>'schemaVersion' <> '1'
    or not public.is_valid_alpha_shared_media(p_payload->'media')
    or jsonb_typeof(p_payload->'contentBlocks') is distinct from 'array'
    or p_payload ?| array[
      'vehicleId',
      'vehicleTargetId',
      'linkedRecordId',
      'displayFields',
      'knowledgeExtractionConsent',
      'storageKey'
    ]
    or exists (
      select 1
      from jsonb_array_elements(p_payload->'media') media
      where media->>'assetPath' not like (auth.uid()::text || '/%')
    )
    or octet_length(p_payload::text) > 65536 then
    raise exception 'invalid_shared_payload';
  end if;

  insert into public.alpha_shared_journals (
    user_id,
    journal_id,
    author_display_name,
    payload,
    published_at,
    updated_at
  ) values (
    auth.uid(),
    trim(p_journal_id),
    trim(p_author_display_name),
    p_payload,
    coalesce(p_published_at, now()),
    now()
  )
  on conflict (user_id, journal_id)
  do update set
    author_display_name = excluded.author_display_name,
    payload = excluded.payload,
    published_at = excluded.published_at,
    updated_at = now()
  where alpha_shared_journals.moderation_state = 'visible'
  returning share_id into shared_id;

  if shared_id is null then
    raise exception 'shared_journal_hidden';
  end if;
  return shared_id;
end;
$$;

revoke all on function public.publish_alpha_shared_journal(text, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.publish_alpha_shared_journal(text, text, jsonb, timestamptz)
  to authenticated;

commit;
