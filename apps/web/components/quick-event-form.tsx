"use client";

import { useApp } from "@/lib/app-context";
import { localDateInputValue } from "@/lib/date-input";
import {
  imagePreparationMessageKey,
  preparePrivateAlphaImage,
  type PreparedImage,
} from "@/lib/image-preparation";
import {
  displayVehicleModel,
  journalSupportsServiceAttribution,
  journalToDraft,
  normalizeServiceAttribution,
  unknownServiceAttribution,
  validateJournalDraft,
  type GarageJournalPost,
  type JournalEventType,
  type JournalDraft,
  type JournalMediaAttachment,
  type JournalVisibility,
  type MaintenanceServiceAttributionV1,
  type Vehicle,
} from "@mechori/core";
import { translate, type TranslationKey } from "@mechori/i18n";
import { LoaderCircle, Save, ShieldAlert, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { OccurrenceDateFields } from "@/components/occurrence-date-fields";
import { PhotoSourceActions } from "@/components/photo-source-actions";
import { JournalCompletion } from "@/components/journal-completion";
import {
  clearLocalDraft,
  loadQuickEventLocalDraft,
  quickEventLocalDraftKey,
  saveLocalDraft,
} from "@/lib/local-draft-store";
import { ServiceAttributionField } from "@/components/service-attribution-field";
import { quickRecordTitle } from "@/lib/quick-record";

const eventTypes: Array<{ value: JournalEventType; label: TranslationKey }> = [
  { value: "delivery", label: "eventDelivery" },
  { value: "photo", label: "eventPhoto" },
  { value: "drive", label: "eventDrive" },
  { value: "inspection", label: "eventInspection" },
  { value: "tire", label: "eventTire" },
  { value: "oil", label: "eventOil" },
  { value: "breakdown", label: "eventBreakdown" },
  { value: "repair", label: "eventRepair" },
  { value: "part", label: "eventPart" },
  { value: "custom", label: "eventCustom" },
  { value: "event", label: "eventEvent" },
  { value: "memory", label: "eventMemory" },
  { value: "other", label: "eventOther" },
];

type OccurrenceDraft = Pick<
  JournalDraft,
  "occurredOn" | "occurredYear" | "occurredMonth" | "occurredPrecision" | "occurredPeriodNote"
>;

export function QuickEventForm({
  vehicle,
  journal,
}: {
  vehicle: Vehicle;
  journal?: GarageJournalPost;
}) {
  const {
    data,
    locale,
    addJournal,
    updateJournal,
    isRemoteAlpha,
    alphaJournalSharingAvailable,
    alphaJournalMediaSharingAvailable,
  } = useApp();
  const editing = Boolean(journal);
  const [eventType, setEventType] = useState<JournalEventType>(journal?.eventType ?? "other");
  const [serviceAttribution, setServiceAttribution] = useState<MaintenanceServiceAttributionV1>(
    () => normalizeServiceAttribution(journal?.serviceAttribution),
  );
  const [occurrence, setOccurrence] = useState<OccurrenceDraft>(() => {
    if (journal) {
      const stored = journalToDraft(journal);
      return {
        occurredOn: stored.occurredOn,
        occurredYear: stored.occurredYear,
        occurredMonth: stored.occurredMonth,
        occurredPrecision: stored.occurredPrecision,
        occurredPeriodNote: stored.occurredPeriodNote,
      };
    }
    return { occurredOn: localDateInputValue(), occurredPrecision: "day" as const };
  });
  const [note, setNote] = useState(journal?.bodyOriginal ?? "");
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [error, setError] = useState<TranslationKey | "">("");
  const [saving, setSaving] = useState(false);
  const [saveTakingLong, setSaveTakingLong] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [visibility, setVisibility] = useState<JournalVisibility>(
    isRemoteAlpha && journal?.visibility === "followers"
      ? "private"
      : journal?.visibility ?? "public",
  );
  const existingAttachment = journal?.media[0];
  const hasLegacyPrivatePhoto =
    journal?.visibility === "public" &&
    existingAttachment?.kind === "image" &&
    existingAttachment.privacyState === "private_only";
  const [publicationError, setPublicationError] = useState("");
  const [draftReady, setDraftReady] = useState(Boolean(journal));
  const [draftStatus, setDraftStatus] = useState<"idle" | "restored" | "saved" | "error">("idle");
  const [pendingDraft, setPendingDraft] = useState<ReturnType<typeof loadQuickEventLocalDraft>>(null);
  const [omittedMediaCount, setOmittedMediaCount] = useState(0);
  const [completion, setCompletion] = useState<GarageJournalPost | null>(null);
  const router = useRouter();
  const vehicleModel = displayVehicleModel(vehicle, locale);
  const localDraftKey = quickEventLocalDraftKey(data.currentProfileId, vehicle.id, journal?.id);

  useEffect(() => {
    if (journal) return;
    const timer = window.setTimeout(() => {
      const stored = loadQuickEventLocalDraft(localDraftKey);
      if (stored && (stored.value.note.trim() || stored.value.hasPhoto || stored.value.visibility !== "private")) {
        setPendingDraft(stored);
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [journal, localDraftKey]);

  useEffect(() => {
    if (journal || !draftReady || (!note.trim() && !image && omittedMediaCount === 0)) return;
    const timer = window.setTimeout(() => {
      setDraftStatus(
        saveLocalDraft(localDraftKey, {
          eventType,
          ...occurrence,
          note,
          visibility,
          hasPhoto: Boolean(image) || omittedMediaCount > 0,
          ...(journalSupportsServiceAttribution(eventType) ? { serviceAttribution } : {}),
        })
          ? "saved"
          : "error",
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [draftReady, eventType, image, journal, localDraftKey, note, occurrence, omittedMediaCount, serviceAttribution, visibility]);

  function restoreDraft() {
    const stored = pendingDraft;
    if (!stored) return;
    setEventType(stored.value.eventType as JournalEventType);
    setOccurrence({
      occurredOn: stored.value.occurredOn,
      occurredYear: stored.value.occurredYear,
      occurredMonth: stored.value.occurredMonth,
      occurredPrecision: stored.value.occurredPrecision as OccurrenceDraft["occurredPrecision"],
      occurredPeriodNote: stored.value.occurredPeriodNote,
    });
    setNote(stored.value.note);
    setVisibility(stored.value.visibility as JournalVisibility);
    setServiceAttribution(normalizeServiceAttribution(stored.value.serviceAttribution));
    setOmittedMediaCount(stored.value.hasPhoto ? 1 : 0);
    setPendingDraft(null);
    setDraftStatus("restored");
  }

  function startNewDraft() {
    clearLocalDraft(localDraftKey);
    setPendingDraft(null);
    setEventType("other");
    setOccurrence({ occurredOn: localDateInputValue(), occurredPrecision: "day" });
    setNote("");
    setVisibility("public");
    setServiceAttribution(unknownServiceAttribution());
    setOmittedMediaCount(0);
    setDraftStatus("idle");
  }

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPreparing(true);
    setError("");
    try {
      setImage(await preparePrivateAlphaImage(file, { maxDimension: 1400, maxOutputBytes: 460 * 1024 }));
      setOmittedMediaCount(0);
    } catch (error) {
      setError(imagePreparationMessageKey(error));
    } finally {
      setPreparing(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) {
      setError("momentNoteRequired");
      return;
    }
    if (saving || preparing) return;
    if (isRemoteAlpha && visibility === "public" && !alphaJournalSharingAvailable) {
      setPublicationError(
        locale === "ja"
          ? "共有機能の準備が完了していないため、いまは自分だけに保存してください。"
          : "Sharing setup is not complete. Save this record for yourself for now.",
      );
      return;
    }
    if (
      isRemoteAlpha &&
      !alphaJournalMediaSharingAvailable &&
      visibility === "public" &&
      (image || existingAttachment?.kind === "image")
    ) {
      setPublicationError(
        locale === "ja"
          ? "写真共有の準備が完了していないため、写真付き記録はいまは自分だけに保存してください。"
          : "Photo sharing is not ready. Save this record with a photo for yourself for now.",
      );
      return;
    }
    setSaveTakingLong(false);
    setError("");
    setPublicationError("");
    let slowSaveTimer: number | undefined;
    try {
      const mediaId = image ? `journal-media-${crypto.randomUUID()}` : existingAttachment?.id;
      const newAttachment: JournalMediaAttachment | undefined = image && mediaId ? {
        id: mediaId,
        kind: "image",
        source: "alpha_inline",
        assetPath: image.dataUrl,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        altText: `${vehicle.make} ${vehicleModel}`,
        privacyState:
          visibility === "public" &&
          alphaJournalMediaSharingAvailable
            ? "public_ready"
            : "private_only",
        createdAt: new Date().toISOString(),
        isDemo: false,
      } : undefined;
      const attachment = newAttachment
        ?? (existingAttachment
          ? {
              ...existingAttachment,
              privacyState:
                visibility === "public" &&
                alphaJournalMediaSharingAvailable
                  ? "public_ready" as const
                  : "private_only" as const,
            }
          : undefined);
      const draft: JournalDraft = {
        title: quickRecordTitle(note, locale),
        sourceLanguage: journal?.sourceLanguage ?? locale,
        eventType,
        ...occurrence,
        bodyOriginal: note.trim(),
        vehicleId: vehicle.id,
        linkedRecordId: journal?.linkedRecordId ?? "",
        displayFields: journal?.displayFields ?? [],
        media: attachment ? [attachment] : [],
        contentBlocks: [
          ...(attachment ? [{ id: `journal-block-${crypto.randomUUID()}`, type: "media" as const, mediaId: attachment.id }] : []),
          { id: `journal-block-${crypto.randomUUID()}`, type: "text", style: "paragraph", text: note.trim() },
        ],
        visibility,
        knowledgeExtractionConsent: journal?.knowledgeExtractionConsent ?? false,
        ...(journalSupportsServiceAttribution(eventType) ? { serviceAttribution } : {}),
      };
      const validation = validateJournalDraft(draft);
      if (validation.errors.occurredOn) {
        setError("momentDateMissing");
        return;
      }
      if (validation.errors.serviceAttribution) {
        setPublicationError(
          locale === "ja"
            ? "お店・工場を選択するか、追加してください。"
            : "Select or add a service provider.",
        );
        return;
      }
      if (!validation.valid) {
        setPublicationError(
          locale === "ja"
            ? "公開範囲と写真の確認状態を見直してください。"
            : "Check the audience and photo confirmation.",
        );
        return;
      }
      setSaving(true);
      slowSaveTimer = window.setTimeout(() => {
        setSaveTakingLong(true);
      }, 8000);
      const savedJournal = journal ? await updateJournal(journal.id, draft) : await addJournal(draft);
      window.clearTimeout(slowSaveTimer);
      clearLocalDraft(localDraftKey);
      if (journal) {
        router.push(`/journal/${journal.id}?updated=1`);
      } else {
        setSaving(false);
        setCompletion(savedJournal);
      }
    } catch {
      if (slowSaveTimer !== undefined) window.clearTimeout(slowSaveTimer);
      setSaveTakingLong(false);
      setError("momentSaveError");
      setSaving(false);
    }
  }

  const existingImageSource = !image && existingAttachment?.kind === "image"
    ? existingAttachment.assetPath
    : undefined;

  if (completion) {
    return <JournalCompletion journal={completion} vehicle={vehicle} locale={locale} mode="quick" />;
  }

  return (
    <div className="page-stack narrow-page quick-event-page">
      <header className="quick-composer-header">
        <p className="quick-composer-kicker">{locale === "ja" ? "愛車の記録" : "Vehicle record"}</p>
        <p className="quick-composer-vehicle">{vehicle.make} {vehicleModel}</p>
        <h1>{editing ? (locale === "ja" ? "記録を編集" : "Edit record") : (locale === "ja" ? "記録する" : "New record")}</h1>
      </header>
      <form className="quick-event-form" onSubmit={submit} aria-busy={saving || preparing}>
        {pendingDraft && (
          <div className="local-draft-status is-restored" role="status">
            <span>
              <strong>{locale === "ja" ? "書きかけの記録があります" : "You have an unfinished record"}</strong>
              <br />
              {locale === "ja" ? "前回入力していた内容を復元できます。" : "You can restore what you entered last time."}
            </span>
            <span className="local-draft-actions">
              <button type="button" onClick={restoreDraft}>{locale === "ja" ? "下書きを復元" : "Restore draft"}</button>
              <button type="button" onClick={() => { clearLocalDraft(localDraftKey); setPendingDraft(null); }}>{locale === "ja" ? "下書きを削除" : "Delete draft"}</button>
              <button type="button" onClick={startNewDraft}>{locale === "ja" ? "新しく書く" : "Start new"}</button>
            </span>
          </div>
        )}
        {draftStatus !== "idle" && (
          <div className={`local-draft-status is-${draftStatus}`} role={draftStatus === "error" ? "alert" : "status"}>
            <span>
              {draftStatus === "restored"
                ? locale === "ja" ? "下書きを復元しました。" : "Draft restored."
                : draftStatus === "saved"
                  ? locale === "ja" ? "下書きを端末内へ保存しました。" : "Draft saved on this device."
                  : locale === "ja" ? "下書きを保存できません。投稿フォームはそのまま使えます。" : "The draft could not be saved. You can still post."}
              {omittedMediaCount > 0 && (locale === "ja" ? " 未送信の写真は再度選択してください。" : " Re-select the unsent photo before posting.")}
            </span>
            <button type="button" onClick={startNewDraft}>{locale === "ja" ? "下書きを破棄" : "Discard draft"}</button>
          </div>
        )}
        <label className="field quick-note-field">
          <span className="sr-only">{locale === "ja" ? "記録本文" : "Record text"}</span>
          <textarea
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={locale === "ja" ? "愛車に何がありましたか？" : "What happened with your vehicle?"}
            autoFocus={!editing}
          />
        </label>
        {(image || existingImageSource) && (
          <section className="quick-event-photo">
            {image
              ? <Image src={image.dataUrl} alt="" fill sizes="(max-width: 760px) 100vw, 680px" unoptimized />
              : <Image src={existingImageSource!} alt={existingAttachment?.altText ?? ""} fill sizes="(max-width: 760px) 100vw, 680px" unoptimized />}
          </section>
        )}
        <div className="quick-composer-photo-row">
          <PhotoSourceActions
            locale={locale}
            preparing={preparing}
            disabled={preparing || saving}
            onChange={selectPhoto}
          />
          <p className="image-preparation-note">
            <ShieldCheck size={15} />
            {isRemoteAlpha
              ? locale === "ja"
                ? "写真は記録本文と同じ公開範囲で保存します。"
                : "The photo uses the same audience as the record."
              : translate(locale, "momentPrivateFirst")}
          </p>
        </div>
        {error && <p className="form-error-summary" role="alert">{translate(locale, error)}</p>}
        {publicationError && <p className="form-error-summary" role="alert">{publicationError}</p>}
        {saveTakingLong && (
          <div className="form-submit-feedback" role="status">
            <LoaderCircle className="spin" size={18} aria-hidden="true" />
            <span>
              {locale === "ja"
                ? "保存を続けています。写真や通信状況によって少し時間がかかることがあります。"
                : "Still saving. Photos or network conditions can make this take a little longer."}
            </span>
          </div>
        )}
        <div className="quick-composer-submit">
          <Link href={journal ? `/journal/${journal.id}` : "/garage"} className="text-link">{translate(locale, "later")}</Link>
          <button className="primary-action" type="submit" disabled={saving || preparing}>
            {saving ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
            {locale === "ja" ? (saving ? "記録中" : "記録する") : (saving ? "Saving" : "Save record")}
          </button>
        </div>
        <details className="quick-composer-details">
          <summary>{locale === "ja" ? "日付・公開範囲などを設定" : "Set date, audience, and more"}</summary>
          <div className="quick-composer-details-body">
            <fieldset className="event-type-picker"><legend>{translate(locale, "momentKindQuestion")}</legend>{eventTypes.map((item) => <button type="button" key={item.value} className={eventType === item.value ? "is-selected" : ""} aria-pressed={eventType === item.value} onClick={() => setEventType(item.value)}>{translate(locale, item.label)}</button>)}</fieldset>
            {journalSupportsServiceAttribution(eventType) && (
              <ServiceAttributionField
                value={serviceAttribution}
                onChange={setServiceAttribution}
                locale={locale}
                compact
              />
            )}
            <OccurrenceDateFields
              value={occurrence}
              locale={locale}
              error={error === "momentDateMissing" ? translate(locale, error) : undefined}
              onChange={(patch) => setOccurrence((current) => ({ ...current, ...patch }))}
            />
            <section className="quick-event-audience" aria-labelledby="quick-event-audience-heading">
          <div>
            <strong id="quick-event-audience-heading">
              {locale === "ja" ? "この記録を見る人" : "Who can see this record"}
            </strong>
            <small>
              {isRemoteAlpha
                ? locale === "ja"
                  ? "初期値は『α参加者に公開』です。自分だけの記録として保存することもできます。"
                  : "The default is shared with alpha participants. You can also save a record for yourself only."
                : locale === "ja"
                  ? "初期値は公開です。自分だけの記録として保存することもできます。"
                  : "The default is public. You can also save a record for yourself only."}
            </small>
          </div>
          <div className={`segmented-control ${isRemoteAlpha ? "has-two-options" : ""}`} role="group" aria-label={locale === "ja" ? "公開範囲" : "Audience"}>
            <button
              type="button"
              className={visibility === "private" ? "is-selected" : ""}
              aria-pressed={visibility === "private"}
              onClick={() => {
                setVisibility("private");
                setPublicationError("");
              }}
            >
              {locale === "ja" ? "自分だけ" : "Only me"}
            </button>
            {!isRemoteAlpha && (
              <button
                type="button"
                className={visibility === "followers" ? "is-selected" : ""}
                aria-pressed={visibility === "followers"}
                onClick={() => {
                  setVisibility("followers");
                  setPublicationError("");
                }}
              >
                {locale === "ja" ? "フォロワー" : "Followers"}
              </button>
            )}
            <button
              type="button"
              className={visibility === "public" ? "is-selected" : ""}
              aria-pressed={visibility === "public"}
              disabled={isRemoteAlpha && !alphaJournalSharingAvailable}
              onClick={() => {
                setVisibility("public");
                setPublicationError("");
              }}
            >
              {isRemoteAlpha
                ? locale === "ja" ? "α参加者に公開" : "Alpha participants"
                : locale === "ja" ? "公開" : "Public"}
            </button>
          </div>
          {isRemoteAlpha && visibility === "public" && (
            <p className="settings-help">
              {locale === "ja"
                ? "ログイン済みのP0・α参加者に、本文、写真、表示用車名を共有します。"
                : "The text, photo, and vehicle label are shared with signed-in P0 and alpha participants."}
            </p>
          )}
          {visibility === "public" && hasLegacyPrivatePhoto && !image && (
            <p className="settings-help">
              {locale === "ja"
                ? "以前の設定で非公開にした写真は、この編集だけで公開へ変更しません。"
                : "The photo kept private under the previous setting will not be published by this edit."}
            </p>
          )}
          {isRemoteAlpha &&
            alphaJournalMediaSharingAvailable &&
            visibility === "public" &&
            (image || existingAttachment?.kind === "image") && (
            <p className="settings-help">
              {locale === "ja"
                ? "写真は記録本文と同じ範囲で公開します。ナンバー、人物、住所が分かる背景を保存前に確認してください。"
                : "The photo uses the same audience as the record. Check plates, people, and address-revealing backgrounds before saving."}
            </p>
          )}
          {isRemoteAlpha &&
            !alphaJournalMediaSharingAvailable &&
            visibility === "public" &&
            (image || existingAttachment?.kind === "image") && (
            <p className="media-publication-gate">
              <ShieldAlert size={18} aria-hidden="true" />
              {locale === "ja"
                ? "写真共有の準備中です。本文と写真の公開範囲を一致させるため、今回は自分だけに保存してください。"
                : "Photo sharing is still being prepared. Save this for yourself so the text and photo audience remain consistent."}
            </p>
          )}
          {isRemoteAlpha && !alphaJournalSharingAvailable && (
            <p className="media-publication-gate">
              <ShieldAlert size={18} aria-hidden="true" />
              {locale === "ja"
                ? "共有機能の準備が完了するまでは、自分だけに保存できます。"
                : "Until sharing setup is complete, records can be saved only for you."}
            </p>
          )}
            </section>
          </div>
        </details>
        {!editing && (
          <Link href={`/journal/new?vehicle=${encodeURIComponent(vehicle.id)}&mode=detailed`} className="quick-composer-detailed-link">
            {locale === "ja" ? "詳しく記録する" : "Write a detailed record"}
          </Link>
        )}
      </form>
    </div>
  );
}
