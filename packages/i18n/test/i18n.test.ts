import assert from "node:assert/strict";
import test from "node:test";
import {
  dictionaries,
  formatUiDate,
  formatUiNumber,
  translate,
} from "../src/index.ts";

test("all supported dictionaries expose the same keys", () => {
  assert.deepEqual(Object.keys(dictionaries.en).sort(), Object.keys(dictionaries.ja).sort());
});

test("translate selects the requested locale", () => {
  assert.equal(translate("ja", "signIn"), "ログイン");
  assert.equal(translate("en", "signIn"), "Sign in");
});

test("translate substitutes only supplied message values", () => {
  assert.equal(
    translate("ja", "vehicleJoinedGarage", { vehicle: "X1/9" }),
    "あなたのGarageに、X1/9が加わりました。",
  );
  assert.equal(translate("en", "vehicleJoinedGarage"), "{vehicle} has joined your Garage.");
});

test("locale formatters use stable Japanese and English conventions", () => {
  assert.equal(formatUiNumber("ja", 12345), "12,345");
  assert.equal(formatUiNumber("en", 12345), "12,345");
  assert.match(formatUiDate("ja", "2026-07-18T00:00:00Z", { year: "numeric", month: "long" }), /2026年7月/);
  assert.match(formatUiDate("en", "2026-07-18T00:00:00Z", { year: "numeric", month: "long" }), /July 2026/);
});

test("invalid date strings remain visible instead of becoming fabricated dates", () => {
  assert.equal(formatUiDate("ja", "時期不明"), "時期不明");
});
