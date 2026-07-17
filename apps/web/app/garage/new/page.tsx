"use client";

import { useApp } from "@/lib/app-context";
import {
  createEmptyVehicleDraft,
  validateVehicleDraft,
  type VehicleDraft,
} from "@mechori/core";
import { CarFront, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

export default function NewVehiclePage() {
  const { addVehicle, locale } = useApp();
  const [draft, setDraft] = useState<VehicleDraft>(() => createEmptyVehicleDraft());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSaveError(false);
    if (!validation.valid || saving) return;
    setSaving(true);
    try {
      await addVehicle(draft);
      router.push("/garage");
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">ADD VEHICLE</span>
          <h1>{ja ? "愛車を登録" : "Add a vehicle"}</h1>
          <p>
            {ja
              ? "メーカーと車種は候補に関係なく入力できます。型式や正確な年式が分からなくても、登録後に追記できます。"
              : "Enter any make and model, even if it is not in a catalog. Exact year and specifications can be added later."}
          </p>
        </div>
      </header>

      <form className="vehicle-form" onSubmit={submit} noValidate aria-busy={saving}>
        <section className="form-section">
          <div className="section-heading compact">
            <div><span className="eyebrow">01</span><h2>{ja ? "車両名" : "Vehicle identity"}</h2></div>
            <CarFront size={22} aria-hidden="true" />
          </div>
          <div className="form-grid two-columns">
            <Field label={ja ? "メーカー *" : "Make *"} error={errorFor("make")}>
              <input value={draft.make} onChange={(event) => setField("make", event.target.value)} autoComplete="organization" placeholder={ja ? "例：Bertone" : "e.g. Bertone"} />
            </Field>
            <Field label={ja ? "車種 *" : "Model *"} error={errorFor("model")}>
              <input value={draft.model} onChange={(event) => setField("model", event.target.value)} placeholder="X1/9" />
            </Field>
          </div>
          <div className="form-grid two-columns">
            <Field label={ja ? "年式（分かる場合）" : "Model year (if known)"} error={errorFor("year")}>
              <input type="number" inputMode="numeric" min="1886" max={new Date().getFullYear() + 2} value={draft.year} onChange={(event) => setField("year", event.target.value)} placeholder={ja ? "未入力でも登録できます" : "Optional"} />
            </Field>
            <Field label={ja ? "所有関係" : "Relationship"}>
              <select value={draft.ownershipType} onChange={(event) => setField("ownershipType", event.target.value as VehicleDraft["ownershipType"])}>
                <option value="owned">{ja ? "現在所有" : "Owned"}</option>
                <option value="previously_owned">{ja ? "過去所有" : "Previously owned"}</option>
                <option value="family">{ja ? "家族所有" : "Family"}</option>
                <option value="shared">{ja ? "共同管理" : "Shared"}</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{ja ? "分かる範囲の仕様" : "Known specifications"}</h2></div></div>
          <div className="form-grid three-columns">
            <Field label={ja ? "エンジン" : "Engine"}><input value={draft.engine} onChange={(event) => setField("engine", event.target.value)} /></Field>
            <Field label={ja ? "トランスミッション" : "Transmission"}><input value={draft.transmission} onChange={(event) => setField("transmission", event.target.value)} /></Field>
            <Field label={ja ? "ハンドル" : "Steering"}><input value={draft.steering} onChange={(event) => setField("steering", event.target.value)} /></Field>
          </div>
          <div className="form-grid three-columns">
            <Field label={ja ? "所有開始年" : "Ownership start year"} error={errorFor("ownershipStartedYear")}><input type="number" inputMode="numeric" value={draft.ownershipStartedYear} onChange={(event) => setField("ownershipStartedYear", event.target.value)} /></Field>
            <Field label={ja ? "所有開始月" : "Ownership start month"} error={errorFor("ownershipStartedMonth")}><input type="number" inputMode="numeric" min="1" max="12" value={draft.ownershipStartedMonth} onChange={(event) => setField("ownershipStartedMonth", event.target.value)} /></Field>
            <Field label={ja ? "現在のメーター表示" : "Current odometer"} error={errorFor("odometer")}>
              <span className="field-with-unit">
                <input type="number" inputMode="numeric" min="0" value={draft.odometer} onChange={(event) => setField("odometer", event.target.value)} />
                <select aria-label={ja ? "走行距離の単位" : "Odometer unit"} value={draft.odometerUnit} onChange={(event) => setField("odometerUnit", event.target.value as VehicleDraft["odometerUnit"])}>
                  <option value="km">km</option><option value="mi">mi</option><option value="unknown">?</option>
                </select>
              </span>
            </Field>
          </div>
          <p className="privacy-caption">
            {ja
              ? "VIN、ナンバープレート、正確な保管場所は登録しません。空欄は推測せず、そのままで構いません。"
              : "VIN, registration plate, and precise storage location are not collected. Leave unknown fields blank."}
          </p>
        </section>

        {saveError && <p className="form-error-summary" role="alert">{ja ? "端末へ保存できませんでした。" : "Could not save to this device."}</p>}
        <div className="form-actions">
          <button type="button" className="secondary-action" onClick={() => router.back()}>{ja ? "戻る" : "Back"}</button>
          <button type="submit" className="primary-action" disabled={saving}><Save size={18} />{saving ? (ja ? "保存中…" : "Saving…") : (ja ? "愛車を登録" : "Add vehicle")}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
