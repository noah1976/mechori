import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  journalLocalDraftKey,
  quickEventLocalDraftKey,
} from "../lib/local-draft-store.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const detailed = read("../components/journal-form.tsx");
const quick = read("../components/quick-event-form.tsx");
const completion = read("../components/journal-completion.tsx");
const store = read("../lib/local-draft-store.ts");

test("draft keys are isolated by user, entry mode, edit target, and prompt", () => {
  assert.notEqual(journalLocalDraftKey("user-a", undefined, "why-this-car"), journalLocalDraftKey("user-b", undefined, "why-this-car"));
  assert.notEqual(journalLocalDraftKey("user-a", undefined, "why-this-car"), journalLocalDraftKey("user-a", "journal-1", "why-this-car"));
  assert.notEqual(journalLocalDraftKey("user-a", undefined, "why-this-car"), quickEventLocalDraftKey("user-a", "vehicle-1"));
});

test("detailed and quick forms debounce local drafts and offer explicit restore actions", () => {
  assert.match(store, /localDraftMaxAgeMs = 30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(detailed, /loadJournalLocalDraft\(localDraftKey\)/);
  assert.match(detailed, /setTimeout\(\(\) => \{/);
  assert.match(detailed, /書きかけの記録があります/);
  assert.match(detailed, /下書きを復元/);
  assert.match(detailed, /clearLocalDraft\(localDraftKey\)/);
  assert.match(quick, /loadQuickEventLocalDraft\(localDraftKey\)/);
  assert.match(quick, /hasPhoto: Boolean\(image\)/);
  assert.match(quick, /未送信の写真は再度選択してください/);
});

test("successful new posts clear drafts and show completion actions", () => {
  assert.match(detailed, /clearLocalDraft\(localDraftKey\);/);
  assert.match(detailed, /setCompletion\(savedJournal\)/);
  assert.match(quick, /setCompletion\(savedJournal\)/);
  assert.match(completion, /愛車の記録を追加しました！/);
  assert.match(completion, /ガレージで見る/);
  assert.match(completion, /投稿を見る/);
  assert.match(completion, /もう1つ記録を残す/);
  assert.match(completion, /ホームへ戻る/);
});

test("new records default to the alpha audience while edits keep saved visibility", () => {
  assert.match(detailed, /visibility: "public"/);
  assert.match(quick, /journal\?\.visibility \?\? "public"/);
  assert.match(quick, /setVisibility\("public"\)/);
  assert.match(detailed, /初期値は『α参加者に公開』です/);
  assert.match(quick, /初期値は『α参加者に公開』です/);
  assert.match(detailed, /journal\s*\?\s*journalToDraft\(journal\)/);
  assert.match(quick, /journal\?\.visibility === "followers"/);
});
