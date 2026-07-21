"use client";

import { useApp } from "@/lib/app-context";
import { localDateInputValue } from "@/lib/date-input";
import { preparePrivateAlphaImage, type PreparedImage } from "@/lib/image-preparation";
import {
  journalToDraft,
  validateJournalDraft,
  type GarageJournalPost,
  type JournalEventType,
  type JournalDraft,
  type JournalMediaAttachment,
  type Vehicle,
} from "@mechori/core";
import { translate, type TranslationKey } from "@mechori/i18n";
import { Camera, ImagePlus, Save, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { OccurrenceDateFields } from "@/components/occurrence-date-fields";

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
  const { locale, addJournal, updateJournal } = useApp();
  const editing = Boolean(journal);
  const [eventType, setEventType] = useState<JournalEventType>(journal?.eventType ?? "photo");
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
  const [preparing, setPreparing] = useState(false);
  const router = useRouter();
  const existingAttachment = journal?.media[0];

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPreparing(true);
    setError("");
    try {
      setImage(await preparePrivateAlphaImage(file, { maxDimension: 1400, maxOutputBytes: 460 * 1024 }));
    } catch {
      setError("vehicleImageInvalid");
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
    setSaving(true);
    setError("");
    try {
      const selectedType = eventTypes.find((item) => item.value === eventType)!;
      const mediaId = image ? `journal-media-${crypto.randomUUID()}` : existingAttachment?.id;
      const newAttachment: JournalMediaAttachment | undefined = image && mediaId ? {
        id: mediaId,
        kind: "image",
        source: "alpha_inline",
        assetPath: image.dataUrl,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        altText: `${vehicle.make} ${vehicle.model}`,
        privacyState: "private_only",
        createdAt: new Date().toISOString(),
        isDemo: false,
      } : undefined;
      const attachment = newAttachment ?? existingAttachment;
      const draft: JournalDraft = {
        title: translate(locale, selectedType.label),
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
        visibility: journal?.visibility ?? "private",
        knowledgeExtractionConsent: journal?.knowledgeExtractionConsent ?? false,
      };
      if (validateJournalDraft(draft).errors.occurredOn) {
        setError("momentDateMissing");
        setSaving(false);
        return;
      }
      if (journal) await updateJournal(journal.id, draft);
      else await addJournal(draft);
      router.push(journal ? `/journal/${journal.id}?updated=1` : `/garage?moment=added&vehicle=${encodeURIComponent(vehicle.id)}`);
    } catch {
      setError("momentSaveError");
      setSaving(false);
    }
  }

  const existingImageSource = !image && existingAttachment?.kind === "image"
    ? existingAttachment.assetPath
    : undefined;

  return (
    <div className="page-stack narrow-page quick-event-page">
      <header className="page-header"><div><span className="eyebrow">{editing ? "EDIT A MOMENT" : "ADD A MOMENT"}</span><h1>{editing ? (locale === "ja" ? "短い記録を編集" : "Edit quick record") : translate(locale, "momentWithVehicle", { vehicle: vehicle.model })}</h1><p>{locale === "ja" ? "写真と一言で残す、短い愛車記録です。日付や内容はあとから直せます。" : "A quick vehicle record with a photo and a short note. You can edit it later."}</p></div></header>
      <form className="quick-event-form" onSubmit={submit}>
        <section className="quick-event-photo">
          {image ? <Image src={image.dataUrl} alt="" fill sizes="(max-width: 760px) 100vw, 680px" unoptimized /> : existingImageSource ? <Image src={existingImageSource} alt={existingAttachment?.altText ?? ""} fill sizes="(max-width: 760px) 100vw, 680px" unoptimized /> : <div><Camera size={38} /><strong>{translate(locale, "photoOptional")}</strong><span>{translate(locale, "addTodaysPhoto")}</span></div>}
        </section>
        <label className="photo-pick-action"><ImagePlus size={18} />{preparing ? translate(locale, "preparingPhoto") : image || existingAttachment ? translate(locale, "chooseAnotherPhoto") : translate(locale, "addPhoto")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={preparing || saving} /></label>
        <p className="image-preparation-note"><ShieldCheck size={15} />{translate(locale, "momentPrivateFirst")}</p>
        <fieldset className="event-type-picker"><legend>{translate(locale, "momentKindQuestion")}</legend>{eventTypes.map((item) => <button type="button" key={item.value} className={eventType === item.value ? "is-selected" : ""} aria-pressed={eventType === item.value} onClick={() => setEventType(item.value)}>{translate(locale, item.label)}</button>)}</fieldset>
        <OccurrenceDateFields
          value={occurrence}
          locale={locale}
          error={error === "momentDateMissing" ? translate(locale, error) : undefined}
          onChange={(patch) => setOccurrence((current) => ({ ...current, ...patch }))}
        />
        <label className="field quick-note-field"><span>{translate(locale, "oneSentenceRequired")}</span><textarea autoFocus maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder={translate(locale, "momentPlaceholder")} /></label>
        {error && <p className="form-error-summary" role="alert">{translate(locale, error)}</p>}
        <div className="form-actions"><Link href={journal ? `/journal/${journal.id}` : "/garage"} className="secondary-action">{translate(locale, "later")}</Link><button className="primary-action" type="submit" disabled={saving || preparing}><Save size={17} />{translate(locale, saving ? "addingMoment" : "saveMoment")}</button></div>
      </form>
    </div>
  );
}
