"use client";

import { useApp } from "@/lib/app-context";
import { imagePreparationMessageKey, preparePrivateAlphaImage } from "@/lib/image-preparation";
import {
  resolveVehicleIdentity,
  resolveVehicleSpecification,
  type VehicleAspirationType,
  type VehicleCategory,
  type VehicleDrivetrainType,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { Bike, BookOpenCheck, Camera, CarFront, ImagePlus, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

export default function VehicleSpecificationPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data, locale, updateVehicleSpecification } = useApp();
  const router = useRouter();
  const vehicle = data.vehicles.find((item) => item.id === decodeURIComponent(vehicleId));
  const ownedVehicle = vehicle?.ownerProfileId === data.currentProfileId ? vehicle : undefined;
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>(ownedVehicle?.vehicleCategory ?? "car");
  const [make, setMake] = useState(ownedVehicle?.makeInput ?? ownedVehicle?.make ?? "");
  const [model, setModel] = useState(ownedVehicle?.modelInput ?? ownedVehicle?.model ?? "");
  const [year, setYear] = useState(ownedVehicle?.year?.toString() ?? "");
  const [grade, setGrade] = useState(ownedVehicle?.grade ?? "");
  const [modelCode, setModelCode] = useState(ownedVehicle?.modelCode ?? "");
  const [specificationNote, setSpecificationNote] = useState(ownedVehicle?.specificationNote ?? "");
  const [engine, setEngine] = useState(ownedVehicle?.engine ?? "");
  const [engineCode, setEngineCode] = useState(ownedVehicle?.engineCode ?? "");
  const [displacementCc, setDisplacementCc] = useState(ownedVehicle?.displacementCc?.toString() ?? "");
  const [aspiration, setAspiration] = useState<VehicleAspirationType>(ownedVehicle?.aspiration ?? "unknown");
  const [drivetrain, setDrivetrain] = useState<VehicleDrivetrainType>(ownedVehicle?.drivetrain ?? "unknown");
  const [transmission, setTransmission] = useState(ownedVehicle?.transmission ?? "");
  const [transmissionCode, setTransmissionCode] = useState(ownedVehicle?.transmissionCode ?? "");
  const [steering, setSteering] = useState(ownedVehicle?.steering ?? "");
  const [nickname, setNickname] = useState(ownedVehicle?.nickname ?? "");
  const [imagePath, setImagePath] = useState(ownedVehicle?.imagePath ?? "");
  const [ownerComment, setOwnerComment] = useState(ownedVehicle?.ownerComment ?? "");
  const [ownershipStartedYear, setOwnershipStartedYear] = useState(ownedVehicle?.ownershipStartedYear?.toString() ?? "");
  const [ownershipStartedMonth, setOwnershipStartedMonth] = useState(ownedVehicle?.ownershipStartedMonth?.toString() ?? "");
  const [ownershipStartedDay, setOwnershipStartedDay] = useState(ownedVehicle?.ownershipStartedDay?.toString() ?? "");
  const [ownershipStartedPrecision, setOwnershipStartedPrecision] = useState(ownedVehicle?.ownershipStartedPrecision ?? (ownedVehicle?.ownershipStartedMonth ? "month" : ownedVehicle?.ownershipStartedYear ? "year" : "unknown"));
  const [preparingImage, setPreparingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const identity = useMemo(() => resolveVehicleIdentity(make, model), [make, model]);
  const specification = useMemo(
    () => resolveVehicleSpecification(identity.modelFamilyId, {
      generationId: identity.generationId,
      modelName: model,
      grade,
      modelCode,
      specificationNote,
      displacementCc,
    }, locale),
    [displacementCc, grade, identity.generationId, identity.modelFamilyId, locale, model, modelCode, specificationNote],
  );

  if (!ownedVehicle) {
    return <div className="page-stack narrow-page"><section className="empty-state"><h1>{translate(locale, "vehicleNotFound")}</h1></section></div>;
  }
  const editableVehicle = ownedVehicle;

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPreparingImage(true);
    setImageError("");
    try {
      const prepared = await preparePrivateAlphaImage(file);
      setImagePath(prepared.dataUrl);
    } catch (photoError) {
      setImageError(translate(locale, imagePreparationMessageKey(photoError)));
    } finally {
      setPreparingImage(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsedYear = year ? Number(year) : undefined;
    const parsedDisplacementCc = displacementCc ? Number(displacementCc) : undefined;
    const parsedOwnershipStartedYear = ownershipStartedYear ? Number(ownershipStartedYear) : undefined;
    const parsedOwnershipStartedMonth = ownershipStartedMonth ? Number(ownershipStartedMonth) : undefined;
    const parsedOwnershipStartedDay = ownershipStartedDay ? Number(ownershipStartedDay) : undefined;
    if (
      !make.trim() ||
      !model.trim() ||
      (parsedYear !== undefined && !Number.isInteger(parsedYear)) ||
      (parsedDisplacementCc !== undefined && !Number.isInteger(parsedDisplacementCc))
    ) {
      setError(translate(locale, "checkRequiredVehicleFields"));
      return;
    }
    setSaving(true);
    try {
      await updateVehicleSpecification(editableVehicle.id, {
        vehicleCategory,
        make,
        model,
        year: parsedYear,
        grade,
        modelCode,
        specificationNote,
        engine,
        engineCode,
        displacementCc: parsedDisplacementCc,
        aspiration,
        drivetrain,
        transmission,
        transmissionCode,
        steering,
        nickname,
        imagePath,
        ownerComment,
        ownershipStartedYear: parsedOwnershipStartedYear,
        ownershipStartedMonth: parsedOwnershipStartedMonth,
        ownershipStartedDay: parsedOwnershipStartedDay,
        ownershipStartedPrecision,
      });
      router.push(`/garage?vehicle=${encodeURIComponent(editableVehicle.id)}`);
    } catch {
      setError(translate(locale, "vehicleSpecificationSaveError"));
      setSaving(false);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div><span className="eyebrow">VEHICLE SPECIFICATION</span><h1>{translate(locale, "editVehicleSpecification")}</h1><p>{translate(locale, "editVehicleSpecificationIntro")}</p></div>
      </header>
      <form className="vehicle-form" onSubmit={submit} noValidate>
        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">PROFILE</span><h2>{locale === "ja" ? "愛車ページの見え方" : "Vehicle profile"}</h2></div></div>
          <div className="vehicle-photo-field is-optional-past-photo">
            <div className="vehicle-photo-preview">
              {imagePath ? (
                <Image src={imagePath} alt="" fill sizes="(max-width: 760px) 100vw, 720px" unoptimized />
              ) : (
                <div><Camera size={40} aria-hidden="true" /><strong>{locale === "ja" ? "メイン写真は任意です" : "Main photo is optional"}</strong></div>
              )}
            </div>
            <div className="vehicle-photo-edit-actions">
              <label className="photo-pick-action">
                <ImagePlus size={18} aria-hidden="true" />
                {preparingImage ? (locale === "ja" ? "写真を準備中" : "Preparing photo") : imagePath ? (locale === "ja" ? "写真を変更" : "Change photo") : (locale === "ja" ? "写真を追加" : "Add photo")}
                <input type="file" accept="image/*" onChange={selectPhoto} disabled={preparingImage || saving} />
              </label>
              {imagePath && <button type="button" className="secondary-action" onClick={() => {
                const confirmed = window.confirm(locale === "ja" ? "メイン写真を外しますか？ 保存するまで変更は確定しません。" : "Remove the main photo? The change is not final until you save.");
                if (confirmed) setImagePath("");
              }}><Trash2 size={17} aria-hidden="true" />{locale === "ja" ? "写真を外す" : "Remove photo"}</button>}
            </div>
            {imageError && <p className="media-error" role="alert">{imageError}</p>}
          </div>
          <Field label={translate(locale, "nicknameOptional")}><input maxLength={30} value={nickname} onChange={(event) => setNickname(event.target.value)} /></Field>
          <Field label={locale === "ja" ? "愛車についてのひとこと（任意）" : "A note about this vehicle (optional)"}><textarea maxLength={500} value={ownerComment} onChange={(event) => setOwnerComment(event.target.value)} /></Field>
          <Field label={locale === "ja" ? "所有開始時期の詳しさ" : "Ownership start precision"}>
            <select value={ownershipStartedPrecision} onChange={(event) => {
              const precision = event.target.value as typeof ownershipStartedPrecision;
              setOwnershipStartedPrecision(precision);
              if (precision === "unknown") { setOwnershipStartedYear(""); setOwnershipStartedMonth(""); setOwnershipStartedDay(""); }
              if (precision === "year") { setOwnershipStartedMonth(""); setOwnershipStartedDay(""); }
              if (precision === "month") setOwnershipStartedDay("");
            }}>
              <option value="unknown">{locale === "ja" ? "不明・覚えていない" : "Unknown"}</option>
              <option value="year">{locale === "ja" ? "年まで" : "Year"}</option>
              <option value="month">{locale === "ja" ? "年月まで" : "Year and month"}</option>
              <option value="day">{locale === "ja" ? "年月日" : "Exact date"}</option>
            </select>
          </Field>
          {ownershipStartedPrecision !== "unknown" && <div className="form-grid three-columns">
            <Field label={translate(locale, "ownershipStartYear")}><input type="number" min="1886" max={new Date().getFullYear()} inputMode="numeric" value={ownershipStartedYear} onChange={(event) => setOwnershipStartedYear(event.target.value)} /></Field>
            {ownershipStartedPrecision !== "year" && <Field label={locale === "ja" ? "月" : "Month"}><input type="number" min="1" max="12" inputMode="numeric" value={ownershipStartedMonth} onChange={(event) => setOwnershipStartedMonth(event.target.value)} /></Field>}
            {ownershipStartedPrecision === "day" && <Field label={locale === "ja" ? "日" : "Day"}><input type="number" min="1" max="31" inputMode="numeric" value={ownershipStartedDay} onChange={(event) => setOwnershipStartedDay(event.target.value)} /></Field>}
          </div>}
        </section>
        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">01</span><h2>{translate(locale, "vehicleIdentity")}</h2></div>{vehicleCategory === "motorcycle" || vehicleCategory === "moped" ? <Bike size={22} /> : <CarFront size={22} />}</div>
          <Field label={translate(locale, "vehicleType")}>
            <select value={vehicleCategory} onChange={(event) => setVehicleCategory(event.target.value as VehicleCategory)}>
              <option value="car">{translate(locale, "vehicleTypeCar")}</option><option value="motorcycle">{translate(locale, "vehicleTypeMotorcycle")}</option><option value="moped">{translate(locale, "vehicleTypeMoped")}</option><option value="other">{translate(locale, "vehicleTypeOther")}</option>
            </select>
          </Field>
          <div className="form-grid two-columns">
            <Field label={translate(locale, "makeOrBrand")}><input value={make} onChange={(event) => setMake(event.target.value)} /></Field>
            <Field label={translate(locale, "modelName")}><input value={model} onChange={(event) => setModel(event.target.value)} /></Field>
          </div>
          <div className="form-grid three-columns">
            <Field label={translate(locale, "approximateModelYear")}><input type="number" min="1886" max={new Date().getFullYear() + 2} value={year} onChange={(event) => setYear(event.target.value)} /></Field>
            <Field label={translate(locale, "gradeOptional")}><input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder={translate(locale, "gradeExample")} /></Field>
            <Field label={translate(locale, "modelCodeOptional")}><input value={modelCode} onChange={(event) => setModelCode(event.target.value)} placeholder={translate(locale, "modelCodeExample")} /></Field>
          </div>
          <Field label={translate(locale, "specificationNoteOptional")}><input value={specificationNote} onChange={(event) => setSpecificationNote(event.target.value)} placeholder={translate(locale, "specificationNoteExample")} /></Field>
          {specification.generationId && <div className="vehicle-identity-match" aria-live="polite"><p>{translate(locale, specification.matchStatus === "confirmed_model_code" ? "confirmedSpecificationNotice" : "candidateSpecificationNotice", { generation: specification.generationLabel ?? "", variant: specification.configurationLabel ?? specification.variantLabel ?? translate(locale, "variantUnspecified") })}</p>{specification.conflict && <p className="specification-conflict">{translate(locale, "specificationConflictNotice")}</p>}</div>}
          <p className="catalog-free-note">{translate(locale, "specificationConfidenceHelp")}</p>
        </section>
        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{translate(locale, "mechanicalDetailsOptional")}</h2></div></div>
          <div className="form-grid three-columns">
            <Field label={translate(locale, "engineDescriptionOptional")}><input value={engine} onChange={(event) => setEngine(event.target.value)} placeholder={translate(locale, "engineDescriptionExample")} /></Field>
            <Field label={translate(locale, "engineCodeOptional")}><input value={engineCode} onChange={(event) => setEngineCode(event.target.value)} placeholder="RB25DET" /></Field>
            <Field label={translate(locale, "displacementCcOptional")}><input type="number" min="1" max="30000" inputMode="numeric" value={displacementCc} onChange={(event) => setDisplacementCc(event.target.value)} placeholder="1905" /></Field>
          </div>
          <div className="form-grid three-columns">
            <Field label={translate(locale, "aspirationOptional")}><select value={aspiration} onChange={(event) => setAspiration(event.target.value as VehicleAspirationType)}><option value="unknown">{translate(locale, "unknown")}</option><option value="naturally_aspirated">{translate(locale, "aspirationNaturallyAspirated")}</option><option value="turbocharged">{translate(locale, "aspirationTurbocharged")}</option><option value="supercharged">{translate(locale, "aspirationSupercharged")}</option><option value="electric">{translate(locale, "aspirationElectric")}</option><option value="other">{translate(locale, "other")}</option></select></Field>
            <Field label={translate(locale, "drivetrainOptional")}><select value={drivetrain} onChange={(event) => setDrivetrain(event.target.value as VehicleDrivetrainType)}><option value="unknown">{translate(locale, "unknown")}</option><option value="fwd">FWD</option><option value="rwd">RWD</option><option value="awd">AWD</option><option value="four_wheel_drive">4WD</option><option value="other">{translate(locale, "other")}</option></select></Field>
            <Field label={translate(locale, "transmissionOptional")}><input value={transmission} onChange={(event) => setTransmission(event.target.value)} /></Field>
          </div>
          <div className="form-grid two-columns">
            <Field label={translate(locale, "transmissionCodeOptional")}><input value={transmissionCode} onChange={(event) => setTransmissionCode(event.target.value)} /></Field>
            <Field label={translate(locale, "steeringOptional")}><input value={steering} onChange={(event) => setSteering(event.target.value)} /></Field>
          </div>
        </section>
        {error && <p className="form-error-summary" role="alert">{error}</p>}
        <div className="form-actions"><button type="submit" className="primary-action" disabled={saving || preparingImage}><Save size={18} />{translate(locale, saving ? "saving" : "saveSpecification")}</button><Link href={`/garage/${encodeURIComponent(editableVehicle.id)}/catalog`} className="secondary-action"><BookOpenCheck size={17} />{locale === "ja" ? "仕様情報を追加・修正する" : "Add or correct specification data"}</Link><button type="button" className="secondary-action" onClick={() => router.back()}>{translate(locale, "back")}</button></div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
