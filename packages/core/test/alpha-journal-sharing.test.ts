import assert from "node:assert/strict";
import test from "node:test";
import {
  createAlphaSharedJournalPayload,
  parseAlphaSharedJournalRow,
  type GarageJournalPost,
} from "../src/index.ts";

function journal(): GarageJournalPost {
  return {
    id: "journal-1",
    authorProfileId: "owner-1",
    vehicleId: "private-vehicle-id",
    vehicleTargetId: "private-target-id",
    vehicleLabel: "FIAT Barchetta",
    modelTargetId: "fiat-barchetta",
    title: "雪でバンパーを傷めた",
    eventType: "breakdown",
    bodyOriginal: "雪の塊に当たり、後日工場で確認してもらった。",
    sourceLanguage: "ja",
    visibility: "public",
    moderationState: "visible",
    linkedRecordId: "private-record-id",
    displayFields: ["service_date", "actions"],
    media: [
      {
        id: "media-1",
        kind: "image",
        source: "local_blob",
        storageKey: "private-storage-key",
        mimeType: "image/webp",
        sizeBytes: 5,
        altText: "傷ついたバンパー",
        privacyState: "public_ready",
        createdAt: "2026-07-29T00:00:00.000Z",
        isDemo: false,
      },
    ],
    contentBlocks: [
      { id: "block-1", type: "media", mediaId: "media-1" },
      { id: "block-2", type: "text", style: "paragraph", text: "雪の塊に当たった。" },
    ],
    knowledgeExtractionConsent: true,
    appreciationCount: 4,
    occurredOn: "2026-01-10",
    occurredPrecision: "day",
    createdAt: "2026-07-29T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    publishedAt: "2026-07-29T00:00:00.000Z",
    isDemo: false,
  };
}

test("shared journal projection omits private identifiers and linked maintenance data", () => {
  const payload = createAlphaSharedJournalPayload(journal());

  assert.equal("vehicleId" in payload, false);
  assert.equal("linkedRecordId" in payload, false);
  assert.equal("displayFields" in payload, false);
  assert.equal("knowledgeExtractionConsent" in payload, false);
  assert.deepEqual(payload.media, []);
  assert.deepEqual(
    payload.contentBlocks.map((block) => block.type),
    ["text"],
  );
});

test("shared row becomes a non-searchable public journal with a synthetic author id", () => {
  const payload = createAlphaSharedJournalPayload(journal());
  const shared = parseAlphaSharedJournalRow({
    share_id: "share-1",
    journal_id: "journal-1",
    author_display_name: "Noah",
    payload,
    published_at: payload.publishedAt,
    updated_at: payload.updatedAt,
  });

  assert.ok(shared);
  assert.equal(shared.journal.authorProfileId, "alpha-shared-author-share-1");
  assert.equal(shared.journal.knowledgeExtractionConsent, false);
  assert.equal(shared.author.displayName, "Noah");
});

test("private journals cannot create a shared projection", () => {
  assert.throws(
    () =>
      createAlphaSharedJournalPayload(
        { ...journal(), visibility: "private" },
      ),
    /journal_not_public/,
  );
});

test("shared rows containing media are rejected instead of rendered", () => {
  const payload = createAlphaSharedJournalPayload(journal());
  const shared = parseAlphaSharedJournalRow({
    share_id: "share-with-media",
    journal_id: "journal-with-media",
    author_display_name: "Noah",
    payload: {
      ...payload,
      media: journal().media,
    },
    published_at: payload.publishedAt,
    updated_at: payload.updatedAt,
  });

  assert.equal(shared, null);
});
