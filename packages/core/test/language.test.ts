import assert from "node:assert/strict";
import test from "node:test";

import {
  isSupportedUiLocale,
  normalizeLanguageTag,
  resolveSupportedUiLocale,
  supportedUiLocales,
} from "../src/index.ts";

test("keeps the initial UI locale list explicit and extensible", () => {
  assert.deepEqual(supportedUiLocales, ["ja", "en"]);
  assert.equal(isSupportedUiLocale("ja"), true);
  assert.equal(isSupportedUiLocale("de"), false);
});

test("canonicalizes source languages beyond the current UI languages", () => {
  assert.equal(normalizeLanguageTag("pt_br"), "pt-BR");
  assert.equal(normalizeLanguageTag("de-DE"), "de-DE");
  assert.equal(normalizeLanguageTag("not a language"), null);
});

test("resolves regional preferences to a supported base UI language", () => {
  assert.equal(resolveSupportedUiLocale("en-GB"), "en");
  assert.equal(resolveSupportedUiLocale("ja-JP"), "ja");
  assert.equal(resolveSupportedUiLocale("it-IT"), "ja");
});
