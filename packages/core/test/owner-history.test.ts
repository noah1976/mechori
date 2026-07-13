import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHistoryShareText,
  cloneDemoData,
  createAppDataExport,
  summarizeVehicleHistory,
} from "../src/index.ts";

test("summarizes private history without turning it into a trust score", () => {
  const data = cloneDemoData();
  const vehicle = data.vehicles[0]!;
  const summary = summarizeVehicleHistory(vehicle, data.records);

  assert.equal(summary.level, "organized");
  assert.equal(summary.levelNumber, 2);
  assert.equal(summary.recordCount, 3);
  assert.equal(summary.actionCount, 4);
  assert.equal(summary.unresolvedCount, 1);
  assert.equal(summary.publicKnowledgeCount, 0);
  assert.equal(
    summary.milestones.find((milestone) => milestone.code === "knowledge_shared")?.achieved,
    false,
  );
});

test("share text omits odometer, cost, and record details", () => {
  const data = cloneDemoData();
  const vehicle = data.vehicles[0]!;
  const summary = summarizeVehicleHistory(vehicle, data.records);
  const text = buildHistoryShareText("ja", vehicle, summary);

  assert.match(text, /整備履歴を3件/);
  assert.doesNotMatch(text, /86,?420/);
  assert.doesNotMatch(text, /警告/);
  assert.doesNotMatch(text, /費用/);
});

test("owner export is versioned and detached from the live data", () => {
  const data = cloneDemoData();
  const exported = createAppDataExport(data, "2026-07-13T12:00:00.000Z");

  assert.equal(exported.exportVersion, 1);
  assert.equal(exported.data.records.length, 3);
  exported.data.records.length = 0;
  assert.equal(data.records.length, 3);
});
