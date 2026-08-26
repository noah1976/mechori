import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  authDisplayState,
  getNavigationItems,
  isActiveNavigation,
  isNavigationItemActive,
  navigationLabel,
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
  assert.equal(hrefs("desktopSide", "authenticated").includes("/admin"), false);
  assert.equal(hrefs("desktopSide", "authenticated", true).includes("/admin"), true);
  assert.equal(hrefs("drawer", "authenticated", true).includes("/admin"), true);
});

test("professional navigation is limited to members and platform admins", () => {
  assert.equal(getNavigationItems("desktopSide", "authenticated", false, false).some((item) => item.id === "professional"), false);
  assert.equal(getNavigationItems("desktopSide", "authenticated", false, true).some((item) => item.id === "professional"), true);
  assert.equal(getNavigationItems("drawer", "authenticated", true, false).some((item) => item.id === "professional"), true);
  assert.equal(getNavigationItems("mobileBottom", "authenticated", false, true).some((item) => item.id === "professional"), false);
  assert.equal(isActiveNavigation("/professional/organizations/demo", "/professional/organizations"), true);
});

test("desktop navigation exposes the full sidebar set from the shared definition", () => {
  assert.deepEqual(getNavigationItems("desktopSide", "authenticated").map((item) => item.id), [
    "home",
    "search",
    "notifications",
    "garage",
    "connections",
    "profile-edit",
    "invite",
    "feedback",
    "help",
    "terms",
    "settings",
    "privacy",
  ]);
  assert.equal(navigationLabel("feedback", "ja"), "フィードバック");
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
  assert.deepEqual(items.map((item) => item.href).sort(), []);
});

test("record FAB is hidden from the Garage hero and focused record-entry routes", () => {
  assert.equal(shouldShowRecordFab("/"), true);
  assert.equal(shouldShowRecordFab("/garage"), false);
  assert.equal(shouldShowRecordFab("/garage/vehicle-1"), true);
  assert.equal(shouldShowRecordFab("/journal/new"), false);
  assert.equal(shouldShowRecordFab("/journal/abc/edit"), false);
  assert.equal(shouldShowRecordFab("/garage/vehicle-1/event/new"), false);
  assert.equal(shouldShowRecordFab("/journal/abc"), true);
  assert.equal(shouldShowRecordFab("/search"), false);
  assert.equal(shouldShowRecordFab("/search/results"), false);
  assert.equal(shouldShowRecordFab("/feedback"), false);
  assert.equal(shouldShowRecordFab("/admin"), false);
  assert.equal(shouldShowRecordFab("/admin/feedback/1"), false);
  assert.equal(shouldShowRecordFab("/professional/organizations/demo"), false);
});

test("logged-out navigation keeps the explicit three-column layout", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.bottom-nav\.signed-out\s*\{\s*grid-template-columns:\s*repeat\(3,/);
});

test("mobile bottom navigation and sticky form actions share the safe-area height contract", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /--mobile-bottom-nav-height:\s*calc\(68px \+ env\(safe-area-inset-bottom\)\);/);
  assert.match(css, /\.bottom-nav\s*\{\s*position:\s*fixed;\s*inset:\s*auto 0 0;/);
  assert.match(css, /\.content-column main\s*\{\s*padding:\s*24px 16px calc\(var\(--mobile-bottom-nav-height\) \+ 28px\);/);
  assert.match(css, /\.form-actions\s*\{\s*position:\s*sticky;\s*z-index:\s*10;\s*bottom:\s*var\(--mobile-bottom-nav-height\);/);
  assert.match(css, /\.journal-submit-area\s*\{\s*position:\s*sticky;\s*z-index:\s*10;\s*bottom:\s*var\(--mobile-bottom-nav-height\);/);
});

test("desktop shell hides mobile-only navigation surfaces while mobile restores them", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.menu-trigger\s*\{[^}]*display:\s*none;/);
  assert.match(css, /\.record-fab\s*\{[^}]*display:\s*none;/);
  assert.match(css, /\.app-menu-layer\s*\{[^}]*display:\s*none;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.menu-trigger\s*\{\s*display:\s*inline-grid;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.record-fab\s*\{[^}]*display:\s*inline-flex;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.app-menu-layer\s*\{\s*display:\s*flex;/);
});

test("mobile header reserves matching action slots around the centered title", () => {
  const shell = readFileSync(new URL("../components/app-shell.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(shell, /className="top-bar-leading"/);
  assert.match(shell, /className=\{`top-bar-title/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.top-bar \{ height: 54px; grid-template-columns: 44px minmax\(0, 1fr\) 44px;/);
  assert.match(css, /\.mobile-brand \{ display: block; justify-self: center; \}/);
});

test("feedback kind styles describe independent selectable buttons", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.feedback-kind-picker\s*\{[^}]*gap:\s*8px;/);
  assert.match(css, /\.feedback-kind-picker button\s*\{[^}]*border:\s*1px solid var\(--line\);/);
  assert.match(css, /\.feedback-kind-picker button\.is-selected\s*\{[^}]*border-color:\s*var\(--brand\);/);
});

test("garage has a signed-out login gate instead of a loading-only state", () => {
  const source = readFileSync(new URL("../app/garage/page.tsx", import.meta.url), "utf8");
  assert.match(source, /ガレージを見るにはログインが必要です/);
  assert.match(source, /returnTo=.*garage/);
});
