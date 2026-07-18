"use client";

import { useApp } from "@/lib/app-context";
import { preparePrivateAlphaImage } from "@/lib/image-preparation";
import {
  createEmptyVehicleDraft,
  validateVehicleDraft,
  type VehicleDraft,
} from "@mechori/core";
import { Bike, Camera, CarFront, History, ImagePlus, Save, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

export default function NewVehiclePage() {
  return <Suspense fallback={null}><NewVehicleContent /></Suspense>;
}

function NewVehicleContent() {
  const { addVehicle, locale, isRemoteAlpha } = useApp();
  const params = useSearchParams();
  const isPrevious = params.get("ownership") === "previously_owned";
  const [draft, setDraft] = useState<VehicleDraft>(() => ({
    ...createEmptyVehicleDraft(),
    ownershipType: isPrevious ? "previously_owned" : "owned",
    odometerContext: isPrevious ? "at_ownership_end" : "current",
  }));
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
    if (!draft.imagePath && !isPrevious) {
      setImageError(ja ? "愛車のメイン写真を1枚選んでください。" : "Choose one main vehicle photo.");
    }
    if (!validation.valid || (!draft.imagePath && !isPrevious) || saving || preparingImage) return;
    setSaving(true);
    try {
      const vehicle = await addVehicle(draft);
      router.push(isPrevious
        ? `/garage?vehicle=${encodeURIComponent(vehicle.id)}`
        : `/garage/${encodeURIComponent(vehicle.id)}/welcome`);
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }

  return (
    <div className="page-stack narrow-page lovable-onboarding">
      <header className="page-header">
        <div>
          <span className="eyebrow">{isPrevious ? "YOUR GARAGE HISTORY" : "YOUR FIRST GARAGE"}</span>
          <h1>{isPrevious
            ? (ja ? "これまでの愛車を記録する。" : "Add a vehicle from your past.")
            : (ja ? "まず、一番好きな一枚から。" : "Start with a photo you love.")}</h1>
          <p>
            {isPrevious
              ? (ja ? "写真や正確な年式が残っていなくても、覚えている範囲から始められます。" : "A make and model are enough. Photos and exact dates are optional.")
              : ja
              ? "3分ほどで愛車ページができます。詳しい型式や走行距離は、あとからで大丈夫です。"
              : "Your vehicle page takes about three minutes. Detailed specifications and mileage can wait."}
          </p>
        </div>
      </header>

      <form className="vehicle-form lovable-vehicle-form" onSubmit={submit} noValidate aria-busy={saving || preparingImage}>
        <section className={`vehicle-photo-field ${isPrevious && !draft.imagePath ? "is-optional-past-photo" : ""}`}>
          <div className="vehicle-photo-preview">
            {draft.imagePath ? (
              <Image src={draft.imagePath} alt="" fill sizes="(max-width: 760px) 100vw, 720px" unoptimized priority />
            ) : (
              <div><Camera size={44} aria-hidden="true" /><strong>{isPrevious ? (ja ? "写真があれば追加できます" : "Add a photo if you have one") : (ja ? "愛車のメイン写真" : "Main vehicle photo")}</strong><span>{isPrevious ? (ja ? "写真なしでも登録できます" : "A photo is not required") : (ja ? "ナンバーや周囲の写り込みも確認してください" : "Check the plate and surroundings before saving")}</span></div>
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
          <div className="section-heading compact"><div><span className="eyebrow">01</span><h2>{ja ? "どんな乗りものですか？" : "What kind of vehicle is it?"}</h2></div>{draft.vehicleCategory === "motorcycle" || draft.vehicleCategory === "moped" ? <Bike size={22} aria-hidden="true" /> : <CarFront size={22} aria-hidden="true" />}</div>
          <Field label={ja ? "車両種別 *" : "Vehicle type *"} error={errorFor("vehicleCategory")}>
            <select value={draft.vehicleCategory} onChange={(event) => setField("vehicleCategory", event.target.value as VehicleDraft["vehicleCategory"])}>
              <option value="car">{ja ? "自動車" : "Car"}</option>
              <option value="motorcycle">{ja ? "オートバイ" : "Motorcycle"}</option>
              <option value="moped">{ja ? "原付" : "Moped"}</option>
              <option value="other">{ja ? "その他" : "Other"}</option>
            </select>
          </Field>
          <div className="form-grid two-columns">
            <Field label={ja ? "メーカー・ブランド *" : "Make or brand *"} error={errorFor("make")}>
              <input value={draft.make} onChange={(event) => setField("make", event.target.value)} placeholder={ja ? "例：FIAT / MG / Bertone" : "e.g. FIAT / MG / Bertone"} />
            </Field>
            <Field label={ja ? "車名 *" : "Model *"} error={errorFor("model")}>
              <input value={draft.model} onChange={(event) => setField("model", event.target.value)} placeholder={ja ? "例：Barchetta / MGB / X1/9" : "e.g. Barchetta / MGB / X1/9"} />
            </Field>
          </div>
          <p className="catalog-free-note">{ja ? "候補にない希少車・旧車・並行輸入車・バイクも、その名前のまま登録できます。" : "Rare, classic, imported, and unlisted cars or motorcycles can be registered as you call them."}</p>
          {isPrevious && <div className="form-grid three-columns optional-vehicle-details">
            <Field label={ja ? "グレード（任意）" : "Grade (optional)"}><input value={draft.grade} onChange={(event) => setField("grade", event.target.value)} /></Field>
            <Field label={ja ? "型式（任意）" : "Model code (optional)"}><input value={draft.modelCode} onChange={(event) => setField("modelCode", event.target.value)} /></Field>
            <Field label={ja ? "呼び名（任意）" : "Nickname (optional)"}><input value={draft.nickname} onChange={(event) => setField("nickname", event.target.value)} /></Field>
          </div>}
        </section>

        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{ja ? "分かる範囲の年月" : "Approximate dates"}</h2></div>{isPrevious && <History size={22} aria-hidden="true" />}</div>
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
          {isPrevious && <>
            <div className="form-grid two-columns">
              <Field label={ja ? "所有終了年（任意）" : "Ownership end year (optional)"} error={errorFor("ownershipEndedYear")}>
                <input type="number" inputMode="numeric" min="1886" max={new Date().getFullYear()} value={draft.ownershipEndedYear} onChange={(event) => setField("ownershipEndedYear", event.target.value)} placeholder={ja ? "例：2007" : "e.g. 2007"} />
              </Field>
              <Field label={ja ? "終了月（任意）" : "End month (optional)"} error={errorFor("ownershipEndedMonth")}>
                <input type="number" inputMode="numeric" min="1" max="12" value={draft.ownershipEndedMonth} onChange={(event) => setField("ownershipEndedMonth", event.target.value)} placeholder="1–12" />
              </Field>
            </div>
            <Field label={ja ? "時期の補足（任意）" : "Period note (optional)"}>
              <input value={draft.ownershipPeriodNote} onChange={(event) => setField("ownershipPeriodNote", event.target.value)} placeholder={ja ? "例：1990年代後半に約3年間" : "e.g. Around three years in the late 1990s"} />
            </Field>
            <div className="form-grid two-columns">
              <Field label={ja ? "手放した時点の走行距離（任意）" : "Odometer when ownership ended (optional)"} error={errorFor("odometer")}>
                <input type="number" min="0" inputMode="numeric" value={draft.odometer} onChange={(event) => setField("odometer", event.target.value)} />
              </Field>
              <Field label={ja ? "単位" : "Unit"}>
                <select value={draft.odometerUnit} onChange={(event) => setField("odometerUnit", event.target.value as VehicleDraft["odometerUnit"])}><option value="km">km</option><option value="mi">mi</option><option value="unknown">{ja ? "不明" : "Unknown"}</option></select>
              </Field>
            </div>
            <div className="form-grid two-columns">
              <Field label={ja ? "主な用途（任意）" : "Main use (optional)"}><input value={draft.primaryUse} onChange={(event) => setField("primaryUse", event.target.value)} placeholder={ja ? "例：通勤、ツーリング" : "e.g. commuting, touring"} /></Field>
              <Field label={ja ? "手放した理由（任意）" : "Reason ownership ended (optional)"}><input value={draft.dispositionReason} onChange={(event) => setField("dispositionReason", event.target.value)} /></Field>
            </div>
          </>}
          <Field label={isPrevious ? (ja ? "思い出やコメント（任意）" : "Memories or notes (optional)") : (ja ? "このクルマへのひとこと（任意）" : "A short note about this vehicle (optional)")}>
            <textarea maxLength={500} value={draft.ownerComment} onChange={(event) => setField("ownerComment", event.target.value)} placeholder={isPrevious ? (ja ? "長く乗って分かったことや、覚えている出来事" : "What you learned or remember from owning it") : (ja ? "好きなところや、これから一緒にしたいこと" : "What you love, or where you hope to go together")} />
          </Field>
        </section>

        {saveError && <p className="form-error-summary" role="alert">{isRemoteAlpha ? (ja ? "MECHORIへ保存できませんでした。通信状態を確認してください。" : "Could not save to MECHORI. Check your connection.") : (ja ? "端末へ保存できませんでした。" : "Could not save to this device.")}</p>}
        <div className="form-actions">
          <button type="button" className="secondary-action" onClick={() => router.back()}>{ja ? "戻る" : "Back"}</button>
          <button type="submit" className="primary-action" disabled={saving || preparingImage}><Save size={18} />{saving ? (ja ? "Garageに追加中…" : "Adding to Garage…") : isPrevious ? (ja ? "これまでの愛車に追加" : "Add to previous vehicles") : (ja ? "愛車ページをつくる" : "Create vehicle page")}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className={`field ${error ? "has-error" : ""}`}><span>{label}</span>{children}{error && <small>{error}</small>}</label>;
}
