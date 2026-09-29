import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { analyticsUrlHasCapability, safeGtmBootstrap, sanitizeAnalyticsPath } from "../lib/analytics-privacy.ts";
import { pushAnalyticsEvent } from "../lib/analytics.ts";
import nextConfig from "../next.config.ts";

const token = "A".repeat(43);
const dangerous = [`/p/${token}`, `/%70/${token}`, `/p%2F${token}`, `/v/abcdef1234567890`, "/invite", `/join#invite=${token}`, `/auth?in%76ite=${token}`, `/auth/callback?code=${token}`, `/auth?mode=signup&inviteLanding=1#invite=${token}`, `/garage?returnTo=${encodeURIComponent(`/p/${token}`)}`, `/garage?returnTo=%252Fp%252F${token}`, `/garage?token=${token}&token=other`, `/garage#access_token=${token}`, `/garage?ID_TOKEN=${token}`, `/garage#/p/${token}`, "/garage?bad=%ZZ"];

function browser(location = "https://mechori.com/garage", referrer = "") {
  const scripts: string[] = [];
  const historyCalls: string[] = [];
  const navigations: string[] = [];
  const window = {
    location: { href: location, hash: new URL(location).hash, assign: (url: string) => navigations.push(url), replace: (url: string) => navigations.push(url) },
    history: { pushState: (_state: unknown, _unused: unknown, url: string) => historyCalls.push(url), replaceState: (_state: unknown, _unused: unknown, url: string) => historyCalls.push(url) },
    dataLayer: undefined as undefined | Array<Record<string, unknown>>,
  };
  const document = { referrer, getElementsByTagName: () => [{ parentNode: { insertBefore: (script: { src: string }) => scripts.push(script.src) } }], createElement: () => ({ src: "", async: false }) };
  vm.runInNewContext(safeGtmBootstrap("GTM-TEST123"), { window, document, URL });
  return { window, scripts, historyCalls, navigations };
}

