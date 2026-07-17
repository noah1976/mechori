"use client";

import { useApp } from "@/lib/app-context";
import { preparePrivateAlphaImage } from "@/lib/image-preparation";
import {
  createEmptyVehicleDraft,
  validateVehicleDraft,
  type VehicleDraft,
} from "@mechori/core";
import { Camera, CarFront, ImagePlus, Save, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

export default function NewVehiclePage() {
  const { addVehicle, locale, isRemoteAlpha } = useApp();
  const [draft, setDraft] = useState<VehicleDraft>(() => createEmptyVehicleDraft());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preparingImage, setPreparingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const validation = useMemo(() => validateVehicleDraft(draft), [draft]);
  const router = useRouter();
  const ja = locale === "ja";

  function setField<K extends keyof VehicleDraft>(key: K, value: VehicleDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function errorFor(key: keyof VehicleDraft) {
    if (!submitted || !validation.errors[key]) return undefined;
    return ja ? "入力内容を確認してください" : "Check this field";
  }

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPreparingImage(true);
    setImageError("");
    try {
      const prepared = await preparePrivateAlphaImage(file);
      setField("imagePath", prepared.dataUrl);
    } catch {
      setImageError(
        ja
          ? "JPEG・PNG・WebPの写真を選んでください（元画像は12MBまで）。"
          : "Choose a JPEG, PNG, or WebP image up to 12 MB.",
      );
    } finally {
      setPreparingImage(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSaveError(false);
    if (!draft.imagePath) {
      setImageError(ja ? "愛車のメイン写真を1枚選んでください。" : "Choose one main vehicle photo.");
    }
    if (!validation.valid || !draft.imagePath || saving || preparingImage) return;
    setSaving(true);
    try {
      const vehicle = await addVehicle(draft);
      router.push(`/garage/${encodeURIComponent(vehicle.id)}/welcome`);
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }

  return (
    <div className="page-stack narrow-page lovable-onboarding">
      <header className="page-header">
        <div>
          <span className="eyebrow">YOUR FIRST GARAGE</span>
          <h1>{ja ? "まず、一番好きな一枚から。" : "Start with a photo you love."}</h1>
          <p>
            {ja
              ? "3分ほどで愛車ページができます。詳しい型式や走行距離は、あとからで大丈夫です。"
              : "Your vehicle page takes about three minutes. Detailed specifications and mileage can wait."}
          </p>
        </div>
      </header>

      <form className="vehicle-form lovable-vehicle-form" onSubmit={submit} noValidate aria-busy={saving || preparingImage}>
        <section className="vehicle-photo-field">
          <div className="vehicle-photo-preview">
            {draft.imagePath ? (
              <Image src={draft.imagePath} alt="" fill sizes="(max-width: 760px) 100vw, 720px" unoptimized priority />
            ) : (
              <div><Camera size={44} aria-hidden="true" /><strong>{ja ? "愛車のメイン写真" : "Main vehicle photo"}</strong><span>{ja ? "ナンバーや周囲の写り込みも確認してください" : "Check the plate and surroundings before saving"}</span></div>
            )}
          </div>
          <label className="photo-pick-action">
            <ImagePlus size={18} aria-hidden="true" />
            {preparingImage ? (ja ? "写真を整えています…" : "Preparing photo…") : draft.imagePath ? (ja ? "写真を選び直す" : "Choose another") : (ja ? "写真を選ぶ" : "Choose photo")}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={preparingImage || saving} />
          </label>
          {imageError && <p className="media-error" role="alert">{imageError}</p>}
          <p className="image-preparation-note"><ShieldCheck size={15} aria-hidden="true" />{ja ? "元画像は保存せず、位置情報を落とした縮小画像を非公開で保存します。" : "The original is not retained. A smaller copy without location metadata is saved privately."}</p>
        </section>

        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">01</span><h2>{ja ? "どんなクルマですか？" : "Which vehicle is yours?"}</h2></div><CarFront size={22} aria-hidden="true" /></div>
          <div className="form-grid two-columns">
            <Field label={ja ? "メーカー・ブランド *" : "Make or brand *"} error={errorFor("make")}>
              <input value={draft.make} onChange={(event) => setField("make", event.target.value)} placeholder={ja ? "例：FIAT / MG / Bertone" : "e.g. FIAT / MG / Bertone"} />
            </Field>
            <Field label={ja ? "車名 *" : "Model *"} error={errorFor("model")}>
              <input value={draft.model} onChange={(event) => setField("model", event.target.value)} placeholder={ja ? "例：Barchetta / MGB / X1/9" : "e.g. Barchetta / MGB / X1/9"} />
            </Field>
          </div>
          <p className="catalog-free-note">{ja ? "候補にない希少車や並行輸入車も、その名前のまま登録できます。" : "Rare, imported, and unlisted vehicles can be registered exactly as you call them."}</p>
        </section>

        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{ja ? "分かる範囲の年月" : "Approximate dates"}</h2></div></div>
          <div className="form-grid three-columns">
            <Field label={ja ? "おおよその年式" : "Approximate model year"} error={errorFor("year")}>
              <input type="number" inputMode="numeric" min="1886" max={new Date().getFullYear() + 2} value={draft.year} onChange={(event) => setField("year", event.target.value)} placeholder={ja ? "例：1997" : "e.g. 1997"} />
            </Field>
            <Field label={ja ? "所有開始年" : "Ownership start year"} error={errorFor("ownershipStartedYear")}>
              <input type="number" inputMode="numeric" min="1886" max={new Date().getFullYear()} value={draft.ownershipStartedYear} onChange={(event) => setField("ownershipStartedYear", event.target.value)} placeholder={ja ? "例：2018" : "e.g. 2018"} />
            </Field>
            <Field label={ja ? "月（任意）" : "Month (optional)"} error={errorFor("ownershipStartedMonth")}>
              <input type="number" inputMode="numeric" min="1" max="12" value={draft.ownershipStartedMonth} onChange={(event) => setField("ownershipStartedMonth", event.target.value)} placeholder="1–12" />
            </Field>
          </div>
          <Field label={ja ? "このクルマへのひとこと（任意）" : "A short note about this vehicle (optional)"}>
            <textarea maxLength={160} value={draft.ownerComment} onChange={(event) => setField("ownerComment", event.target.value)} placeholder={ja ? "好きなところや、これから一緒にしたいこと" : "What you love, or where you hope to go together"} />
          </Field>
        </section>

        {saveError && <p className="form-error-summary" role="alert">{isRemoteAlpha ? (ja ? "MECHORIへ保存できませんでした。通信状態を確認してください。" : "Could not save to MECHORI. Check your connection.") : (ja ? "端末へ保存できませんでした。" : "Could not save to this device.")}</p>}
        <div className="form-actions">
          <button type="button" className="secondary-action" onClick={() => router.back()}>{ja ? "戻る" : "Back"}</button>
          <button type="submit" className="primary-action" disabled={saving || preparingImage}><Save size={18} />{saving ? (ja ? "Garageに追加中…" : "Adding to Garage…") : (ja ? "愛車ページをつくる" : "Create vehicle page")}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className={`field ${error ? "has-error" : ""}`}><span>{label}</span>{children}{error && <small>{error}</small>}</label>;
}
