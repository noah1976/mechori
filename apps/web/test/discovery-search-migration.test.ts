import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../../../supabase/migrations/202608120002_alpha_member_vehicle_discovery.sql", import.meta.url),
  "utf8",
);

test("alpha discovery is a separate, bounded read model with an existing-vehicle backfill", () => {
  assert.match(sql, /create table public\.alpha_member_vehicle_discoveries/);
  assert.match(sql, /alter table public\.alpha_member_vehicle_discoveries enable row level security/);
  assert.match(sql, /revoke all on public\.alpha_member_vehicle_discoveries from public, anon, authenticated/);
  assert.match(sql, /create or replace function public\.sync_alpha_member_vehicle_discoveries/);
  assert.match(sql, /after insert or update of payload on public\.alpha_private_workspaces/);
  assert.match(sql, /after insert or update of status on public\.test_memberships/);
  assert.match(sql, /join public\.test_memberships membership[\s\S]*membership\.status = 'active'/);
  assert.match(sql, /select public\.sync_alpha_member_vehicle_discoveries\(workspace\.user_id\)/);
  assert.match(sql, /set is_active = true, updated_at = now\(\)[\s\S]*membership\.status = 'active'/);
  assert.match(sql, /on conflict \(user_id, source_vehicle_id\)[\s\S]*updated_at = now\(\);/);
  assert.match(sql, /default false/);
});

test("alpha vehicle search projects only minimal member-visible fields through bounded RPCs", () => {
  assert.match(sql, /create function public\.search_alpha_member_owners\(p_query text\)/);
  assert.match(sql, /create function public\.search_alpha_member_vehicles\(p_query text\)/);
  assert.match(sql, /create function public\.resolve_alpha_member_profile\(p_public_username text\)/);
  assert.match(sql, /from public\.alpha_member_vehicle_discoveries discovery/);
  assert.match(sql, /char_length\(input\.query\) between 1 and 80/);
  assert.match(sql, /position\(input\.query in lower\(discovery\.make\)\)/);
  assert.match(sql, /position\(input\.query in lower\(discovery\.model\)\)/);
  assert.match(sql, /position\(input\.query in lower\(coalesce\(discovery\.nickname, ''\)\)\)/);
  assert.match(sql, /position\(input\.query in lower\(profile\.display_name\)\)/);
  assert.match(sql, /limit 20/);
  const vehicleSearch = sql.slice(
    sql.indexOf("create function public.search_alpha_member_vehicles"),
    sql.indexOf("create function public.get_alpha_member_owner"),
  );
  assert.doesNotMatch(vehicleSearch, /alpha_public_vehicle_shares/);
  assert.doesNotMatch(vehicleSearch, /email|raw_user_meta_data|vin|location/i);
});

test("discovery RPCs require an active authenticated alpha member and preserve block boundaries", () => {
  assert.match(sql, /auth\.uid\(\) is not null/);
  assert.match(sql, /public\.is_active_test_member\(auth\.uid\(\)\)/);
  assert.match(sql, /not public\.alpha_profiles_block_each_other\(auth\.uid\(\), profile\.user_id\)/);
  assert.match(sql, /revoke all on function public\.search_alpha_member_vehicles\(text\)/);
  assert.match(sql, /grant execute on function public\.search_alpha_member_vehicles\(text\)\s+to authenticated/);
  assert.match(sql, /grant execute on function public\.resolve_alpha_member_profile\(text\)\s+to authenticated/);
  assert.doesNotMatch(sql, /grant execute on function public\.search_alpha_member_vehicles\(text\)\s+to anon/);
});

test("vehicle follows resolve both existing external shares and alpha-only discovery IDs", () => {
  assert.match(sql, /join public\.alpha_member_vehicle_discoveries discovery/);
  assert.match(sql, /join public\.alpha_public_vehicle_shares share/);
  assert.match(sql, /on conflict \(recipient_user_id, source_key\) do nothing/);
});
