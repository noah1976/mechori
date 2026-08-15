import assert from "node:assert/strict";
import test from "node:test";
import { createAuthRouteCookieBridge } from "../lib/supabase/auth-route-cookies.ts";

test("commits a successful callback session to both the request and redirect response", () => {
  const requestWrites: Array<{ name: string; value: string }> = [];
  const responseWrites: Array<{ name: string; value: string; options: object }> = [];
  const responseHeaders = new Headers();
  const bridge = createAuthRouteCookieBridge({
    getAll: () => [],
    set(name, value) {
      requestWrites.push({ name, value });
    },
  });

  bridge.cookies.setAll(
    [
      {
        name: "sb-project-auth-token.0",
        value: "session-chunk",
        options: { path: "/", sameSite: "lax", httpOnly: false },
      },
    ],
    { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0" },
  );
  bridge.applyTo({
    cookies: {
      set(name, value, options) {
        responseWrites.push({ name, value, options });
      },
    },
    headers: responseHeaders,
  });

  assert.deepEqual(requestWrites, [{ name: "sb-project-auth-token.0", value: "session-chunk" }]);
  assert.equal(responseWrites.length, 1);
  assert.equal(responseWrites[0]?.name, "sb-project-auth-token.0");
  assert.equal(responseWrites[0]?.value, "session-chunk");
  assert.equal(
    responseHeaders.get("Cache-Control"),
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
});
