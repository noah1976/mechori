import assert from "node:assert/strict";
import test from "node:test";
import { cloneDemoData, filterRecords, validateRecordDraft } from "../src/index.ts";

test("filters demo records by hazard and keyword", () => {
  const { records } = cloneDemoData();
  const results = filterRecords(records, {
    keyword: "警告",
    hazardLevel: "CRITICAL",
  });
  assert.equal(results.length, 1);
  assert.equal(results[0]?.id, "record-demo-warning");
});

test("requires the core manual-entry fields", () => {
  const result = validateRecordDraft({
    serviceDate: "",
    odometerKm: "-1",
    summary: "",
    symptoms: "",
    causeCandidates: "",
    checksPerformed: "",
    workPerformed: "",
    partName: "",
    partManufacturer: "",
    partNumber: "",
    cost: "",
    resolutionStatus: "unresolved",
    hazardLevel: "LOW",
    requestSharing: false,
  });
  assert.equal(result.valid, false);
  assert.equal(result.errors.serviceDate, "required");
  assert.equal(result.errors.odometerKm, "invalid");
  assert.equal(result.errors.summary, "required");
});
