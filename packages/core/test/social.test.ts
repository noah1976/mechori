import assert from "node:assert/strict";
import test from "node:test";
import {
  addJournalToData,
  canProfileViewProfile,
  canCurrentProfileViewJournal,
  classifyJournalForKnowledge,
  cloneDemoData,
  createFollowTargets,
  getFollowedSharedVehicleFeed,
  getFollowedSharedFeed,
  getFollowingFeed,
  isFollowing,
  isProfileBlocked,
  isProfileMuted,
  journalContentBlocksForViewer,
  journalMediaForViewer,
  journalOccurrenceDate,
  journalOccurrenceLabel,
  journalToDraft,
  toggleBlockProfileInData,
  toggleFollowInData,
  toggleMuteProfileInData,
  updateCurrentProfilePrivacy,
  updateCurrentProfileIdentity,
  updateCurrentProfileImage,
  updateJournalInData,
  validateJournalDraft,
  type JournalDraft,
} from "../src/index.ts";

function validDraft(overrides: Partial<JournalDraft> = {}): JournalDraft {
  return {
    title: "DEMO: 自分で書いたJournal",
    bodyOriginal: "これは本人が自由に入力したDEMO本文です。",
    vehicleId: "vehicle-demo-barchetta",
    linkedRecordId: "record-demo-oil",
    displayFields: ["service_date", "odometer", "actions"],
    media: [],
    contentBlocks: [
      {
        id: "journal-block-test",
        type: "text",
        style: "paragraph",
        text: "これは本人が自由に入力したDEMO本文です。",
      },
    ],
    visibility: "private",
    knowledgeExtractionConsent: false,
    ...overrides,
  };
}

test("requires a title and either owner content or a linked record", () => {
  const result = validateJournalDraft(validDraft({
    title: "",
    bodyOriginal: "",
    contentBlocks: [],
    linkedRecordId: "",
  }));
  assert.equal(result.valid, false);
  assert.equal(result.errors.title, "required");
  assert.equal(result.errors.bodyOriginal, "required");
});

test("creates a private journal by default without rewriting the body", () => {
  const body = "  本人が書いた冒頭です。\n\n改行も含めて保持します。  ";
  const draft = validDraft({
    bodyOriginal: body,
    contentBlocks: [{
      id: "journal-block-owner-text",
      type: "text",
      style: "paragraph",
      text: body,
    }],
  });
  const result = addJournalToData(
    cloneDemoData(),
    draft,
    "ja",
    "2026-07-15T10:00:00.000Z",
  );

  assert.equal(result.journal.bodyOriginal, body);
  assert.equal(result.journal.visibility, "private");
  assert.equal(result.journal.publishedAt, undefined);
  assert.equal(result.journal.linkedRecordId, "record-demo-oil");
  assert.deepEqual(result.journal.media, []);
  assert.deepEqual(result.journal.contentBlocks, draft.contentBlocks);
});

test("preserves a lightweight vehicle event category", () => {
  const result = addJournalToData(
    cloneDemoData(),
    validDraft({ eventType: "drive", occurredOn: "2021-09-18", linkedRecordId: "" }),
    "ja",
    "2026-07-18T10:00:00.000Z",
  );

  assert.equal(result.journal.eventType, "drive");
  assert.equal(result.journal.occurredOn, "2021-09-18");
  assert.equal(result.journal.createdAt, "2026-07-18T10:00:00.000Z");
  assert.equal(result.journal.visibility, "private");
});

test("keeps broad capture intent separate from detailed event classification", () => {
  const service = addJournalToData(
    cloneDemoData(),
    validDraft({ captureIntent: "service", eventType: undefined, linkedRecordId: "" }),
    "ja",
  ).journal;
  const issue = addJournalToData(
    cloneDemoData(),
    validDraft({ captureIntent: "issue", eventType: "issue", linkedRecordId: "" }),
    "ja",
  ).journal;

  assert.equal(service.captureIntent, "service");
  assert.equal(service.eventType, undefined);
  assert.equal(service.issueStatus, undefined);
  assert.equal(issue.captureIntent, "issue");
  assert.equal(issue.eventType, "issue");
  assert.equal(issue.issueStatus, "open");
});

