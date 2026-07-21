"use client";

import { useApp } from "@/lib/app-context";
import {
  resolveVehicleIdentity,
  resolveVehicleSpecification,
  type VehicleCategory,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { Bike, CarFront, Save } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

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
  const [engine, setEngine] = useState(ownedVehicle?.engine ?? "");
  const [transmission, setTransmission] = useState(ownedVehicle?.transmission ?? "");
  const [steering, setSteering] = useState(ownedVehicle?.steering ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const identity = useMemo(() => resolveVehicleIdentity(make, model), [make, model]);
  const specification = useMemo(
    () => resolveVehicleSpecification(identity.modelFamilyId, { grade, modelCode }, locale),
    [grade, identity.modelFamilyId, locale, modelCode],
  );

  if (!ownedVehicle) {
    return <div className="page-stack narrow-page"><section className="empty-state"><h1>{translate(locale, "vehicleNotFound")}</h1></section></div>;
  }
  const editableVehicle = ownedVehicle;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsedYear = year ? Number(year) : undefined;
    if (!make.trim() || !model.trim() || (parsedYear !== undefined && !Number.isInteger(parsedYear))) {
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
        engine,
        transmission,
        steering,
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
          {specification.generationId && <div className="vehicle-identity-match" aria-live="polite"><p>{translate(locale, specification.matchStatus === "confirmed_model_code" ? "confirmedSpecificationNotice" : "candidateSpecificationNotice", { generation: specification.generationLabel ?? "", variant: specification.variantLabel ?? translate(locale, "variantUnspecified") })}</p>{specification.conflict && <p className="specification-conflict">{translate(locale, "specificationConflictNotice")}</p>}</div>}
          <p className="catalog-free-note">{translate(locale, "specificationConfidenceHelp")}</p>
        </section>
        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{translate(locale, "mechanicalDetailsOptional")}</h2></div></div>
          <div className="form-grid three-columns">
            <Field label={translate(locale, "engineOptional")}><input value={engine} onChange={(event) => setEngine(event.target.value)} placeholder="RB25DET" /></Field>
            <Field label={translate(locale, "transmissionOptional")}><input value={transmission} onChange={(event) => setTransmission(event.target.value)} /></Field>
            <Field label={translate(locale, "steeringOptional")}><input value={steering} onChange={(event) => setSteering(event.target.value)} /></Field>
          </div>
        </section>
        {error && <p className="form-error-summary" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="secondary-action" onClick={() => router.back()}>{translate(locale, "back")}</button><button type="submit" className="primary-action" disabled={saving}><Save size={18} />{translate(locale, saving ? "saving" : "saveSpecification")}</button></div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
