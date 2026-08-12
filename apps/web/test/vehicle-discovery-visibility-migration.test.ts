import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202608120004_vehicle_discovery_visibility_and_organization_owner.sql", import.meta.url),
  "utf8",
);

const discoverySync = migration.slice(
  migration.indexOf("create or replace function public.sync_alpha_member_vehicle_discoveries"),
  migration.indexOf("create or replace function public.list_my_alpha_followed_vehicles"),
);

test("member discovery sync defaults legacy vehicles on and persists the owner setting", () => {
  assert.match(discoverySync, /case lower\(coalesce\(vehicle->>'memberDiscoveryEnabled', 'true'\)\)\s+when 'false' then false\s+else true/s);
  assert.match(discoverySync, /is_active = excluded\.is_active/);
  assert.match(discoverySync, /delete from public\.alpha_member_vehicle_discoveries discovery/);
  assert.doesNotMatch(discoverySync, /alpha_public_vehicle_shares/);
});

test("discovery opt-out does not remove existing vehicle follows or external shares", () => {
  const followedVehicles = migration.slice(
    migration.indexOf("create or replace function public.list_my_alpha_followed_vehicles"),
    migration.indexOf("create or replace function public.notify_alpha_journal_published"),
  );
  const publicationNotifications = migration.slice(
    migration.indexOf("create or replace function public.notify_alpha_journal_published"),
    migration.indexOf("create or replace function public.search_professional_member_candidates"),
  );

  assert.match(followedVehicles, /join public\.alpha_member_vehicle_discoveries discovery\s+on discovery\.id::text = followed\.vehicle_target_id/s);
  assert.doesNotMatch(followedVehicles, /discovery\.is_active/);
  assert.match(publicationNotifications, /discovery\.source_vehicle_id = new\.payload->>'vehicleId'/);
  assert.doesNotMatch(publicationNotifications, /discovery\.is_active/);
});
