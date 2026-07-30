import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePublicUsername,
  validateProfileIdentity,
} from "../lib/profile-identity.ts";

test("normalizes a public username to a lower-case id without @", () => {
  assert.equal(normalizePublicUsername(" @Noah_Nord "), "noah_nord");
});

test("accepts only 3 to 30 lower-case letters, digits, or underscores", () => {
  assert.equal(
    validateProfileIdentity({
      displayName: "Noah",
      publicUsername: "Noah_1976",
    }).valid,
    true,
  );
  assert.equal(
    validateProfileIdentity({
      displayName: "Noah",
      publicUsername: "no-ah",
    }).errors.publicUsername,
    "invalid",
  );
  assert.equal(
    validateProfileIdentity({
      displayName: "",
      publicUsername: "no",
    }).errors.displayName,
    "required",
  );
});