test("an explicitly classified issue is valid before diagnosis, repair, or result", () => {
  const result = addJournalToData(
    cloneDemoData(),
    validDraft({
      eventType: "issue",
      issueStatus: undefined,
      linkedRecordId: "",
      title: "段差で後ろから音がする",
      bodyOriginal: "段差を越えると、右後ろからコトコト音がする。",
      contentBlocks: [{
        id: "journal-block-open-issue",
        type: "text",
        style: "paragraph",
        text: "段差を越えると、右後ろからコトコト音がする。",
      }],
    }),
    "ja",
  );

  assert.equal(result.journal.eventType, "issue");
  assert.equal(result.journal.issueStatus, "open");
  assert.equal(result.journal.linkedRecordId, undefined);
  assert.equal(result.journal.serviceAttribution, undefined);
  assert.equal(result.journal.bodyOriginal, "段差を越えると、右後ろからコトコト音がする。");
});

test("changing an issue to another type clears issue-only state", () => {
  const created = addJournalToData(
    cloneDemoData(),
    validDraft({ eventType: "issue", linkedRecordId: "" }),
    "ja",
  );
  const updated = updateJournalInData(
    created.data,
    created.journal.id,
    { ...journalToDraft(created.journal), eventType: "drive", issueStatus: undefined },
  );

  assert.equal(updated.journal.eventType, "drive");
  assert.equal(updated.journal.issueStatus, undefined);
});

test("stores service attribution only for maintenance-like quick records", () => {
  const attribution = {
    version: 1 as const,
    performedByType: "service_provider" as const,
    serviceProviderId: "provider-demo",
    providerDisplayNameSnapshot: "DEMO Workshop",
  };
  const maintenance = addJournalToData(
    cloneDemoData(),
    validDraft({ eventType: "repair", serviceAttribution: attribution }),
    "ja",
  ).journal;
  const drive = addJournalToData(
    cloneDemoData(),
    validDraft({ eventType: "drive", serviceAttribution: attribution }),
    "ja",
  ).journal;

  assert.deepEqual(maintenance.serviceAttribution, attribution);
  assert.equal(drive.serviceAttribution, undefined);
});

test("rejects an invalid occurrence date while accepting legacy drafts without one", () => {
  assert.equal(validateJournalDraft(validDraft({ occurredOn: "2024-02-30" })).errors.occurredOn, "invalid");
  assert.equal(validateJournalDraft(validDraft({ occurredOn: "" })).errors.occurredOn, "required");
  assert.equal(validateJournalDraft(validDraft()).errors.occurredOn, undefined);
});

test("uses the occurrence date for a vehicle timeline and falls back for legacy journals", () => {
  const current = addJournalToData(
    cloneDemoData(),
    validDraft({ occurredOn: "2019-05-03" }),
    "ja",
    "2026-07-18T10:00:00.000Z",
  ).journal;
  assert.equal(journalOccurrenceDate(current), "2019-05-03");
  const legacy = { ...current, occurredOn: undefined, occurredPrecision: undefined };
  assert.equal(journalOccurrenceDate(legacy), "2026-07-18T10:00:00.000Z");
  assert.equal(journalToDraft(legacy).occurredPrecision, "unknown");
});

test("keeps an approximate month without inventing an exact day", () => {
  const journal = addJournalToData(
    cloneDemoData(),
    validDraft({
      occurredOn: undefined,
      occurredYear: 2007,
      occurredMonth: 4,
      occurredPrecision: "month",
      occurredPeriodNote: "車検の少し前",
    }),
    "ja",
    "2026-07-21T10:00:00.000Z",
  ).journal;

  assert.equal(journal.occurredOn, undefined);
  assert.equal(journal.occurredYear, 2007);
  assert.equal(journal.occurredMonth, 4);
  assert.equal(journalOccurrenceDate(journal), "2007-04");
  assert.equal(journalOccurrenceLabel(journal, "ja"), "2007年4月ごろ（車検の少し前）");
  assert.equal(journalToDraft(journal).occurredPrecision, "month");
});

test("accepts a year-only or unknown occurrence without fabricating a date", () => {
  const yearOnly = addJournalToData(
    cloneDemoData(),
    validDraft({
      occurredOn: undefined,
      occurredYear: 1998,
      occurredPrecision: "year",
    }),
    "ja",
  ).journal;
  const unknown = addJournalToData(
    cloneDemoData(),
    validDraft({ occurredOn: undefined, occurredPrecision: "unknown" }),
    "ja",
  ).journal;

  assert.equal(journalOccurrenceLabel(yearOnly, "ja"), "1998年ごろ");
  assert.equal(journalOccurrenceLabel(unknown, "ja"), "時期不明");
  assert.equal(journalOccurrenceDate(unknown), "0000");
});

