import assert from "node:assert/strict";
import test from "node:test";
import {
  alphaJournalSyncError,
  journalSaveErrorCode,
  journalSaveErrorMessage,
} from "../lib/journal-save-error.ts";

test("keeps shared photo failures distinct from record persistence failures", () => {
  assert.equal(
    journalSaveErrorCode(new Error("shared_image_not_found")),
    "alpha_shared_image_sync_failed",
  );
  assert.equal(
    journalSaveErrorCode(new Error("persistence_failed")),
    "persistence_failed",
  );
  assert.equal(
    alphaJournalSyncError(new Error("alpha_shared_image_upload_failed")).message,
    "alpha_shared_image_sync_failed",
  );
  assert.equal(
    journalSaveErrorCode(new Error("media_storage_key_required")),
    "alpha_shared_image_sync_failed",
  );
  assert.equal(
    journalSaveErrorCode(new Error("alpha_journal_sharing_unavailable")),
    "alpha_shared_journal_sync_failed",
  );
});

test("returns safe actionable messages without exposing backend details", () => {
  assert.match(
    journalSaveErrorMessage(new Error("alpha_shared_image_sync_failed"), true),
    /既存の記録と写真は失われていません/,
  );
  assert.match(
    journalSaveErrorMessage(new Error("persistence_failed"), false),
    /record itself/,
  );
  const fallback = journalSaveErrorMessage(
    new Error("private database constraint detail"),
    true,
  );
  assert.doesNotMatch(fallback, /database|constraint|private/i);
  assert.match(fallback, /運営者/);
});
