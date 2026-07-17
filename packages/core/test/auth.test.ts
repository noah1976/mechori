import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuthSession,
  isSignedIn,
  parseAuthSession,
  parseStoredAuthSession,
  sanitizeLocalReturnPath,
  signedOutSession,
} from "../src/index.ts";

test("creates a provider-neutral signed-in session without profile data", () => {
  const session = createAuthSession(
    "google",
    "profile-demo-current",
    "2026-07-16T12:00:00.000Z",
  );
  assert.equal(isSignedIn(session), true);
  assert.deepEqual(session, {
    status: "signed_in",
    provider: "google",
    profileId: "profile-demo-current",
    authenticatedAt: "2026-07-16T12:00:00.000Z",
  });
  assert.equal("email" in session, false);
});

test("represents sign-out without retaining provider identifiers", () => {
  assert.deepEqual(signedOutSession, { status: "signed_out" });
  assert.equal(isSignedIn(signedOutSession), false);
});

test("parses valid persisted sessions and rejects incomplete state", () => {
  assert.deepEqual(parseAuthSession({ status: "signed_out" }), signedOutSession);
  assert.equal(parseAuthSession({ status: "signed_in", provider: "google" }), null);
  assert.equal(
    parseAuthSession({
      status: "signed_in",
      provider: "unknown",
      profileId: "profile-demo-current",
      authenticatedAt: "2026-07-16T12:00:00.000Z",
    }),
    null,
  );
});

test("requires an internal profile id for authenticated sessions", () => {
  assert.throws(() => createAuthSession("apple", ""), /profile_id_required/);
});

test("keeps only local non-authentication return paths", () => {
  assert.equal(sanitizeLocalReturnPath("/garage/history?view=all#latest"), "/garage/history?view=all#latest");
  assert.equal(sanitizeLocalReturnPath("/journal/journal-demo-luca-drive"), "/journal/journal-demo-luca-drive");
  assert.equal(sanitizeLocalReturnPath(null), "/");
  assert.equal(sanitizeLocalReturnPath("https://example.com"), "/");
  assert.equal(sanitizeLocalReturnPath("//example.com/path"), "/");
  assert.equal(sanitizeLocalReturnPath("/\\example.com/path"), "/");
  assert.equal(sanitizeLocalReturnPath("/auth?returnTo=/garage"), "/");
  assert.equal(sanitizeLocalReturnPath("/auth/callback"), "/");
});

test("treats missing or invalid persisted authentication as signed out", () => {
  assert.deepEqual(parseStoredAuthSession(null), signedOutSession);
  assert.deepEqual(parseStoredAuthSession("not-json"), signedOutSession);
  assert.deepEqual(
    parseStoredAuthSession(JSON.stringify({ status: "signed_in", provider: "unknown" })),
    signedOutSession,
  );
  assert.equal(
    isSignedIn(
      parseStoredAuthSession(
        JSON.stringify({
          status: "signed_in",
          provider: "apple",
          profileId: "profile-demo-current",
          authenticatedAt: "2026-07-16T12:00:00.000Z",
        }),
      ),
    ),
    true,
  );
});
