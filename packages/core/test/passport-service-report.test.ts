import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPassportServiceReportToData,
  cloneDemoData,
  passportServiceReportRecordId,
  type PassportServiceReportConfirmation,
} from "../src/index.ts";

const reportId = "53f42f4d-d470-4a41-8ee5-86545422da4f";

function confirmation(
  overrides: Partial<PassportServiceReportConfirmation> = {},
): PassportServiceReportConfirmation {
  return {
    reportId,
    submittedAt: "2026-09-20T10:00:00.000Z",
    summary: "左リアキャリパー交換",
    serviceDate: "2026-09-19",
    odometerValue: "86420",
    odometerUnit: "km",
    inspectionNotes: "左リア周辺を確認",
    workPerformed: "キャリパー交換とエア抜き",
    partsUsed: "TRW リアキャリパー",
    resultNotes: "漏れがないことを確認",
    otherNotes: "共有リンクから受領",
    resolutionStatus: "resolved",
    ...overrides,
  };
}

test("maps an owner-confirmed Passport report into the existing private Maintenance model", () => {
  const original = cloneDemoData();
  const vehicleId = original.vehicles[0]!.id;
  const applied = applyPassportServiceReportToData(original, vehicleId, confirmation());

  assert.equal(applied.record.id, passportServiceReportRecordId(reportId));
  assert.equal(applied.record.vehicleId, vehicleId);
  assert.equal(applied.record.visibility, "private");
  assert.equal(applied.record.verificationStatus, "owner_confirmed");
  assert.equal(applied.record.sourceType, "owner_record");
  assert.equal(applied.record.serviceAttribution.performedByType, "unknown");
  assert.equal(applied.record.result, "漏れがないことを確認");
  assert.equal(applied.record.notes, "共有リンクから受領");
  assert.deepEqual(applied.record.sourceReference, {
    type: "passport_service_report",
    id: reportId,
    receivedAt: "2026-09-20T10:00:00.000Z",
  });
});

test("does not fabricate a service date when the Workshop left it blank", () => {
  const original = cloneDemoData();
  const applied = applyPassportServiceReportToData(
    original,
    original.vehicles[0]!.id,
    confirmation({ serviceDate: "", odometerValue: "" }),
  );

  assert.equal(applied.record.serviceDate, "");
  assert.equal(applied.record.serviceDatePrecision, "unknown");
  assert.equal(applied.record.odometerReading, undefined);
});

test("retries replace the deterministic record instead of creating a duplicate", () => {
  const original = cloneDemoData();
  const vehicleId = original.vehicles[0]!.id;
  const first = applyPassportServiceReportToData(original, vehicleId, confirmation());
  const retried = applyPassportServiceReportToData(
    first.data,
    vehicleId,
    confirmation({ summary: "Ownerが確認した見出し" }),
  );

  assert.equal(retried.data.records.filter((item) => item.id === first.record.id).length, 1);
  assert.equal(retried.record.summary, "Ownerが確認した見出し");
  assert.equal(retried.record.createdAt, first.record.createdAt);
  assert.deepEqual(retried.record.sourceReference, first.record.sourceReference);
});

test("rejects a malformed report id before creating a Maintenance record", () => {
  const original = cloneDemoData();
  assert.throws(
    () => applyPassportServiceReportToData(
      original,
      original.vehicles[0]!.id,
      confirmation({ reportId: "not-a-report" }),
    ),
    /passport_service_report_id_invalid/,
  );
});
