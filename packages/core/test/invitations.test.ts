import assert from "node:assert/strict";
import test from "node:test";
import {
  decideInvitationRedemption,
  type InvitationRedemption,
  type TestInvitation,
} from "../src/index.ts";

const invitation: TestInvitation = {
  id: "invite-alpha-001",
  phase: "alpha",
  tokenHash: "server-side-token-hash",
  createdByUserId: "owner-001",
  createdAt: "2026-07-17T00:00:00.000Z",
  expiresAt: "2026-07-31T00:00:00.000Z",
  maxRedemptions: 1,
};

const redemption: InvitationRedemption = {
  id: "redemption-001",
  invitationId: invitation.id,
  userId: "tester-001",
  redeemedAt: "2026-07-18T00:00:00.000Z",
};

test("allows an active invitation with capacity", () => {
  assert.deepEqual(
    decideInvitationRedemption(
      invitation,
      [],
      "tester-001",
      new Date("2026-07-18T00:00:00.000Z"),
    ),
    { allowed: true, reason: "eligible", remainingRedemptions: 1 },
  );
});

test("keeps redemption idempotent for the same tester", () => {
  assert.deepEqual(
    decideInvitationRedemption(
      invitation,
      [redemption],
      "tester-001",
      new Date("2026-07-19T00:00:00.000Z"),
    ),
    { allowed: true, reason: "already_redeemed", remainingRedemptions: 0 },
  );
});

test("does not let another tester reuse a single-use invitation", () => {
  assert.deepEqual(
    decideInvitationRedemption(
      invitation,
      [redemption],
      "tester-002",
      new Date("2026-07-19T00:00:00.000Z"),
    ),
    { allowed: false, reason: "exhausted", remainingRedemptions: 0 },
  );
});

test("rejects revoked and expired invitations", () => {
  assert.equal(
    decideInvitationRedemption(
      { ...invitation, revokedAt: "2026-07-18T00:00:00.000Z" },
      [],
      "tester-001",
      new Date("2026-07-19T00:00:00.000Z"),
    ).reason,
    "revoked",
  );
  assert.equal(
    decideInvitationRedemption(
      invitation,
      [],
      "tester-001",
      new Date("2026-07-31T00:00:00.000Z"),
    ).reason,
    "expired",
  );
});

test("rejects malformed invitations and blank users", () => {
  assert.equal(
    decideInvitationRedemption(
      { ...invitation, maxRedemptions: 0 },
      [],
      "tester-001",
    ).reason,
    "invalid_invitation",
  );
  assert.equal(
    decideInvitationRedemption(invitation, [], " ").reason,
    "invalid_invitation",
  );
});
