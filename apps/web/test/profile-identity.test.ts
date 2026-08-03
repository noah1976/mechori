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

test("keeps a short bio but rejects contact details and markup", () => {
  const accepted = validateProfileIdentity({
    displayName: "Noah",
    publicUsername: "noah_1976",
    bio: "古いクルマを長く楽しんでいます。",
  });
  assert.equal(accepted.valid, true);
  assert.equal(accepted.normalized.bio, "古いクルマを長く楽しんでいます。");

  assert.equal(
    validateProfileIdentity({
      displayName: "Noah",
      publicUsername: "noah_1976",
      bio: "mail@example.com へ連絡してください",
    }).errors.bio,
    "invalid",
  );
  assert.equal(
    validateProfileIdentity({
      displayName: "Noah",
      publicUsername: "noah_1976",
      bio: "090-1234-5678",
    }).errors.bio,
    "invalid",
  );
  assert.equal(
    validateProfileIdentity({
      displayName: "Noah",
      publicUsername: "noah_1976",
      bio: "<a href='https://example.com'>profile</a>",
    }).errors.bio,
    "invalid",
  );
});