test("rejects incomplete approximate occurrence values", () => {
  assert.equal(validateJournalDraft(validDraft({
    occurredOn: undefined,
    occurredPrecision: "month",
    occurredYear: 2020,
  })).errors.occurredOn, "required");
  assert.equal(validateJournalDraft(validDraft({
    occurredOn: undefined,
    occurredPrecision: "year",
    occurredYear: 1800,
  })).errors.occurredOn, "invalid");
});

test("lets only the author correct a journal date without replacing its identity", () => {
  const data = cloneDemoData();
  const previous = data.journals.find((journal) => journal.id === "journal-demo-owner-private");
  assert.ok(previous);
  const result = updateJournalInData(
    data,
    previous.id,
    {
      ...journalToDraft(previous),
      occurredOn: "2026-07-09",
      occurredPrecision: "day",
      title: "DEMO: 日付を直した記録",
      contentBlocks: [{
        id: "journal-block-corrected",
        type: "text",
        style: "paragraph",
        text: "昨日の出来事として修正しました。",
      }],
    },
    "2026-07-21T09:00:00.000Z",
  );

  assert.equal(result.journal.id, previous.id);
  assert.equal(result.journal.createdAt, previous.createdAt);
  assert.equal(result.journal.updatedAt, "2026-07-21T09:00:00.000Z");
  assert.equal(result.journal.occurredOn, "2026-07-09");
  assert.equal(result.journal.bodyOriginal, "昨日の出来事として修正しました。");
  assert.deepEqual(result.journal.media, previous.media);
});

test("edits a detailed month-level record with a described photo and optional maintenance link", () => {
  for (const linkedRecordId of ["", "record-demo-oil"]) {
    const data = cloneDemoData();
    const previous = data.journals.find(
      (journal) => journal.id === "journal-demo-owner-private",
    );
    assert.ok(previous);
    const photo = {
      id: "journal-media-bumper",
      kind: "image" as const,
      source: "local_blob" as const,
      storageKey: "journal-media-bumper",
      mimeType: "image/webp",
      sizeBytes: 420_000,
      altText: "破損したフロントバンパー",
      privacyState: "public_ready" as const,
      createdAt: "2026-02-20T12:00:00.000Z",
      isDemo: false,
    };
    const result = updateJournalInData(
      data,
      previous.id,
      {
        ...journalToDraft(previous),
        title: "バンパー破損",
        occurredOn: undefined,
        occurredYear: 2026,
        occurredMonth: 2,
        occurredPrecision: "month",
        linkedRecordId,
        media: [photo],
        contentBlocks: [
          {
            id: "journal-block-bumper-photo",
            type: "media",
            mediaId: photo.id,
          },
          {
            id: "journal-block-bumper-text",
            type: "text",
            style: "paragraph",
            text: "雪の塊に当たり、バンパーが割れた。",
          },
        ],
        visibility: "public",
        knowledgeExtractionConsent: true,
      },
      "2026-08-03T12:00:00.000Z",
    );

    assert.equal(result.journal.id, previous.id);
    assert.equal(result.journal.title, "バンパー破損");
    assert.equal(result.journal.occurredOn, undefined);
    assert.equal(result.journal.occurredYear, 2026);
    assert.equal(result.journal.occurredMonth, 2);
    assert.equal(result.journal.linkedRecordId, linkedRecordId || undefined);
    assert.equal(result.journal.media[0]?.id, photo.id);
    assert.equal(result.journal.media[0]?.altText, photo.altText);
    assert.equal(result.journal.bodyOriginal, "雪の塊に当たり、バンパーが割れた。");
    assert.equal(result.journal.knowledgeExtractionConsent, true);
  }
});

test("edits the same detailed record without a photo", () => {
  const data = cloneDemoData();
  const previous = data.journals.find(
    (journal) => journal.id === "journal-demo-owner-private",
  );
  assert.ok(previous);

  const result = updateJournalInData(
    data,
    previous.id,
    {
      ...journalToDraft(previous),
      title: "バンパー破損",
      occurredOn: undefined,
      occurredYear: 2026,
      occurredMonth: 2,
      occurredPrecision: "month",
      media: [],
      contentBlocks: [{
        id: "journal-block-bumper-text-only",
        type: "text",
        style: "paragraph",
        text: "写真なしで経緯だけを追記した。",
      }],
      visibility: "public",
      knowledgeExtractionConsent: false,
    },
    "2026-08-03T12:00:00.000Z",
  );

  assert.equal(result.journal.id, previous.id);
  assert.deepEqual(result.journal.media, []);
  assert.equal(result.journal.bodyOriginal, "写真なしで経緯だけを追記した。");
  assert.equal(result.journal.occurredYear, 2026);
  assert.equal(result.journal.occurredMonth, 2);
  assert.equal(result.journal.knowledgeExtractionConsent, false);
});

