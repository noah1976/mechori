import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mechoriProductionOrigin } from "../lib/site-origin.ts";

test("uses mechori.com as the canonical production origin", () => {
  assert.equal(mechoriProductionOrigin, "https://mechori.com");
});

test("redirects only the legacy Netlify production host to the canonical domain", () => {
  const redirects = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");

  assert.equal(
    redirects.trim(),
    "https://mechori-alpha.netlify.app/* https://mechori.com/:splat 301!",
  );
  assert.doesNotMatch(redirects, /deploy-preview-/);
  assert.doesNotMatch(redirects, /www\.mechori\.com/);
});
