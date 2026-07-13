"use client";

import {
  validateRecordDraft,
  type MaintenanceRecord,
  type RecordDraft,
} from "@mechory/core";
import { AlertTriangle, Check, LockKeyhole, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";

function draftFromRecord(record?: MaintenanceRecord): RecordDraft {
  return {
    serviceDate: record?.serviceDate ?? new Date().toISOString().slice(0, 10),
    odometerKm: record?.odometerKm.toString() ?? "",
    summary: record?.summary ?? "",
    symptoms: record?.symptoms ?? "",
    causeCandidates: record?.causeCandidates ?? "",
    checksPerformed: record?.checksPerformed ?? "",
    workPerformed: record?.workPerformed ?? "",
    partName: record?.parts[0]?.name ?? "",
    partManufacturer: record?.parts[0]?.manufacturer ?? "",
    partNumber: record?.parts[0]?.partNumber ?? "",
    cost: record?.cost?.toString() ?? "",
    resolutionStatus: record?.resolutionStatus ?? "unresolved",
    hazardLevel: record?.hazardLevel ?? "LOW",
    requestSharing: record?.visibility === "pending_review",
  };
}

export function RecordForm({ record }: { record?: MaintenanceRecord }) {
  const router = useRouter();
  const { addRecord, updateRecord, locale } = useApp();
  const [draft, setDraft] = useState<RecordDraft>(() => draftFromRecord(record));
  const [submitted, setSubmitted] = useState(false);
  const validation = useMemo(() => validateRecordDraft(draft), [draft]);
  const ja = locale === "ja";

  function setField<K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.valid) return;
    const saved = record ? updateRecord(record.id, draft) : addRecord(draft);
    if (saved) router.push(`/records/${saved.id}`);
  }

  const errorText = (key: keyof RecordDraft) =>
    submitted && validation.errors[key]
      ? ja
        ? "入力内容を確認してください"
        : "Check this field"
      : undefined;

  return (
    <form className="record-form" onSubmit={onSubmit} noValidate>
      <section className="form-section">
        <div className="section-heading compact">
          <div><span className="eyebrow">01</span><h2>{ja ? "基本情報" : "Basics"}</h2></div>
          <span className="required-note">{ja ? "* 必須" : "* Required"}</span>
        </div>
        <div className="form-grid two-columns">
          <Field label={ja ? "整備日 *" : "Service date *"} error={errorText("serviceDate")}>
            <input type="date" value={draft.serviceDate} onChange={(e) => setField("serviceDate", e.target.value)} />
          </Field>
          <Field label={ja ? "走行距離 (km) *" : "Odometer (km) *"} error={errorText("odometerKm")}>
            <input type="number" min="0" inputMode="numeric" value={draft.odometerKm} onChange={(e) => setField("odometerKm", e.target.value)} />
          </Field>
        </div>
        <Field label={ja ? "記録タイトル *" : "Record title *"} error={errorText("summary")}>
          <input value={draft.summary} onChange={(e) => setField("summary", e.target.value)} placeholder={ja ? "例：定期点検の記録" : "e.g. Routine inspection record"} />
        </Field>
      </section>

      <section className="form-section">
        <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{ja ? "症状から結果まで" : "From symptom to result"}</h2></div></div>
        <Field label={ja ? "確認した症状 *" : "Observed symptoms *"} error={errorText("symptoms")}>
          <textarea rows={3} value={draft.symptoms} onChange={(e) => setField("symptoms", e.target.value)} />
        </Field>
        <div className="form-grid two-columns">
          <Field label={ja ? "原因候補" : "Possible causes"}><textarea rows={3} value={draft.causeCandidates} onChange={(e) => setField("causeCandidates", e.target.value)} /></Field>
          <Field label={ja ? "確認した箇所" : "Checks performed"}><textarea rows={3} value={draft.checksPerformed} onChange={(e) => setField("checksPerformed", e.target.value)} /></Field>
        </div>
        <Field label={ja ? "実施した作業" : "Work performed"}><textarea rows={3} value={draft.workPerformed} onChange={(e) => setField("workPerformed", e.target.value)} /></Field>
      </section>

      <section className="form-section">
        <div className="section-heading compact"><div><span className="eyebrow">03</span><h2>{ja ? "部品と状態" : "Parts and status"}</h2></div></div>
        <div className="form-grid three-columns">
          <Field label={ja ? "部品名" : "Part name"}><input value={draft.partName} onChange={(e) => setField("partName", e.target.value)} /></Field>
          <Field label={ja ? "メーカー" : "Manufacturer"}><input value={draft.partManufacturer} onChange={(e) => setField("partManufacturer", e.target.value)} /></Field>
          <Field label={ja ? "部品番号（要確認）" : "Part number (verify)"} error={errorText("partNumber")}><input value={draft.partNumber} onChange={(e) => setField("partNumber", e.target.value)} /></Field>
        </div>
        <div className="form-grid three-columns">
          <Field label={ja ? "費用" : "Cost"}><input type="number" min="0" value={draft.cost} onChange={(e) => setField("cost", e.target.value)} /></Field>
          <Field label={ja ? "結果" : "Result"}>
            <select value={draft.resolutionStatus} onChange={(e) => setField("resolutionStatus", e.target.value as RecordDraft["resolutionStatus"])}>
              <option value="unresolved">{ja ? "未解決" : "Unresolved"}</option>
              <option value="resolved">{ja ? "解決済み" : "Resolved"}</option>
            </select>
          </Field>
          <Field label={ja ? "危険度" : "Hazard level"}>
            <select value={draft.hazardLevel} onChange={(e) => setField("hazardLevel", e.target.value as RecordDraft["hazardLevel"])}>
              <option value="LOW">LOW</option><option value="CAUTION">CAUTION</option><option value="CRITICAL">CRITICAL</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="sharing-panel">
        <LockKeyhole size={21} aria-hidden="true" />
        <div>
          <strong>{ja ? "初期値は非公開です" : "Private by default"}</strong>
          <p>{ja ? "共有を選んでも即時公開されず、匿名化確認と運営確認へ送られます。" : "Sharing sends this record for privacy and operator review; it is never published immediately."}</p>
          <label className="checkbox-row">
            <input type="checkbox" checked={draft.requestSharing} onChange={(e) => setField("requestSharing", e.target.checked)} />
            <span>{ja ? "共有ナレッジ候補として確認を依頼する" : "Request review as shared knowledge"}</span>
          </label>
        </div>
      </section>

      {draft.hazardLevel === "CRITICAL" && (
        <div className="critical-warning" role="alert">
          <AlertTriangle size={22} />
          <div><strong>{ja ? "安全に関わる可能性があります" : "This may involve safety-critical work"}</strong><p>{ja ? "MECHORYは診断や修理指示を行いません。実車とメーカー資料を確認し、専門整備工場へ相談してください。" : "MECHORY does not diagnose or instruct repairs. Check the vehicle and manufacturer material, and consult a qualified workshop."}</p></div>
        </div>
      )}

      {!validation.valid && submitted && <p className="form-error-summary" role="alert">{ja ? "必須項目または入力値を確認してください。" : "Review required fields and invalid values."}</p>}

      <div className="form-actions">
        <button type="button" className="secondary-action" onClick={() => router.back()}>{ja ? "戻る" : "Back"}</button>
        <button type="submit" className="primary-action"><Save size={18} />{record ? (ja ? "変更を保存" : "Save changes") : (ja ? "非公開で保存" : "Save privately")}{draft.requestSharing && <Check size={16} />}</button>
      </div>
    </form>
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
