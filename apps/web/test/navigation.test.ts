import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appNavigationItems, authDisplayState, isActiveNavigation, shouldShowRecordFab } from "../lib/navigation.ts";

test("navigation exposes the four trial destinations", () => {
  assert.deepEqual(appNavigationItems.map((item) => item.href), ["/", "/search", "/notifications", "/garage"]);
});

test("navigation keeps parent selection on record and feed routes", () => {
  assert.equal(isActiveNavigation("/journal/abc", "/"), true);
  assert.equal(isActiveNavigation("/feed", "/"), true);
  assert.equal(isActiveNavigation("/garage/vehicle-1", "/garage"), true);
  assert.equal(isActiveNavigation("/search", "/garage"), false);
});

test("record FAB is hidden from record entry and edit routes", () => {
  assert.equal(shouldShowRecordFab("/"), true);
  assert.equal(shouldShowRecordFab("/journal/new"), false);
  assert.equal(shouldShowRecordFab("/journal/abc/edit"), false);
  assert.equal(shouldShowRecordFab("/garage/vehicle-1/event/new"), false);
  assert.equal(shouldShowRecordFab("/journal/abc"), true);
  assert.equal(shouldShowRecordFab("/search"), false);
  assert.equal(shouldShowRecordFab("/search/results"), false);
});

test("auth display state separates loading, signed-out, and signed-in navigation", () => {
  assert.equal(authDisplayState(false, false), "loading");
  assert.equal(authDisplayState(true, false), "signed-out");
  assert.equal(authDisplayState(true, true), "authenticated");
});

test("logged-out navigation uses an explicit three-column layout", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.bottom-nav\.signed-out\s*\{\s*grid-template-columns:\s*repeat\(3,/);
});

test("garage has a signed-out login gate instead of a loading-only state", () => {
  const source = readFileSync(new URL("../app/garage/page.tsx", import.meta.url), "utf8");
  assert.match(source, /ガレージを見るにはログインが必要です/);
  assert.match(source, /returnTo=.*garage/);
});
