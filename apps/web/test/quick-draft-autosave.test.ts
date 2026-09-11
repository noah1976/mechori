import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createDraftAutosaveLifecycle } from "../lib/draft-autosave-lifecycle.ts";

function createQueuedTimers() {
  const callbacks = new Map<number, () => void>();
  let nextId = 1;

  return {
    schedule(callback: () => void) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    cancel(id: number) {
      // Deliberately retain callbacks to simulate work already queued by the browser.
      void id;
    },
    flush() {
      const queued = [...callbacks.values()];
      callbacks.clear();
      queued.forEach((callback) => callback());
    },
  };
}

function createHarness(store = new Map<string, string>()) {
  const timers = createQueuedTimers();
  const lifecycle = createDraftAutosaveLifecycle(
    (callback) => timers.schedule(callback),
    (timer) => timers.cancel(timer),
  );

  return { lifecycle, store, timers };
}

test("fast successful save cannot be overwritten by a stale autosave callback", () => {
  const { lifecycle, store, timers } = createHarness();
  lifecycle.schedule(() => store.set("vehicle-a", "saved body"), 600);

  lifecycle.beginSubmission();
  lifecycle.completeSuccess(() => store.delete("vehicle-a"));
  timers.flush();

  assert.equal(store.has("vehicle-a"), false);
});

test("successful save clears a draft that autosaved before submit", () => {
  const { lifecycle, store, timers } = createHarness();
  lifecycle.schedule(() => store.set("vehicle-a", "saved body"), 600);
  timers.flush();
  assert.equal(store.get("vehicle-a"), "saved body");

  lifecycle.beginSubmission();
  lifecycle.completeSuccess(() => store.delete("vehicle-a"));

  assert.equal(store.has("vehicle-a"), false);
});

test("failed save persists the submitted input and resumes autosave", () => {
  const { lifecycle, store, timers } = createHarness();
  lifecycle.schedule(() => store.set("vehicle-a", "stale body"), 600);
  lifecycle.beginSubmission();

  const persisted = lifecycle.completeFailure(() => {
    store.set("vehicle-a", "retry body");
    return true;
  });
  timers.flush();

  assert.equal(persisted, true);
  assert.equal(store.get("vehicle-a"), "retry body");

  lifecycle.schedule(() => store.set("vehicle-a", "edited retry body"), 600);
  timers.flush();
  assert.equal(store.get("vehicle-a"), "edited retry body");
});

test("retry success clears the draft left by a failed save", () => {
  const { lifecycle, store, timers } = createHarness();
  lifecycle.beginSubmission();
  lifecycle.completeFailure(() => {
    store.set("vehicle-a", "retry body");
    return true;
  });

  lifecycle.schedule(() => store.set("vehicle-a", "retry body"), 600);
  lifecycle.beginSubmission();
  lifecycle.completeSuccess(() => store.delete("vehicle-a"));
  timers.flush();

  assert.equal(store.has("vehicle-a"), false);
});

test("leaving without submit keeps normal autosave behavior", () => {
  const { lifecycle, store, timers } = createHarness();
  lifecycle.schedule(() => store.set("vehicle-a", "unfinished body"), 600);
  timers.flush();

  assert.equal(store.get("vehicle-a"), "unfinished body");
});

test("success clears only the submitted vehicle draft", () => {
  const store = new Map<string, string>([["vehicle-a", "other unfinished body"]]);
  const { lifecycle, timers } = createHarness(store);
  lifecycle.schedule(() => store.set("vehicle-b", "submitted body"), 600);
  lifecycle.beginSubmission();
  lifecycle.completeSuccess(() => store.delete("vehicle-b"));
  timers.flush();

  assert.equal(store.get("vehicle-a"), "other unfinished body");
  assert.equal(store.has("vehicle-b"), false);
});

test("unmount invalidates autosave work already queued", () => {
  const { lifecycle, store, timers } = createHarness();
  lifecycle.schedule(() => store.set("vehicle-a", "stale body"), 600);
  lifecycle.dispose();
  timers.flush();

  assert.equal(store.has("vehicle-a"), false);
});

test("Quick Record connects submit success and failure to the autosave lifecycle", () => {
  const source = readFileSync(
    new URL("../components/quick-event-form.tsx", import.meta.url),
    "utf8",
  );
  const beginSubmission = source.indexOf("draftAutosave.beginSubmission()");
  const saveRequest = source.indexOf("await addJournal(draft)");
  const completeSuccess = source.indexOf("draftAutosave.completeSuccess");

  assert.ok(beginSubmission >= 0 && beginSubmission < saveRequest);
  assert.ok(completeSuccess > saveRequest);
  assert.match(source, /draftAutosave\.completeFailure\([\s\S]*saveLocalDraft\(localDraftKey, submittedDraftSnapshot\)/);
});
