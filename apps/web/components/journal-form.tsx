"use client";

import {
  getPreferredVehicle,
  createRestorableJournalDraft,
  journalToDraft,
  maintenanceRecordDateLabel,
  validateJournalDraft,
  type GarageJournalPost,
  type JournalContentBlock,
  type JournalDisplayField,
  type JournalDraft,
  type JournalMediaAttachment,
  type JournalTextBlockStyle,
  type JournalVisibility,
} from "@mechori/core";
import {
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Heading2,
  ImagePlus,
  Link2,
  LoaderCircle,
  Plus,
  Quote,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useApp } from "@/lib/app-context";
import { JournalMedia } from "@/components/journal-media";
import { JournalCompletion } from "@/components/journal-completion";
import { OccurrenceDateFields } from "@/components/occurrence-date-fields";
import { localDateInputValue } from "@/lib/date-input";
import { findJournalPrompt } from "@/lib/journal-prompts";
import { journalSaveErrorMessage } from "@/lib/journal-save-error";
import {
  imagePreparationMessageKey,
  preparePrivateAlphaImage,
  validateSourceImage,
} from "@/lib/image-preparation";
import {
  clearLocalDraft,
  journalLocalDraftKey,
  loadJournalLocalDraft,
  saveLocalDraft,
} from "@/lib/local-draft-store";
import { translate } from "@mechori/i18n";

// Temporary alpha transport guardrail; this is not a permanent product-level photo cap.
const alphaMediaTechnicalLimit = 6;
const maxVideoBytes = 100 * 1024 * 1024;
const maxPreparedJournalImageBytes = 460 * 1024;

interface PendingMedia {
  attachment: JournalMediaAttachment;
  file: Blob;
  previewUrl: string;
}

const displayFieldOptions: Array<{
  value: JournalDisplayField;
  ja: string;
  en: string;
}> = [
  { value: "service_date", ja: "整備日", en: "Service date" },
  { value: "odometer", ja: "その時点の走行距離", en: "Odometer at service" },
  { value: "actions", ja: "整備箇所・作業", en: "Maintenance actions" },
];

function newTextBlock(style: JournalTextBlockStyle = "paragraph"): JournalContentBlock {
  return {
    id: `journal-block-${crypto.randomUUID()}`,
    type: "text",
    style,
    text: "",
  };
}

function createInitialJournalDraft(vehicleId: string, sourceLanguage: "ja" | "en"): JournalDraft {
  return {
    title: "",
    sourceLanguage,
    occurredOn: localDateInputValue(),
    occurredPrecision: "day",
    bodyOriginal: "",
    vehicleId,
    linkedRecordId: "",
    displayFields: ["service_date", "odometer", "actions"],
    media: [],
    contentBlocks: [newTextBlock()],
    visibility: "public",
    knowledgeExtractionConsent: false,
  };
}

function hasMeaningfulJournalDraft(draft: JournalDraft): boolean {
  return Boolean(
    draft.title.trim() ||
    draft.linkedRecordId ||
    draft.media.length ||
    draft.contentBlocks.some((block) => block.type === "text" && block.text.trim()) ||
    draft.knowledgeExtractionConsent,
  );
}

