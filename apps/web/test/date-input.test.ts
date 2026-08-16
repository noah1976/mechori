import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { localDateInputValue } from "../lib/date-input.ts";

test("formats a browser-local calendar day without converting it to UTC", () => {
  assert.equal(localDateInputValue(new Date(2026, 6, 18, 1, 30)), "2026-07-18");
});

test("date fields use a full-width mobile-safe native date input", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const component = readFileSync(new URL("../components/occurrence-date-fields.tsx", import.meta.url), "utf8");
  assert.match(component, /type="date"/);
  assert.match(component, /className="occurrence-date-control"/);
  assert.match(css, /\.occurrence-date-fields input\[type="date"\][\s\S]*?box-sizing:\s*border-box/);
  assert.match(css, /\.occurrence-date-fields \{[\s\S]*?inline-size:\s*100%/);
  assert.match(css, /\.occurrence-date-fields \{[\s\S]*?min-inline-size:\s*0/);
  assert.match(css, /\.occurrence-date-fields \{[\s\S]*?box-sizing:\s*border-box/);
  assert.match(css, /\.occurrence-date-fields input\[type="date"\][\s\S]*?inline-size:\s*100%/);
  assert.match(css, /\.occurrence-date-fields input\[type="date"\][\s\S]*?min-inline-size:\s*0/);
  assert.match(css, /\.occurrence-date-fields input\[type="date"\][\s\S]*?width:\s*100%/);
  assert.match(css, /\.occurrence-date-fields input\[type="date"\][\s\S]*?max-width:\s*100%/);
  assert.match(css, /\.occurrence-date-fields input\[type="date"\][\s\S]*?min-width:\s*0/);
  assert.match(css, /\.occurrence-date-fields input\[type="date"\][\s\S]*?min-height:\s*50px/);
  assert.match(css, /\.occurrence-date-fields input\[type="date"\][\s\S]*?font-size:\s*16px/);
  assert.match(css, /\.occurrence-date-control \{ inline-size:\s*100%; max-inline-size:\s*100%; \}/);
  assert.match(css, /\.quick-record-enrichment-form \{ display:\s*grid; min-inline-size:\s*0;/);
});