test("does not let the current profile edit another owner's journal", () => {
  const data = cloneDemoData();
  const other = data.journals.find((journal) => journal.authorProfileId !== data.currentProfileId);
  assert.ok(other);
  assert.throws(
    () => updateJournalInData(data, other.id, journalToDraft(other)),
    /journal_owner_required/,
  );
});

test("does not let a journal be moved onto another owner's vehicle", () => {
  const data = cloneDemoData();
  const own = data.journals.find((journal) => journal.authorProfileId === data.currentProfileId);
  const ownVehicle = data.vehicles.find((vehicle) => vehicle.ownerProfileId === data.currentProfileId);
  const otherProfile = data.profiles.find((profile) => profile.id !== data.currentProfileId);
  assert.ok(own);
  assert.ok(ownVehicle);
  assert.ok(otherProfile);
  const otherVehicle = {
    ...structuredClone(ownVehicle),
    id: "vehicle-other-owner",
    ownerProfileId: otherProfile.id,
  };
  const dataWithOtherVehicle = {
    ...data,
    vehicles: [...data.vehicles, otherVehicle],
  };
  assert.throws(
    () => updateJournalInData(dataWithOtherVehicle, own.id, {
      ...journalToDraft(own),
      vehicleId: otherVehicle.id,
    }),
    /journal_vehicle_owner_required/,
  );
});

test("allows a linked maintenance record without requiring journal prose", () => {
  const result = validateJournalDraft(validDraft({
    bodyOriginal: "",
    contentBlocks: [],
    linkedRecordId: "record-demo-oil",
  }));
  assert.equal(result.valid, true);
});

test("derives photo privacy from the record audience and ignores client photo flags", () => {
  const photo = {
    id: "media-test",
    kind: "image" as const,
    source: "local_blob" as const,
    storageKey: "media-test",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    altText: "DEMO image",
    privacyState: "private_only" as const,
    createdAt: "2026-07-15T10:00:00.000Z",
    isDemo: false,
  };
  const contentBlocks = [{
    id: "journal-block-media",
    type: "media" as const,
    mediaId: photo.id,
  }];

  const privatePost = addJournalToData(
    cloneDemoData(),
    validDraft({
      visibility: "private",
      media: [{ ...photo, privacyState: "public_ready" }],
      contentBlocks,
    }),
    "ja",
    "2026-07-15T10:00:00.000Z",
  ).journal;
  assert.equal(privatePost.media[0]?.privacyState, "private_only");
  assert.equal(journalMediaForViewer(privatePost, false).length, 0);
  assert.equal(
    journalMediaForViewer({
      ...privatePost,
      media: privatePost.media.map((attachment) => ({
        ...attachment,
        privacyState: "public_ready",
      })),
    }, false).length,
    0,
  );

  const publicPost = addJournalToData(
    cloneDemoData(),
    validDraft({ visibility: "public", media: [photo], contentBlocks }),
    "ja",
    "2026-07-15T10:00:00.000Z",
  ).journal;
  assert.equal(publicPost.media[0]?.privacyState, "public_ready");
  assert.equal(journalMediaForViewer(publicPost, false).length, 1);
  assert.equal(journalContentBlocksForViewer(publicPost, false).length, 1);

  const { privacyState: _privacyState, ...photoWithoutPrivacyFlag } = photo;
  const withoutPhotoFlag = addJournalToData(
    cloneDemoData(),
    validDraft({
      visibility: "public",
      media: [photoWithoutPrivacyFlag as typeof photo],
      contentBlocks,
    }),
    "ja",
    "2026-07-15T10:00:00.000Z",
  ).journal;
  assert.equal(withoutPhotoFlag.media[0]?.privacyState, "public_ready");
});

