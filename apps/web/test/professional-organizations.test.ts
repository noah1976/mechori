import assert from "node:assert/strict";
import test from "node:test";
import {
  canEditProfessionalPlatformFields,
  canManageProfessionalOrganization,
} from "../lib/professional-organization-policy.ts";

test("OWNER can manage its organization and STAFF remains read-only", () => {
  assert.equal(canManageProfessionalOrganization("owner", false), true);
  assert.equal(canManageProfessionalOrganization("staff", false), false);
  assert.equal(canManageProfessionalOrganization(undefined, false), false);
});

test("platform admin manages organizations without a membership", () => {
  assert.equal(canManageProfessionalOrganization(undefined, true), true);
  assert.equal(canEditProfessionalPlatformFields(true), true);
});

test("organization members cannot edit platform-owned status or Founding Garage", () => {
  assert.equal(canEditProfessionalPlatformFields(false), false);
});

test("inactive organizations are read-only for OWNER but recoverable by platform admin", () => {
  assert.equal(canManageProfessionalOrganization("owner", false, "inactive"), false);
  assert.equal(canManageProfessionalOrganization(undefined, true, "inactive"), true);
});
