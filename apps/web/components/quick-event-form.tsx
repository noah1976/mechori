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
  journalOccurrenceLabel,
  journalToDraft,
  normalizeServiceAttribution,
  unknownServiceAttribution,
  validateJournalDraft,
  type GarageJournalPost,
  type JournalCaptureIntent,
  type JournalEventType,
  type JournalDraft,
  type JournalMediaAttachment,
  type JournalVisibility,
  type MaintenanceServiceAttributionV1,
  type Vehicle,
} from "@mechori/core";
import { translate, type TranslationKey } from "@mechori/i18n";
import { ArrowRight, ChevronDown, CircleAlert, Ellipsis, LoaderCircle, MapPinned, Save, ShieldCheck, Wrench } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { OccurrenceDateFields } from "@/components/occurrence-date-fields";
import { PhotoSourceActions } from "@/components/photo-source-actions";
import { QuickRecordCompletionSheet } from "@/components/quick-record-completion-sheet";
import {
  clearLocalDraft,
  loadQuickEventLocalDraft,
  quickEventLocalDraftKey,
  saveLocalDraft,
} from "@/lib/local-draft-store";
import { ServiceAttributionField } from "@/components/service-attribution-field";
import {
  captureIntentForJournal,
  captureIntentLabel,
  captureIntentPlaceholder,
  defaultEventTypeForCaptureIntent,
  isJournalCaptureIntent,
  quickRecordTitle,
} from "@/lib/quick-record";
import { journalSaveErrorMessage } from "@/lib/journal-save-error";