test("keeps photo privacy synchronized when a record audience changes", () => {
  const photo = {
    id: "media-audience-change",
    kind: "image" as const,
    source: "local_blob" as const,
    storageKey: "media-audience-change",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    altText: "DEMO image",
    privacyState: "private_only" as const,
    createdAt: "2026-07-15T10:00:00.000Z",
    isDemo: false,
  };
  const contentBlocks = [{
    id: "journal-block-audience-change",
    type: "media" as const,
    mediaId: photo.id,
  }];
  const created = addJournalToData(
    cloneDemoData(),
    validDraft({ visibility: "public", media: [photo], contentBlocks }),
    "ja",
    "2026-07-15T10:00:00.000Z",
  );

  const madePrivate = updateJournalInData(
    created.data,
    created.journal.id,
    { ...journalToDraft(created.journal), visibility: "private" },
    "2026-07-15T11:00:00.000Z",
  );
  assert.equal(madePrivate.journal.media[0]?.privacyState, "private_only");
  assert.equal(journalMediaForViewer(madePrivate.journal, false).length, 0);

  const madePublicAgain = updateJournalInData(
    madePrivate.data,
    madePrivate.journal.id,
    { ...journalToDraft(madePrivate.journal), visibility: "public" },
    "2026-07-15T12:00:00.000Z",
  );
  assert.equal(madePublicAgain.journal.media[0]?.privacyState, "public_ready");
  assert.equal(journalMediaForViewer(madePublicAgain.journal, false).length, 1);
});

test("does not publish a legacy private photo during an unrelated public-record edit", () => {
  const created = addJournalToData(
    cloneDemoData(),
    validDraft({
      visibility: "public",
      media: [{
        id: "media-legacy-private",
        kind: "image",
        source: "local_blob",
        storageKey: "media-legacy-private",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        altText: "DEMO legacy private image",
        privacyState: "private_only",
        createdAt: "2026-07-15T10:00:00.000Z",
        isDemo: false,
      }],
      contentBlocks: [{
        id: "journal-block-legacy-private",
        type: "media",
        mediaId: "media-legacy-private",
      }],
    }),
    "ja",
    "2026-07-15T10:00:00.000Z",
  );
  const legacyJournal = {
    ...created.journal,
    media: created.journal.media.map((attachment) => ({
      ...attachment,
      privacyState: "private_only" as const,
    })),
  };
  const legacyData = {
    ...created.data,
    journals: created.data.journals.map((journal) =>
      journal.id === legacyJournal.id ? legacyJournal : journal,
    ),
  };

  const edited = updateJournalInData(
    legacyData,
    legacyJournal.id,
    {
      ...journalToDraft(legacyJournal),
      title: "本文だけを編集",
      media: legacyJournal.media.map((attachment) => ({
        ...attachment,
        privacyState: "public_ready",
      })),
    },
    "2026-07-15T11:00:00.000Z",
  ).journal;

  assert.equal(edited.visibility, "public");
  assert.equal(edited.media[0]?.privacyState, "private_only");
  assert.equal(journalMediaForViewer(edited, false).length, 0);

  const newPhoto = {
    ...legacyJournal.media[0]!,
    id: "media-new-under-unified-audience",
    storageKey: "media-new-under-unified-audience",
    altText: "DEMO new public image",
  };
  const withNewPhoto = updateJournalInData(
    legacyData,
    legacyJournal.id,
    {
      ...journalToDraft(legacyJournal),
      media: [...legacyJournal.media, newPhoto],
      contentBlocks: [
        ...legacyJournal.contentBlocks,
        {
          id: "journal-block-new-under-unified-audience",
          type: "media",
          mediaId: newPhoto.id,
        },
      ],
    },
    "2026-07-15T12:00:00.000Z",
  ).journal;
  assert.equal(withNewPhoto.media[0]?.privacyState, "private_only");
  assert.equal(withNewPhoto.media[1]?.privacyState, "public_ready");
  assert.deepEqual(
    journalMediaForViewer(withNewPhoto, false).map((attachment) => attachment.id),
    [newPhoto.id],
  );
});

test("requires descriptions only for media displayed in journal content", () => {
  const displayedMedia = {
    id: "media-displayed",
    kind: "image" as const,
    source: "local_blob" as const,
    storageKey: "media-displayed",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    altText: "",
    privacyState: "private_only" as const,
    createdAt: "2026-07-15T10:00:00.000Z",
    isDemo: false,
  };
  const hiddenLegacyMedia = {
    ...displayedMedia,
    id: "media-hidden-legacy",
    storageKey: "media-hidden-legacy",
  };
  const contentBlocks = [
    {
      id: "journal-block-media",
      type: "media" as const,
      mediaId: displayedMedia.id,
    },
  ];

  assert.equal(
    validateJournalDraft(validDraft({
      linkedRecordId: "",
      media: [displayedMedia, hiddenLegacyMedia],
      contentBlocks,
    })).errors.media,
    "description_required",
  );
  assert.equal(
    validateJournalDraft(validDraft({
      linkedRecordId: "",
      media: [{ ...displayedMedia, altText: "DEMO: damaged bumper" }, hiddenLegacyMedia],
      contentBlocks,
    })).errors.media,
    undefined,
  );
});

