"use client";

import { useApp } from "@/lib/app-context";
import { preparePrivateAlphaImage } from "@/lib/image-preparation";
import {
  createEmptyVehicleDraft,
  validateVehicleDraft,
  type VehicleDraft,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
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

  function setField<K extends keyof VehicleDraft>(key: K, value: VehicleDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function errorFor(key: keyof VehicleDraft) {
    if (!submitted || !validation.errors[key]) return undefined;
    return translate(locale, "checkField");
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
      setImageError(translate(locale, "vehicleImageInvalid"));
    } finally {
      setPreparingImage(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSaveError(false);
    if (!draft.imagePath && !isPrevious) {
      setImageError(translate(locale, "vehicleMainPhotoRequired"));
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
          <h1>{translate(locale, isPrevious ? "previousVehicleRegistrationTitle" : "currentVehicleRegistrationTitle")}</h1>
          <p>
            {isPrevious
              ? translate(locale, "previousVehicleRegistrationIntro")
              : translate(locale, "currentVehicleRegistrationIntro")}
          </p>
        </div>
      </header>

      <form className="vehicle-form lovable-vehicle-form" onSubmit={submit} noValidate aria-busy={saving || preparingImage}>
        <section className={`vehicle-photo-field ${isPrevious && !draft.imagePath ? "is-optional-past-photo" : ""}`}>
          <div className="vehicle-photo-preview">
            {draft.imagePath ? (
              <Image src={draft.imagePath} alt="" fill sizes="(max-width: 760px) 100vw, 720px" unoptimized priority />
            ) : (
              <div><Camera size={44} aria-hidden="true" /><strong>{translate(locale, isPrevious ? "pastPhotoOptionalTitle" : "mainVehiclePhoto")}</strong><span>{translate(locale, isPrevious ? "pastPhotoOptionalBody" : "checkPhotoPrivacy")}</span></div>
            )}
          </div>
          <label className="photo-pick-action">
            <ImagePlus size={18} aria-hidden="true" />
            {translate(locale, preparingImage ? "preparingPhoto" : draft.imagePath ? "chooseAnotherPhoto" : "choosePhoto")}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={preparingImage || saving} />
          </label>
          {imageError && <p className="media-error" role="alert">{imageError}</p>}
          <p className="image-preparation-note"><ShieldCheck size={15} aria-hidden="true" />{translate(locale, "privateImagePreparationNotice")}</p>
        </section>

        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">01</span><h2>{translate(locale, "vehicleKindQuestion")}</h2></div>{draft.vehicleCategory === "motorcycle" || draft.vehicleCategory === "moped" ? <Bike size={22} aria-hidden="true" /> : <CarFront size={22} aria-hidden="true" />}</div>
          <Field label={translate(locale, "vehicleType")} error={errorFor("vehicleCategory")}>
            <select value={draft.vehicleCategory} onChange={(event) => setField("vehicleCategory", event.target.value as VehicleDraft["vehicleCategory"])}>
              <option value="car">{translate(locale, "vehicleTypeCar")}</option>
              <option value="motorcycle">{translate(locale, "vehicleTypeMotorcycle")}</option>
              <option value="moped">{translate(locale, "vehicleTypeMoped")}</option>
              <option value="other">{translate(locale, "vehicleTypeOther")}</option>
            </select>
          </Field>
          <div className="form-grid two-columns">
            <Field label={translate(locale, "makeOrBrand")} error={errorFor("make")}>
              <input value={draft.make} onChange={(event) => setField("make", event.target.value)} placeholder={translate(locale, "makeExample")} />
            </Field>
            <Field label={translate(locale, "modelName")} error={errorFor("model")}>
              <input value={draft.model} onChange={(event) => setField("model", event.target.value)} placeholder={translate(locale, "modelExample")} />
            </Field>
          </div>
          <p className="catalog-free-note">{translate(locale, "catalogFreeNotice")}</p>
          {isPrevious && <div className="form-grid three-columns optional-vehicle-details">
            <Field label={translate(locale, "gradeOptional")}><input value={draft.grade} onChange={(event) => setField("grade", event.target.value)} /></Field>
            <Field label={translate(locale, "modelCodeOptional")}><input value={draft.modelCode} onChange={(event) => setField("modelCode", event.target.value)} /></Field>
            <Field label={translate(locale, "nicknameOptional")}><input value={draft.nickname} onChange={(event) => setField("nickname", event.target.value)} /></Field>
          </div>}
        </section>

        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{translate(locale, "approximateDates")}</h2></div>{isPrevious && <History size={22} aria-hidden="true" />}</div>
          <div className="form-grid three-columns">
            <Field label={translate(locale, "approximateModelYear")} error={errorFor("year")}>
              <input type="number" inputMode="numeric" min="1886" max={new Date().getFullYear() + 2} value={draft.year} onChange={(event) => setField("year", event.target.value)} placeholder={translate(locale, "yearExample1997")} />
            </Field>
            <Field label={translate(locale, "ownershipStartYear")} error={errorFor("ownershipStartedYear")}>
              <input type="number" inputMode="numeric" min="1886" max={new Date().getFullYear()} value={draft.ownershipStartedYear} onChange={(event) => setField("ownershipStartedYear", event.target.value)} placeholder={translate(locale, "yearExample2018")} />
            </Field>
            <Field label={translate(locale, "monthOptional")} error={errorFor("ownershipStartedMonth")}>
              <input type="number" inputMode="numeric" min="1" max="12" value={draft.ownershipStartedMonth} onChange={(event) => setField("ownershipStartedMonth", event.target.value)} placeholder="1–12" />
            </Field>
          </div>
          {isPrevious && <>
            <div className="form-grid two-columns">
              <Field label={translate(locale, "ownershipEndYearOptional")} error={errorFor("ownershipEndedYear")}>
                <input type="number" inputMode="numeric" min="1886" max={new Date().getFullYear()} value={draft.ownershipEndedYear} onChange={(event) => setField("ownershipEndedYear", event.target.value)} placeholder={translate(locale, "yearExample2007")} />
              </Field>
              <Field label={translate(locale, "endMonthOptional")} error={errorFor("ownershipEndedMonth")}>
                <input type="number" inputMode="numeric" min="1" max="12" value={draft.ownershipEndedMonth} onChange={(event) => setField("ownershipEndedMonth", event.target.value)} placeholder="1–12" />
              </Field>
            </div>
            <Field label={translate(locale, "periodNoteOptional")}>
              <input value={draft.ownershipPeriodNote} onChange={(event) => setField("ownershipPeriodNote", event.target.value)} placeholder={translate(locale, "periodNoteExample")} />
            </Field>
            <div className="form-grid two-columns">
              <Field label={translate(locale, "odometerAtOwnershipEndOptional")} error={errorFor("odometer")}>
                <input type="number" min="0" inputMode="numeric" value={draft.odometer} onChange={(event) => setField("odometer", event.target.value)} />
              </Field>
              <Field label={translate(locale, "unit")}>
                <select value={draft.odometerUnit} onChange={(event) => setField("odometerUnit", event.target.value as VehicleDraft["odometerUnit"])}><option value="km">km</option><option value="mi">mi</option><option value="unknown">{translate(locale, "unknown")}</option></select>
              </Field>
            </div>
            <div className="form-grid two-columns">
              <Field label={translate(locale, "mainUseOptional")}><input value={draft.primaryUse} onChange={(event) => setField("primaryUse", event.target.value)} placeholder={translate(locale, "mainUseExample")} /></Field>
              <Field label={translate(locale, "dispositionReasonOptional")}><input value={draft.dispositionReason} onChange={(event) => setField("dispositionReason", event.target.value)} /></Field>
            </div>
          </>}
          <Field label={translate(locale, isPrevious ? "memoriesOptional" : "vehicleNoteOptional")}>
            <textarea maxLength={500} value={draft.ownerComment} onChange={(event) => setField("ownerComment", event.target.value)} placeholder={translate(locale, isPrevious ? "memoriesPlaceholder" : "vehicleNotePlaceholder")} />
          </Field>
        </section>

        {saveError && <p className="form-error-summary" role="alert">{translate(locale, isRemoteAlpha ? "remoteVehicleSaveError" : "localVehicleSaveError")}</p>}
        <div className="form-actions">
          <button type="button" className="secondary-action" onClick={() => router.back()}>{translate(locale, "back")}</button>
          <button type="submit" className="primary-action" disabled={saving || preparingImage}><Save size={18} />{translate(locale, saving ? "addingToGarage" : isPrevious ? "addToPreviousVehicles" : "createVehiclePage")}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className={`field ${error ? "has-error" : ""}`}><span>{label}</span>{children}{error && <small>{error}</small>}</label>;
}
