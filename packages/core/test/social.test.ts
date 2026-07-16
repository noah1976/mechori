import assert from "node:assert/strict";
import test from "node:test";
import {
  addJournalToData,
  classifyJournalForKnowledge,
  cloneDemoData,
  createFollowTargets,
  getFollowingFeed,
  isFollowing,
  toggleFollowInData,
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

test("requires an owner-written title and body", () => {
  const result = validateJournalDraft(validDraft({ title: "", bodyOriginal: "" }));
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
      "FIAT Barchetta · Luca / DEMO",
      "FIAT Barchetta · Officina Verde / DEMO",
    ],
  );
});
