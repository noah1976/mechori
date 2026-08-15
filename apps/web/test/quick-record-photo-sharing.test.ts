import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  addJournalToData,
  cloneDemoData,
  createAlphaSharedJournalPayload,
  type JournalMediaAttachment,
} from "@mechori/core";
import {
  AlphaSharedJournalMediaError,
  alphaInlineDataUrlToBlob,
} from "../lib/alpha-shared-journals.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("a public quick record can promote its prepared image to a shared media payload", () => {
  const data = cloneDemoData();
  const vehicle = data.vehicles[0]!;
  const attachment: JournalMediaAttachment = {
    id: "quick-photo",
    kind: "image",
    source: "alpha_inline",
    assetPath: "data:image/webp;base64,shared-after-upload",
    mimeType: "image/webp",
    sizeBytes: 1200,
    altText: "Vehicle photo",
    privacyState: "public_ready",
    createdAt: "2026-08-15T00:00:00.000Z",
    isDemo: false,
  };
  const result = addJournalToData(data, {
    title: "Short record",
    eventType: "other",
    occurredOn: "2026-08-15",
    occurredPrecision: "day",
    bodyOriginal: "A short record with a photo.",
    vehicleId: vehicle.id,
    linkedRecordId: "",
    displayFields: [],
    media: [attachment],
    contentBlocks: [
      { id: "quick-media", type: "media", mediaId: attachment.id },
      { id: "quick-text", type: "text", style: "paragraph", text: "A short record with a photo." },
    ],
    visibility: "public",
    knowledgeExtractionConsent: false,
  }, "en", "2026-08-15T00:00:00.000Z");
  const sharedAttachment: JournalMediaAttachment = {
    ...attachment,
    source: "alpha_shared",
    assetPath: "owner/journal/quick-photo.webp",
  };

  const payload = createAlphaSharedJournalPayload(result.journal, {
    sharedMedia: [sharedAttachment],
  });

  assert.deepEqual(payload.media, [sharedAttachment]);
  assert.deepEqual(payload.contentBlocks.map((block) => block.type), ["media", "text"]);
  assert.equal(payload.media[0]?.source, "alpha_shared");
  assert.doesNotMatch(payload.media[0]?.assetPath ?? "", /^data:/);
});

test("forms do not preflight-block public photo sharing before the shared upload runs", () => {
  const quick = read("../components/quick-event-form.tsx");
  const detailed = read("../components/journal-form.tsx");
  const context = read("../lib/app-context.tsx");

  for (const source of [quick, detailed]) {
    assert.doesNotMatch(source, /写真共有の準備が完了していない/);
    assert.doesNotMatch(source, /自分だけに保存してください/);
  }
  assert.doesNotMatch(context, /alphaJournalMediaSharingAvailable/);
  assert.match(context, /await publishAlphaSharedJournal\(/);
  assert.match(context, /throw alphaJournalSyncError\(error\)/);
});

test("prepared alpha_inline images become uploadable Blobs without refetching their data URL", async () => {
  const blob = alphaInlineDataUrlToBlob("data:image/webp;base64,AAEC");

  assert.ok(blob);
  assert.equal(blob.type, "image/webp");
  assert.equal(blob.size, 3);
  assert.deepEqual(Array.from(new Uint8Array(await blob.arrayBuffer())), [0, 1, 2]);
  assert.equal(alphaInlineDataUrlToBlob("data:image/heic;base64,AAEC"), null);
});

test("shared photo writes use a fresh Storage insert and expose only safe diagnostics", () => {
  const source = read("../lib/alpha-shared-journals.ts");
  const failure = new AlphaSharedJournalMediaError(
    "alpha_shared_image_upload_failed",
    "upload_shared_media",
    { statusCode: "403", error: "Unauthorized" },
  );

  assert.match(source, /upsert:\s*false/);
  assert.doesNotMatch(source, /fetch\(attachment\.assetPath\)/);
  assert.equal(failure.operation, "upload_shared_media");
  assert.equal(failure.httpStatus, 403);
  assert.equal(failure.safeErrorCode, "unauthorized");
});
