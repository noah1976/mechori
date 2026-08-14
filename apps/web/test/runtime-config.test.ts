import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getGoogleOAuthPublishingStatus,
  requiresGoogleOAuthTestUserRegistration,
} from "../lib/runtime-config.ts";

const originalRuntime = process.env.NEXT_PUBLIC_MECHORI_RUNTIME;
const originalOAuthStatus =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_PUBLISHING_STATUS;

afterEach(() => {
  restoreEnvironment(
    "NEXT_PUBLIC_MECHORI_RUNTIME",
    originalRuntime,
  );
  restoreEnvironment(
    "NEXT_PUBLIC_GOOGLE_OAUTH_PUBLISHING_STATUS",
    originalOAuthStatus,
  );
});

test("Google OAuth status defaults to testing", () => {
  delete process.env.NEXT_PUBLIC_GOOGLE_OAUTH_PUBLISHING_STATUS;
  assert.equal(getGoogleOAuthPublishingStatus(), "testing");
});

test("Google OAuth production status is recognized explicitly", () => {
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_PUBLISHING_STATUS = "production";
  assert.equal(getGoogleOAuthPublishingStatus(), "production");
});

test("test-user registration is required only for a testing alpha", () => {
  process.env.NEXT_PUBLIC_MECHORI_RUNTIME = "alpha";
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_PUBLISHING_STATUS = "testing";
  assert.equal(requiresGoogleOAuthTestUserRegistration(), true);

  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_PUBLISHING_STATUS = "production";
  assert.equal(requiresGoogleOAuthTestUserRegistration(), false);

  process.env.NEXT_PUBLIC_MECHORI_RUNTIME = "local";
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_PUBLISHING_STATUS = "testing";
  assert.equal(requiresGoogleOAuthTestUserRegistration(), false);
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
