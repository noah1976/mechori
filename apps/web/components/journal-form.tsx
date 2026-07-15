"use client";

import {
  validateJournalDraft,
  type JournalDisplayField,
  type JournalDraft,
  type JournalMediaAttachment,
  type JournalVisibility,
} from "@mechory/core";
import {
  BookOpenText,
  FileImage,
  ImageIcon,
  Link2,
  Save,
  ShieldAlert,
  ShieldCheck,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useApp } from "@/lib/app-context";

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

export function JournalForm() {
  const { data, locale, addJournal } = useApp();
  const router = useRouter();
  const ja = locale === "ja";
  const vehicle = data.vehicles[0];
  const [draft, setDraft] = useState<JournalDraft>({
    title: "",
    bodyOriginal: "",
    vehicleId: vehicle?.id ?? "",
    linkedRecordId: "",
    displayFields: ["service_date", "odometer", "actions"],
    media: [],
    visibility: "private",
    knowledgeExtractionConsent: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const pendingMediaRef = useRef<PendingMedia[]>([]);
  const validation = validateJournalDraft(draft);
  const missingMediaDescription = pendingMedia.some(
    ({ attachment }) => !attachment.altText.trim(),
  );

  useEffect(() => {
    pendingMediaRef.current = pendingMedia;
  }, [pendingMedia]);

  useEffect(() => () => {
    pendingMediaRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.valid || missingMediaDescription || saving) return;
    setSaving(true);
    try {
      const journal = await addJournal(
        draft,
        pendingMedia.map(({ attachment, file }) => ({ attachment, blob: file })),
      );
      router.push(`/journal/${journal.id}`);
    } catch {
      setMediaError(
        ja
          ? "メディアを端末内へ保存できませんでした。容量を確認して、もう一度お試しください。"
          : "Media could not be stored on this device. Check available storage and try again.",
      );
      setSaving(false);
    }
  }

  function setVisibility(visibility: JournalVisibility) {
    setDraft((current) => ({ ...current, visibility }));
  }

  function toggleDisplayField(field: JournalDisplayField) {
    setDraft((current) => ({
      ...current,
      displayFields: current.displayFields.includes(field)
        ? current.displayFields.filter((item) => item !== field)
        : [...current.displayFields, field],
    }));
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
    setDraft((current) => ({
      ...current,
      media: [...current.media, ...additions.map(({ attachment }) => attachment)],
    }));
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
      media: current.media.map((item) =>
        item.id === id ? { ...item, altText } : item,
      ),
    }));
  }

  function removeMedia(id: string) {
    const target = pendingMedia.find((item) => item.attachment.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setPendingMedia((current) => current.filter((item) => item.attachment.id !== id));
    setDraft((current) => ({
      ...current,
      media: current.media.filter((item) => item.id !== id),
    }));
  }

  return (
    <form className="journal-form" onSubmit={submit} noValidate>
      <section className="journal-writing-surface">
        <div className="journal-writing-heading">
          <BookOpenText size={22} aria-hidden="true" />
          <div>
            <strong>{ja ? "あなたの言葉で書く" : "Write in your own words"}</strong>
            <small>
              {ja
                ? "AIによる本文生成や書き換えは行いません。"
                : "AI will not generate or rewrite your journal."}
            </small>
          </div>
        </div>
        <label className={submitted && validation.errors.title ? "field has-error" : "field"}>
          {ja ? "タイトル" : "Title"}
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            placeholder={ja ? "今日、愛車とあったこと" : "What happened with your car today"}
          />
          {submitted && validation.errors.title && (
            <small>{ja ? "タイトルを入力してください" : "Enter a title"}</small>
          )}
        </label>
        <label className={submitted && validation.errors.bodyOriginal ? "field has-error" : "field"}>
          {ja ? "本文" : "Journal"}
          <textarea
            className="journal-body-input"
            value={draft.bodyOriginal}
            onChange={(event) =>
              setDraft((current) => ({ ...current, bodyOriginal: event.target.value }))
            }
            placeholder={
              ja
                ? "工場へ持ち込んだ経緯、直ってうれしかったこと、まだ気になることなど、自由に書いてください。"
                : "Write freely about the visit, what felt good afterward, or what still concerns you."
            }
          />
          {submitted && validation.errors.bodyOriginal && (
            <small>{ja ? "本文を入力してください" : "Write your journal"}</small>
          )}
        </label>
      </section>

      <section className="journal-settings journal-media-editor">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">PHOTO &amp; VIDEO</span>
            <h2>{ja ? "写真・動画を添える" : "Add photos and videos"}</h2>
          </div>
          <FileImage size={21} aria-hidden="true" />
        </div>
        <p className="journal-media-help">
          {ja
            ? "画像は10MB、動画は100MBまで。最大6件をこの端末のブラウザ内だけに保存します。"
            : "Up to 6 items. Images are limited to 10 MB and videos to 100 MB, stored only in this browser."}
        </p>
        <label className="media-upload-action">
          <Upload size={18} aria-hidden="true" />
          <span>{ja ? "画像・動画を選ぶ" : "Choose images or videos"}</span>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={selectMedia}
            disabled={pendingMedia.length >= maxMediaCount}
          />
        </label>
        {mediaError && <p className="media-error" role="alert">{mediaError}</p>}
        {pendingMedia.length > 0 && (
          <div className="media-draft-grid">
            {pendingMedia.map(({ attachment, previewUrl, file }) => (
              <article className="media-draft-item" key={attachment.id}>
                <div className="media-draft-preview">
                  {attachment.kind === "image" ? (
                    // The preview is a browser-created object URL and is never sent externally.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="" />
                  ) : (
                    <video src={previewUrl} muted preload="metadata" aria-label={file.name} />
                  )}
                  <span>
                    {attachment.kind === "image" ? (
                      <ImageIcon size={14} aria-hidden="true" />
                    ) : (
                      <Video size={14} aria-hidden="true" />
                    )}
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    className="icon-action media-remove"
                    onClick={() => removeMedia(attachment.id)}
                    aria-label={ja ? `${file.name}を削除` : `Remove ${file.name}`}
                    title={ja ? "削除" : "Remove"}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
                <label className={submitted && !attachment.altText.trim() ? "field has-error" : "field"}>
                  {ja ? "内容の説明" : "Description"}
                  <input
                    value={attachment.altText}
                    onChange={(event) => describeMedia(attachment.id, event.target.value)}
                    placeholder={ja ? "写真・動画に写っているもの" : "What this media shows"}
                  />
                  {submitted && !attachment.altText.trim() && (
                    <small>{ja ? "内容を短く説明してください" : "Add a short description"}</small>
                  )}
                </label>
              </article>
            ))}
          </div>
        )}
        {pendingMedia.length > 0 && (
          <div className="media-privacy-notice">
            <ShieldAlert size={20} aria-hidden="true" />
            <div>
              <strong>
                {ja ? "このDEMOでは実ファイル付き投稿は非公開のみ" : "Real media remains private in this demo"}
              </strong>
              <p>
                {ja
                  ? "ナンバー・顔・位置情報の自動除去が未実装です。公開前処理が完成するまで、端末内の非公開記録として保存します。"
                  : "Automatic removal of plates, faces, and location metadata is not implemented. Media stays private on this device."}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="journal-settings">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">OPTIONAL CONTEXT</span>
            <h2>{ja ? "整備記録を添える" : "Attach maintenance context"}</h2>
          </div>
          <Link2 size={21} aria-hidden="true" />
        </div>
        <label className="field">
          {ja ? "関連する整備記録" : "Related maintenance record"}
          <select
            value={draft.linkedRecordId}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                linkedRecordId: event.target.value,
              }))
            }
          >
            <option value="">{ja ? "関連付けない" : "No linked record"}</option>
            {data.records.map((record) => (
              <option key={record.id} value={record.id}>
                {record.serviceDate} · {record.summary}
              </option>
            ))}
          </select>
        </label>
        {draft.linkedRecordId && (
          <fieldset className="journal-field-options">
            <legend>{ja ? "Journalに表示する定型情報" : "Structured details to show"}</legend>
            {displayFieldOptions.map((option) => (
              <label className="checkbox-row" key={option.value}>
                <input
                  type="checkbox"
                  checked={draft.displayFields.includes(option.value)}
                  onChange={() => toggleDisplayField(option.value)}
                />
                <span>{ja ? option.ja : option.en}</span>
              </label>
            ))}
          </fieldset>
        )}
      </section>

      <section className="journal-settings">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">PRIVACY</span>
            <h2>{ja ? "公開範囲" : "Audience"}</h2>
          </div>
          <ShieldCheck size={21} aria-hidden="true" />
        </div>
        <div className="segmented-control" role="group" aria-label={ja ? "公開範囲" : "Audience"}>
          {([
            ["private", ja ? "非公開" : "Private"],
            ["followers", ja ? "フォロワー" : "Followers"],
            ["public", ja ? "公開" : "Public"],
          ] as Array<[JournalVisibility, string]>).map(([value, label]) => (
            <button
              type="button"
              className={draft.visibility === value ? "is-selected" : ""}
              aria-pressed={draft.visibility === value}
              onClick={() => setVisibility(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
        {validation.errors.media === "private_only" && (
          <div className="media-publication-gate" role="alert">
            <ShieldAlert size={19} aria-hidden="true" />
            <span>
              {ja
                ? "実ファイルを添付した投稿は、公開前処理が未実装のため公開できません。"
                : "Posts with real media cannot be published until privacy processing is implemented."}
            </span>
            <button type="button" className="secondary-action" onClick={() => setVisibility("private")}>
              {ja ? "非公開に戻す" : "Make private"}
            </button>
          </div>
        )}
        <label className="consent-option">
          <input
            type="checkbox"
            checked={draft.knowledgeExtractionConsent}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                knowledgeExtractionConsent: event.target.checked,
              }))
            }
          />
          <span>
            <strong>
              {ja
                ? "本文からナレッジ候補を探すことを許可する"
                : "Allow knowledge candidates to be found in this journal"}
            </strong>
            <small>
              {ja
                ? "候補は自動確定されません。実AIはこのDEMOに接続されていません。"
                : "Candidates are never auto-confirmed. No real AI is connected in this demo."}
            </small>
          </span>
        </label>
      </section>

      <div className="form-actions">
        <button type="submit" className="primary-action" disabled={saving}>
          <Save size={17} aria-hidden="true" />
          {saving
            ? ja
              ? "保存中…"
              : "Saving…"
            : draft.visibility === "private"
            ? ja
              ? "非公開で保存"
              : "Save privately"
            : ja
              ? "公開範囲を確認して保存"
              : "Review audience and save"}
        </button>
      </div>
    </form>
  );
}

function formatBytes(value: number): string {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
