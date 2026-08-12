import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202608120004_vehicle_discovery_visibility_and_organization_owner.sql", import.meta.url),
  "utf8",
);

const createOrganization = migration.slice(
  migration.indexOf("create or replace function public.admin_create_professional_organization"),
  migration.indexOf("comment on function public.sync_alpha_member_vehicle_discoveries"),
);

test("organization creation rejects a missing initial OWNER before inserting an organization", () => {
  const initialOwnerCheck = createOrganization.indexOf("raise exception 'initial_owner_required'");
  const organizationInsert = createOrganization.indexOf("insert into public.professional_organizations");

  assert.ok(initialOwnerCheck >= 0);
  assert.ok(organizationInsert > initialOwnerCheck);
  assert.match(createOrganization, /not public\.is_active_test_member\(p_owner_user_id\)/);
});

test("organization and required OWNER membership are created in one trusted function", () => {
  assert.match(createOrganization, /security definer/);
  assert.match(createOrganization, /set search_path = ''/);
  assert.match(createOrganization, /insert into public\.professional_organization_memberships[\s\S]*\) values \(organization_id, p_owner_user_id, 'owner', auth\.uid\(\)\)/);
  assert.match(createOrganization, /jsonb_build_object\([\s\S]*'initialOwnerUserId', p_owner_user_id/s);
});

test("only platform admins can search an initial OWNER without an organization", () => {
  const candidates = migration.slice(
    migration.indexOf("create or replace function public.search_professional_member_candidates"),
    migration.indexOf("create or replace function public.admin_create_professional_organization"),
  );

  assert.match(candidates, /public\.is_alpha_admin\(auth\.uid\(\)\)/);
  assert.match(candidates, /p_organization_id is not null[\s\S]*public\.can_manage_professional_organization/s);
  assert.doesNotMatch(candidates, /email|raw_user_meta_data/i);
});