export function JournalForm({
  journal,
  vehicleId,
  promptId,
}: {
  journal?: GarageJournalPost;
  vehicleId?: string;
  promptId?: string;
}) {
  const {
    data,
    locale,
    addJournal,
    updateJournal,
    isRemoteAlpha,
  } = useApp();
  const router = useRouter();
  const ja = locale === "ja";
  const selectedPrompt = findJournalPrompt(promptId);
  const vehicle = journal?.vehicleId
    ? data.vehicles.find((item) => item.id === journal.vehicleId)
    : data.vehicles.find(
        (item) => item.id === vehicleId && item.ownerProfileId === data.currentProfileId,
      ) ?? getPreferredVehicle(
        data.vehicles.filter((item) => item.ownerProfileId === data.currentProfileId),
      );
  const localDraftKey = journalLocalDraftKey(data.currentProfileId, journal?.id, promptId);
  const initialDraft = useMemo(
    () => journal
      ? journalToDraft(journal)
      : createInitialJournalDraft(vehicle?.id ?? "", locale),
    [journal, locale, vehicle?.id],
  );
  const [draft, setDraft] = useState<JournalDraft>(initialDraft);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveTakingLong, setSaveTakingLong] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [preparingMedia, setPreparingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [draftReady, setDraftReady] = useState(Boolean(journal));
  const [draftStatus, setDraftStatus] = useState<"idle" | "restored" | "saved" | "error">("idle");
  const [pendingDraft, setPendingDraft] = useState<ReturnType<typeof loadJournalLocalDraft>>(null);
  const [completion, setCompletion] = useState<GarageJournalPost | null>(null);
  const [omittedMediaCount, setOmittedMediaCount] = useState(0);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [insertAfterBlockId, setInsertAfterBlockId] = useState<string | null>(null);
  const pendingMediaRef = useRef<PendingMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const submitFeedbackRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  const validation = validateJournalDraft(draft);
  const imageAttachments = draft.media.filter((attachment) => attachment.kind === "image");
  const legacyPrivatePhotoCount = journal?.visibility === "public"
    ? journal.media.filter(
        (attachment) =>
          attachment.kind === "image" && attachment.privacyState === "private_only",
      ).length
    : 0;

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    pendingMediaRef.current = pendingMedia;
  }, [pendingMedia]);

  useEffect(() => {
    if (journal) return;
    const timer = window.setTimeout(() => {
      const stored = loadJournalLocalDraft(localDraftKey);
      if (stored) {
        const storedDraft = stored.value.draft;
        const vehicleExists = data.vehicles.some((item) => item.id === storedDraft.vehicleId);
        const recordExists = data.records.some((item) => item.id === storedDraft.linkedRecordId);
        const restoredDraft = {
          ...storedDraft,
          occurredOn:
            storedDraft.occurredPrecision && storedDraft.occurredPrecision !== "day"
              ? undefined
              : storedDraft.occurredOn ?? localDateInputValue(),
          occurredPrecision: storedDraft.occurredPrecision ?? "day",
          vehicleId: vehicleExists ? storedDraft.vehicleId : vehicle?.id ?? "",
          linkedRecordId: recordExists ? storedDraft.linkedRecordId : "",
          contentBlocks: storedDraft.contentBlocks.length
            ? storedDraft.contentBlocks
            : [newTextBlock()],
        };
        if (hasMeaningfulJournalDraft(restoredDraft)) {
          if (hasMeaningfulJournalDraft(draftRef.current)) {
            setPendingDraft({ ...stored, value: { ...stored.value, draft: restoredDraft } });
          } else {
            setPendingDraft({ ...stored, value: { ...stored.value, draft: restoredDraft } });
          }
        }
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data.records, data.vehicles, journal, localDraftKey, vehicle?.id]);

  useEffect(() => {
    if (journal) return;
    if (!draftReady) return;
    if (!hasMeaningfulJournalDraft(draft)) return;
    const timer = window.setTimeout(() => {
      const restorable = createRestorableJournalDraft(draft);
      const omittedMediaCountToSave = Math.max(
        restorable.omittedMediaCount,
        omittedMediaCount,
      );
      setOmittedMediaCount(omittedMediaCountToSave);
      setDraftStatus(
        saveLocalDraft(localDraftKey, {
          ...restorable,
          omittedMediaCount: omittedMediaCountToSave,
        })
          ? "saved"
          : "error",
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [draft, draftReady, journal, localDraftKey, omittedMediaCount]);

  function discardDraft() {
    pendingMediaRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    clearLocalDraft(localDraftKey);
    setPendingMedia([]);
    setDraft(initialDraft);
    setDraftStatus("idle");
    setPendingDraft(null);
    setOmittedMediaCount(0);
    setSubmitted(false);
    setMediaError("");
  }

  function restoreDraft() {
    const stored = pendingDraft;
    if (!stored) return;
    const restoredDraft = stored.value.draft;
    setDraft(restoredDraft);
    setOmittedMediaCount(stored.value.omittedMediaCount);
    setPendingDraft(null);
    setDraftStatus("restored");
  }

  function startNewDraft() {
    clearLocalDraft(localDraftKey);
    setPendingDraft(null);
    setDraft(initialDraft);
    setDraftStatus("idle");
    setOmittedMediaCount(0);
  }

  function changeVisibility(visibility: JournalVisibility) {
    if (isRemoteAlpha && visibility === "followers") return;
    if (visibility !== "public") {
      setPendingMedia((current) =>
        current.map((item) => ({
          ...item,
          attachment: { ...item.attachment, privacyState: "private_only" },
        })),
      );
    }
    setDraft((current) => ({
      ...current,
      visibility,
      media:
        visibility === "public"
          ? current.media
          : current.media.map((attachment) => ({
              ...attachment,
              privacyState: "private_only",
            })),
    }));
  }

  useEffect(() => () => {
    pendingMediaRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedDraft = draft;
    const submittedValidation = validateJournalDraft(submittedDraft);
    setSubmitted(true);
    setSaveError("");
    if (!submittedValidation.valid) {
      window.requestAnimationFrame(() => {
        const firstInvalidField = submittedValidation.errors.title
          ? titleInputRef.current
          : formRef.current?.querySelector<HTMLElement>(
              ".has-error input, .has-error textarea, [aria-invalid='true']",
            );
        if (firstInvalidField) {
          firstInvalidField.focus();
          firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          submitFeedbackRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
      return;
    }
    if (saving || preparingMedia) return;
    setSaving(true);
    setSaveTakingLong(false);
    const slowSaveTimer = window.setTimeout(() => {
      setSaveTakingLong(true);
    }, 8000);
    try {
      const savedJournal = journal
        ? await updateJournal(
            journal.id,
            submittedDraft,
            pendingMedia.map(({ attachment, file }) => ({ attachment, blob: file })),
          )
        : await addJournal(
            submittedDraft,
            pendingMedia.map(({ attachment, file }) => ({ attachment, blob: file })),
          );
      clearLocalDraft(localDraftKey);
      window.clearTimeout(slowSaveTimer);
      if (journal) {
        router.push(`/journal/${savedJournal.id}?updated=1`);
      } else {
        setSaving(false);
        setCompletion(savedJournal);
      }
    } catch (error) {
      window.clearTimeout(slowSaveTimer);
      setSaveTakingLong(false);
      setSaveError(journalSaveErrorMessage(error, ja));
      setSaving(false);
    }
  }

  function updateBlock(id: string, patch: Partial<JournalContentBlock>) {
    setDraft((current) => ({
      ...current,
      contentBlocks: current.contentBlocks.map((block) =>
        block.id === id ? ({ ...block, ...patch } as JournalContentBlock) : block,
      ),
    }));
  }

  function insertBlock(afterId: string | null, block: JournalContentBlock) {
    setDraft((current) => {
      const index = afterId
        ? current.contentBlocks.findIndex((item) => item.id === afterId) + 1
        : current.contentBlocks.length;
      const blocks = [...current.contentBlocks];
      blocks.splice(Math.max(0, index), 0, block);
      return { ...current, contentBlocks: blocks };
    });
  }

  function addText(afterId: string | null, style: JournalTextBlockStyle) {
    insertBlock(afterId, newTextBlock(style));
  }

  function moveBlock(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.contentBlocks.findIndex((block) => block.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.contentBlocks.length) return current;
      const blocks = [...current.contentBlocks];
      [blocks[index], blocks[target]] = [blocks[target]!, blocks[index]!];
      return { ...current, contentBlocks: blocks };
    });
  }

  function removeBlock(block: JournalContentBlock) {
    if (block.type === "media") removeMedia(block.mediaId);
    setDraft((current) => ({
      ...current,
      contentBlocks: current.contentBlocks.filter((item) => item.id !== block.id),
    }));
  }

  function openMediaPicker(afterId: string | null) {
    if (preparingMedia || saving) return;
    setInsertAfterBlockId(afterId);
    fileInputRef.current?.click();
  }

  async function selectMedia(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setMediaError("");
    if (draft.media.length + files.length > alphaMediaTechnicalLimit) {
      setMediaError(
        ja
          ? `現在のα版の保存上限（${alphaMediaTechnicalLimit}ファイル）に達しました。`
          : `The current alpha storage limit is ${alphaMediaTechnicalLimit} files.`,
      );
      return;
    }
    const imageSourceError = files
      .filter((file) => !file.type.startsWith("video/"))
      .map((file) => validateSourceImage(file))
      .find((error) => error !== null);
    const unsupportedVideo = files.find(
      (file) => !file.type.startsWith("video/") && validateSourceImage(file) === "unsupported_image",
    );
    const oversizedVideo = files.find(
      (file) => file.type.startsWith("video/") && file.size > maxVideoBytes,
    );
    if (unsupportedVideo || imageSourceError || oversizedVideo) {
      setMediaError(
        imageSourceError
          ? translate(locale, imagePreparationMessageKey(new Error(imageSourceError)))
          : ja
            ? "動画は100MBまでです。"
            : "Videos are limited to 100 MB.",
      );
      return;
    }

    const now = new Date().toISOString();
    const additions: PendingMedia[] = [];
    setPreparingMedia(true);
    try {
      for (const file of files) {
        const id = `journal-media-${crypto.randomUUID()}`;
        const isVideo = file.type.startsWith("video/");
        const prepared = isVideo
          ? null
          : await preparePrivateAlphaImage(file, {
              maxDimension: 1800,
              maxOutputBytes: maxPreparedJournalImageBytes,
            });
        const blob = prepared?.blob ?? file;
        additions.push({
          attachment: {
            id,
            kind: isVideo ? "video" : "image",
            source: "local_blob",
            storageKey: id,
            mimeType: blob.type,
            sizeBytes: blob.size,
            altText: "",
            privacyState:
              isRemoteAlpha &&
              draft.visibility === "public" &&
              !isVideo
                ? "public_ready"
                : "private_only",
            createdAt: now,
            isDemo: false,
          },
          file: blob,
          previewUrl: URL.createObjectURL(blob),
        });
      }
      setOmittedMediaCount(0);
    } catch (error) {
      additions.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      setMediaError(translate(locale, imagePreparationMessageKey(error)));
      setPreparingMedia(false);
      return;
    }
    setPreparingMedia(false);
    setPendingMedia((current) => [...current, ...additions]);
    setDraft((current) => {
      const mediaBlocks = additions.map(({ attachment }) => ({
        id: `journal-block-${crypto.randomUUID()}`,
        type: "media" as const,
        mediaId: attachment.id,
      }));
      const index = insertAfterBlockId
        ? current.contentBlocks.findIndex((block) => block.id === insertAfterBlockId) + 1
        : current.contentBlocks.length;
      const blocks = [...current.contentBlocks];
      blocks.splice(Math.max(0, index), 0, ...mediaBlocks);
      return {
        ...current,
        media: [...current.media, ...additions.map(({ attachment }) => attachment)],
        contentBlocks: blocks,
      };
    });
  }

  function describeMedia(id: string, altText: string) {
    setPendingMedia((current) =>
      current.map((item) =>
        item.attachment.id === id
          ? { ...item, attachment: { ...item.attachment, altText } }
          : item,
      ),
    );
    setDraft((current) => ({
      ...current,
      media: current.media.map((item) => (item.id === id ? { ...item, altText } : item)),
    }));
  }

  function removeMedia(id: string) {
    const target = pendingMedia.find((item) => item.attachment.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setPendingMedia((current) => current.filter((item) => item.attachment.id !== id));
    setDraft((current) => ({
      ...current,
      media: current.media.filter((item) => item.id !== id),
      contentBlocks: current.contentBlocks.filter(
        (item) => item.type !== "media" || item.mediaId !== id,
      ),
    }));
  }

  function toggleDisplayField(field: JournalDisplayField) {
    setDraft((current) => ({
      ...current,
      displayFields: current.displayFields.includes(field)
        ? current.displayFields.filter((item) => item !== field)
        : [...current.displayFields, field],
    }));
  }

  if (completion) {
    return <JournalCompletion journal={completion} vehicle={vehicle} locale={locale} mode="detailed" />;
  }

  return (
    <form ref={formRef} className="journal-form note-editor-form" onSubmit={submit} noValidate aria-busy={saving || preparingMedia}>
      <section className="note-editor-shell">
        <header className="note-editor-header">
          <div>
            <span className="eyebrow">DETAILED RECORD</span>
            <strong>{ja ? "愛車の記録を、詳しく残す" : "Keep a detailed vehicle record"}</strong>
            <small>
              {ja
                ? "タイトル、長文、複数の写真や動画を使えます。写真と一言だけなら「さっと記録」が向いています。"
                : "Use a title, long-form text, and multiple photos or videos. For a photo and one line, use Quick record."}
            </small>
          </div>
          <Link href="/records/new" className="secondary-action">
            <Wrench size={17} aria-hidden="true" />
            {ja ? "整備記録だけ残す" : "Maintenance record only"}
          </Link>
        </header>
        {selectedPrompt && (
          <aside className="journal-prompt-hint" aria-label={selectedPrompt.label}>
            <strong>{selectedPrompt.label}</strong>
            <ul>{selectedPrompt.hint.map((item) => <li key={item}>{item}</li>)}</ul>
          </aside>
        )}
        <JournalDraftStatus
          status={draftStatus}
          omittedMediaCount={omittedMediaCount}
          ja={ja}
          onDiscard={discardDraft}
        />
        {pendingDraft && (
          <div className="local-draft-status is-restored" role="status">
            <span>
              <strong>{ja ? "書きかけの記録があります" : "You have an unfinished record"}</strong>
              <br />
              {ja ? "前回入力していた内容を復元できます。" : "You can restore what you entered last time."}
            </span>
            <span className="local-draft-actions">
              <button type="button" onClick={restoreDraft}>{ja ? "下書きを復元" : "Restore draft"}</button>
              <button type="button" onClick={() => { clearLocalDraft(localDraftKey); setPendingDraft(null); }}>{ja ? "下書きを削除" : "Delete draft"}</button>
              <button type="button" onClick={startNewDraft}>{ja ? "新しく書く" : "Start new"}</button>
            </span>
          </div>
        )}

        <label className={submitted && validation.errors.title ? "note-title has-error" : "note-title"}>
          <span className="sr-only">{ja ? "タイトル" : "Title"}</span>
          <input
            ref={titleInputRef}
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder={ja ? "タイトル" : "Title"}
            aria-invalid={submitted && Boolean(validation.errors.title)}
          />
          {submitted && validation.errors.title && (
            <small>{ja ? "タイトルを入力してください" : "Enter a title"}</small>
          )}
        </label>

        <OccurrenceDateFields
          value={draft}
          locale={locale}
          error={submitted && validation.errors.occurredOn ? validation.errors.occurredOn : undefined}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        />

        <label className="field journal-source-language">
          {ja ? "この文章の原文言語" : "Original language of this post"}
          <select value={draft.sourceLanguage ?? locale} onChange={(event) => setDraft((current) => ({ ...current, sourceLanguage: event.target.value }))}>
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
          <small>{ja ? "画面の表示言語ではなく、実際に書いている言語を選びます。" : "Choose the language you are actually writing in, independently of the interface language."}</small>
        </label>

        <div className="note-block-list">
          {draft.contentBlocks.map((block, index) => {
            const media = block.type === "media"
              ? pendingMedia.find((item) => item.attachment.id === block.mediaId)
              : undefined;
            return (
              <div className="note-block-wrap" key={block.id}>
                <article className={`note-block note-block-${block.type}`}>
                  <div className="note-block-actions" aria-label={ja ? "ブロック操作" : "Block controls"}>
                    <button type="button" className="icon-action" onClick={() => moveBlock(block.id, -1)} disabled={index === 0} title={ja ? "上へ" : "Move up"} aria-label={ja ? "上へ移動" : "Move block up"}><ChevronUp size={16} /></button>
                    <button type="button" className="icon-action" onClick={() => moveBlock(block.id, 1)} disabled={index === draft.contentBlocks.length - 1} title={ja ? "下へ" : "Move down"} aria-label={ja ? "下へ移動" : "Move block down"}><ChevronDown size={16} /></button>
                    <button type="button" className="icon-action danger-icon" onClick={() => removeBlock(block)} title={ja ? "削除" : "Remove"} aria-label={ja ? "ブロックを削除" : "Remove block"}><Trash2 size={16} /></button>
                  </div>
                  {block.type === "text" ? (
                    <div className={`note-text-block is-${block.style}`}>
                      <div className="note-text-style" role="group" aria-label={ja ? "文章スタイル" : "Text style"}>
                        {([
                          ["paragraph", AlignLeft, ja ? "本文" : "Text"],
                          ["heading", Heading2, ja ? "見出し" : "Heading"],
                          ["quote", Quote, ja ? "引用" : "Quote"],
                        ] as const).map(([style, Icon, label]) => (
                          <button type="button" className={block.style === style ? "is-selected" : ""} aria-pressed={block.style === style} onClick={() => updateBlock(block.id, { style })} title={label} key={style}><Icon size={16} aria-hidden="true" /><span>{label}</span></button>
                        ))}
                      </div>
                      <textarea
                        value={block.text}
                        onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                        placeholder={
                          block.style === "heading"
                            ? ja ? "見出し" : "Heading"
                            : block.style === "quote"
                              ? ja ? "その時の言葉や印象に残った一言" : "A memorable line or thought"
                              : ja ? "ここから自由に書く…" : "Start writing here…"
                        }
                        aria-label={ja ? "記事本文" : "Article text"}
                      />
                    </div>
                  ) : media ? (
                    <div className="note-media-block">
                      <div className="note-media-preview">
                        {media.attachment.kind === "image" ? (
                          // Browser-local preview; it is never sent externally.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={media.previewUrl} alt="" />
                        ) : (
                          <video src={media.previewUrl} controls preload="metadata" />
                        )}
                      </div>
                      <label className={submitted && !media.attachment.altText.trim() ? "field has-error" : "field"}>
                        {ja ? "写真・動画の説明" : "Media description"}
                        <input value={media.attachment.altText} onChange={(event) => describeMedia(media.attachment.id, event.target.value)} placeholder={ja ? "何が写っているか、ひとこと添える" : "Add a short description"} aria-invalid={submitted && !media.attachment.altText.trim()} />
                        {submitted && !media.attachment.altText.trim() && <small>{ja ? "説明を入力してください" : "Add a description"}</small>}
                      </label>
                    </div>
                  ) : (() => {
                    const attachment = draft.media.find((item) => item.id === block.mediaId);
                    return attachment ? (
                      <div className="note-media-block">
                        <JournalMedia attachments={[attachment]} locale={locale} />
                        <label className={submitted && !attachment.altText.trim() ? "field has-error" : "field"}>
                          {ja ? "写真・動画の説明" : "Media description"}
                          <input value={attachment.altText} onChange={(event) => describeMedia(attachment.id, event.target.value)} placeholder={ja ? "何が写っているか、ひとこと添える" : "Add a short description"} aria-invalid={submitted && !attachment.altText.trim()} />
                          {submitted && !attachment.altText.trim() && <small>{ja ? "説明を入力してください" : "Add a description"}</small>}
                        </label>
                      </div>
                    ) : null;
                  })()}
                </article>
                <BlockInsertMenu
                  ja={ja}
                  onText={(style) => addText(block.id, style)}
                  onMedia={() => openMediaPicker(block.id)}
                  mediaDisabled={draft.media.length >= alphaMediaTechnicalLimit || preparingMedia || saving}
                />
              </div>
            );
          })}
          {draft.contentBlocks.length === 0 && (
            <div className="note-empty-editor">
              <p>{ja ? "文章でも写真でも、好きなところから始められます。" : "Begin with words or media."}</p>
              <BlockInsertMenu ja={ja} onText={(style) => addText(null, style)} onMedia={() => openMediaPicker(null)} mediaDisabled={preparingMedia || saving} />
            </div>
          )}
        </div>

        <input ref={fileInputRef} hidden type="file" accept="image/*,video/*" multiple tabIndex={-1} aria-hidden="true" onChange={selectMedia} disabled={preparingMedia || saving} />
        {preparingMedia && <p className="image-preparation-note" role="status"><ShieldCheck size={15} aria-hidden="true" />{translate(locale, "preparingPhoto")}</p>}
        {mediaError && <p className="media-error" role="alert">{mediaError}</p>}
        {submitted && validation.errors.bodyOriginal && (
          <p className="media-error" role="alert">
            {ja ? "文章、写真・動画、または関連する整備記録を追加してください。" : "Add text, media, or a related maintenance record."}
          </p>
        )}
        {draft.media.length > 0 && draft.visibility !== "public" && (
          <div className="media-privacy-notice">
            <ShieldAlert size={20} aria-hidden="true" />
            <div>
              <strong>{ja ? "写真は記録の公開範囲に従って保存します" : "Photos use the record audience"}</strong>
              <p>{ja ? "本文と写真は同じ公開範囲になります。" : "The text and photos use the same audience."}</p>
            </div>
          </div>
        )}
      </section>

      <section className="journal-settings">
        <div className="section-heading compact"><div><span className="eyebrow">MAINTENANCE CONTEXT</span><h2>{ja ? "整備記録を添える" : "Attach maintenance context"}</h2></div><Link2 size={21} aria-hidden="true" /></div>
        <label className="field">{ja ? "関連する整備記録" : "Related maintenance record"}<select value={draft.linkedRecordId} onChange={(event) => setDraft((current) => ({ ...current, linkedRecordId: event.target.value }))}><option value="">{ja ? "関連付けない" : "No linked record"}</option>{data.records.map((record) => <option key={record.id} value={record.id}>{maintenanceRecordDateLabel(record, locale)} · {record.summary}</option>)}</select></label>
        {draft.linkedRecordId && <fieldset className="journal-field-options"><legend>{ja ? "記事に表示する定型情報" : "Structured details to show"}</legend>{displayFieldOptions.map((option) => <label className="checkbox-row" key={option.value}><input type="checkbox" checked={draft.displayFields.includes(option.value)} onChange={() => toggleDisplayField(option.value)} /><span>{ja ? option.ja : option.en}</span></label>)}</fieldset>}
      </section>

      <section className="journal-settings">
        <div className="section-heading compact"><div><span className="eyebrow">PRIVACY</span><h2>{ja ? "公開範囲" : "Audience"}</h2></div><ShieldCheck size={21} aria-hidden="true" /></div>
        {!journal && (
          <p className="settings-help">
            {isRemoteAlpha
              ? ja
                ? "初期値は『α参加者に公開』です。自分だけの記録として保存することもできます。"
                : "The default is shared with alpha participants. You can also save a record for yourself only."
              : ja
                ? "初期値は公開です。自分だけの記録として保存することもできます。"
                : "The default is public. You can also save a record for yourself only."}
          </p>
        )}
        <div className={`segmented-control ${isRemoteAlpha ? "has-two-options" : ""}`} role="group" aria-label={ja ? "公開範囲" : "Audience"}>
          {([
            ["private", ja ? "自分だけ" : "Only me"],
            ...(!isRemoteAlpha ? [["followers", ja ? "フォロワー" : "Followers"]] : []),
            ["public", isRemoteAlpha ? (ja ? "α参加者に公開" : "Alpha participants") : (ja ? "公開" : "Public")],
          ] as Array<[JournalVisibility, string]>).map(([value, label]) => (
            <button
              type="button"
              className={draft.visibility === value ? "is-selected" : ""}
              aria-pressed={draft.visibility === value}
              onClick={() => changeVisibility(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
        {isRemoteAlpha && draft.visibility === "public" && (
          <p className="settings-help">
            {ja
              ? "ログイン済みのP0・α参加者だけが、投稿本文、写真、表示用車名を見られます。関連する非公開整備記録は共有しません。"
              : "Only signed-in P0 and alpha participants can see the post text, photos, and vehicle label. Linked private maintenance records are not shared."}
          </p>
        )}
        {isRemoteAlpha &&
          draft.visibility === "public" &&
          imageAttachments.length > 0 &&
          <p className="settings-help">
            {ja
              ? "写真は記録本文と同じ範囲で公開します。ナンバー、人物、住所が分かる背景を保存前に確認してください。"
              : "Photos use the same audience as the record. Check plates, people, and address-revealing backgrounds before saving."}
          </p>}
        {draft.visibility === "public" && legacyPrivatePhotoCount > 0 && (
          <p className="settings-help">
            {ja
              ? `以前の設定で非公開にした写真${legacyPrivatePhotoCount}枚は、この編集だけで公開へ変更しません。`
              : `${legacyPrivatePhotoCount} photo${legacyPrivatePhotoCount === 1 ? "" : "s"} kept private under the previous setting will not be published by this edit.`}
          </p>
        )}
        {isRemoteAlpha && draft.visibility === "public" && draft.media.some((item) => item.kind === "video") && (
          <div className="media-publication-gate" role="status">
            <ShieldCheck size={19} aria-hidden="true" />
            <span>{ja ? "動画はα参加者へ共有せず、自分の履歴だけに残します。" : "Videos remain in your private history and are not shared with alpha participants."}</span>
          </div>
        )}
        <label className="consent-option"><input type="checkbox" checked={draft.knowledgeExtractionConsent} onChange={(event) => setDraft((current) => ({ ...current, knowledgeExtractionConsent: event.target.checked }))} /><span><strong>{ja ? "本文をナレッジ検索の参考候補にする" : "Allow this story to inform knowledge search"}</strong><small>{ja ? "AIは本文を代筆せず、公開後も出典付きの未確認投稿として扱います。" : "AI never writes the story and treats it as cited, unverified owner content."}</small></span></label>
      </section>

      <div className="journal-submit-area">
        {submitted && !validation.valid && (
          <div ref={submitFeedbackRef} className="form-submit-feedback is-error" role="alert">
            <ShieldAlert size={18} aria-hidden="true" />
            <span>{journalValidationMessage(validation, ja)}</span>
          </div>
        )}
        {saveTakingLong && (
          <div className="form-submit-feedback" role="status">
            <LoaderCircle className="spin" size={18} aria-hidden="true" />
            <span>
              {ja
                ? "保存を続けています。写真や通信状況によって少し時間がかかることがあります。"
                : "Still saving. Photos or network conditions can make this take a little longer."}
            </span>
          </div>
        )}
        {saveError && (
          <div className="form-submit-feedback is-error" role="alert">
            <ShieldAlert size={18} aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}
        <div className="form-actions">
          <button type="submit" className="primary-action" disabled={saving || preparingMedia}>
            {saving
              ? <LoaderCircle className="spin" size={17} aria-hidden="true" />
              : <Save size={17} aria-hidden="true" />}
            {saving ? ja ? "保存中…" : "Saving…" : journal ? (ja ? "変更を保存" : "Save changes") : draft.visibility === "private" ? ja ? "詳しい記録を非公開で保存" : "Save detailed record privately" : ja ? "公開範囲を確認して保存" : "Review audience and save"}
          </button>
        </div>
      </div>
    </form>
  );
}

function journalValidationMessage(
  validation: ReturnType<typeof validateJournalDraft>,
  ja: boolean,
): string {
  const issues: string[] = [];
  if (validation.errors.title) {
    issues.push(ja ? "タイトル" : "title");
  }
  if (validation.errors.occurredOn) {
    issues.push(ja ? "日付・時期" : "date or period");
  }
  if (validation.errors.bodyOriginal) {
    issues.push(ja ? "文章・写真・関連する整備記録" : "text, media, or a linked maintenance record");
  }
  if (validation.errors.media === "description_required") {
    issues.push(ja ? "写真・動画の説明" : "media description");
  }
  return ja
    ? `保存前に確認が必要です：${issues.join("、")}。`
    : `Check the following before saving: ${issues.join(", ")}.`;
}

function JournalDraftStatus({
  status,
  omittedMediaCount,
  ja,
  onDiscard,
}: {
  status: "idle" | "restored" | "saved" | "error";
  omittedMediaCount: number;
  ja: boolean;
  onDiscard(): void;
}) {
  if (status === "idle") return null;
  const mediaNote = omittedMediaCount > 0
    ? ja
      ? ` 写真・動画${omittedMediaCount}件は再選択が必要です。`
      : ` Re-select ${omittedMediaCount} media file${omittedMediaCount === 1 ? "" : "s"}.`
    : "";
  return (
    <div className={`local-draft-status is-${status}`} role={status === "error" ? "alert" : "status"}>
      <span>
        {status === "restored"
          ? ja ? "端末内の下書きを復元しました。" : "Restored the draft from this device."
          : status === "saved"
            ? ja ? "文章と設定を端末内へ下書き保存しました。" : "Text and settings saved on this device."
            : ja ? "下書きを保存できません。ブラウザの保存設定を確認してください。" : "The draft could not be saved. Check browser storage settings."}
        {mediaNote}
      </span>
      <button type="button" onClick={onDiscard}>
        <Trash2 size={15} aria-hidden="true" />
        {ja ? "下書きを破棄" : "Discard draft"}
      </button>
    </div>
  );
}

function BlockInsertMenu({
  ja,
  onText,
  onMedia,
  mediaDisabled,
}: {
  ja: boolean;
  onText(style: JournalTextBlockStyle): void;
  onMedia(): void;
  mediaDisabled: boolean;
}) {
  return (
    <div className="note-insert-row">
      <span><Plus size={15} aria-hidden="true" /></span>
      <button type="button" onClick={() => onText("paragraph")}><AlignLeft size={16} aria-hidden="true" />{ja ? "文章" : "Text"}</button>
      <button type="button" onClick={() => onText("heading")}><Heading2 size={16} aria-hidden="true" />{ja ? "見出し" : "Heading"}</button>
      <button type="button" onClick={() => onText("quote")}><Quote size={16} aria-hidden="true" />{ja ? "引用" : "Quote"}</button>
      <button type="button" onClick={onMedia} disabled={mediaDisabled}><ImagePlus size={16} aria-hidden="true" />{ja ? "写真・動画" : "Media"}</button>
    </div>
  );
}
