import assert from "node:assert/strict";
import test from "node:test";
import {
  alphaAuthErrorMessage,
  authCallbackUrl,
  authContinuationUrl,
} from "../lib/auth-flow.ts";

const origin = "https://mechori-alpha.netlify.app";

test("keeps the raw invitation out of the same-site OAuth continuation URL", () => {
  const url = new URL(authContinuationUrl(origin, "signup", "/garage"));

  assert.equal(url.origin, origin);
  assert.equal(url.pathname, "/auth/start");
  assert.equal(url.searchParams.get("continue"), "google");
  assert.equal(url.searchParams.get("mode"), "signup");
  assert.equal(url.searchParams.get("returnTo"), "/garage");
  assert.equal(url.searchParams.has("invite"), false);
});

test("sanitizes external return paths in OAuth continuation and callback URLs", () => {
  const continuation = new URL(
    authContinuationUrl(origin, "signin", "https://example.com/steal"),
  );
  const callback = new URL(
    authCallbackUrl(origin, "https://example.com/steal", "signup"),
  );

  assert.equal(continuation.searchParams.has("returnTo"), false);
  assert.equal(callback.searchParams.get("returnTo"), "/");
  assert.equal(callback.searchParams.get("mode"), "signup");
});

test("keeps the alpha membership error specific and localized", () => {
  assert.match(alphaAuthErrorMessage("invitation_required", "ja"), /招待URLから新規登録/);
  assert.match(alphaAuthErrorMessage("invitation_required", "en"), /invitation link/);
});
