import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../../../supabase/migrations/202608110001_alpha_notifications.sql", import.meta.url),
  "utf8",
);

test("notification storage is recipient-private and browser clients cannot insert", () => {
  assert.match(sql, /alter table public\.alpha_notifications enable row level security/);
  assert.match(sql, /auth\.uid\(\)\) = recipient_user_id/);
  assert.match(sql, /revoke all on public\.alpha_notifications from public, anon, authenticated/);
  assert.doesNotMatch(sql, /grant insert[\s\S]*alpha_notifications/);
  assert.match(sql, /set search_path = ''/);
});

test("successful source inserts generate notifications with database-side dedupe", () => {
  assert.match(sql, /after insert on public\.alpha_journal_likes/);
  assert.match(sql, /after insert on public\.alpha_user_follows/);
  assert.match(sql, /after insert on public\.alpha_shared_journals/);
  assert.match(sql, /unique \(recipient_user_id, source_key\)/);
  assert.match(sql, /'journal_published:' \|\| new\.user_id::text \|\| ':' \|\| new\.journal_id/);
  assert.match(sql, /select distinct[\s\S]*from recipient_candidates/);
  assert.match(sql, /union[\s\S]*targetType' = 'vehicle'/);
  assert.match(sql, /candidate\.recipient_user_id <> new\.user_id/);
  assert.match(sql, /new\.moderation_state <> 'visible'/);
});

test("read RPCs are scoped to auth.uid and list access-safe record metadata", () => {
  assert.match(sql, /notification\.recipient_user_id = auth\.uid\(\)/);
  assert.match(sql, /notification\.read_at is null/);
  assert.match(sql, /update public\.alpha_notifications notification[\s\S]*set read_at[\s\S]*notification\.recipient_user_id = auth\.uid\(\)/);
  assert.match(sql, /shared\.moderation_state = 'visible'/);
  assert.match(sql, /not public\.alpha_profiles_block_each_other\(auth\.uid\(\), shared\.user_id\)/);
  assert.match(sql, /order by notification\.created_at desc, notification\.id desc/);
});
