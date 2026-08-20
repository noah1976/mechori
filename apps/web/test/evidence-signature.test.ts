import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const completion = read("../components/quick-record-completion-sheet.tsx");
const garage = read("../app/garage/page.tsx");
const home = read("../app/page.tsx");
const reference = read("../app/reference-garage/page.tsx");
const signature = read("../components/alpha-history-signature.tsx");
const spine = read("../components/vehicle-history-spine.tsx");
const card = read("../components/journal-card.tsx");
const detail = read("../app/journal/[id]/page.tsx");
const css = read("../app/globals.css");

test("Quick Record completion is neutral until the user explicitly selects issue", () => {
  assert.match(completion, /このクルマに、ひとつ経験が残りました/);
  assert.match(completion, /journal\.bodyOriginal/);
  assert.match(completion, /journalOccurrenceLabel\(journal, locale\)/);
  assert.match(completion, /photoCount > 0/);
  assert.match(completion, /journal\.eventType === "issue" && journal\.issueStatus === "open"/);
  assert.match(completion, /kind: isIssue \? "issue" : "record"/);
  assert.match(completion, /kind: "continuation"/);
  assert.match(completion, /onSaveEnrichment/);
  assert.match(completion, /元の記録は残っています/);
  assert.doesNotMatch(completion, /原因:|診断:|Evidence \d+%/);
});

test("Home, Quick Record, and Garage share the same vehicle history spine", () => {
  assert.match(home, /<AlphaHistorySignature locale=\{locale\} compact \/>/);
  assert.ok(home.indexOf("<AlphaHistorySignature") < home.indexOf("{feed.length"));
  assert.match(completion, /<VehicleHistorySpine/);
  assert.match(garage, /<VehicleHistorySpine/);
  assert.match(spine, /className={`vehicle-history-spine is-\$\{density\}`}/);
  assert.doesNotMatch(garage, /garage-evidence-summary/);
});

test("the inline signature is clearly demo-only and derives people and records from demo fixtures", () => {
  assert.match(signature, /demoData\.records\.find/);
  assert.match(signature, /demoData\.profiles\.find/);
  assert.match(signature, /<span className="demo-label">DEMO<\/span>/);
  assert.match(signature, /実ユーザーの記録ではありません/);
  assert.match(signature, /workshopRecord\.serviceAttribution\.providerDisplayNameSnapshot/);
  assert.match(signature, /issueRecord\.resolutionStatus/);
  assert.doesNotMatch(signature, /34人|12件|92%|解決率/);
});

test("Reference Garage remains a secondary demo deep dive", () => {
  assert.match(signature, /href="\/reference-garage"/);
  assert.match(signature, /DEMO履歴を詳しく見る/);
  assert.match(reference, /<AlphaHistorySignature locale="ja" \/>/);
  assert.match(signature, /同じ車種の別個体との比較は将来構想/);
});

test("issue semantics are calm and visible in feed, detail, and Garage", () => {
  assert.match(card, /journal-issue-state/);
  assert.match(detail, /journal-issue-state/);
  assert.match(garage, /item\.issueStatus === "open"/);
  assert.match(css, /\.journal-issue-state \{ color: #465b51; font-weight: 750; \}/);
  assert.doesNotMatch(css, /\.journal-issue-state[^}]*var\(--danger\)/);
});

test("the shared spine is narrow-screen safe without hiding overflow", () => {
  assert.match(css, /\.vehicle-history-spine-copy \{ min-width: 0;/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.vehicle-history-spine \.vehicle-history-spine-entry[\s\S]*grid-template-columns: 30px minmax\(0, 1fr\)/);
  assert.match(css, /\.vehicle-history-spine-media \{ grid-column: 2; min-height: 164px;/);
  assert.doesNotMatch(css, /\.vehicle-history-spine \{[^}]*overflow: hidden/);
  assert.match(css, /@media \(max-width: 340px\)[\s\S]*\.record-fab > span \{ display: none; \}/);
});
