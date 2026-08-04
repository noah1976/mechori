import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../lib/app-context.tsx", import.meta.url),
  "utf8",
);

test("initial alpha hydration does not wait for social feed reads", () => {
  const hydrateStart = source.indexOf("async function hydrate() {");
  const backgroundStart = source.indexOf("void hydrateAlphaSocialContent");
  const criticalHydration = source.slice(hydrateStart, backgroundStart);

  assert.ok(hydrateStart >= 0);
  assert.ok(backgroundStart > hydrateStart);
  assert.match(criticalHydration, /loadAlphaWorkspace/);
  assert.match(criticalHydration, /loadMyAlphaProfileIdentity/);
  assert.doesNotMatch(criticalHydration, /loadAlphaSharedJournals/);
  assert.doesNotMatch(criticalHydration, /loadAlphaJournalReactions/);
  assert.doesNotMatch(criticalHydration, /alphaSharedJournalMediaAvailable/);
  assert.doesNotMatch(criticalHydration, /loadMyAlphaUserFollows/);
});

test("background social hydration bounds profile image reads to shared authors", () => {
  assert.match(source, /const authorIds = \[\.\.\.new Set\(loadedSharedContent\.map\(\(item\) => item\.author\.id\)\)\]/);
  assert.match(source, /loadAlphaPublicProfileImages\(authorIds\)/);
  assert.doesNotMatch(source, /loadAlphaPublicProfileImages\(\)\./);
  assert.match(source, /if \(!active\) return;/);
});
