import assert from "node:assert/strict";
import test from "node:test";
import { localDateInputValue } from "../lib/date-input.ts";

test("formats a browser-local calendar day without converting it to UTC", () => {
  assert.equal(localDateInputValue(new Date(2026, 6, 18, 1, 30)), "2026-07-18");
});
