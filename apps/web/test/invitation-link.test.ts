import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInvitationUrl,
  createInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  invitationValidityDays,
} from "../lib/invitation-link.ts";

test("creates a URL-safe invitation token with enough entropy", () => {
  const first = createInvitationToken();
  const second = createInvitationToken();

  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
});

test("hashes an invitation token without exposing the raw value", async () => {
  const hash = await hashInvitationToken("a".repeat(43));

  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash.includes("a".repeat(43)), false);
});

test("keeps the invitation token in the URL fragment", () => {
  const url = new URL(buildInvitationUrl("https://mechori-alpha.netlify.app", "secret-token"));

  assert.equal(url.pathname, "/auth");
  assert.equal(url.searchParams.get("mode"), "signup");
  assert.equal(url.searchParams.has("invite"), false);
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("invite"), "secret-token");
});

test("uses the fixed member invitation validity", () => {
  const now = Date.UTC(2026, 6, 22, 0, 0, 0);
  const expiresAt = Date.parse(invitationExpiresAt(now));

  assert.equal(expiresAt - now, invitationValidityDays * 24 * 60 * 60 * 1000);
});
