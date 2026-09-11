import assert from "node:assert/strict";
import test from "node:test";
import {
  journalDetailAvailability,
  journalDetailHref,
  journalReturnHref,
} from "../lib/journal-detail-route.ts";

const journal = {
  id: "journal / with space",
} as never;

test("journal detail links preserve the exact journal identifier", () => {
  assert.equal(journalDetailHref("journal / with space"), "/journal/journal%20%2F%20with%20space");
  assert.equal(journalDetailHref("journal-1", "/"), "/journal/journal-1?from=%2F");
  assert.equal(journalReturnHref("/", true), "/");
  assert.equal(journalReturnHref("https://example.com", true), "/feed");
});

test("a shared record loading in the background is not treated as missing", () => {
  assert.equal(journalDetailAvailability({
    hydrated: true,
    isRemoteAlpha: true,
    signedIn: true,
    sharedLoadState: "loading",
  }), "loading");
  assert.equal(journalDetailAvailability({
    hydrated: true,
    isRemoteAlpha: true,
    signedIn: true,
    sharedJournal: journal,
    sharedLoadState: "ready",
  }), "ready");
});

test("workspace hydration is not treated as a missing shared record", () => {
  assert.equal(journalDetailAvailability({
    hydrated: true,
    isRemoteAlpha: true,
    signedIn: true,
    workspaceLoadState: "loading",
    sharedLoadState: "idle",
  }), "loading");
});

test("a transient shared lookup failure remains retryable, while a completed miss is missing", () => {
  assert.equal(journalDetailAvailability({
    hydrated: true,
    isRemoteAlpha: true,
    signedIn: true,
    sharedLoadState: "error",
  }), "retryable_error");
  assert.equal(journalDetailAvailability({
    hydrated: true,
    isRemoteAlpha: true,
    signedIn: true,
    sharedLoadState: "ready",
  }), "missing");
});
