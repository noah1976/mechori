import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  authDisplayState,
  getNavigationItems,
  isActiveNavigation,
  isNavigationItemActive,
  navigationItems,
  shouldShowRecordFab,
} from "../lib/navigation.ts";

const hrefs = (surface: "mobileBottom" | "desktopSide" | "drawer", state: "loading" | "authenticated" | "signed-out", isAdmin = false) =>
  getNavigationItems(surface, state, isAdmin).map((item) => item.href);

test("logged-out navigation returns only home, search, and sign-in", () => {
  assert.deepEqual(hrefs("mobileBottom", "signed-out"), ["/", "/search", "/auth"]);
  assert.equal(hrefs("mobileBottom", "signed-out").includes("/notifications"), false);
  assert.equal(hrefs("mobileBottom", "signed-out").includes("/garage"), false);
  assert.equal(hrefs("drawer", "signed-out").includes("/admin"), false);
});

test("signed-in navigation returns the four trial destinations", () => {
  assert.deepEqual(hrefs("mobileBottom", "authenticated"), [
    "/",
    "/search",
    "/notifications",
    "/garage",
  ]);
  assert.equal(hrefs("drawer", "authenticated").includes("/admin"), false);
});

test("admin navigation keeps user destinations and adds admin only to the drawer", () => {
  assert.deepEqual(hrefs("mobileBottom", "authenticated", true), [
    "/",
    "/search",
    "/notifications",
    "/garage",
  ]);
  assert.equal(hrefs("desktopSide", "authenticated", true).includes("/admin"), false);
  assert.equal(hrefs("drawer", "authenticated", true).includes("/admin"), true);
});

test("each surface selects stable, non-duplicated definitions", () => {
  for (const surface of ["mobileBottom", "desktopSide", "drawer"] as const) {
    const items = getNavigationItems(surface, "authenticated", true);
    assert.equal(new Set(items.map((item) => item.id)).size, items.length);
    assert.equal(new Set(items.map((item) => item.href)).size, items.length);
  }
  assert.deepEqual(
    getNavigationItems("drawer", "authenticated").map((item) => item.href).filter((href) => href === "/settings/profile"),
    ["/settings/profile"],
  );
});

test("loading state exposes no navigation before auth is known", () => {
  assert.deepEqual(hrefs("mobileBottom", "loading"), []);
  assert.equal(authDisplayState(false, true), "loading");
});

test("active state maps detail routes to their parent navigation item", () => {
  assert.equal(isActiveNavigation("/", "/"), true);
  assert.equal(isActiveNavigation("/search/results", "/search"), true);
  assert.equal(isActiveNavigation("/notifications", "/notifications"), true);
  assert.equal(isActiveNavigation("/garage/vehicle-1", "/garage"), true);
  assert.equal(isActiveNavigation("/journal/abc", "/"), true);
  assert.equal(isActiveNavigation("/records/abc", "/"), true);
  assert.equal(isActiveNavigation("/settings/profile", "/settings/profile"), true);
  assert.equal(isActiveNavigation("/search", "/garage"), false);

  const garage = getNavigationItems("mobileBottom", "authenticated").find((item) => item.href === "/garage");
  assert.ok(garage);
  assert.equal(isNavigationItemActive("/v/barchetta", garage), true);
});

test("coming-soon navigation uses existing safe routes", () => {
  const items = navigationItems.filter((item) => item.status === "comingSoon");
  assert.deepEqual(items.map((item) => item.href).sort(), ["/notifications"]);
});

test("record FAB is hidden from record entry, edit, and search routes", () => {
  assert.equal(shouldShowRecordFab("/"), true);
  assert.equal(shouldShowRecordFab("/journal/new"), false);
  assert.equal(shouldShowRecordFab("/journal/abc/edit"), false);
  assert.equal(shouldShowRecordFab("/garage/vehicle-1/event/new"), false);
  assert.equal(shouldShowRecordFab("/journal/abc"), true);
  assert.equal(shouldShowRecordFab("/search"), false);
  assert.equal(shouldShowRecordFab("/search/results"), false);
});

test("logged-out navigation keeps the explicit three-column layout", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.bottom-nav\.signed-out\s*\{\s*grid-template-columns:\s*repeat\(3,/);
});

test("garage has a signed-out login gate instead of a loading-only state", () => {
  const source = readFileSync(new URL("../app/garage/page.tsx", import.meta.url), "utf8");
  assert.match(source, /ガレージを見るにはログインが必要です/);
  assert.match(source, /returnTo=.*garage/);
});
