import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const appShell = read("../components/app-shell.tsx");
const completion = read("../components/quick-record-completion-sheet.tsx");
const composer = read("../components/quick-event-form.tsx");
const garage = read("../app/garage/page.tsx");
const home = read("../app/page.tsx");
const reference = read("../app/reference-garage/page.tsx");
const signature = read("../components/alpha-history-signature.tsx");
const continuity = read("../components/vehicle-continuity.tsx");
const card = read("../components/journal-card.tsx");
const detail = read("../app/journal/[id]/page.tsx");
const demo = read("../../../packages/core/src/demo.ts");
const css = read("../app/globals.css");

test("explicit issue capture is open without diagnosis while other intents stay neutral", () => {
  assert.match(composer, /defaultEventTypeForCaptureIntent\(intent\)/);
  assert.match(composer, /issueStatus: eventType === "issue"/);
  assert.match(completion, /このクルマに、ひとつ経験が残りました/);
  assert.match(completion, /const \[savedJournal, setSavedJournal\] = useState\(journal\)/);
  assert.match(completion, /savedJournal\.eventType === "issue" && savedJournal\.issueStatus === "open"/);
  assert.match(completion, /const updated = await onSaveEnrichment\(draft\)/);
  assert.match(completion, /setSavedJournal\(updated\)/);
  assert.match(completion, /captureIntentLabel\(captureIntent, locale\)/);
  assert.match(completion, /kind: isIssue \? "issue" : "record"/);
  assert.match(completion, /<VehicleContinuity/);
  assert.match(completion, /まだ記録はありません/);
  assert.match(completion, /元の記録は残っています/);
  assert.doesNotMatch(completion, /原因:|診断:|Evidence \d+%/);
});

test("Quick Record and Garage share the Vehicle Continuity vocabulary while Home stays a live feed", () => {
  assert.doesNotMatch(home, /<AlphaHistorySignature/);
  assert.doesNotMatch(home, /<ActivationOnboarding/);
  assert.match(home, /home-following-section/);
  assert.match(home, /home-journal-feed/);
  assert.match(completion, /<VehicleContinuity/);
  assert.match(garage, /<VehicleContinuity/);
  assert.match(continuity, /vehicle-continuity-anchor/);
  assert.match(continuity, /vehicle-experience-mark/);
  assert.match(continuity, /vehicle-continuation-slot/);
  assert.match(continuity, /vehicle-experience-register/);
  assert.doesNotMatch(garage, /garage-evidence-summary/);
  assert.doesNotMatch(home + completion + garage, /VehicleHistorySpine/);
});

test("Vehicle Continuity omits missing optional identity and provenance fields", () => {
  assert.match(continuity, /identity\.model && <b>/);
  assert.match(continuity, /identity\.context && <small>/);
  assert.match(continuity, /experience\.dateLabel && experience\.dateTime/);
  assert.match(continuity, /experience\.actor &&/);
  assert.match(continuity, /experience\.media &&/);
});

