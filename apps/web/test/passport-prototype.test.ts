import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildPassportShareProjection } from "../lib/passport-share-projection.ts";
import type { Vehicle, VehiclePassport } from "@mechori/core";

const vehicle = {
  id: "vehicle-1",
  ownerProfileId: "private-owner-id",
  vehicleCategory: "car",
  make: "FIAT",
  model: "Barchetta",
  identityMatchStatus: "unmatched",
  ownershipType: "owned",
  memberDiscoveryEnabled: false,
  odometerContext: "current",
  odometerKm: 0,
  odometerEpisodes: [],
  currentOdometerReading: {
    episodeId: "episode-1",
    displayedValue: 10,
    unit: "km",
    sequenceAssessment: "consistent_increase",
  },
  nickname: "バルケッタ",
  year: 1997,
  engine: "",
  steering: "unknown",
  transmission: "",
  isDemo: false,
} satisfies Vehicle;

const passport = {
  vehicleId: vehicle.id,
  odometerValue: 86420,
  odometerUnit: "km",
  workshopConcerns: "低速で少し異音",
  createdAt: "2026-09-17T00:00:00.000Z",
  updatedAt: "2026-09-17T01:00:00.000Z",
  completedAt: "2026-09-17T00:00:00.000Z",
  shareToken: "private-token",
} satisfies VehiclePassport;

test("workshop projection includes only passport and vehicle presentation fields", () => {
  const projection = buildPassportShareProjection(vehicle, passport);
  assert.equal(projection.make, "FIAT");
  assert.equal(projection.workshopConcerns, "低速で少し異音");
  assert.equal("ownerProfileId" in projection, false);
  assert.equal("vehicleId" in projection, false);
  assert.equal("shareToken" in projection, false);
});

test("root routes signed-in users to Passport while Home remains at /home", () => {
  const root = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../app/home/page.tsx", import.meta.url), "utf8");
  const experience = readFileSync(new URL("../components/passport-experience.tsx", import.meta.url), "utf8");
  assert.match(root, /signedIn.*PassportExperience/s);
  assert.match(root, /<HomePage \/>/);
  assert.match(home, /function HomePage/);
  assert.match(experience, /vehicles\.length > 1/);
  assert.match(experience, /\/garage\/new\?returnTo=%2F/);
  assert.match(experience, /空欄のままでも作れます/);
});

test("passport share is explicit, revocable, and public page is noindex", () => {
  const experience = readFileSync(new URL("../components/passport-experience.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/p/[token]/layout.tsx", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../../../supabase/migrations/202609170001_alpha_passport_shares.sql", import.meta.url), "utf8");
  assert.match(experience, /共有リンクを作る/);
  assert.match(experience, /共有を停止/);
  assert.match(experience, /onClick=\{onShare\}/);
  assert.match(experience, /scrollIntoView/);
  assert.match(layout, /index: false, follow: false/);
  assert.match(migration, /token_hash/);
  assert.match(migration, /and share\.is_active/);
  assert.doesNotMatch(migration, /grant select on (table )?public\.alpha_passport_shares to anon/);
});

test("Passport feedback reuses alpha feedback without adding free text to analytics", () => {
  const source = readFileSync(new URL("../components/passport-experience.tsx", import.meta.url), "utf8");
  assert.match(source, /submitAlphaFeedback/);
  assert.match(source, /\[passport_owner\]/);
  assert.match(source, /pushAnalyticsEvent\("feedback_submitted", \{ feedback_kind: "other" \}\)/);
  assert.doesNotMatch(source, /pushAnalyticsEvent\([^\n]*feedback\.trim/);
});