const eventTypes: Array<{ value: JournalEventType; label: TranslationKey }> = [
  { value: "delivery", label: "eventDelivery" },
  { value: "photo", label: "eventPhoto" },
  { value: "drive", label: "eventDrive" },
  { value: "issue", label: "eventIssue" },
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

const captureIntents = [
  { value: "issue" as const, Icon: CircleAlert },
  { value: "service" as const, Icon: Wrench },
  { value: "drive" as const, Icon: MapPinned },
  { value: "other" as const, Icon: Ellipsis },
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
  } = useApp();
  const editing = Boolean(journal);
  const [captureIntent, setCaptureIntent] = useState<JournalCaptureIntent | null>(() =>
    journal ? captureIntentForJournal(journal.captureIntent, journal.eventType) : null,
  );
  const [eventType, setEventType] = useState<JournalEventType | undefined>(journal?.eventType);
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
  // New Quick Records are shared with alpha participants; a local draft is the private pre-save state.
  const visibility: JournalVisibility = journal?.visibility ?? "public";
  const existingAttachment = journal?.media[0];
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
      if (stored && (stored.value.note.trim() || stored.value.hasPhoto)) {
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
          captureIntent: captureIntent ?? undefined,
          eventType,
          ...occurrence,
          note,
          visibility: "public",
          hasPhoto: Boolean(image) || omittedMediaCount > 0,
          ...(journalSupportsServiceAttribution(eventType) ? { serviceAttribution } : {}),
        })
          ? "saved"
          : "error",
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [captureIntent, draftReady, eventType, image, journal, localDraftKey, note, occurrence, omittedMediaCount, serviceAttribution]);

  function restoreDraft() {
    const stored = pendingDraft;
    if (!stored) return;
    const restoredEventType = stored.value.eventType as JournalEventType | undefined;
    setEventType(restoredEventType);
    setCaptureIntent(
      isJournalCaptureIntent(stored.value.captureIntent)
        ? stored.value.captureIntent
        : captureIntentForJournal(undefined, restoredEventType),
    );
    setOccurrence({
      occurredOn: stored.value.occurredOn,
      occurredYear: stored.value.occurredYear,
      occurredMonth: stored.value.occurredMonth,
      occurredPrecision: stored.value.occurredPrecision as OccurrenceDraft["occurredPrecision"],
      occurredPeriodNote: stored.value.occurredPeriodNote,
    });
    setNote(stored.value.note);
    setServiceAttribution(normalizeServiceAttribution(stored.value.serviceAttribution));
    setOmittedMediaCount(stored.value.hasPhoto ? 1 : 0);
    setPendingDraft(null);
    setDraftStatus("restored");
  }

  function startNewDraft() {
    clearLocalDraft(localDraftKey);
    setPendingDraft(null);
    setCaptureIntent(null);
    setEventType(undefined);
    setOccurrence({ occurredOn: localDateInputValue(), occurredPrecision: "day" });
    setNote("");
    setImage(null);
    setServiceAttribution(unknownServiceAttribution());
    setOmittedMediaCount(0);
    setDraftStatus("idle");
  }

  function chooseCaptureIntent(intent: JournalCaptureIntent) {
    if (pendingDraft) {
      clearLocalDraft(localDraftKey);
      setPendingDraft(null);
    }
    setCaptureIntent(intent);
    setEventType(defaultEventTypeForCaptureIntent(intent));
    setServiceAttribution(unknownServiceAttribution());
    setError("");
    setPublicationError("");
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
          visibility === "public" ? "public_ready" : "private_only",
        createdAt: new Date().toISOString(),
        isDemo: false,
      } : undefined;
      const attachment = newAttachment
        ?? (existingAttachment
          ? {
              ...existingAttachment,
              privacyState:
                visibility === "public" ? "public_ready" as const : "private_only" as const,
            }
          : undefined);
      const draft: JournalDraft = {
        title: quickRecordTitle(note, locale),
        sourceLanguage: journal?.sourceLanguage ?? locale,
        captureIntent: captureIntent ?? undefined,
        eventType,
        issueStatus: eventType === "issue" ? journal?.issueStatus ?? "open" : undefined,
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
            ? "記録内容を確認してください。"
            : "Check the record details.",
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
    } catch (caught) {
      if (slowSaveTimer !== undefined) window.clearTimeout(slowSaveTimer);
      setSaveTakingLong(false);
      setPublicationError(journalSaveErrorMessage(caught, locale === "ja"));
      setSaving(false);
    }
  }

  const existingImageSource = !image && existingAttachment?.kind === "image"
    ? existingAttachment.assetPath
    : undefined;
  const intentForDisplay = captureIntent
    ?? captureIntentForJournal(journal?.captureIntent, eventType);
  const selectedEventType = eventTypes.find((item) => item.value === eventType);
  const detailSummary = journal
    ? [
        selectedEventType
          ? translate(locale, selectedEventType.label)
          : captureIntentLabel(intentForDisplay, locale),
        journalOccurrenceLabel(journal, locale),
        eventType === "issue" ? (locale === "ja" ? "未解決" : "Unresolved") : undefined,
      ].filter(Boolean).join(" ・ ")
    : "";

  if (completion) {
    return (
      <QuickRecordCompletionSheet
        journal={completion}
        vehicle={vehicle}
        locale={locale}
        onClose={() => router.push(`/journal/${completion.id}`)}
        onSaveEnrichment={async (draft) => {
          const updated = await updateJournal(completion.id, draft);
          setCompletion(updated);
          return updated;
        }}
      />
    );
  }


  if (!editing && !captureIntent) {
    return (
      <div className="page-stack narrow-page quick-event-page">
        <header className="quick-composer-header">
          <p className="quick-composer-kicker">{locale === "ja" ? "愛車の記録" : "Vehicle record"}</p>
          <p className="quick-composer-vehicle">{vehicle.make} {vehicleModel}</p>
          <h1>{locale === "ja" ? "記録する" : "New record"}</h1>
        </header>
        {!draftReady ? (
          <p className="quick-capture-intent-loading" role="status">{locale === "ja" ? "下書きを確認しています…" : "Checking for a draft…"}</p>
        ) : (
          <section className="quick-capture-intent" aria-labelledby="quick-capture-intent-title">
            {pendingDraft && (
              <div className="local-draft-status is-restored" role="status">
                <span>
                  <strong>{locale === "ja" ? "書きかけの記録があります" : "You have an unfinished record"}</strong>
                  <br />
                  {locale === "ja" ? "前回入力していた内容を復元できます。" : "You can restore what you entered last time."}
                </span>
                <span className="local-draft-actions">
                  <button type="button" className="primary-action draft-restore-action" onClick={restoreDraft}>{locale === "ja" ? "下書きを復元" : "Restore draft"}</button>
                  <button type="button" className="secondary-action draft-new-action" onClick={startNewDraft}>{locale === "ja" ? "新しく書く" : "Start new"}</button>
                  <button type="button" className="draft-delete-action" onClick={() => { clearLocalDraft(localDraftKey); setPendingDraft(null); }}>{locale === "ja" ? "下書きを削除" : "Delete draft"}</button>
                </span>
              </div>
            )}
            {!pendingDraft && (
              <>
                <div className="quick-capture-intent-heading">
                  <h2 id="quick-capture-intent-title">{locale === "ja" ? "このクルマに、何を残す？" : "What do you want to keep for this vehicle?"}</h2>
                  <p>{locale === "ja" ? "ひとつ選ぶと、すぐに書けます。" : "Choose one and start writing right away."}</p>
                </div>
                <div className="quick-capture-intent-options">
                  {captureIntents.map(({ value, Icon }) => (
                    <button type="button" key={value} onClick={() => chooseCaptureIntent(value)}>
                      <Icon size={19} aria-hidden="true" />
                      <span>{captureIntentLabel(value, locale)}</span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    );
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
              <button type="button" className="primary-action draft-restore-action" onClick={restoreDraft}>{locale === "ja" ? "下書きを復元" : "Restore draft"}</button>
              <button type="button" className="secondary-action draft-new-action" onClick={startNewDraft}>{locale === "ja" ? "新しく書く" : "Start new"}</button>
              <button type="button" className="draft-delete-action" onClick={() => { clearLocalDraft(localDraftKey); setPendingDraft(null); }}>{locale === "ja" ? "下書きを削除" : "Delete draft"}</button>
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
            <button type="button" className="draft-discard-action" onClick={startNewDraft}>{locale === "ja" ? "下書きを破棄" : "Discard draft"}</button>
          </div>
        )}
        {!editing && captureIntent && (
          <div className="quick-capture-intent-current">
            <span>{captureIntentLabel(captureIntent, locale)}</span>
            <button type="button" className="text-action" onClick={() => setCaptureIntent(null)}>{locale === "ja" ? "変更" : "Change"}</button>
          </div>
        )}
        <label className="field quick-note-field">
          <span className="sr-only">{locale === "ja" ? "記録本文" : "Record text"}</span>
          <textarea
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={captureIntentPlaceholder(intentForDisplay, locale)}
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
            variant="single"
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
          <button className="primary-action" type="submit" disabled={saving || preparing}>
            {saving ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
            {locale === "ja" ? (saving ? "記録中" : "記録する") : (saving ? "Saving" : "Save record")}
          </button>
        </div>
        {editing && <details className="quick-composer-details">
          <summary>
            <span>
              <strong>{locale === "ja" ? "記録の詳細" : "Record details"}</strong>
              <small>{detailSummary || (locale === "ja" ? "種類や起きた時期などを追加できます" : "Add the type, timing, and other details")}</small>
            </span>
            <b>{detailSummary ? (locale === "ja" ? "変更する" : "Change") : (locale === "ja" ? "追加する" : "Add")}</b>
            <ChevronDown size={17} aria-hidden="true" />
          </summary>
          <div className="quick-composer-details-body">
            <fieldset className="event-type-picker"><legend>{translate(locale, "momentKindQuestion")}</legend>{eventTypes.map((item) => <button type="button" key={item.value} className={eventType === item.value ? "is-selected" : ""} aria-pressed={eventType === item.value} onClick={() => { setEventType(item.value); setCaptureIntent(captureIntentForJournal(undefined, item.value)); }}>{translate(locale, item.label)}</button>)}</fieldset>
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
          </div>
        </details>}
      </form>
    </div>
  );
}
