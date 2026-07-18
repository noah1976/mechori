"use client";

import { useApp } from "@/lib/app-context";
import { ArrowLeft, ArrowLeftRight, CarFront, History, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

export default function VehicleOwnershipPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data, locale, updateVehicleOwnership } = useApp();
  const router = useRouter();
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  const ja = locale === "ja";
  const [endYear, setEndYear] = useState(vehicle?.ownershipEndedYear?.toString() ?? "");
  const [endMonth, setEndMonth] = useState(vehicle?.ownershipEndedMonth?.toString() ?? "");
  const [reason, setReason] = useState(vehicle?.dispositionReason ?? "");
  const [periodNote, setPeriodNote] = useState(vehicle?.ownershipPeriodNote ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!vehicle || vehicle.ownerProfileId !== data.currentProfileId) {
    return (
      <div className="empty-state">
        <CarFront size={30} aria-hidden="true" />
        <h1>{ja ? "この車両は変更できません" : "This vehicle cannot be changed"}</h1>
        <Link href="/garage" className="secondary-action">{ja ? "Garageへ戻る" : "Back to Garage"}</Link>
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
      setError(ja ? "所有時期の入力を確認してください。" : "Check the ownership period and try again.");
      setSaving(false);
    }
  }

  function endOwnership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed || saving) return;
    void saveOwnership("previously_owned");
  }

  const isPrevious = vehicle.ownershipType === "previously_owned";

  return (
    <div className="page-stack narrow-page ownership-page">
      <Link href={`/garage?vehicle=${encodeURIComponent(vehicle.id)}`} className="back-link"><ArrowLeft size={17} />{ja ? "Garageへ戻る" : "Back to Garage"}</Link>
      <header className="page-header">
        <div>
          <span className="eyebrow">OWNERSHIP</span>
          <h1>{vehicle.make} {vehicle.model}</h1>
          <p>{ja ? "車両そのものを削除せず、Garage内の所有状態だけを変更します。" : "Change its place in your Garage without deleting the vehicle or its history."}</p>
        </div>
      </header>

      {isPrevious ? (
        <section className="form-section ownership-transition-panel">
          <History size={25} aria-hidden="true" />
          <div>
            <span className="eyebrow">これまでの愛車</span>
            <h2>{ja ? "現在のガレージへ戻す" : "Move back to Current Garage"}</h2>
            <p>{ja ? "写真、整備記録、出来事はそのまま保持されます。所有終了時期と手放した理由は現在表示から外れます。" : "Photos, maintenance records, and moments remain. End-date details will no longer be shown as current ownership."}</p>
          </div>
          <button type="button" className="primary-action" disabled={saving} onClick={() => void saveOwnership("owned")}><ArrowLeftRight size={18} />{saving ? (ja ? "移動中…" : "Moving…") : (ja ? "現在のガレージへ戻す" : "Move to Current Garage")}</button>
        </section>
      ) : (
        <form className="vehicle-form" onSubmit={endOwnership} noValidate>
          <section className="form-section">
            <div className="section-heading compact"><div><span className="eyebrow">OWNERSHIP END</span><h2>{ja ? "所有を終了する" : "End ownership"}</h2></div><History size={22} aria-hidden="true" /></div>
            <p className="ownership-preservation-note">{ja ? "この車両を削除せず、「これまでの愛車」へ移動します。" : "This vehicle will not be deleted. It will move to Previous Vehicles."}</p>
            <div className="form-grid two-columns">
              <Field label={ja ? "所有終了年（任意）" : "End year (optional)"}><input type="number" min="1886" max={new Date().getFullYear()} inputMode="numeric" value={endYear} onChange={(event) => setEndYear(event.target.value)} placeholder={ja ? "例：2024" : "e.g. 2024"} /></Field>
              <Field label={ja ? "終了月（任意）" : "End month (optional)"}><input type="number" min="1" max="12" inputMode="numeric" value={endMonth} onChange={(event) => setEndMonth(event.target.value)} placeholder="1–12" /></Field>
            </div>
            <Field label={ja ? "時期の補足（任意）" : "Period note (optional)"}><input value={periodNote} onChange={(event) => setPeriodNote(event.target.value)} placeholder={ja ? "例：2024年春ごろ" : "e.g. Around spring 2024"} /></Field>
            <Field label={ja ? "手放した理由やコメント（任意）" : "Reason or note (optional)"}><textarea value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
            <label className="checkbox-row ownership-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>{ja ? "記録を残したまま「これまでの愛車」へ移動することを確認しました" : "I understand that the vehicle and all records will be kept and moved"}</span></label>
          </section>
          {error && <p className="form-error-summary" role="alert">{error}</p>}
          <div className="form-actions"><button type="button" className="secondary-action" onClick={() => router.back()}>{ja ? "戻る" : "Back"}</button><button type="submit" className="primary-action" disabled={!confirmed || saving}><Save size={18} />{saving ? (ja ? "移動中…" : "Moving…") : (ja ? "これまでの愛車へ移動" : "Move to Previous Vehicles")}</button></div>
        </form>
      )}
      {error && isPrevious && <p className="form-error-summary" role="alert">{error}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
