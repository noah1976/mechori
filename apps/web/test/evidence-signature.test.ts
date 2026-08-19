import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const completion = read("../components/quick-record-completion-sheet.tsx");
const garage = read("../app/garage/page.tsx");
const home = read("../app/page.tsx");
const reference = read("../app/reference-garage/page.tsx");
const css = read("../app/globals.css");

test("Quick Record completion previews only saved record facts before optional enrichment", () => {
  assert.match(completion, /この記録は、\$\{vehicleLabel\}の履歴に残りました/);
  assert.match(completion, /journal\.bodyOriginal/);
  assert.match(completion, /journalOccurrenceLabel\(journal, locale\)/);
  assert.match(completion, /photoCount > 0/);
  assert.match(completion, /整備情報を追加可能/);
  assert.match(completion, /後から結果を追記可能/);
  assert.match(completion, /onSaveEnrichment/);
  assert.match(completion, /元の記録は残っています/);
  assert.doesNotMatch(completion, /原因:|診断:|Evidence \d+%/);
});

test("Garage summarizes only records and part entries already present for the selected vehicle", () => {
  assert.match(garage, /const partCount = records\.reduce/);
  assert.match(garage, /className="garage-evidence-summary"/);
  assert.match(garage, /timeline\.length/);
  assert.match(garage, /records\.length/);
  assert.match(garage, /partCount > 0/);
});

test("Reference Garage is explicitly demo-only and reads the existing safe demo dataset in evidence order", () => {
  assert.match(reference, /demoData/);
  assert.match(reference, /MECHORI Reference Garage · DEMO車両/);
  assert.match(reference, /実ユーザーのデータではありません/);
  assert.ok(reference.indexOf('label: "出来事"') < reference.indexOf('label: "作業"'));
  assert.ok(reference.indexOf('label: "作業"') < reference.indexOf('label: "部品"'));
  assert.ok(reference.indexOf('label: "部品"') < reference.indexOf('label: "結果"'));
});

test("Home uses a restrained Reference Garage entry and evidence surfaces remain mobile-safe", () => {
  assert.match(home, /href="\/reference-garage"/);
  assert.match(home, /記録がつながった例を見る/);
  assert.match(css, /\.evidence-flow-strip li \{ display: grid; grid-template-columns: 28px minmax\(0, 1fr\)/);
  assert.match(css, /\.garage-evidence-summary \{ align-items: flex-start; flex-direction: column/);
  assert.match(css, /\.home-reference-link \{ width: 100%; margin-left: 0; \}/);
});
