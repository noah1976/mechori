import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPublicVehicleShareError,
  publicVehicleShareErrorMessage,
} from "../lib/public-vehicle-share-error.ts";

test("classifies vehicle share failures without exposing backend details", () => {
  assert.equal(
    classifyPublicVehicleShareError({ code: "42P01", message: "private relation detail" }),
    "setup_required",
  );
  assert.equal(classifyPublicVehicleShareError(new Error("JWT expired")), "permission");
  assert.equal(classifyPublicVehicleShareError(new Error("Failed to fetch")), "temporary");
  assert.equal(
    classifyPublicVehicleShareError(new Error("prepared_vehicle_photo_required")),
    "public_content_required",
  );

  const message = publicVehicleShareErrorMessage("unknown", true);
  assert.match(message, /フィードバック/);
  assert.doesNotMatch(message, /private relation detail/);
});
