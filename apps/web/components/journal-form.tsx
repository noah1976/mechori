"use client";

import {
  getPreferredVehicle,
  createRestorableJournalDraft,
  validateJournalDraft,
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
import {
  clearLocalDraft,
  journalLocalDraftKey,
  loadJournalLocalDraft,
  saveLocalDraft,
} from "@/lib/local-draft-store";

const maxMediaCount = 6;
const maxImageBytes = 10 * 1024 * 1024;
const maxVideoBytes = 100 * 1024 * 1024;

interface PendingMedia {
  attachment: JournalMediaAttachment;
  file: File;
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

function createInitialJournalDraft(vehicleId: string): JournalDraft {
  return {
    title: "",
    bodyOriginal: "",
    vehicleId,
    linkedRecordId: "",
    displayFields: ["service_date", "odometer", "actions"],
    media: [],
    contentBlocks: [newTextBlock()],
    visibility: "private",
    knowledgeExtractionConsent: false,
  };
}

function hasMeaningfulJournalDraft(draft: JournalDraft): boolean {
  return Boolean(
    draft.title.trim() ||
    draft.linkedRecordId ||
    draft.media.length ||
    draft.contentBlocks.some((block) => block.type === "text" && block.text.trim()) ||
    draft.visibility !== "private" ||
    draft.knowledgeExtractionConsent,
  );
}

export function JournalForm() {
  const { data, locale, addJournal } = useApp();
  const router = useRouter();
  const ja = locale === "ja";
  const vehicle = getPreferredVehicle(data.vehicles);
  const localDraftKey = journalLocalDraftKey();
  const initialDraft = useMemo(
    () => createInitialJournalDraft(vehicle?.id ?? ""),
    [vehicle?.id],
  );
  const [draft, setDraft] = useState<JournalDraft>(initialDraft);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"idle" | "restored" | "saved" | "error">("idle");
  const [omittedMediaCount, setOmittedMediaCount] = useState(0);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [insertAfterBlockId, setInsertAfterBlockId] = useState<string | null>(null);
  const pendingMediaRef = useRef<PendingMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const validation = validateJournalDraft(draft);
  const missingMediaDescription = pendingMedia.some(
    ({ attachment }) => !attachment.altText.trim(),
  );

  useEffect(() => {
    pendingMediaRef.current = pendingMedia;
  }, [pendingMedia]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadJournalLocalDraft();
      if (stored) {
        const storedDraft = stored.value.draft;
        const vehicleExists = data.vehicles.some((item) => item.id === storedDraft.vehicleId);
        const recordExists = data.records.some((item) => item.id === storedDraft.linkedRecordId);
        const restoredDraft = {
          ...storedDraft,
          vehicleId: vehicleExists ? storedDraft.vehicleId : vehicle?.id ?? "",
          linkedRecordId: recordExists ? storedDraft.linkedRecordId : "",
          contentBlocks: storedDraft.contentBlocks.length
            ? storedDraft.contentBlocks
            : [newTextBlock()],
        };
        if (hasMeaningfulJournalDraft(restoredDraft)) {
          setDraft(restoredDraft);
          setOmittedMediaCount(stored.value.omittedMediaCount);
          setDraftStatus("restored");
        } else {
          clearLocalDraft(localDraftKey);
        }
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data.records, data.vehicles, localDraftKey, vehicle?.id]);

  useEffect(() => {
    if (!draftReady) return;
    if (!hasMeaningfulJournalDraft(draft)) {
      clearLocalDraft(localDraftKey);
      return;
    }
    const timer = window.setTimeout(() => {
      const restorable = createRestorableJournalDraft(draft);
      setOmittedMediaCount(restorable.omittedMediaCount);
      setDraftStatus(
        saveLocalDraft(localDraftKey, restorable) ? "saved" : "error",
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [draft, draftReady, localDraftKey]);

  function discardDraft() {
    pendingMediaRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    clearLocalDraft(localDraftKey);
    setPendingMedia([]);
    setDraft(initialDraft);
    setDraftStatus("idle");
    setOmittedMediaCount(0);
    setSubmitted(false);
    setMediaError("");
  }

  useEffect(() => () => {
    pendingMediaRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.valid || missingMediaDescription) {
      window.requestAnimationFrame(() => {
        if (validation.errors.title) {
          titleInputRef.current?.focus();
          return;
        }
        formRef.current
          ?.querySelector<HTMLElement>(".has-error input, .has-error textarea, [aria-invalid='true'], .note-text-block textarea")
          ?.focus();
      });
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const journal = await addJournal(
        draft,
        pendingMedia.map(({ attachment, file }) => ({ attachment, blob: file })),
      );
      clearLocalDraft(localDraftKey);
      router.push(`/journal/${journal.id}`);
    } catch {
      setMediaError(
        ja
          ? "端末へ保存できませんでした。入力内容は下書きとして残しています。容量を確認して、もう一度お試しください。"
          : "This journal could not be saved. Your text remains in the local draft. Check available storage and try again.",
      );
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
    setInsertAfterBlockId(afterId);
    fileInputRef.current?.click();
  }

  function selectMedia(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setMediaError("");
    if (pendingMedia.length + files.length > maxMediaCount) {
      setMediaError(
        ja
          ? `1投稿につき${maxMediaCount}ファイルまで追加できます。`
          : `You can attach up to ${maxMediaCount} files per post.`,
      );
      return;
    }
    const unsupported = files.find(
      (file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"),
    );
    const tooLarge = files.find((file) =>
      file.type.startsWith("video/")
        ? file.size > maxVideoBytes
        : file.size > maxImageBytes,
    );
    if (unsupported || tooLarge) {
      setMediaError(
        unsupported
          ? ja
            ? "画像または動画ファイルを選んでください。"
            : "Choose image or video files."
          : ja
            ? "画像は10MB、動画は100MBまでです。"
            : "Images are limited to 10 MB and videos to 100 MB.",
      );
      return;
    }

    const now = new Date().toISOString();
    const additions = files.map((file): PendingMedia => {
      const id = `journal-media-${crypto.randomUUID()}`;
      return {
        attachment: {
          id,
          kind: file.type.startsWith("video/") ? "video" : "image",
          source: "local_blob",
          storageKey: id,
          mimeType: file.type,
          sizeBytes: file.size,
          altText: "",
          privacyState: "private_only",
          createdAt: now,
          isDemo: false,
        },
        file,
        previewUrl: URL.createObjectURL(file),
      };
    });
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

  return (
    <form ref={formRef} className="journal-form note-editor-form" onSubmit={submit} noValidate aria-busy={saving}>
      <section className="note-editor-shell">
        <header className="note-editor-header">
          <div>
            <span className="eyebrow">YOUR GARAGE STORY</span>
            <strong>{ja ? "その日の出来事を、好きな形で" : "Tell the story your way"}</strong>
            <small>
              {ja
                ? "壊れた日も、路上で止まった日も、直って走れた日も。AIは本文を代筆しません。"
                : "Breakdowns, roadside stops, and the first drive after a fix. AI will not write it for you."}
            </small>
          </div>
          <Link href="/records/new" className="secondary-action">
            <Wrench size={17} aria-hidden="true" />
            {ja ? "整備記録だけ残す" : "Maintenance record only"}
          </Link>
        </header>
        <JournalDraftStatus
          status={draftStatus}
          omittedMediaCount={omittedMediaCount}
          ja={ja}
          onDiscard={discardDraft}
        />

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
                        <input value={media.attachment.altText} onChange={(event) => describeMedia(media.attachment.id, event.target.value)} placeholder={ja ? "何が写っているか、ひとこと添える" : "Add a short description"} />
                        {submitted && !media.attachment.altText.trim() && <small>{ja ? "説明を入力してください" : "Add a description"}</small>}
                      </label>
                    </div>
                  ) : null}
                </article>
                <BlockInsertMenu
                  ja={ja}
                  onText={(style) => addText(block.id, style)}
                  onMedia={() => openMediaPicker(block.id)}
                  mediaDisabled={pendingMedia.length >= maxMediaCount}
                />
              </div>
            );
          })}
          {draft.contentBlocks.length === 0 && (
            <div className="note-empty-editor">
              <p>{ja ? "文章でも写真でも、好きなところから始められます。" : "Begin with words or media."}</p>
              <BlockInsertMenu ja={ja} onText={(style) => addText(null, style)} onMedia={() => openMediaPicker(null)} mediaDisabled={false} />
            </div>
          )}
        </div>

        <input ref={fileInputRef} hidden type="file" accept="image/*,video/*" multiple tabIndex={-1} aria-hidden="true" onChange={selectMedia} />
        {mediaError && <p className="media-error" role="alert">{mediaError}</p>}
        {submitted && validation.errors.bodyOriginal && (
          <p className="media-error" role="alert">
            {ja ? "文章、写真・動画、または関連する整備記録を追加してください。" : "Add text, media, or a related maintenance record."}
          </p>
        )}
        {pendingMedia.length > 0 && (
          <div className="media-privacy-notice">
            <ShieldAlert size={20} aria-hidden="true" />
            <div><strong>{ja ? "実ファイル付き投稿は現在、非公開のみ" : "Real media remains private for now"}</strong><p>{ja ? "ナンバー・顔・位置情報の公開前処理が完成するまで、端末内の非公開記録として保存します。" : "Until privacy processing is complete, media stays private on this device."}</p></div>
          </div>
        )}
      </section>

      <section className="journal-settings">
        <div className="section-heading compact"><div><span className="eyebrow">MAINTENANCE CONTEXT</span><h2>{ja ? "整備記録を添える" : "Attach maintenance context"}</h2></div><Link2 size={21} aria-hidden="true" /></div>
        <label className="field">{ja ? "関連する整備記録" : "Related maintenance record"}<select value={draft.linkedRecordId} onChange={(event) => setDraft((current) => ({ ...current, linkedRecordId: event.target.value }))}><option value="">{ja ? "関連付けない" : "No linked record"}</option>{data.records.map((record) => <option key={record.id} value={record.id}>{record.serviceDate} · {record.summary}</option>)}</select></label>
        {draft.linkedRecordId && <fieldset className="journal-field-options"><legend>{ja ? "記事に表示する定型情報" : "Structured details to show"}</legend>{displayFieldOptions.map((option) => <label className="checkbox-row" key={option.value}><input type="checkbox" checked={draft.displayFields.includes(option.value)} onChange={() => toggleDisplayField(option.value)} /><span>{ja ? option.ja : option.en}</span></label>)}</fieldset>}
      </section>

      <section className="journal-settings">
        <div className="section-heading compact"><div><span className="eyebrow">PRIVACY</span><h2>{ja ? "公開範囲" : "Audience"}</h2></div><ShieldCheck size={21} aria-hidden="true" /></div>
        <div className="segmented-control" role="group" aria-label={ja ? "公開範囲" : "Audience"}>{([ ["private", ja ? "非公開" : "Private"], ["followers", ja ? "フォロワー" : "Followers"], ["public", ja ? "公開" : "Public"] ] as Array<[JournalVisibility, string]>).map(([value, label]) => <button type="button" className={draft.visibility === value ? "is-selected" : ""} aria-pressed={draft.visibility === value} onClick={() => setDraft((current) => ({ ...current, visibility: value }))} key={value}>{label}</button>)}</div>
        {validation.errors.media === "private_only" && <div className="media-publication-gate" role="alert"><ShieldAlert size={19} aria-hidden="true" /><span>{ja ? "実ファイルの公開前処理が未実装です。" : "Privacy processing for real media is not implemented."}</span><button type="button" className="secondary-action" onClick={() => setDraft((current) => ({ ...current, visibility: "private" }))}>{ja ? "非公開に戻す" : "Make private"}</button></div>}
        <label className="consent-option"><input type="checkbox" checked={draft.knowledgeExtractionConsent} onChange={(event) => setDraft((current) => ({ ...current, knowledgeExtractionConsent: event.target.checked }))} /><span><strong>{ja ? "本文をナレッジ検索の参考候補にする" : "Allow this story to inform knowledge search"}</strong><small>{ja ? "AIは本文を代筆せず、公開後も出典付きの未確認投稿として扱います。" : "AI never writes the story and treats it as cited, unverified owner content."}</small></span></label>
      </section>

      <div className="form-actions"><button type="submit" className="primary-action" disabled={saving}><Save size={17} aria-hidden="true" />{saving ? ja ? "保存中…" : "Saving…" : draft.visibility === "private" ? ja ? "非公開で保存" : "Save privately" : ja ? "公開範囲を確認して保存" : "Review audience and save"}</button></div>
    </form>
  );
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
