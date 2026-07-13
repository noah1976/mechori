"use client";

import {
  createEmptyActionDraft,
  validateRecordDraft,
  type MaintenanceRecord,
  type PrototypeOdometerEpisodeReason,
  type RecordActionDraft,
  type RecordDraft,
  type Vehicle,
} from "@mechory/core";
import {
  AlertTriangle,
  Check,
  LockKeyhole,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";

const meterChangeReasons: PrototypeOdometerEpisodeReason[] = [
  "replacement",
  "repair",
  "reset",
  "unit_change",
  "unknown",
];

function draftFromRecord(record: MaintenanceRecord | undefined, vehicle: Vehicle): RecordDraft {
  const primaryAction = record?.actions[0];
  const recordedEpisode = record
    ? vehicle.odometerEpisodes.find((episode) => episode.id === record.odometerReading.episodeId)
    : undefined;
  const recordedMeterChange =
    recordedEpisode &&
    recordedEpisode.reason !== "initial" &&
    recordedEpisode.startedAt === record?.serviceDate;
  return {
    serviceDate: record?.serviceDate ?? new Date().toISOString().slice(0, 10),
    odometerKm: (record?.odometerReading.displayedValue ?? vehicle.currentOdometerReading.displayedValue).toString(),
    odometerUnit: record?.odometerReading.unit ?? vehicle.currentOdometerReading.unit,
    odometerEpisodeId: record?.odometerReading.episodeId ?? vehicle.currentOdometerReading.episodeId,
    odometerChangeReason: recordedMeterChange ? recordedEpisode.reason : "same_episode",
    summary: record?.summary ?? "",
    symptoms: record?.symptoms ?? "",
    causeCandidates: primaryAction?.causeCandidates ?? record?.causeCandidates ?? "",
    checksPerformed: primaryAction?.checksPerformed ?? record?.checksPerformed ?? "",
    workPerformed: primaryAction?.workPerformed ?? record?.workPerformed ?? "",
    partName: primaryAction?.parts[0]?.name ?? record?.parts[0]?.name ?? "",
    partManufacturer: primaryAction?.parts[0]?.manufacturer ?? record?.parts[0]?.manufacturer ?? "",
    partNumber: primaryAction?.parts[0]?.partNumber ?? record?.parts[0]?.partNumber ?? "",
    cost: record?.cost?.toString() ?? "",
    resolutionStatus: primaryAction?.resolutionStatus ?? record?.resolutionStatus ?? "unresolved",
    hazardLevel: primaryAction?.hazardLevel ?? record?.hazardLevel ?? "LOW",
    additionalActions:
      record?.actions.slice(1).map((action) => ({
        clientId: action.id,
        summary: action.summary,
        causeCandidates: action.causeCandidates,
        checksPerformed: action.checksPerformed,
        workPerformed: action.workPerformed,
        partName: action.parts[0]?.name ?? "",
        partManufacturer: action.parts[0]?.manufacturer ?? "",
        partNumber: action.parts[0]?.partNumber ?? "",
        result: action.result,
        resolutionStatus: action.resolutionStatus,
        hazardLevel: action.hazardLevel,
      })) ?? [],
    requestSharing: record?.visibility === "pending_review",
  };
}

export function RecordForm({ record }: { record?: MaintenanceRecord }) {
  const { data } = useApp();
  const vehicle = data.vehicles.find((item) => item.id === record?.vehicleId) ?? data.vehicles[0];
  if (!vehicle) return null;

  return <RecordFormWithVehicle key={`${record?.id ?? "new"}-${vehicle.id}`} record={record} vehicle={vehicle} />;
}

function RecordFormWithVehicle({ record, vehicle }: { record?: MaintenanceRecord; vehicle: Vehicle }) {
  const router = useRouter();
  const { addRecord, updateRecord, locale } = useApp();
  const [draft, setDraft] = useState<RecordDraft>(() => draftFromRecord(record, vehicle));
  const [submitted, setSubmitted] = useState(false);
  const validation = useMemo(() => validateRecordDraft(draft), [draft]);
  const ja = locale === "ja";

  function setField<K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setActionField<K extends keyof RecordActionDraft>(
    index: number,
    key: K,
    value: RecordActionDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      additionalActions: current.additionalActions.map((action, actionIndex) =>
        actionIndex === index ? { ...action, [key]: value } : action,
      ),
    }));
  }

  function onMeterChangeToggle(checked: boolean) {
    setDraft((current) => ({
      ...current,
      odometerEpisodeId: checked
        ? vehicle.currentOdometerReading.episodeId
        : current.odometerEpisodeId,
      odometerChangeReason: checked ? "replacement" : "same_episode",
    }));
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
  const recordsExistingMeterChange = Boolean(
    record && draft.odometerChangeReason !== "same_episode",
  );
  const hasMeterChange = draft.odometerChangeReason !== "same_episode";

  return (
    <form className="record-form" onSubmit={onSubmit} noValidate>
      <section className="form-section">
        <div className="section-heading compact">
          <div><span className="eyebrow">01</span><h2>{ja ? "基本情報" : "Basics"}</h2></div>
          <span className="required-note">{ja ? "* 必須" : "* Required"}</span>
        </div>
        <div className="form-grid three-columns">
          <Field label={ja ? "整備日 *" : "Service date *"} error={errorText("serviceDate")}>
            <input type="date" value={draft.serviceDate} onChange={(event) => setField("serviceDate", event.target.value)} />
          </Field>
          <Field label={hasMeterChange ? (ja ? "交換・修理後の走行距離 *" : "Odometer after change *") : (ja ? "走行距離 *" : "Odometer *")} error={errorText("odometerKm")}>
            <input type="number" min="0" inputMode="numeric" value={draft.odometerKm} onChange={(event) => setField("odometerKm", event.target.value)} />
          </Field>
          <Field label={ja ? "表示単位" : "Display unit"}>
            <select value={draft.odometerUnit} onChange={(event) => setField("odometerUnit", event.target.value as RecordDraft["odometerUnit"])}>
              <option value="km">km</option>
              <option value="mi">mi</option>
              <option value="unknown">{ja ? "不明" : "Unknown"}</option>
            </select>
          </Field>
        </div>
        <div className="meter-change-option">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={hasMeterChange}
              disabled={recordsExistingMeterChange}
              onChange={(event) => onMeterChangeToggle(event.target.checked)}
            />
            <span>{ja ? "この整備でメーターを交換・修理した" : "The odometer was replaced or repaired during this service"}</span>
          </label>
          {recordsExistingMeterChange && <small>{ja ? "保存済みのメーター交換記録です。" : "This meter-change record is already saved."}</small>}
          {hasMeterChange && <div className="meter-change-fields">
            <Field label={ja ? "記録する内容" : "What changed"}>
              <select
                value={draft.odometerChangeReason}
                disabled={recordsExistingMeterChange}
                onChange={(event) => setField("odometerChangeReason", event.target.value as PrototypeOdometerEpisodeReason)}
              >
                {meterChangeReasons.map((reason) => <option key={reason} value={reason}>{episodeReasonLabel(reason, ja)}</option>)}
              </select>
            </Field>
            <p>{ja ? "上の走行距離には、交換・修理後のメーター表示値を入力します。以前より小さくても異常や虚偽とは判定しません。" : "Enter the displayed value after replacement or repair above. A lower value is not treated as an error or false claim."}</p>
          </div>}
        </div>
        <Field label={ja ? "入庫・整備イベントのタイトル *" : "Visit or maintenance event title *"} error={errorText("summary")}>
          <input value={draft.summary} onChange={(event) => setField("summary", event.target.value)} placeholder={ja ? "例：車検と定期整備" : "e.g. Inspection and routine service"} />
        </Field>
      </section>

      <section className="form-section">
        <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{ja ? "確認した症状" : "Observed symptoms"}</h2></div></div>
        <Field label={ja ? "この入庫のきっかけ・症状 *" : "Reason for visit or symptoms *"} error={errorText("symptoms")}>
          <textarea rows={3} value={draft.symptoms} onChange={(event) => setField("symptoms", event.target.value)} />
        </Field>
      </section>

      <section className="form-section">
        <div className="section-heading compact"><div><span className="eyebrow">03</span><h2>{ja ? "作業 1" : "Action 1"}</h2></div></div>
        <ActionFields
          ja={ja}
          summary={draft.summary}
          causeCandidates={draft.causeCandidates}
          checksPerformed={draft.checksPerformed}
          workPerformed={draft.workPerformed}
          partName={draft.partName}
          partManufacturer={draft.partManufacturer}
          partNumber={draft.partNumber}
          resolutionStatus={draft.resolutionStatus}
          hazardLevel={draft.hazardLevel}
          partNumberError={errorText("partNumber")}
          showSummary={false}
          setField={(key, value) => setField(key as keyof RecordDraft, value as never)}
        />
        <div className="form-grid two-columns">
          <Field label={ja ? "費用（入庫全体）" : "Cost (whole visit)"}><input type="number" min="0" value={draft.cost} onChange={(event) => setField("cost", event.target.value)} /></Field>
        </div>
      </section>

      {draft.additionalActions.map((action, index) => (
        <section className="form-section action-section" key={action.clientId}>
          <div className="section-heading compact">
            <div><span className="eyebrow">{String(index + 4).padStart(2, "0")}</span><h2>{ja ? `作業 ${index + 2}` : `Action ${index + 2}`}</h2></div>
            <button
              type="button"
              className="icon-action danger-icon"
              aria-label={ja ? `作業 ${index + 2} を削除` : `Remove action ${index + 2}`}
              title={ja ? "作業を削除" : "Remove action"}
              onClick={() => setField("additionalActions", draft.additionalActions.filter((_, actionIndex) => actionIndex !== index))}
            ><Trash2 size={18} /></button>
          </div>
          <ActionFields
            ja={ja}
            {...action}
            showSummary
            setField={(key, value) => setActionField(index, key as keyof RecordActionDraft, value as never)}
          />
        </section>
      ))}

      <button
        type="button"
        className="secondary-action add-action-button"
        onClick={() => setField("additionalActions", [...draft.additionalActions, createEmptyActionDraft()])}
      ><Plus size={18} />{ja ? "同じ入庫に作業を追加" : "Add another action to this visit"}</button>
      {errorText("additionalActions") && <p className="form-error-summary" role="alert">{ja ? "追加した作業のタイトルまたは部品番号を確認してください。" : "Review action titles and part numbers."}</p>}

      <section className="sharing-panel">
        <LockKeyhole size={21} aria-hidden="true" />
        <div>
          <strong>{ja ? "初期値は非公開です" : "Private by default"}</strong>
          <p>{ja ? "共有を選んでも即時公開されず、匿名化確認と運営確認へ送られます。" : "Sharing sends this record for privacy and operator review; it is never published immediately."}</p>
          <label className="checkbox-row">
            <input type="checkbox" checked={draft.requestSharing} onChange={(event) => setField("requestSharing", event.target.checked)} />
            <span>{ja ? "共有ナレッジ候補として確認を依頼する" : "Request review as shared knowledge"}</span>
          </label>
        </div>
      </section>

      {[draft.hazardLevel, ...draft.additionalActions.map((action) => action.hazardLevel)].includes("CRITICAL") && (
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

type ActionFieldKey =
  | "summary"
  | "causeCandidates"
  | "checksPerformed"
  | "workPerformed"
  | "partName"
  | "partManufacturer"
  | "partNumber"
  | "resolutionStatus"
  | "hazardLevel";

function ActionFields({
  ja,
  summary,
  causeCandidates,
  checksPerformed,
  workPerformed,
  partName,
  partManufacturer,
  partNumber,
  resolutionStatus,
  hazardLevel,
  showSummary,
  partNumberError,
  setField,
}: {
  ja: boolean;
  summary: string;
  causeCandidates: string;
  checksPerformed: string;
  workPerformed: string;
  partName: string;
  partManufacturer: string;
  partNumber: string;
  resolutionStatus: RecordActionDraft["resolutionStatus"];
  hazardLevel: RecordActionDraft["hazardLevel"];
  showSummary: boolean;
  partNumberError?: string;
  setField: (key: ActionFieldKey, value: string) => void;
}) {
  return <>
    {showSummary && <Field label={ja ? "作業タイトル *" : "Action title *"}><input value={summary} onChange={(event) => setField("summary", event.target.value)} /></Field>}
    <div className="form-grid two-columns">
      <Field label={ja ? "原因候補" : "Possible causes"}><textarea rows={3} value={causeCandidates} onChange={(event) => setField("causeCandidates", event.target.value)} /></Field>
      <Field label={ja ? "確認した箇所" : "Checks performed"}><textarea rows={3} value={checksPerformed} onChange={(event) => setField("checksPerformed", event.target.value)} /></Field>
    </div>
    <Field label={ja ? "実施した作業" : "Work performed"}><textarea rows={3} value={workPerformed} onChange={(event) => setField("workPerformed", event.target.value)} /></Field>
    <div className="form-grid three-columns">
      <Field label={ja ? "部品名" : "Part name"}><input value={partName} onChange={(event) => setField("partName", event.target.value)} /></Field>
      <Field label={ja ? "メーカー" : "Manufacturer"}><input value={partManufacturer} onChange={(event) => setField("partManufacturer", event.target.value)} /></Field>
      <Field label={ja ? "部品番号（要確認）" : "Part number (verify)"} error={partNumberError}><input value={partNumber} onChange={(event) => setField("partNumber", event.target.value)} /></Field>
    </div>
    <div className="form-grid two-columns">
      <Field label={ja ? "結果" : "Result"}>
        <select value={resolutionStatus} onChange={(event) => setField("resolutionStatus", event.target.value)}>
          <option value="unresolved">{ja ? "未解決" : "Unresolved"}</option>
          <option value="resolved">{ja ? "解決済み" : "Resolved"}</option>
        </select>
      </Field>
      <Field label={ja ? "危険度" : "Hazard level"}>
        <select value={hazardLevel} onChange={(event) => setField("hazardLevel", event.target.value)}>
          <option value="LOW">LOW</option><option value="CAUTION">CAUTION</option><option value="CRITICAL">CRITICAL</option>
        </select>
      </Field>
    </div>
  </>;
}

function episodeReasonLabel(reason: PrototypeOdometerEpisodeReason, ja: boolean) {
  const labels: Record<PrototypeOdometerEpisodeReason, [string, string]> = {
    initial: ["初期登録", "Initial"],
    replacement: ["交換", "Replacement"],
    repair: ["修理", "Repair"],
    reset: ["リセット", "Reset"],
    rollover: ["桁あふれ", "Rollover"],
    unit_change: ["単位変更", "Unit change"],
    unknown: ["理由不明", "Unknown reason"],
  };
  return labels[reason][ja ? 0 : 1];
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
