import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202608120003_professional_service_provider_foundation.sql", import.meta.url),
  "utf8",
);

test("professional foundation separates providers, organizations, links, and memberships", () => {
  assert.match(migration, /create table public\.service_providers/);
  assert.match(migration, /create table public\.professional_organizations/);
  assert.match(migration, /create table public\.service_provider_organization_links/);
  assert.match(migration, /create table public\.professional_organization_memberships/);
  assert.match(migration, /founding_garage boolean not null default false/);
  assert.match(migration, /primary key \(organization_id, user_id\)/);
});

test("provider access is RPC-only and does not expose private user fields", () => {
  assert.match(migration, /revoke all on public\.service_providers from public, anon, authenticated/);
  assert.match(migration, /public\.is_active_test_member\(auth\.uid\(\)\)/);
  assert.match(migration, /returns table \(\s*id uuid,\s*display_name text,\s*locality text,\s*status text,\s*source text\s*\)/);
  assert.doesNotMatch(migration, /returns table \([^)]*email/is);
  assert.match(migration, /'unverified', 'user_submitted'/);
});

test("organization mutations enforce owner or platform-admin authorization", () => {
  assert.match(migration, /public\.is_alpha_admin\(auth\.uid\(\)\)/);
  assert.match(migration, /public\.can_manage_professional_organization\(p_organization_id, auth\.uid\(\)\)/);
  assert.match(migration, /raise exception 'last_owner_required'/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all on function public\.admin_create_professional_organization/);
});

test("organization operations write to the existing audit history", () => {
  for (const action of [
    "professional_organization_created",
    "professional_organization_updated",
    "professional_provider_link_changed",
    "professional_member_added",
    "professional_member_role_changed",
    "professional_member_removed",
  ]) {
    assert.match(migration, new RegExp(`'${action}'`));
  }
});
