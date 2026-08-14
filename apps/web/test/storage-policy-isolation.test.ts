import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationSource = readFileSync(
  new URL(
    "../../../supabase/migrations/202608040002_isolate_profile_image_storage_policy.sql",
    import.meta.url,
  ),
  "utf8",
);

test("profile image policy no longer directly calls the private block helper", () => {
  const policyStart = migrationSource.indexOf(
    'create policy "active members fetch allowed alpha profile images"',
  );
  assert.notEqual(policyStart, -1);
  const policySource = migrationSource.slice(policyStart);

  assert.match(policySource, /public\.can_read_alpha_profile_image\(name\)/);
  assert.doesNotMatch(policySource, /alpha_profiles_block_each_other/);
});

test("path-scoped profile image access preserves block privacy", () => {
  assert.match(
    migrationSource,
    /create or replace function public\.can_read_alpha_profile_image\(p_path text\)/,
  );
  assert.match(migrationSource, /security definer/);
  assert.match(migrationSource, /public\.alpha_profiles_block_each_other/);
  assert.match(
    migrationSource,
    /grant execute on function public\.can_read_alpha_profile_image\(text\)\s+to authenticated/,
  );
  assert.doesNotMatch(
    migrationSource,
    /grant execute on function public\.alpha_profiles_block_each_other/,
  );
});

test("profile images remain private authenticated fetches", () => {
  assert.match(migrationSource, /for select to authenticated/);
  assert.match(migrationSource, /bucket_id = 'alpha-profile-images'/);
  assert.match(migrationSource, /'object\.get_authenticated_info'/);
  assert.match(migrationSource, /'object\.get_authenticated'/);
  assert.doesNotMatch(migrationSource, /update storage\.buckets/i);
  assert.doesNotMatch(migrationSource, /to (?:public|anon)\b/);
});
