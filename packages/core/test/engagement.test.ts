import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMonthlyOwnerSummary,
  cloneDemoData,
  summarizeMonthlyEngagement,
  type EngagementEvent,
} from "../src/index.ts";

const events: EngagementEvent[] = [
  {
    id: "event-1",
    anonymousActorId: "actor-a",
    name: "session_started",
    occurredAt: "2026-07-01T00:00:00.000Z",
    appVersion: "prototype",
  },
  {
    id: "event-2",
    anonymousActorId: "actor-a",
    name: "garage_viewed",
    occurredAt: "2026-07-03T00:00:00.000Z",
    appVersion: "prototype",
  },
  {
    id: "event-3",
    anonymousActorId: "actor-b",
    name: "session_started",
    occurredAt: "2026-07-04T00:00:00.000Z",
    appVersion: "prototype",
  },
  {
    id: "event-4",
    anonymousActorId: "actor-b",
    name: "maintenance_saved",
    occurredAt: "2026-06-30T23:59:59.000Z",
    appVersion: "prototype",
  },
];

test("separates monthly access from monthly value activity", () => {
  const summary = summarizeMonthlyEngagement(events, "2026-07");

  assert.equal(summary.monthlyActiveActors, 2);
  assert.equal(summary.monthlyValueActiveActors, 1);
  assert.equal(summary.valueEventCount, 1);
  assert.equal(summary.eventCounts.session_started, 2);
});

test("summarizes low-frequency owner value within a calendar month", () => {
  const summary = buildMonthlyOwnerSummary(
    cloneDemoData(),
    new Date("2026-07-17T00:00:00.000Z"),
  );

  assert.equal(summary.month, "2026-07");
  assert.equal(summary.recordCount, 0);
  assert.equal(summary.journalCount, 1);
  assert.equal(summary.unresolvedCount, 1);
  assert.ok(summary.followingUpdateCount >= 1);
});
