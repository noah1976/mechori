import assert from "node:assert/strict";
import test from "node:test";

import { assessOdometerSequence, type OdometerReading } from "../src/index.ts";

function reading(
  displayedValue: number,
  odometerEpisodeId = "episode-1",
  unit: OdometerReading["unit"] = "km",
): OdometerReading {
  return {
    id: `reading-${displayedValue}-${odometerEpisodeId}`,
    vehicleId: "vehicle-1",
    odometerEpisodeId,
    displayedValue,
    unit,
    recordedAt: "2026-07-13",
    verificationStatus: "owner_confirmed",
    contextState: "normal",
  };
}

test("treats a lower reading as context to review, not as invalid data", () => {
  assert.equal(
    assessOdometerSequence(reading(120_000), reading(8_000)),
    "needs_context",
  );
});

test("recognizes a replacement meter as a new odometer episode", () => {
  assert.equal(
    assessOdometerSequence(reading(120_000), reading(8_000, "episode-2")),
    "new_episode",
  );
});

test("supports repeated meter replacements without imposing a count limit", () => {
  const readings = [
    reading(120_000, "episode-1"),
    reading(8_000, "episode-2"),
    reading(2_500, "episode-3"),
    reading(900, "episode-4"),
  ];

  const assessments = readings
    .slice(1)
    .map((current, index) => assessOdometerSequence(readings[index], current));

  assert.deepEqual(assessments, ["new_episode", "new_episode", "new_episode"]);
});

test("keeps unit changes separate from mileage continuity", () => {
  assert.equal(
    assessOdometerSequence(reading(70_000, "episode-1", "mi"), reading(115_000)),
    "unit_changed",
  );
});
