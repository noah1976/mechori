import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/search/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("search conditions submit through one form action", () => {
  assert.match(source, /<form className="search-panel" onSubmit=\{submit\}/);
  assert.match(source, /<button type="submit" className="primary-action search-submit"/);
  assert.match(source, /この条件で探す/);
  assert.match(source, /検索中…/);
  assert.match(source, /setSubmittedCriteria\(nextCriteria\)/);
});

test("search submit reveals the result region below the form", () => {
  assert.match(source, /const resultsAnchorRef = useRef<HTMLElement>\(null\)/);
  assert.match(source, /shouldRevealResults\.current = true/);
  assert.match(source, /anchor\.scrollIntoView\(\{ behavior, block: "start" \}\)/);
  assert.match(source, /className="search-results-anchor"/);
  assert.match(source, /id="search-results-heading"/);
  assert.match(css, /\.search-results-anchor \{[\s\S]*?scroll-margin-top: 82px/);
});

test("search separates empty results from retryable errors", () => {
  assert.match(source, /検索結果を取得できませんでした/);
  assert.match(source, /もう一度試す/);
  assert.match(source, /条件に合う公開事例は見つかりませんでした/);
  assert.match(source, /この内容を記録する/);
  assert.match(source, /hasSubmitted && <section ref=\{resultsAnchorRef\}/);
  assert.match(source, /\{searchError \? \(/);
  assert.match(source, /!hasResults/);
});

test("search submit fills the available form width without relying on the global FAB", () => {
  assert.match(css, /\.search-submit \{ width: 100%; min-height: 50px;/);
  assert.match(source, /href="\/journal\/new"/);
});

test("search result and hazard selects match the standard mobile form-control height", () => {
  assert.match(source, /結果.*?<select/);
  assert.match(source, /危険度.*?<select/);
  assert.match(css, /\.field select, \.filter-grid select \{ height:\s*44px; block-size:\s*44px; \}/);
});
