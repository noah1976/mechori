import assert from "node:assert/strict";
import test from "node:test";
import {
  createSharedMediaLoadDiagnostic,
  isSharedMediaLoadDiagnostic,
} from "../lib/shared-media-diagnostics.ts";

test("creates a safe shared-media diagnostic without retaining the object path", async () => {
  const objectPath = "owner-id/journal-id/private-name.webp";
  const diagnostic = await createSharedMediaLoadDiagnostic({
    photoId: "photo-1",
    bucket: "alpha-journal-media",
    objectPath,
    error: {
      name: "StorageApiError",
      statusCode: "403",
      message: `secret detail for ${objectPath}`,
    },
    sessionPresent: true,
    attempts: 2,
  });

  assert.equal(diagnostic.httpStatus, 403);
  assert.equal(diagnostic.supabaseErrorCode, "storageapierror");
  assert.equal(diagnostic.safeSummary, "Storage access was denied");
  assert.equal(diagnostic.pathShape.segmentCount, 3);
  assert.equal(diagnostic.objectPathHash.length, 64);
  assert.equal(JSON.stringify(diagnostic).includes(objectPath), false);
  assert.equal(JSON.stringify(diagnostic).includes("secret detail"), false);
  assert.equal(isSharedMediaLoadDiagnostic(diagnostic), true);
});

test("flags malformed stored object paths without logging their values", async () => {
  const diagnostic = await createSharedMediaLoadDiagnostic({
    photoId: "photo-2",
    bucket: "alpha-journal-media",
    objectPath: "https://example.invalid/alpha-journal-media%252Fowner%252Fphoto.webp",
    error: { error: "not_found", statusCode: 404 },
    sessionPresent: false,
    attempts: 2,
  });

  assert.equal(diagnostic.httpStatus, 404);
  assert.equal(diagnostic.supabaseErrorCode, "not_found");
  assert.equal(diagnostic.pathShape.looksLikeUrl, true);
  assert.equal(diagnostic.pathShape.containsDoubleEncoding, true);
  assert.match(diagnostic.errorId, /^P069-[a-f0-9]{10}-404$/);
});
