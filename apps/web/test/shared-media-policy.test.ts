import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationSource = readFileSync(
  new URL(
    "../../../supabase/migrations/202608040001_align_shared_media_member_visibility.sql",
    import.meta.url,
  ),
  "utf8",
);

test("shared journal photos remain private to authenticated active members", () => {
  assert.match(migrationSource, /for select to authenticated/);
  assert.match(migrationSource, /public\.is_active_test_member/);
  assert.match(migrationSource, /bucket_id = 'alpha-journal-media'/);
  assert.doesNotMatch(migrationSource, /to (?:public|anon)\b/);
  assert.doesNotMatch(migrationSource, /update storage\.buckets/i);
});

test("shared photo fetches are allowed without exposing the complete bucket listing", () => {
  assert.match(migrationSource, /'object\.get_authenticated_info'/);
  assert.match(migrationSource, /'object\.get_authenticated'/);
  assert.match(migrationSource, /storage\.allow_only_operation\('object\.list'\)/);
  assert.match(
    migrationSource,
    /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/,
  );
});
