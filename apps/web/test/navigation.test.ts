import assert from "node:assert/strict";
import test from "node:test";
import { appNavigationItems, isActiveNavigation, shouldShowRecordFab } from "../lib/navigation.ts";

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
});
