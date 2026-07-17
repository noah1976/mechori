"use client";

import { useApp } from "@/lib/app-context";
import { preparePrivateAlphaImage, type PreparedImage } from "@/lib/image-preparation";
import type { JournalEventType, JournalDraft, JournalMediaAttachment } from "@mechori/core";
import { Camera, ImagePlus, Save, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

const eventTypes: Array<{ value: JournalEventType; ja: string; en: string }> = [
  { value: "delivery", ja: "納車・購入", en: "Delivery / purchase" },
  { value: "photo", ja: "今日の一枚", en: "Photo of the day" },
  { value: "drive", ja: "ドライブ", en: "Drive" },
  { value: "inspection", ja: "車検・点検", en: "Inspection" },
  { value: "tire", ja: "タイヤ交換", en: "Tires" },
  { value: "oil", ja: "オイル交換", en: "Oil change" },
  { value: "breakdown", ja: "故障", en: "Breakdown" },
  { value: "repair", ja: "修理", en: "Repair" },
  { value: "part", ja: "部品交換", en: "Parts" },
  { value: "custom", ja: "カスタム", en: "Custom" },
  { value: "event", ja: "イベント参加", en: "Event" },
  { value: "memory", ja: "思い出", en: "Memory" },
  { value: "other", ja: "その他", en: "Other" },
];

export default function QuickVehicleEventPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data, locale, addJournal } = useApp();
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  const [eventType, setEventType] = useState<JournalEventType>("photo");
  const [note, setNote] = useState("");
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const router = useRouter();
  const ja = locale === "ja";

  if (!vehicle) return <div className="empty-state"><h1>{ja ? "愛車が見つかりません" : "Vehicle not found"}</h1><Link href="/garage" className="primary-action">{ja ? "Garageへ" : "Open Garage"}</Link></div>;
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
      setError(ja ? "JPEG・PNG・WebPの写真を選んでください（元画像は12MBまで）。" : "Choose a JPEG, PNG, or WebP image up to 12 MB.");
    } finally {
      setPreparing(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!note.trim()) {
      setError(ja ? "この出来事を、一言で残してください。" : "Add one sentence about this moment.");
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
        title: ja ? selectedType.ja : selectedType.en,
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
      setError(ja ? "保存できませんでした。通信状態を確認して、もう一度お試しください。" : "Could not save this moment. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <div className="page-stack narrow-page quick-event-page">
      <header className="page-header"><div><span className="eyebrow">ADD A MOMENT</span><h1>{ja ? `${currentVehicle.model}との出来事` : `A moment with ${currentVehicle.model}`}</h1><p>{ja ? "写真と一言だけで、このクルマの時間軸が育ちます。" : "A photo and one sentence add to this vehicle's timeline."}</p></div></header>
      <form className="quick-event-form" onSubmit={submit}>
        <section className="quick-event-photo">
          {image ? <Image src={image.dataUrl} alt="" fill sizes="(max-width: 760px) 100vw, 680px" unoptimized /> : <div><Camera size={38} /><strong>{ja ? "写真はなくても保存できます" : "A photo is optional"}</strong><span>{ja ? "今日の一枚なら、ここから追加" : "Add today's photo here"}</span></div>}
        </section>
        <label className="photo-pick-action"><ImagePlus size={18} />{preparing ? (ja ? "写真を整えています…" : "Preparing photo…") : image ? (ja ? "写真を選び直す" : "Choose another") : (ja ? "写真を追加" : "Add photo")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={preparing || saving} /></label>
        <p className="image-preparation-note"><ShieldCheck size={15} />{ja ? "この記録はまず非公開で保存されます。" : "This moment is saved privately first."}</p>
        <fieldset className="event-type-picker"><legend>{ja ? "どんな出来事ですか？" : "What kind of moment?"}</legend>{eventTypes.map((item) => <button type="button" key={item.value} className={eventType === item.value ? "is-selected" : ""} aria-pressed={eventType === item.value} onClick={() => setEventType(item.value)}>{ja ? item.ja : item.en}</button>)}</fieldset>
        <label className="field quick-note-field"><span>{ja ? "一言で残す *" : "One sentence *"}</span><textarea autoFocus maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder={ja ? "例：朱鞠内湖まで、今年最初の長距離ドライブ。" : "e.g. Our first long drive of the year."} /></label>
        {error && <p className="form-error-summary" role="alert">{error}</p>}
        <div className="form-actions"><Link href="/garage" className="secondary-action">{ja ? "あとで" : "Later"}</Link><button className="primary-action" type="submit" disabled={saving || preparing}><Save size={17} />{saving ? (ja ? "記録を追加中…" : "Adding…") : (ja ? "この出来事を残す" : "Save this moment")}</button></div>
      </form>
    </div>
  );
}
