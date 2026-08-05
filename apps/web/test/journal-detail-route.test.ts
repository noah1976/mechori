import assert from "node:assert/strict";
import test from "node:test";
import {
  journalDetailAvailability,
  journalDetailHref,
} from "../lib/journal-detail-route.ts";

const journal = {
  id: "journal / with space",
} as never;

test("journal detail links preserve the exact journal identifier", () => {
  assert.equal(journalDetailHref("journal / with space"), "/journal/journal%20%2F%20with%20space");
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
