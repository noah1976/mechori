import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../lib/app-context.tsx", import.meta.url),
  "utf8",
);

test("initial alpha hydration resolves auth before starting workspace hydration", () => {
  const hydrateStart = source.indexOf("async function hydrate() {");
  const workspaceStart = source.indexOf("void loadWorkspace(storedAuthSession)");
  const criticalHydration = source.slice(hydrateStart, workspaceStart);

  assert.ok(hydrateStart >= 0);
  assert.ok(workspaceStart > hydrateStart);
  assert.match(criticalHydration, /setHydrated\(true\)/);
  assert.doesNotMatch(criticalHydration, /loadAlphaWorkspace/);
  assert.doesNotMatch(criticalHydration, /loadMyAlphaProfileIdentity/);
  assert.doesNotMatch(criticalHydration, /loadAlphaSharedJournals/);
  assert.doesNotMatch(criticalHydration, /loadAlphaJournalReactions/);
  assert.doesNotMatch(criticalHydration, /alphaSharedJournalMediaAvailable/);
  assert.doesNotMatch(criticalHydration, /loadMyAlphaUserFollows/);
});

test("lazy social hydration bounds profile image reads to shared authors", () => {
  assert.match(source, /const authorIds = \[\.\.\.new Set\(loadedSharedContent\.map\(\(item\) => item\.author\.id\)\)\]/);
  assert.match(source, /loadAlphaPublicProfileImages\(authorIds\)/);
  assert.doesNotMatch(source, /loadAlphaPublicProfileImages\(\)\./);
  assert.match(source, /socialProfileRef\.current !== profileId/);
});
