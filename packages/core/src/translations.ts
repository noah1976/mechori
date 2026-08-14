import type { ContentTranslation } from "./domain-model.ts";
import type { LanguageTag } from "./language.ts";
import type {
  AppData,
  GarageJournalPost,
  JournalContentBlock,
  Locale,
} from "./types.ts";

export interface JournalTranslationDraft {
  targetLanguage: LanguageTag;
  title: string;
  textBlocks: Record<string, string>;
}

export interface JournalDisplayContent {
  title: string;
  body: string;
  contentBlocks: JournalContentBlock[];
  sourceLanguage: LanguageTag;
  targetLanguage: LanguageTag;
  translated: boolean;
  translationAvailable: boolean;
}

export function journalTranslationFieldCode(blockId: string): string {
  return `content_block:${blockId}`;
}

export function resolveJournalDisplayContent(
  data: Pick<AppData, "contentTranslations">,
  journal: GarageJournalPost,
  locale: Locale,
  preferOriginal = false,
): JournalDisplayContent {
  const targetLanguage = locale;
  const sourceMatchesTarget = sameBaseLanguage(journal.sourceLanguage, targetLanguage);
  const relevant = data.contentTranslations.filter(
    (translation) =>
      translation.entityType === "garage_journal" &&
      translation.entityId === journal.id &&
      sameBaseLanguage(translation.targetLanguage, targetLanguage) &&
      translation.sourceContentVersion === journal.updatedAt &&
      translation.reviewStatus !== "rejected" &&
      translation.reviewStatus !== "outdated",
  );
  const byField = new Map(relevant.map((translation) => [translation.fieldCode, translation]));
  const textBlocks = journal.contentBlocks.filter(
    (block): block is Extract<JournalContentBlock, { type: "text" }> =>
      block.type === "text" && Boolean(block.text.trim()),
  );
  const titleTranslation = byField.get("title");
  const complete = Boolean(titleTranslation?.translatedText.trim()) && textBlocks.every((block) =>
    Boolean(byField.get(journalTranslationFieldCode(block.id))?.translatedText.trim()),
  );
  const translated = !preferOriginal && !sourceMatchesTarget && complete;

  if (!translated) {
    return {
      title: journal.title,
      body: journal.bodyOriginal,
      contentBlocks: journal.contentBlocks,
      sourceLanguage: journal.sourceLanguage,
      targetLanguage,
      translated: false,
      translationAvailable: complete,
    };
  }

  const contentBlocks = journal.contentBlocks.map((block): JournalContentBlock => {
    if (block.type !== "text") return block;
    const translation = byField.get(journalTranslationFieldCode(block.id));
    return translation ? { ...block, text: translation.translatedText } : block;
  });
  return {
    title: titleTranslation!.translatedText,
    body: contentBlocks
      .filter((block): block is Extract<JournalContentBlock, { type: "text" }> => block.type === "text")
      .map((block) => block.text)
      .filter((text) => text.trim())
      .join("\n\n"),
    contentBlocks,
    sourceLanguage: journal.sourceLanguage,
    targetLanguage,
    translated: true,
    translationAvailable: true,
  };
}

export function upsertJournalTranslationInData(
  data: AppData,
  journalId: string,
  draft: JournalTranslationDraft,
  now = new Date().toISOString(),
): AppData {
  const journal = data.journals.find((item) => item.id === journalId);
  if (!journal) throw new Error("journal_not_found");
  if (journal.authorProfileId !== data.currentProfileId) throw new Error("journal_owner_required");
  if (sameBaseLanguage(journal.sourceLanguage, draft.targetLanguage)) {
    throw new Error("translation_target_matches_source");
  }

  const title = draft.title.trim();
  const textBlocks = journal.contentBlocks.filter(
    (block): block is Extract<JournalContentBlock, { type: "text" }> =>
      block.type === "text" && Boolean(block.text.trim()),
  );
  if (!title || textBlocks.some((block) => !draft.textBlocks[block.id]?.trim())) {
    throw new Error("translation_incomplete");
  }

  const targetLanguage = draft.targetLanguage;
  const retained = data.contentTranslations.filter(
    (translation) =>
      !(
        translation.entityType === "garage_journal" &&
        translation.entityId === journalId &&
        sameBaseLanguage(translation.targetLanguage, targetLanguage)
      ),
  );
  const makeTranslation = (fieldCode: string, translatedText: string): ContentTranslation => ({
    id: `translation-${crypto.randomUUID()}`,
    entityType: "garage_journal",
    entityId: journal.id,
    fieldCode,
    sourceLanguage: journal.sourceLanguage,
    targetLanguage,
    translatedText: translatedText.trim(),
    sourceContentVersion: journal.updatedAt,
    method: "human",
    reviewStatus: "human_reviewed",
    translatedAt: now,
    reviewedAt: now,
    reviewedByUserId: data.currentProfileId,
  });

  return {
    ...data,
    contentTranslations: [
      ...retained,
      makeTranslation("title", title),
      ...textBlocks.map((block) =>
        makeTranslation(journalTranslationFieldCode(block.id), draft.textBlocks[block.id]!),
      ),
    ],
  };
}

export function existingJournalTranslationDraft(
  data: Pick<AppData, "contentTranslations">,
  journal: GarageJournalPost,
  targetLanguage: LanguageTag,
): JournalTranslationDraft {
  const relevant = data.contentTranslations.filter(
    (translation) =>
      translation.entityType === "garage_journal" &&
      translation.entityId === journal.id &&
      sameBaseLanguage(translation.targetLanguage, targetLanguage) &&
      translation.reviewStatus !== "rejected",
  );
  const byField = new Map(relevant.map((translation) => [translation.fieldCode, translation]));
  return {
    targetLanguage,
    title: byField.get("title")?.translatedText ?? "",
    textBlocks: Object.fromEntries(
      journal.contentBlocks
        .filter((block) => block.type === "text")
        .map((block) => [
          block.id,
          byField.get(journalTranslationFieldCode(block.id))?.translatedText ?? "",
        ]),
    ),
  };
}

export function inferJournalSourceLanguage(
  journalText: string,
  fallback: LanguageTag,
): LanguageTag {
  if (/[\u3040-\u30ff\u3400-\u9fff]/u.test(journalText)) return "ja";
  return fallback;
}

function sameBaseLanguage(left: LanguageTag, right: LanguageTag): boolean {
  return left.split("-")[0]?.toLocaleLowerCase() === right.split("-")[0]?.toLocaleLowerCase();
}
