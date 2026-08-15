import assert from "node:assert/strict";
import test from "node:test";
import {
  alphaAuthErrorMessage,
  authCallbackUrl,
  authContinuationUrl,
  isAllowedMechoriAuthOrigin,
  resolvePublicOrigin,
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

test("uses a verified MECHORI deploy preview origin over the configured production origin", () => {
  assert.equal(
    resolvePublicOrigin({
      fallbackOrigin: "https://deploy-preview-2--mechori-alpha.netlify.app",
      configuredOrigin: origin,
      forwardedHost: "deploy-preview-2--mechori-alpha.netlify.app",
      forwardedProto: "https",
    }),
    "https://deploy-preview-2--mechori-alpha.netlify.app",
  );
});

test("allows the production origin and numeric MECHORI deploy previews only", () => {
  assert.equal(isAllowedMechoriAuthOrigin(origin), true);
  assert.equal(isAllowedMechoriAuthOrigin("https://deploy-preview-2--mechori-alpha.netlify.app"), true);
  assert.equal(isAllowedMechoriAuthOrigin("https://deploy-preview-302--mechori-alpha.netlify.app"), true);

  for (const candidate of [
    "https://foo--mechori-alpha.netlify.app",
    "https://deploy-preview-abc--mechori-alpha.netlify.app",
    "https://deploy-preview-2--other-project.netlify.app",
    "https://mechori-alpha.attacker.example",
    "http://deploy-preview-2--mechori-alpha.netlify.app",
    "https://deploy-preview-2--mechori-alpha.netlify.app:444",
    "https://deploy-preview-2--mechori-alpha.netlify.app.attacker.example",
  ]) {
    assert.equal(isAllowedMechoriAuthOrigin(candidate), false, candidate);
  }
});

test("falls back to production when proxy headers do not identify an allowed MECHORI origin", () => {
  assert.equal(
    resolvePublicOrigin({
      fallbackOrigin: "http://internal:3000",
      configuredOrigin: origin,
      forwardedHost: "deploy-preview-abc--mechori-alpha.netlify.app, internal:3000",
      forwardedProto: "https, http",
    }),
    origin,
  );
});

test("keeps the alpha membership error specific and localized", () => {
  assert.match(alphaAuthErrorMessage("invitation_required", "ja"), /招待URLから新規登録/);
  assert.match(alphaAuthErrorMessage("invitation_required", "en"), /invitation link/);
});