test("builds a chronological feed only from followed public or follower posts", () => {
  const feed = getFollowingFeed(cloneDemoData());
  assert.deepEqual(
    feed.map((journal) => journal.id),
    ["journal-demo-luca-drive", "journal-demo-workshop-history"],
  );
  assert.equal(feed.some((journal) => journal.visibility === "private"), false);
});

test("does not expose a followers-only journal through a model or vehicle follow", () => {
  const data = cloneDemoData();
  data.follows = data.follows.filter((follow) => follow.targetType !== "profile");
  data.journals = data.journals.map((journal) =>
    journal.id === "journal-demo-luca-drive"
      ? { ...journal, visibility: "followers" }
      : journal,
  );

  const feed = getFollowingFeed(data);
  assert.equal(
    feed.some((journal) => journal.id === "journal-demo-luca-drive"),
    false,
  );
});

test("toggles profile, vehicle, or model follows independently", () => {
  const data = cloneDemoData();
  const followedProfile = toggleFollowInData(
    data,
    "profile",
    "profile-demo-workshop",
  );
  const followed = toggleFollowInData(
    followedProfile,
    "vehicle",
    "vehicle-demo-workshop-barchetta",
  );
  assert.equal(isFollowing(followed, "profile", "profile-demo-workshop"), true);
  assert.equal(
    isFollowing(followed, "vehicle", "vehicle-demo-workshop-barchetta"),
    true,
  );
  assert.equal(isFollowing(followed, "model", "model-family:fiat-barchetta"), true);

  const profileUnfollowed = toggleFollowInData(
    followed,
    "profile",
    "profile-demo-workshop",
  );
  assert.equal(
    isFollowing(profileUnfollowed, "profile", "profile-demo-workshop"),
    false,
  );
  assert.equal(
    isFollowing(
      profileUnfollowed,
      "vehicle",
      "vehicle-demo-workshop-barchetta",
    ),
    true,
  );

  const vehicleUnfollowed = toggleFollowInData(
    followed,
    "vehicle",
    "vehicle-demo-workshop-barchetta",
  );
  assert.equal(
    isFollowing(vehicleUnfollowed, "profile", "profile-demo-workshop"),
    true,
  );
  assert.equal(
    isFollowing(
      vehicleUnfollowed,
      "vehicle",
      "vehicle-demo-workshop-barchetta",
    ),
    false,
  );
});

test("updates the current profile identity without changing its immutable id", () => {
  const data = cloneDemoData();
  const updated = updateCurrentProfileIdentity(data, " Noah ", "NOAH_NORD");
  const profile = updated.profiles.find(
    (item) => item.id === updated.currentProfileId,
  );

  assert.equal(profile?.id, data.currentProfileId);
  assert.equal(profile?.displayName, "Noah");
  assert.equal(profile?.publicUsername, "noah_nord");
  assert.throws(
    () => updateCurrentProfileIdentity(data, "Noah", "no"),
    /invalid_public_username/,
  );
});

test("updates only the current profile image path and supports removal", () => {
  const data = cloneDemoData();
  const path = "daed5df5-a404-4c89-82f6-ec92c085d2b4/avatar-123.webp";
  const updated = updateCurrentProfileImage(data, path);
  const current = updated.profiles.find(
    (profile) => profile.id === updated.currentProfileId,
  );

  assert.equal(current?.profileImagePath, path);
  assert.equal(updateCurrentProfileImage(updated).profiles.find(
    (profile) => profile.id === updated.currentProfileId,
  )?.profileImagePath, undefined);
  assert.throws(
    () => updateCurrentProfileImage(data, "../another-user/avatar.webp"),
    /invalid_profile_image_path/,
  );
});

