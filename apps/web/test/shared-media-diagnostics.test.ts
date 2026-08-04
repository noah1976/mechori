import assert from "node:assert/strict";
import test from "node:test";
import {
  createSharedMediaServerProbe,
  createSharedMediaLoadDiagnostic,
  isSafeSharedMediaObjectPath,
  isSharedMediaLoadDiagnostic,
  isSharedMediaServerProbe,
  sharedMediaObjectPathMatchesDiagnostic,
} from "../lib/shared-media-diagnostics.ts";

test("creates a safe shared-media diagnostic without retaining the object path", async () => {
  const objectPath = "owner-id/journal-id/private-name.webp";
  const diagnostic = await createSharedMediaLoadDiagnostic({
    photoId: "photo-1",
    bucket: "alpha-journal-media",
    objectPath,
    error: {
      name: "StorageApiError",
      status: 400,
      statusCode: "403",
      message: `secret detail for ${objectPath}`,
    },
    sessionPresent: true,
    attempts: 2,
  });

  assert.equal(diagnostic.httpStatus, 400);
  assert.equal(diagnostic.supabaseErrorCode, "storageapierror");
  assert.equal(diagnostic.safeSummary, "Storage rejected the object request");
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
    error: { error: "not_found", status: 404, statusCode: "not_found" },
    sessionPresent: false,
    attempts: 2,
  });

  assert.equal(diagnostic.httpStatus, 404);
  assert.equal(diagnostic.supabaseErrorCode, "not_found");
  assert.equal(diagnostic.pathShape.looksLikeUrl, true);
  assert.equal(diagnostic.pathShape.containsDoubleEncoding, true);
  assert.match(diagnostic.errorId, /^P069-[a-f0-9]{10}-404$/);
});

test("validates and binds a safe object path to its diagnostic hash", async () => {
  const objectPath = "owner-id/journal-id/photo.webp";
  const diagnostic = await createSharedMediaLoadDiagnostic({
    photoId: "photo-1",
    bucket: "alpha-journal-media",
    objectPath,
    error: { status: 403, statusCode: "AccessDenied", error: "AccessDenied" },
    sessionPresent: true,
    attempts: 2,
  });

  assert.equal(isSafeSharedMediaObjectPath(objectPath), true);
  assert.equal(isSafeSharedMediaObjectPath(`alpha-journal-media/${objectPath}`), false);
  assert.equal(await sharedMediaObjectPathMatchesDiagnostic(objectPath, diagnostic), true);
  assert.equal(
    await sharedMediaObjectPathMatchesDiagnostic("owner-id/journal-id/other.webp", diagnostic),
    false,
  );
});

test("creates a safe server-side access probe code", () => {
  const probe = createSharedMediaServerProbe({
    userVerified: true,
    objectOwnedByUser: true,
    policyAllowsRead: true,
    listedInVisibleShare: true,
    serverDownloadError: {
      status: 400,
      statusCode: "unauthorized",
      name: "StorageApiError",
    },
    serverDownloadSucceeded: false,
    objectDownloadStatus: 400,
    objectDownloadErrorCode: "unauthorized",
    authenticatedDownloadStatus: 400,
    authenticatedDownloadErrorCode: "unauthorized",
    authOnlyDownloadStatus: 200,
    authOnlyDownloadErrorCode: "none",
    signedUrlCreateError: { status: 400, statusCode: "unauthorized", name: "StorageApiError" },
    signedUrlCreated: false,
    signedUrlFetchStatus: null,
    signedUrlFetchErrorCode: "signed_url_unavailable",
  });

  assert.equal(
    probe.probeCode,
    "U1-W1-P1-L1-D400-storageapierror-unauthorized-O400-unauthorized-A400-unauthorized-B200-none-S400-storageapierror-Fx-signed_url_unavailable",
  );
  assert.equal(isSharedMediaServerProbe(probe), true);
  assert.doesNotMatch(JSON.stringify(probe), /owner-id|journal-id|token/i);
});
