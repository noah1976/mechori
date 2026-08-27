import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the edge proxy never waits for Supabase Auth before serving a request", () => {
  const source = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");

  assert.match(source, /export function proxy\(request: NextRequest\)/);
  assert.doesNotMatch(source, /createServerClient/);
  assert.doesNotMatch(source, /auth\.getClaims\(/);
  assert.match(source, /Authorization remains at the data\/API boundary/);
});

test("the edge proxy retains a safe unavailable response for invalid Alpha configuration", () => {
  const source = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");

  assert.match(source, /if \(!getSupabasePublicConfig\(\)\) return serviceUnavailable\(\);/);
  assert.match(source, /catch \{\s*return serviceUnavailable\(\);\s*\}/);
  assert.match(source, /status: 503/);
  assert.match(source, /Cache-Control": "no-store/);
});
