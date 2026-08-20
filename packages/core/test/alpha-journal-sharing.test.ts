import assert from "node:assert/strict";
import test from "node:test";
import {
  createAlphaSharedJournalPayload,
  parseAlphaSharedJournalRow,
  preferSharedJournalMediaForDisplay,
  reusableAlphaSharedJournalMedia,
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
    serviceAttribution: {
      version: 1,
      performedByType: "service_provider",
      serviceProviderId: "private-provider-id",
      providerDisplayNameSnapshot: "Private Workshop Snapshot",
    },
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
  assert.equal("serviceAttribution" in payload, false);
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

test("reuses an existing server photo when a public journal is edited", () => {
  const edited = {
    ...journal(),
    title: "バンパー破損",
    occurredOn: undefined,
    occurredYear: 2026,
    occurredMonth: 2,
    occurredPrecision: "month" as const,
    updatedAt: "2026-08-03T12:00:00.000Z",
    media: journal().media.map((attachment) => ({
      ...attachment,
      altText: "破損したフロントバンパー",
    })),
  };
  const { storageKey: _storageKey, ...previousPrivateMedia } = journal().media[0]!;
  const previousShared = {
    ...journal(),
    media: [{
      ...previousPrivateMedia,
      source: "alpha_shared" as const,
      assetPath:
        "daed5df5-a404-4c89-82f6-ec92c085d2b4/journal-1/original-media-1.webp",
    }],
  };

  const reusable = reusableAlphaSharedJournalMedia(edited, previousShared);
  const payload = createAlphaSharedJournalPayload(edited, {
    sharedMedia: reusable,
  });

  assert.equal(reusable.length, 1);
  assert.equal(reusable[0]?.assetPath, previousShared.media[0]?.assetPath);
  assert.equal(reusable[0]?.altText, "破損したフロントバンパー");
  assert.equal(payload.media[0]?.storageKey, undefined);
  assert.equal(payload.occurredOn, undefined);
  assert.equal(payload.occurredYear, 2026);
  assert.equal(payload.occurredMonth, 2);
});

test("does not reuse a server photo that was removed or made private", () => {
  const source = journal();
  const { storageKey: _storageKey, ...previousPrivateMedia } = source.media[0]!;
  const previousShared = {
    ...source,
    media: [{
      ...previousPrivateMedia,
      source: "alpha_shared" as const,
      assetPath:
        "daed5df5-a404-4c89-82f6-ec92c085d2b4/journal-1/original-media-1.webp",
    }],
  };

  assert.deepEqual(
    reusableAlphaSharedJournalMedia({ ...source, media: [] }, previousShared),
    [],
  );
  assert.deepEqual(
    reusableAlphaSharedJournalMedia({
      ...source,
      media: source.media.map((attachment) => ({
        ...attachment,
        privacyState: "private_only" as const,
      })),
    }, previousShared),
    [],
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

test("an open issue keeps its explicit state in the shared projection", () => {
  const source = { ...journal(), eventType: "issue" as const, issueStatus: "open" as const };
  const payload = createAlphaSharedJournalPayload(source);
  const shared = parseAlphaSharedJournalRow({
    share_id: "share-open-issue",
    journal_id: source.id,
    author_display_name: "Noah",
    payload,
    published_at: payload.publishedAt,
    updated_at: payload.updatedAt,
  });

  assert.equal(payload.eventType, "issue");
  assert.equal(payload.issueStatus, "open");
  assert.equal(shared?.journal.eventType, "issue");
  assert.equal(shared?.journal.issueStatus, "open");
});

test("shared rows use stable public profile and vehicle identifiers when available", () => {
  const payload = createAlphaSharedJournalPayload(journal());
  const shared = parseAlphaSharedJournalRow({
    share_id: "share-with-public-links",
    journal_id: "journal-with-public-links",
    public_profile_id: "28d8cb58-2f98-4e4d-b9b2-382416ca37d2",
    vehicle_target_id: "public-vehicle-slug",
    author_display_name: "Noah",
    payload,
    published_at: payload.publishedAt,
    updated_at: payload.updatedAt,
  });

  assert.ok(shared);
  assert.equal(
    shared.journal.authorProfileId,
    "28d8cb58-2f98-4e4d-b9b2-382416ca37d2",
  );
  assert.equal(shared.journal.vehicleTargetId, "public-vehicle-slug");
  assert.equal(shared.author.visibility, "public");
  assert.deepEqual(shared.author.displayFields, ["vehicles"]);
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

test("a server copy replaces public-ready local media for cross-device display", () => {
  const local = journal();
  const sharedMedia = {
    ...local.media[0]!,
    source: "alpha_shared" as const,
    storageKey: undefined,
    assetPath:
      "daed5df5-a404-4c89-82f6-ec92c085d2b4/journal-1/revision-media-1.webp",
  };
  const shared = {
    ...local,
    media: [sharedMedia],
  };

  const display = preferSharedJournalMediaForDisplay(local, shared);

  assert.equal(display.media[0]?.source, "alpha_shared");
  assert.equal(display.media[0]?.assetPath, sharedMedia.assetPath);
  assert.equal(display.media[0]?.storageKey, undefined);
});

test("private local media is never replaced by a server copy", () => {
  const local = journal();
  local.media[0] = {
    ...local.media[0]!,
    privacyState: "private_only",
  };
  const shared = {
    ...journal(),
    media: [{
      ...journal().media[0]!,
      source: "alpha_shared" as const,
      storageKey: undefined,
      assetPath:
        "daed5df5-a404-4c89-82f6-ec92c085d2b4/journal-1/revision-media-1.webp",
    }],
  };

  const display = preferSharedJournalMediaForDisplay(local, shared);

  assert.equal(display.media[0]?.source, "local_blob");
  assert.equal(display.media[0]?.privacyState, "private_only");
});
