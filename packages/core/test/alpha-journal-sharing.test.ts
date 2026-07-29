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

test("explicitly prepared alpha images are included without private storage keys", () => {
  const source = journal();
  const { storageKey: _storageKey, ...privateMedia } = source.media[0]!;
  const sharedImage = {
    ...privateMedia,
    source: "alpha_shared" as const,
    assetPath:
      "daed5df5-a404-4c89-82f6-ec92c085d2b4/journal-1/revision-media-1.webp",
  };
  const payload = createAlphaSharedJournalPayload(source, {
    sharedMedia: [sharedImage],
  });

  assert.equal(payload.media.length, 1);
  assert.equal(payload.media[0]?.source, "alpha_shared");
  assert.equal(payload.media[0]?.assetPath, sharedImage.assetPath);
  assert.equal(payload.media[0]?.storageKey, undefined);
  assert.deepEqual(
    payload.contentBlocks.map((block) => block.type),
    ["media", "text"],
  );
});

test("shared row becomes a non-searchable public journal with a synthetic author id", () => {
  const source = journal();
  const { storageKey: _storageKey, ...privateMedia } = source.media[0]!;
  const payload = createAlphaSharedJournalPayload(source, {
    sharedMedia: [
      {
        ...privateMedia,
        source: "alpha_shared",
        assetPath:
          "daed5df5-a404-4c89-82f6-ec92c085d2b4/journal-1/revision-media-1.webp",
      },
    ],
  });
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
  assert.equal(shared.journal.media[0]?.source, "alpha_shared");
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

test("shared rows containing local private media are rejected instead of rendered", () => {
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

test("shared rows reject unsafe paths and videos", () => {
  const source = journal();
  const payload = createAlphaSharedJournalPayload(source);
  const baseMedia = {
    ...source.media[0]!,
    source: "alpha_shared",
    storageKey: undefined,
    assetPath:
      "daed5df5-a404-4c89-82f6-ec92c085d2b4/journal-1/revision-media-1.webp",
  };

  for (const media of [
    { ...baseMedia, assetPath: "../private/photo.webp" },
    { ...baseMedia, kind: "video", mimeType: "video/mp4" },
  ]) {
    const shared = parseAlphaSharedJournalRow({
      share_id: "unsafe-share",
      journal_id: "unsafe-journal",
      author_display_name: "Noah",
      payload: {
        ...payload,
        media: [media],
        contentBlocks: [{ id: "block-1", type: "media", mediaId: media.id }],
      },
      published_at: payload.publishedAt,
      updated_at: payload.updatedAt,
    });
    assert.equal(shared, null);
  }
});

test("media blocks cannot reference an image omitted from the shared payload", () => {
  const payload = createAlphaSharedJournalPayload(journal());
  const shared = parseAlphaSharedJournalRow({
    share_id: "missing-media-share",
    journal_id: "missing-media-journal",
    author_display_name: "Noah",
    payload: {
      ...payload,
      contentBlocks: [{ id: "block-1", type: "media", mediaId: "missing" }],
    },
    published_at: payload.publishedAt,
    updated_at: payload.updatedAt,
  });

  assert.equal(shared, null);
});

test("shared images over the alpha limit are rejected", () => {
  const source = journal();
  const { storageKey: _storageKey, ...privateMedia } = source.media[0]!;

  assert.throws(
    () =>
      createAlphaSharedJournalPayload(source, {
        sharedMedia: [
          {
            ...privateMedia,
            source: "alpha_shared",
            assetPath:
              "daed5df5-a404-4c89-82f6-ec92c085d2b4/journal-1/revision-media-1.webp",
            sizeBytes: 512 * 1024 + 1,
          },
        ],
      }),
    /invalid_shared_media/,
  );
});

test("a shared payload cannot contain more than six images", () => {
  const source = journal();
  const { storageKey: _storageKey, ...privateMedia } = source.media[0]!;
  const sharedMedia = Array.from({ length: 7 }, (_, index) => ({
    ...privateMedia,
    id: `media-${index}`,
    source: "alpha_shared" as const,
    assetPath:
      `daed5df5-a404-4c89-82f6-ec92c085d2b4/journal-1/revision-media-${index}.webp`,
  }));

  assert.throws(
    () => createAlphaSharedJournalPayload(source, { sharedMedia }),
    /too_many_shared_media/,
  );
});
