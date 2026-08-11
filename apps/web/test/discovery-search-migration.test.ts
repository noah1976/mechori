import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../../../supabase/migrations/202608120001_alpha_owner_vehicle_discovery_search.sql", import.meta.url),
  "utf8",
);

test("discovery search projects only public owner and vehicle fields through bounded RPCs", () => {
  assert.match(sql, /create function public\.search_alpha_public_owners\(p_query text\)/);
  assert.match(sql, /create or replace function public\.search_alpha_public_vehicles\(p_query text\)/);
  assert.match(sql, /share\.is_active/);
  assert.match(sql, /char_length\(input\.query\) between 1 and 80/);
  assert.match(sql, /position\(input\.query in lower\(share\.make\)\)/);
  assert.match(sql, /position\(input\.query in lower\(share\.model\)\)/);
  assert.match(sql, /position\(input\.query in lower\(coalesce\(share\.nickname, ''\)\)\)/);
  assert.match(sql, /position\(input\.query in lower\(profile\.display_name\)\)/);
  assert.match(sql, /limit 20/);
  assert.doesNotMatch(sql, /email|raw_user_meta_data|vin/i);
});

test("discovery RPCs require an active authenticated alpha member and preserve block boundaries", () => {
  assert.match(sql, /auth\.uid\(\) is not null/);
  assert.match(sql, /public\.is_active_test_member\(auth\.uid\(\)\)/);
  assert.match(sql, /not public\.alpha_profiles_block_each_other\(auth\.uid\(\), profile\.user_id\)/);
  assert.match(sql, /revoke all on function public\.search_alpha_public_vehicles\(text\)/);
  assert.match(sql, /grant execute on function public\.search_alpha_public_vehicles\(text\)\s+to authenticated/);
  assert.doesNotMatch(sql, /grant execute on function public\.search_alpha_public_vehicles\(text\)\s+to anon/);
});

test("vehicle nickname is an optional bounded public snapshot field", () => {
  assert.match(sql, /add column nickname text check \(nickname is null or char_length\(nickname\) between 1 and 80\)/);
  assert.match(sql, /grant select \(nickname\) on public\.alpha_public_vehicle_shares to anon, authenticated/);
});
