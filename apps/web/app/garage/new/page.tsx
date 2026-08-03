"use client";

import { useApp } from "@/lib/app-context";
import {
  imagePreparationMessageKey,
  preparePrivateAlphaImage,
} from "@/lib/image-preparation";
import {
  collaborativeMatchIdentityOverride,
  createEmptyVehicleDraft,
  relatedVehicleIdentities,
  resolveCollaborativeCatalog,
  resolveVehicleIdentity,
  resolveVehicleSpecification,
  validateVehicleDraft,
  type VehicleDraft,
} from "@mechori/core";
import { usePublishedVehicleCatalog } from "@/lib/use-vehicle-catalog";
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
  const { snapshot: collaborativeCatalog } = usePublishedVehicleCatalog(isRemoteAlpha);
  const validation = useMemo(() => validateVehicleDraft(draft), [draft]);
  const staticIdentity = useMemo(
    () => resolveVehicleIdentity(draft.make, draft.model),
    [draft.make, draft.model],
  );
  const collaborativeMatch = useMemo(
    () => collaborativeCatalog && draft.make.trim() && draft.model.trim()
      ? resolveCollaborativeCatalog(collaborativeCatalog, draft.make, draft.model)
      : undefined,
    [collaborativeCatalog, draft.make, draft.model],
  );
  const collaborativeIdentity = useMemo(
    () => collaborativeMatch
      ? collaborativeMatchIdentityOverride(
          collaborativeMatch,
          draft.make,
          draft.model,
        )
      : undefined,
    [collaborativeMatch, draft.make, draft.model],
  );
  const identity = collaborativeIdentity ?? staticIdentity;
  const relatedIdentities = useMemo(
    () => relatedVehicleIdentities(identity.marketNameId, locale),
    [identity.marketNameId, locale],
  );
  const specification = useMemo(
    () => resolveVehicleSpecification(identity.modelFamilyId, {
      ...draft,
      generationId: identity.generationId,
      modelName: draft.model,
    }, locale),
    [draft, identity.generationId, identity.modelFamilyId, locale],
  );
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
    } catch (error) {
      setImageError(translate(locale, imagePreparationMessageKey(error)));
    } finally {
      setPreparingImage(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSaveError(false);
    if (!validation.valid || saving || preparingImage) return;
    setSaving(true);
    try {
      const vehicle = await addVehicle(
        draft,
        collaborativeIdentity ? { identity: collaborativeIdentity } : undefined,
      );
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
        <section className={`vehicle-photo-field ${!draft.imagePath ? "is-optional-past-photo" : ""}`}>
          <div className="vehicle-photo-preview">
            {draft.imagePath ? (
              <Image src={draft.imagePath} alt="" fill sizes="(max-width: 760px) 100vw, 720px" unoptimized priority />
            ) : (
              <div><Camera size={44} aria-hidden="true" /><strong>{isPrevious ? translate(locale, "pastPhotoOptionalTitle") : locale === "ja" ? "愛車の写真（任意）" : "Vehicle photo (optional)"}</strong><span>{translate(locale, isPrevious ? "pastPhotoOptionalBody" : "checkPhotoPrivacy")}</span></div>
            )}
          </div>
          <label className="photo-pick-action">
            <ImagePlus size={18} aria-hidden="true" />
            {translate(locale, preparingImage ? "preparingPhoto" : draft.imagePath ? "chooseAnotherPhoto" : "choosePhoto")}
            <input type="file" accept="image/*" onChange={selectPhoto} disabled={preparingImage || saving} />
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
          <Field label={translate(locale, "nicknameOptional")}>
            <input value={draft.nickname} onChange={(event) => setField("nickname", event.target.value)} placeholder={locale === "ja" ? "普段呼んでいる名前があれば" : "How you usually refer to it"} />
          </Field>
          {draft.make.trim() && <div className="vehicle-identity-match" aria-live="polite">
            {identity.brandId && identity.canonicalMake !== draft.make.trim() && (
              <p>{translate(locale, "canonicalBrandNotice", {
                input: draft.make.trim(),
                canonical: identity.canonicalMake,
              })}</p>
            )}
            {relatedIdentities.length > 0 && (
              <p>{translate(locale, "relatedVehicleNotice", {
                model: draft.model.trim(),
                names: relatedIdentities
                  .map((item) => `${item.canonicalMake} ${item.model}`)
                  .join(" / "),
              })}</p>
            )}
            {draft.model.trim() && identity.matchStatus !== "matched_alias" && (
              <p>{translate(locale, "unmatchedIdentityNotice")}</p>
            )}
            {collaborativeMatch?.status === "candidate" && (
              <p>
                {locale === "ja"
                  ? "近いカタログ候補がありますが、自動では確定しません。登録後に内容を補足できます。"
                  : "A close catalog candidate exists, but it will not be confirmed automatically. You can add details after registration."}
              </p>
            )}
            {collaborativeMatch?.status === "ambiguous" && (
              <p>
                {locale === "ja"
                  ? "複数の候補があります。入力内容をそのまま保存し、後から確認できます。"
                  : "More than one candidate exists. Your original text will be saved for later review."}
              </p>
            )}
            {specification.generationId && (
              <p>{translate(locale, specification.matchStatus === "confirmed_model_code"
                ? "confirmedSpecificationNotice"
                : "candidateSpecificationNotice", {
                generation: specification.generationLabel ?? "",
                variant: specification.configurationLabel ?? specification.variantLabel ?? translate(locale, "variantUnspecified"),
              })}</p>
            )}
            {specification.conflict && <p className="specification-conflict">{translate(locale, "specificationConflictNotice")}</p>}
          </div>}
          <p className="catalog-free-note">{translate(locale, "catalogFreeNotice")}</p>
          <details className="optional-specification" open={isPrevious || undefined}>
            <summary>{translate(locale, "detailedSpecificationOptional")}</summary>
            <p>{translate(locale, "detailedSpecificationHelp")}</p>
            <div className="form-grid two-columns optional-vehicle-details">
              <Field label={translate(locale, "gradeOptional")}><input value={draft.grade} onChange={(event) => setField("grade", event.target.value)} placeholder={translate(locale, "gradeExample")} /></Field>
              <Field label={translate(locale, "modelCodeOptional")}><input value={draft.modelCode} onChange={(event) => setField("modelCode", event.target.value)} placeholder={translate(locale, "modelCodeExample")} /></Field>
            </div>
            <Field label={translate(locale, "specificationNoteOptional")}><input value={draft.specificationNote} onChange={(event) => setField("specificationNote", event.target.value)} placeholder={translate(locale, "specificationNoteExample")} /></Field>
            <div className="form-grid three-columns optional-vehicle-details">
              <Field label={translate(locale, "engineCodeOptional")}><input value={draft.engineCode} onChange={(event) => setField("engineCode", event.target.value)} placeholder="RB25DET" /></Field>
              <Field label={translate(locale, "displacementCcOptional")} error={errorFor("displacementCc")}><input type="number" min="1" max="30000" inputMode="numeric" value={draft.displacementCc} onChange={(event) => setField("displacementCc", event.target.value)} placeholder="1905" /></Field>
              <Field label={translate(locale, "aspirationOptional")}><select value={draft.aspiration} onChange={(event) => setField("aspiration", event.target.value as VehicleDraft["aspiration"])}><option value="unknown">{translate(locale, "unknown")}</option><option value="naturally_aspirated">{translate(locale, "aspirationNaturallyAspirated")}</option><option value="turbocharged">{translate(locale, "aspirationTurbocharged")}</option><option value="supercharged">{translate(locale, "aspirationSupercharged")}</option><option value="electric">{translate(locale, "aspirationElectric")}</option><option value="other">{translate(locale, "other")}</option></select></Field>
            </div>
            <div className="form-grid three-columns optional-vehicle-details">
              <Field label={translate(locale, "drivetrainOptional")}><select value={draft.drivetrain} onChange={(event) => setField("drivetrain", event.target.value as VehicleDraft["drivetrain"])}><option value="unknown">{translate(locale, "unknown")}</option><option value="fwd">FWD</option><option value="rwd">RWD</option><option value="awd">AWD</option><option value="four_wheel_drive">4WD</option><option value="other">{translate(locale, "other")}</option></select></Field>
              <Field label={translate(locale, "transmissionOptional")}><input value={draft.transmission} onChange={(event) => setField("transmission", event.target.value)} /></Field>
              <Field label={translate(locale, "transmissionCodeOptional")}><input value={draft.transmissionCode} onChange={(event) => setField("transmissionCode", event.target.value)} /></Field>
            </div>
          </details>
        </section>

        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{translate(locale, "approximateDates")}</h2></div>{isPrevious && <History size={22} aria-hidden="true" />}</div>
          <div className="form-grid two-columns">
            <Field label={translate(locale, "approximateModelYear")} error={errorFor("year")}>
              <input type="number" inputMode="numeric" min="1886" max={new Date().getFullYear() + 2} value={draft.year} onChange={(event) => setField("year", event.target.value)} placeholder={translate(locale, "yearExample1997")} />
            </Field>
            <Field label={locale === "ja" ? "所有開始時期の詳しさ" : "Ownership start precision"}>
              <select
                value={draft.ownershipStartedPrecision}
                onChange={(event) => {
                  const precision = event.target.value as VehicleDraft["ownershipStartedPrecision"];
                  setDraft((current) => ({
                    ...current,
                    ownershipStartedPrecision: precision,
                    ownershipStartedYear: precision === "unknown" ? "" : current.ownershipStartedYear,
                    ownershipStartedMonth: precision === "year" || precision === "unknown" ? "" : current.ownershipStartedMonth,
                    ownershipStartedDay: precision === "day" ? current.ownershipStartedDay : "",
                  }));
                }}
              >
                <option value="unknown">{locale === "ja" ? "不明・覚えていない" : "Unknown"}</option>
                <option value="year">{locale === "ja" ? "年まで" : "Year"}</option>
                <option value="month">{locale === "ja" ? "年月まで" : "Year and month"}</option>
                <option value="day">{locale === "ja" ? "年月日" : "Exact date"}</option>
              </select>
            </Field>
          </div>
          {draft.ownershipStartedPrecision !== "unknown" && (
          <div className="form-grid three-columns">
            <Field label={translate(locale, "ownershipStartYear")} error={errorFor("ownershipStartedYear")}>
              <input type="number" inputMode="numeric" min="1886" max={new Date().getFullYear()} value={draft.ownershipStartedYear} onChange={(event) => setField("ownershipStartedYear", event.target.value)} placeholder={translate(locale, "yearExample2018")} />
            </Field>
            {draft.ownershipStartedPrecision !== "year" && <Field label={translate(locale, "monthOptional")} error={errorFor("ownershipStartedMonth")}>
              <input type="number" inputMode="numeric" min="1" max="12" value={draft.ownershipStartedMonth} onChange={(event) => setField("ownershipStartedMonth", event.target.value)} placeholder="1–12" />
            </Field>}
            {draft.ownershipStartedPrecision === "day" && <Field label={locale === "ja" ? "日" : "Day"} error={errorFor("ownershipStartedDay")}>
              <input type="number" inputMode="numeric" min="1" max="31" value={draft.ownershipStartedDay} onChange={(event) => setField("ownershipStartedDay", event.target.value)} placeholder="1–31" />
            </Field>}
          </div>
          )}
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
