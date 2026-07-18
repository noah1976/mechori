"use client";

import { useApp } from "@/lib/app-context";
import { preparePrivateAlphaImage, type PreparedImage } from "@/lib/image-preparation";
import type { JournalEventType, JournalDraft, JournalMediaAttachment } from "@mechori/core";
import { translate, type TranslationKey } from "@mechori/i18n";
import { Camera, ImagePlus, Save, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

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

export default function QuickVehicleEventPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data, locale, addJournal } = useApp();
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  const [eventType, setEventType] = useState<JournalEventType>("photo");
  const [note, setNote] = useState("");
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [error, setError] = useState<TranslationKey | "">("");
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const router = useRouter();

  if (!vehicle) return <div className="empty-state"><h1>{translate(locale, "vehicleNotFound")}</h1><Link href="/garage" className="primary-action">{translate(locale, "openGarage")}</Link></div>;
  const currentVehicle = vehicle;

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

  async function submit(event: FormEvent) {
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
      const mediaId = image ? `journal-media-${crypto.randomUUID()}` : undefined;
      const attachment: JournalMediaAttachment | undefined = image && mediaId ? {
        id: mediaId,
        kind: "image",
        source: "alpha_inline",
        assetPath: image.dataUrl,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        altText: `${currentVehicle.make} ${currentVehicle.model}`,
        privacyState: "private_only",
        createdAt: new Date().toISOString(),
        isDemo: false,
      } : undefined;
      const draft: JournalDraft = {
        title: translate(locale, selectedType.label),
        eventType,
        bodyOriginal: note.trim(),
        vehicleId: currentVehicle.id,
        linkedRecordId: "",
        displayFields: [],
        media: attachment ? [attachment] : [],
        contentBlocks: [
          ...(attachment ? [{ id: `journal-block-${crypto.randomUUID()}`, type: "media" as const, mediaId: attachment.id }] : []),
          { id: `journal-block-${crypto.randomUUID()}`, type: "text", style: "paragraph", text: note.trim() },
        ],
        visibility: "private",
        knowledgeExtractionConsent: false,
      };
      await addJournal(draft);
      router.push(`/garage?moment=added&vehicle=${encodeURIComponent(currentVehicle.id)}`);
    } catch {
      setError("momentSaveError");
      setSaving(false);
    }
  }

  return (
    <div className="page-stack narrow-page quick-event-page">
      <header className="page-header"><div><span className="eyebrow">ADD A MOMENT</span><h1>{translate(locale, "momentWithVehicle", { vehicle: currentVehicle.model })}</h1><p>{translate(locale, "momentTimelineIntro")}</p></div></header>
      <form className="quick-event-form" onSubmit={submit}>
        <section className="quick-event-photo">
          {image ? <Image src={image.dataUrl} alt="" fill sizes="(max-width: 760px) 100vw, 680px" unoptimized /> : <div><Camera size={38} /><strong>{translate(locale, "photoOptional")}</strong><span>{translate(locale, "addTodaysPhoto")}</span></div>}
        </section>
        <label className="photo-pick-action"><ImagePlus size={18} />{preparing ? translate(locale, "preparingPhoto") : image ? translate(locale, "chooseAnotherPhoto") : translate(locale, "addPhoto")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={preparing || saving} /></label>
        <p className="image-preparation-note"><ShieldCheck size={15} />{translate(locale, "momentPrivateFirst")}</p>
        <fieldset className="event-type-picker"><legend>{translate(locale, "momentKindQuestion")}</legend>{eventTypes.map((item) => <button type="button" key={item.value} className={eventType === item.value ? "is-selected" : ""} aria-pressed={eventType === item.value} onClick={() => setEventType(item.value)}>{translate(locale, item.label)}</button>)}</fieldset>
        <label className="field quick-note-field"><span>{translate(locale, "oneSentenceRequired")}</span><textarea autoFocus maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder={translate(locale, "momentPlaceholder")} /></label>
        {error && <p className="form-error-summary" role="alert">{translate(locale, error)}</p>}
        <div className="form-actions"><Link href="/garage" className="secondary-action">{translate(locale, "later")}</Link><button className="primary-action" type="submit" disabled={saving || preparing}><Save size={17} />{translate(locale, saving ? "addingMoment" : "saveMoment")}</button></div>
      </form>
    </div>
  );
}