test("shows only shared posts from explicitly followed vehicles", () => {
  let data = cloneDemoData();
  data.follows = [];
  data = toggleFollowInData(data, "vehicle", "public-vehicle-alfa");
  const source = data.journals.find(
    (journal) => journal.visibility === "public",
  );
  assert.ok(source);
  const shared = [
    {
      ...source,
      id: "shared-alfa",
      authorProfileId: "public-owner-alfa",
      vehicleTargetId: "public-vehicle-alfa",
    },
    {
      ...source,
      id: "shared-renault",
      authorProfileId: "public-owner-renault",
      vehicleTargetId: "public-vehicle-renault",
    },
    {
      ...source,
      id: "shared-without-public-vehicle",
      authorProfileId: "public-owner-unknown",
      vehicleTargetId: undefined,
    },
  ];

  assert.deepEqual(
    getFollowedSharedVehicleFeed(data, shared).map((journal) => journal.id),
    ["shared-alfa"],
  );
});

test("combines profile and vehicle follows without duplicating shared posts", () => {
  let data = cloneDemoData();
  data.follows = [];
  data = toggleFollowInData(data, "profile", "public-owner-alfa");
  data = toggleFollowInData(data, "vehicle", "public-vehicle-alfa");
  const source = data.journals.find(
    (journal) => journal.visibility === "public",
  );
  assert.ok(source);
  const shared = [
    {
      ...source,
      id: "shared-alfa",
      authorProfileId: "public-owner-alfa",
      vehicleTargetId: "public-vehicle-alfa",
    },
    {
      ...source,
      id: "shared-alfa-second-car",
      authorProfileId: "public-owner-alfa",
      vehicleTargetId: "public-vehicle-alfa-two",
    },
    {
      ...source,
      id: "shared-renault",
      authorProfileId: "public-owner-renault",
      vehicleTargetId: "public-vehicle-renault",
    },
  ];

  assert.deepEqual(
    getFollowedSharedFeed(data, shared).map((journal) => journal.id),
    ["shared-alfa", "shared-alfa-second-car"],
  );
});

test("muting hides an author's journals without changing follow state", () => {
  const data = cloneDemoData();
  const muted = toggleMuteProfileInData(
    data,
    "profile-demo-luca",
    "2026-07-16T20:00:00.000Z",
  );

  assert.equal(isProfileMuted(muted, "profile-demo-luca"), true);
  assert.equal(isFollowing(muted, "profile", "profile-demo-luca"), true);
  assert.equal(
    getFollowingFeed(muted).some((journal) => journal.authorProfileId === "profile-demo-luca"),
    false,
  );

  const unmuted = toggleMuteProfileInData(muted, "profile-demo-luca");
  assert.equal(isProfileMuted(unmuted, "profile-demo-luca"), false);
  assert.equal(isFollowing(unmuted, "profile", "profile-demo-luca"), true);
});

test("blocking removes profile and vehicle follows but keeps model follows", () => {
  let data = cloneDemoData();
  data = toggleFollowInData(data, "vehicle", "vehicle-demo-luca-barchetta");
  const blocked = toggleBlockProfileInData(
    data,
    "profile-demo-luca",
    "2026-07-16T20:00:00.000Z",
  );

  assert.equal(isProfileBlocked(blocked, "profile-demo-luca"), true);
  assert.equal(isFollowing(blocked, "profile", "profile-demo-luca"), false);
  assert.equal(isFollowing(blocked, "vehicle", "vehicle-demo-luca-barchetta"), false);
  assert.equal(isFollowing(blocked, "model", "model-family:fiat-barchetta"), true);
  assert.equal(
    getFollowingFeed(blocked).some((journal) => journal.authorProfileId === "profile-demo-luca"),
    false,
  );
  assert.equal(
    createFollowTargets(blocked).some(
      (target) =>
        target.id === "profile-demo-luca" || target.id === "vehicle-demo-luca-barchetta",
    ),
    false,
  );
});

test("blocking a remote owner removes their supplied public vehicle follows", () => {
  let data = cloneDemoData();
  data.follows = [];
  data = toggleFollowInData(data, "vehicle", "public-vehicle-one");
  data = toggleFollowInData(data, "vehicle", "public-vehicle-two");
  data = toggleFollowInData(data, "vehicle", "unrelated-public-vehicle");

  const blocked = toggleBlockProfileInData(
    data,
    "public-owner-one",
    "2026-07-30T10:00:00.000Z",
    ["public-vehicle-one", "public-vehicle-two"],
  );

  assert.equal(isFollowing(blocked, "vehicle", "public-vehicle-one"), false);
  assert.equal(isFollowing(blocked, "vehicle", "public-vehicle-two"), false);
  assert.equal(isFollowing(blocked, "vehicle", "unrelated-public-vehicle"), true);
});