test("capabilities, encodings and nested return URLs never initialize GTM", () => {
  for (const path of dangerous) {
    assert.equal(analyticsUrlHasCapability(`https://mechori.com${path}`), true, path);
    const result = browser(`https://mechori.com${path}`);
    assert.deepEqual(result.scripts, [], path);
    assert.equal(result.window.dataLayer, undefined, path);
  }
  assert.deepEqual(browser("https://mechori.com/garage", `https://mechori.com/p/${token}`).scripts, []);
  for (const path of ["/qa?src=private%40example.com", "/qa?email=private%40example.com", "/qa#private-note"]) {
    assert.deepEqual(browser(`https://mechori.com${path}`).scripts, [], path);
  }
});
test("normal analytics and ordinary SPA routing remain available; secret navigation uses fresh document", () => {
  const result = browser("https://mechori.com/garage?view=timeline");
  assert.equal(result.scripts.length, 1);
  result.window.history.pushState({}, "", "/qa?src=x");
  assert.deepEqual(result.historyCalls, ["/qa?src=x"]);
  result.window.history.pushState({}, "", `/p/${token}`);
  result.window.history.replaceState({}, "", `/auth?returnTo=${encodeURIComponent(`/p/${token}`)}`);
  assert.equal(result.historyCalls.length, 1);
  assert.equal(result.navigations.length, 2);
});
test("long resource IDs and ordinary fragments retain GTM and SPA navigation", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const ordinary = [
    `/garage?vehicle=vehicle-${id}`, `/garage/vehicle-${id}/event/new`,
    `/records/record-${id}`, `/journal/journal-${id}`, `/profile/profile-${id}`,
    `/garage?returnTo=${encodeURIComponent(`/garage?vehicle=vehicle-${id}`)}`,
    `/garage#record-${id}`, "/search?q=%E6%95%B4%E5%82%99",
  ];
  for (const path of ordinary) {
    assert.equal(analyticsUrlHasCapability(path), false, path);
    const result = browser(`https://mechori.com${path}`, `https://mechori.com/records/record-${id}`);
    assert.equal(result.scripts.length, 1, path);
    result.window.history.pushState({}, "", path);
    result.window.history.replaceState({}, "", path);
    assert.deepEqual(result.historyCalls, [path, path], path);
    assert.deepEqual(result.navigations, [], path);
  }
});
test("central analytics boundary templates capabilities and drops arbitrary prose/URL properties", () => {
  const temporary = { dataLayer: [] as Array<Record<string, unknown>> };
  const previous = globalThis.window;
  Object.assign(globalThis, { window: temporary });
  try {
    pushAnalyticsEvent("page_view", { page_path: `/p/${token}?invite=${token}#token`, page_location: `https://mechori.com/p/${token}`, page_referrer: token, note: "private@example.com" });
    pushAnalyticsEvent("qa_feedback_submitted", { task: "history-reading-v1", version: "qa-v0.1", step: 2, source: "facebook", device_class: "mobile", outcome: "confusing", email: "private@example.com", user_id: "owner", source_url: token });
    pushAnalyticsEvent("maintenance_saved", { resolution_status: "resolved" });
    pushAnalyticsEvent("content_policy_accepted", { policy_version: "alpha-public-content-v1" });
    assert.deepEqual(temporary.dataLayer[0], { page_path: "/p/[share]", event: "page_view" });
    assert.equal(JSON.stringify(temporary.dataLayer).includes(token), false);
    assert.equal(JSON.stringify(temporary.dataLayer).includes("private@example.com"), false);
    assert.equal(temporary.dataLayer[1]?.source, "facebook");
    assert.equal(temporary.dataLayer[2]?.resolution_status, "resolved");
    assert.equal(temporary.dataLayer[3]?.policy_version, "alpha-public-content-v1");
  } finally { if (previous === undefined) Reflect.deleteProperty(globalThis, "window"); else Object.assign(globalThis, { window: previous }); }
});
test("safe path representations never retain parameters, dynamic IDs or malformed paths", () => {
  for (const value of [`/p/${token}`, `/%70/${token}`, `/p%2F${token}`, `/p/${token}?token=${token}`, `/p/${token}#invite`, `/p/${token}%3Fsecret`]) assert.equal(sanitizeAnalyticsPath(value), "/p/[share]");
  assert.equal(sanitizeAnalyticsPath("/garage/private-owner-id/event/new"), "/garage/[vehicle]");
  assert.equal(sanitizeAnalyticsPath("/profile/private-owner-id"), "/profile/[id]");
  assert.equal(sanitizeAnalyticsPath(`/auth?invite=${token}`), "/auth");
  assert.equal(sanitizeAnalyticsPath(`/unknown/${token}`), "/unknown");
  assert.equal(sanitizeAnalyticsPath("/%ZZ"), "/unknown");
  assert.equal(sanitizeAnalyticsPath("/garage?view=timeline"), "/garage");
});
test("no-JS iframe and callback error prose cannot bypass protection", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  const callback = readFileSync(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(layout, /<iframe/);
  assert.match(config, /Referrer-Policy.*strict-origin/);
  assert.doesNotMatch(callback, /message: error.message/);
  assert.match(callback, /p_raw_token: invite/); // Consumer still gets the unchanged capability.
  const passport = readFileSync(new URL("../components/passport-experience.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(passport, /<span>\{shareUrl\}<\/span>|href=\{`\/p\//);
  assert.match(passport, /window\.open\(shareUrl, "_blank", "noopener,noreferrer"\)/);
});

test("referring origins remain measurable; secret routes suppress referrers and auth form keeps Origin", async () => {
  const routes = await nextConfig.headers!();
  const policyFor = (path: string) => routes
    .filter((route) => route.source === "/:path*" || route.source === path
      || (route.source.endsWith("/:path*") && (path === route.source.slice(0, -7) || path.startsWith(`${route.source.slice(0, -7)}/`))))
    .flatMap((route) => route.headers)
    .filter((header) => header.key.toLowerCase() === "referrer-policy")
    .at(-1)?.value;
  // no-referrer makes native form POST's Origin null. strict-origin retains the
  // CSRF Origin guard and exposes no path/query, including nested returnTo.
  assert.equal(policyFor("/auth"), "strict-origin");
  for (const route of ["/qa", "/garage", "/records/test", "/journal/test", "/profile/test"]) assert.equal(policyFor(route), "strict-origin", route);
  for (const route of ["/p", "/p/test", "/v/test", "/join", "/invite", "/auth/start", "/auth/callback"]) assert.equal(policyFor(route), "no-referrer", route);
});