test("the Home signature uses an explicit fictional fixture without fabricated metrics", () => {
  assert.match(signature, /signatureDemoStory\.experiences/);
  assert.match(signature, /DEMO・\{ja \? "架空例"/);
  assert.match(signature, /実在の車両・人物・整備結果ではありません/);
  assert.match(demo, /export const signatureDemoStory/);
  assert.match(demo, /Owner A \/ DEMO/);
  assert.match(demo, /Mechanic B \/ DEMO/);
  assert.match(demo, /未実装の将来像/);
  assert.doesNotMatch(signature, /34人|12件|92%|解決率/);
});

test("Reference Garage is a demoted explanation route, not required to understand Home", () => {
  assert.match(signature, /href="\/reference-garage"/);
  assert.match(signature, /架空例の前提を見る/);
  assert.match(reference, /<AlphaHistorySignature locale="ja" \/>/);
  assert.match(signature, /同型車との照合・比較は未実装/);
});

test("issue semantics remain calm and visible in feed, detail, and Garage", () => {
  assert.match(card, /journal-issue-state/);
  assert.match(detail, /journal-issue-state/);
  assert.match(garage, /item\.issueStatus === "open"/);
  assert.match(css, /\.journal-issue-state \{ color: #465b51; font-weight: 750; \}/);
  assert.doesNotMatch(css, /\.journal-issue-state[^}]*var\(--danger\)/);
});

test("knowledge copy keeps the safety boundary while explaining the record's value", () => {
  assert.match(detail, /この記録は、まだ確認済みナレッジではありません/);
  assert.match(detail, /車両履歴として残り/);
  assert.match(detail, /原因候補や確認済みナレッジとして検索へ出しません/);
  assert.doesNotMatch(detail, /ナレッジ検索には使用されません/);
});

test("desktop capture is directly below the brand while the mobile FAB remains", () => {
  assert.ok(appShell.indexOf('className="primary-action nav-add"') > appShell.indexOf('className="brand-block"'));
  assert.ok(appShell.indexOf('className="primary-action nav-add"') < appShell.indexOf('className="side-nav-links side-nav-primary"'));
  assert.match(appShell, /className=\{pathname === "\/" \? "record-fab record-fab-home" : "record-fab"\}/);
  assert.match(css, /\.nav-add \{ min-height: 46px; margin: 2px 0 6px;/);
});

test("onboarding is outside the authenticated Feed surface and no longer uses the black panel", () => {
  assert.doesNotMatch(appShell, /<ActivationOnboarding/);
  assert.doesNotMatch(home, /<ActivationOnboarding/);
  assert.doesNotMatch(css, /\.activation-onboarding[^}]*background: #252927/);
  assert.match(css, /\.activation-onboarding \{[^}]*background: transparent;/);
});

test("Home renders its Signature surface before the optional username setup notice", () => {
  const appMain = appShell.lastIndexOf("<main");
  const homeUsernameNotice = appShell.indexOf('{pathname === "/" && usernameSetupNotice}');
  assert.ok(appMain >= 0);
  assert.ok(homeUsernameNotice > appMain);
  assert.match(appShell, /pathname !== "\/" && usernameSetupNotice/);
});

test("Vehicle Continuity is narrow-screen safe and does not hide overflow", () => {
  assert.match(css, /\.vehicle-continuity \{[^}]*grid-template-columns: minmax\(180px, 0\.32fr\) minmax\(0, 1fr\)/);
  assert.match(css, /\.vehicle-experience-body \{ min-width: 0;/);
  assert.match(css, /\.vehicle-experience-register \{ min-width: 0;/);
  assert.doesNotMatch(css, /\.vehicle-experience-mark::before/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.vehicle-continuity, \.vehicle-continuity\.is-compact \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 340px\)[\s\S]*grid-template-columns: 80px minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /\.vehicle-continuity \{[^}]*overflow: hidden/);
});

test("Garage media spans the Experience Mark instead of becoming a narrow side column", () => {
  assert.match(garage, /media: displayJournal\.media\.filter\(\(attachment\) => attachment\.kind === "image"\)/);
  assert.match(garage, /<JournalMedia attachments=\{item\.media\} locale=\{locale\} compact \/>/);
  assert.match(css, /\.vehicle-experience-mark\.has-media \{ grid-template-columns: minmax\(132px, 0\.25fr\) minmax\(0, 1fr\); \}/);
  assert.match(css, /\.vehicle-experience-media \{ grid-column: 1 \/ -1;/);
  assert.match(css, /\.vehicle-experience-media \.journal-media\.compact, \.vehicle-experience-media \.journal-media-item \{ width: 100%; min-width: 0; max-width: 100%; \}/);
  assert.match(css, /\.vehicle-experience-media \.journal-media-item \{ min-height: 0; height: auto; \}/);
  assert.doesNotMatch(css, /\.vehicle-experience-mark\.has-media \{[^}]*minmax\(0, 220px\)/);
  assert.doesNotMatch(css, /\.vehicle-experience-media \.journal-media-item \{[^}]*height: 100%/);
});

test("feed text and image still use the same canonical journal detail href", () => {
  assert.match(card, /href=\{detailHref\}/);
  assert.match(card, /linkHref=\{detailHref\}/);
  assert.doesNotMatch(card, /linkHref=\{vehicleHref\}/);
});