test("blocking replaces mute and blocks direct journal access until undone", () => {
  const journal = cloneDemoData().journals.find(
    (item) => item.authorProfileId === "profile-demo-luca",
  );
  assert.ok(journal);

  const muted = toggleMuteProfileInData(cloneDemoData(), "profile-demo-luca");
  const blocked = toggleBlockProfileInData(muted, "profile-demo-luca");
  assert.equal(isProfileMuted(blocked, "profile-demo-luca"), false);
  assert.equal(canCurrentProfileViewJournal(blocked, journal), false);

  const unblocked = toggleBlockProfileInData(blocked, "profile-demo-luca");
  assert.equal(isProfileBlocked(unblocked, "profile-demo-luca"), false);
  assert.equal(canCurrentProfileViewJournal(unblocked, journal), true);
});

test("direct journal access respects private and followers-only visibility", () => {
  const data = cloneDemoData();
  const otherJournal = data.journals.find(
    (item) => item.authorProfileId === "profile-demo-luca",
  );
  assert.ok(otherJournal);

  assert.equal(
    canCurrentProfileViewJournal(data, { ...otherJournal, visibility: "private" }),
    false,
  );
  assert.equal(
    canCurrentProfileViewJournal(data, { ...otherJournal, visibility: "followers" }),
    true,
  );

  const unfollowed = toggleFollowInData(data, "profile", "profile-demo-luca");
  assert.equal(
    canCurrentProfileViewJournal(unfollowed, { ...otherJournal, visibility: "followers" }),
    false,
  );
});

test("social popularity never promotes a journal to verified knowledge", () => {
  const journal = cloneDemoData().journals.find(
    (item) => item.id === "journal-demo-luca-drive",
  );
  assert.ok(journal);
  assert.equal(classifyJournalForKnowledge(journal), "related_owner_record");
  assert.equal(
    classifyJournalForKnowledge({ ...journal, appreciationCount: 1_000_000 }),
    "related_owner_record",
  );
  assert.notEqual(classifyJournalForKnowledge(journal), "verified_knowledge");
});

test("private journals remain unavailable to knowledge search even with consent", () => {
  const journal = cloneDemoData().journals[0];
  assert.ok(journal);
  assert.equal(
    classifyJournalForKnowledge({
      ...journal,
      visibility: "private",
      knowledgeExtractionConsent: true,
    }),
    "not_searchable",
  );
});

test("vehicle follow targets identify their owners and exclude the current vehicle", () => {
  const targets = createFollowTargets(cloneDemoData());
  const vehicleTargets = targets.filter((target) => target.type === "vehicle");

  assert.deepEqual(
    vehicleTargets.map((target) => target.label),
    [
      "Luca / DEMO / FIAT Barchetta",
      "Officina Verde / DEMO / FIAT Barchetta",
    ],
  );
});

test("applies profile visibility independently from journal visibility", () => {
  const data = cloneDemoData();
  assert.equal(canProfileViewProfile(data, "profile-demo-luca"), true);

  const privateProfileData = {
    ...data,
    profiles: data.profiles.map((profile) =>
      profile.id === "profile-demo-luca"
        ? { ...profile, visibility: "private" as const }
        : profile,
    ),
  };
  assert.equal(canProfileViewProfile(privateProfileData, "profile-demo-luca"), false);
  assert.equal(
    canProfileViewProfile(privateProfileData, "profile-demo-luca", "profile-demo-luca"),
    true,
  );
});

test("limits a followers-only profile to direct profile followers", () => {
  const data = cloneDemoData();
  data.profiles = data.profiles.map((profile) =>
    profile.id === "profile-demo-luca"
      ? { ...profile, visibility: "followers" }
      : profile,
  );
  assert.equal(
    canProfileViewProfile(data, "profile-demo-luca", data.currentProfileId),
    true,
  );

  const unfollowed = toggleFollowInData(data, "profile", "profile-demo-luca");
  assert.equal(
    canProfileViewProfile(unfollowed, "profile-demo-luca", data.currentProfileId),
    false,
  );
});

test("updates only the current profile's selected public fields", () => {
  const data = updateCurrentProfilePrivacy(
    cloneDemoData(),
    "public",
    ["bio", "vehicles", "bio"],
  );
  const profile = data.profiles.find((item) => item.id === data.currentProfileId);
  assert.equal(profile?.visibility, "public");
  assert.deepEqual(profile?.displayFields, ["bio", "vehicles"]);
});
