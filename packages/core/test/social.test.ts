import assert from "node:assert/strict";
import test from "node:test";
import {
  addJournalToData,
  canProfileViewProfile,
  canCurrentProfileViewJournal,
  classifyJournalForKnowledge,
  cloneDemoData,
  createFollowTargets,
  getFollowingFeed,
  isFollowing,
  isProfileBlocked,
  isProfileMuted,
  toggleBlockProfileInData,
  toggleFollowInData,
  toggleMuteProfileInData,
  updateCurrentProfilePrivacy,
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
    validDraft({ eventType: "drive", linkedRecordId: "" }),
    "ja",
  );

  assert.equal(result.journal.eventType, "drive");
  assert.equal(result.journal.visibility, "private");
});

test("allows a linked maintenance record without requiring journal prose", () => {
  const result = validateJournalDraft(validDraft({
    bodyOriginal: "",
    contentBlocks: [],
    linkedRecordId: "record-demo-oil",
  }));
  assert.equal(result.valid, true);
});

test("preserves media metadata and blocks unprocessed media from publication", () => {
  const media = [{
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
  }];
  const privateDraft = validDraft({ media });
  assert.equal(validateJournalDraft(privateDraft).valid, true);

  const publicValidation = validateJournalDraft({
    ...privateDraft,
    visibility: "public",
  });
  assert.equal(publicValidation.valid, false);
  assert.equal(publicValidation.errors.media, "private_only");

  const created = addJournalToData(
    cloneDemoData(),
    privateDraft,
    "ja",
    "2026-07-15T10:00:00.000Z",
  );
  assert.deepEqual(created.journal.media, media);
  assert.notEqual(created.journal.media, media);
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
  const followed = toggleFollowInData(data, "profile", "profile-demo-workshop");
  assert.equal(isFollowing(followed, "profile", "profile-demo-workshop"), true);
  assert.equal(isFollowing(followed, "model", "model:fiat:barchetta"), true);

  const unfollowed = toggleFollowInData(
    followed,
    "profile",
    "profile-demo-workshop",
  );
  assert.equal(isFollowing(unfollowed, "profile", "profile-demo-workshop"), false);
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
  assert.equal(isFollowing(blocked, "model", "model:fiat:barchetta"), true);
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
