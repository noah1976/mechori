"use client";

import { useApp } from "@/lib/app-context";
import { displayVehicleModel } from "@mechori/core";
import { translate, type TranslationKey } from "@mechori/i18n";
import { ArrowLeft, ArrowLeftRight, CarFront, History, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

export default function VehicleOwnershipPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data, locale, updateVehicleOwnership } = useApp();
  const router = useRouter();
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  const [endYear, setEndYear] = useState(vehicle?.ownershipEndedYear?.toString() ?? "");
  const [endMonth, setEndMonth] = useState(vehicle?.ownershipEndedMonth?.toString() ?? "");
  const [reason, setReason] = useState(vehicle?.dispositionReason ?? "");
  const [periodNote, setPeriodNote] = useState(vehicle?.ownershipPeriodNote ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<TranslationKey | "">("");

  if (!vehicle || vehicle.ownerProfileId !== data.currentProfileId) {
    return (
      <div className="empty-state">
        <CarFront size={30} aria-hidden="true" />
        <h1>{translate(locale, "vehicleCannotChange")}</h1>
        <Link href="/garage" className="secondary-action">{translate(locale, "backToGarage")}</Link>
      </div>
    );
  }
  const ownedVehicle = vehicle;

  async function saveOwnership(ownershipType: "owned" | "previously_owned") {
    setSaving(true);
    setError("");
    try {
      await updateVehicleOwnership(ownedVehicle.id, {
        ownershipType,
        ownershipEndedYear: ownershipType === "previously_owned" && endYear ? Number(endYear) : undefined,
        ownershipEndedMonth: ownershipType === "previously_owned" && endMonth ? Number(endMonth) : undefined,
        dispositionReason: ownershipType === "previously_owned" ? reason : undefined,
        ownershipPeriodNote: periodNote,
      });
      router.push(`/garage?vehicle=${encodeURIComponent(ownedVehicle.id)}`);
    } catch {
      setError("ownershipPeriodError");
      setSaving(false);
    }
  }

  function endOwnership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed || saving) return;
    void saveOwnership("previously_owned");
  }

  const isPrevious = vehicle.ownershipType === "previously_owned";
  const vehicleModel = displayVehicleModel(vehicle, locale);

  return (
    <div className="page-stack narrow-page ownership-page">
      <Link href={`/garage?vehicle=${encodeURIComponent(vehicle.id)}`} className="back-link"><ArrowLeft size={17} />{translate(locale, "backToGarage")}</Link>
      <header className="page-header">
        <div>
          <span className="eyebrow">OWNERSHIP</span>
          <h1>{vehicle.make} {vehicleModel}</h1>
          <p>{translate(locale, "ownershipChangeIntro")}</p>
        </div>
      </header>

      {isPrevious ? (
        <section className="form-section ownership-transition-panel">
          <History size={25} aria-hidden="true" />
          <div>
            <span className="eyebrow">{translate(locale, "previousVehicles")}</span>
            <h2>{translate(locale, "moveBackToCurrentGarage")}</h2>
            <p>{translate(locale, "moveBackPreservationNotice")}</p>
          </div>
          <button type="button" className="primary-action" disabled={saving} onClick={() => void saveOwnership("owned")}><ArrowLeftRight size={18} />{translate(locale, saving ? "moving" : "moveBackToCurrentGarage")}</button>
        </section>
      ) : (
        <form className="vehicle-form" onSubmit={endOwnership} noValidate>
          <section className="form-section">
            <div className="section-heading compact"><div><span className="eyebrow">OWNERSHIP END</span><h2>{translate(locale, "endOwnership")}</h2></div><History size={22} aria-hidden="true" /></div>
            <p className="ownership-preservation-note">{translate(locale, "moveWithoutDeletingNotice")}</p>
            <div className="form-grid two-columns">
              <Field label={translate(locale, "ownershipEndYearOptional")}><input type="number" min="1886" max={new Date().getFullYear()} inputMode="numeric" value={endYear} onChange={(event) => setEndYear(event.target.value)} placeholder={translate(locale, "yearExample2024")} /></Field>
              <Field label={translate(locale, "endMonthOptional")}><input type="number" min="1" max="12" inputMode="numeric" value={endMonth} onChange={(event) => setEndMonth(event.target.value)} placeholder="1–12" /></Field>
            </div>
            <Field label={translate(locale, "periodNoteOptional")}><input value={periodNote} onChange={(event) => setPeriodNote(event.target.value)} placeholder={translate(locale, "periodSpringExample")} /></Field>
            <Field label={translate(locale, "dispositionReasonOrNoteOptional")}><textarea value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
            <label className="checkbox-row ownership-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>{translate(locale, "confirmMoveToPrevious")}</span></label>
          </section>
          {error && <p className="form-error-summary" role="alert">{translate(locale, error)}</p>}
          <div className="form-actions"><button type="button" className="secondary-action" onClick={() => router.back()}>{translate(locale, "back")}</button><button type="submit" className="primary-action" disabled={!confirmed || saving}><Save size={18} />{translate(locale, saving ? "moving" : "moveToPreviousVehicles")}</button></div>
        </form>
      )}
      {error && isPrevious && <p className="form-error-summary" role="alert">{translate(locale, error)}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
