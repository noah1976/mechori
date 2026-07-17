"use client";

import {
  createEmptyActionDraft,
  validateRecordDraft,
  type MaintenanceRecord,
  type PrototypeOdometerEpisodeReason,
  type RecordActionDraft,
  type RecordDraft,
  type Vehicle,
} from "@mechori/core";
import {
  AlertTriangle,
  Check,
  LockKeyhole,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";
import {
  clearLocalDraft,
  loadRecordLocalDraft,
  recordLocalDraftKey,
  saveLocalDraft,
} from "@/lib/local-draft-store";

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

export function RecordForm({ record, vehicleId }: { record?: MaintenanceRecord; vehicleId?: string }) {
  const { data, locale } = useApp();
  const vehicle = data.vehicles.find((item) => item.id === (record?.vehicleId ?? vehicleId)) ?? data.vehicles[0];
  if (!vehicle) {
    const ja = locale === "ja";
    return (
      <div className="empty-state">
        <h2>{ja ? "整備記録を付ける愛車がありません" : "No vehicle is available for this record"}</h2>
        <p>{ja ? "先に愛車を登録すると、その車両の整備履歴として保存できます。" : "Add a vehicle first, then save this as part of its maintenance history."}</p>
        <Link href="/garage/new" className="primary-action">{ja ? "愛車を登録" : "Add vehicle"}</Link>
      </div>
    );
  }

  return <RecordFormWithVehicle key={`${record?.id ?? "new"}-${vehicle.id}`} record={record} vehicle={vehicle} />;
}

function RecordFormWithVehicle({ record, vehicle }: { record?: MaintenanceRecord; vehicle: Vehicle }) {
  const router = useRouter();
  const { addRecord, updateRecord, locale, isRemoteAlpha } = useApp();
  const draftKey = recordLocalDraftKey(record?.id);
  const initialDraft = useMemo(() => draftFromRecord(record, vehicle), [record, vehicle]);
  const [draft, setDraft] = useState<RecordDraft>(initialDraft);
  const [submitted, setSubmitted] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"idle" | "restored" | "saved" | "error">("idle");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const validation = useMemo(() => validateRecordDraft(draft), [draft]);
  const ja = locale === "ja";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadRecordLocalDraft(draftKey);
      if (stored) {
        const episodeExists = vehicle.odometerEpisodes.some(
          (episode) => episode.id === stored.value.odometerEpisodeId,
        );
        const restoredDraft = {
          ...stored.value,
          odometerEpisodeId: episodeExists
            ? stored.value.odometerEpisodeId
            : vehicle.currentOdometerReading.episodeId,
        };
        if (JSON.stringify(restoredDraft) !== JSON.stringify(initialDraft)) {
          setDraft(restoredDraft);
          setDraftStatus("restored");
        } else {
          clearLocalDraft(draftKey);
        }
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftKey, initialDraft, vehicle.currentOdometerReading.episodeId, vehicle.odometerEpisodes]);

  useEffect(() => {
    if (!draftReady) return;
    if (JSON.stringify(draft) === JSON.stringify(initialDraft)) {
      clearLocalDraft(draftKey);
      return;
    }
    const timer = window.setTimeout(() => {
      setDraftStatus(saveLocalDraft(draftKey, draft) ? "saved" : "error");
    }, 600);
    return () => window.clearTimeout(timer);
  }, [draft, draftKey, draftReady, initialDraft]);

  function discardDraft() {
    clearLocalDraft(draftKey);
    setDraft(initialDraft);
    setDraftStatus("idle");
    setSubmitted(false);
    setSaveError(false);
  }

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSaveError(false);
    if (!validation.valid) {
      window.requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>(".has-error input, .has-error textarea, .has-error select")
          ?.focus();
      });
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const saved = record ? await updateRecord(record.id, draft) : await addRecord(draft, vehicle.id);
      if (saved) {
        clearLocalDraft(draftKey);
        router.push(`/records/${saved.id}`);
        return;
      }
      setSaveError(true);
    } catch {
      setSaveError(true);
    }
    setSaving(false);
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
    <form ref={formRef} className="record-form" onSubmit={onSubmit} noValidate aria-busy={saving}>
      <LocalDraftStatus status={draftStatus} ja={ja} onDiscard={discardDraft} />
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
        <Field label={ja ? "整備記録のタイトル *" : "Visit or maintenance event title *"} error={errorText("summary")}>
          <input value={draft.summary} onChange={(event) => setField("summary", event.target.value)} placeholder={ja ? "例：車検と定期整備" : "e.g. Inspection and routine service"} />
        </Field>
      </section>

      <section className="form-section">
        <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{ja ? "確認した症状" : "Observed symptoms"}</h2></div></div>
        <Field label={ja ? "整備のきっかけ・症状 *" : "Reason for visit or symptoms *"} error={errorText("symptoms")}>
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
          <div><strong>{ja ? "安全に関わる可能性があります" : "This may involve safety-critical work"}</strong><p>{ja ? "MECHORIは診断や修理指示を行いません。実車とメーカー資料を確認し、専門整備工場へ相談してください。" : "MECHORI does not diagnose or instruct repairs. Check the vehicle and manufacturer material, and consult a qualified workshop."}</p></div>
        </div>
      )}

      {!validation.valid && submitted && <p className="form-error-summary" role="alert">{ja ? "必須項目または入力値を確認してください。" : "Review required fields and invalid values."}</p>}
      {saveError && <p className="form-error-summary" role="alert">
        {isRemoteAlpha
          ? ja ? "MECHORIへ保存できませんでした。入力内容は端末内の下書きに残しています。" : "This record could not be saved to MECHORI. Your input remains in the local draft."
          : ja ? "端末へ保存できませんでした。入力内容は下書きとして残しています。" : "This record could not be saved. Your input remains in the local draft."}
      </p>}

      <div className="form-actions">
        <button type="button" className="secondary-action" onClick={() => router.back()}>{ja ? "戻る" : "Back"}</button>
        <button type="submit" className="primary-action" disabled={saving}><Save size={18} />{saving ? (ja ? "保存中…" : "Saving…") : record ? (ja ? "変更を保存" : "Save changes") : (ja ? "非公開で保存" : "Save privately")}{draft.requestSharing && <Check size={16} />}</button>
      </div>
    </form>
  );
}

function LocalDraftStatus({
  status,
  ja,
  onDiscard,
}: {
  status: "idle" | "restored" | "saved" | "error";
  ja: boolean;
  onDiscard(): void;
}) {
  if (status === "idle") return null;
  return (
    <div className={`local-draft-status is-${status}`} role={status === "error" ? "alert" : "status"}>
      <span>
        {status === "restored"
          ? ja ? "端末内の下書きを復元しました。" : "Restored the draft from this device."
          : status === "saved"
            ? ja ? "入力内容を端末内へ下書き保存しました。" : "Draft saved on this device."
            : ja ? "下書きを保存できません。ブラウザの保存設定を確認してください。" : "The draft could not be saved. Check browser storage settings."}
      </span>
      <button type="button" onClick={onDiscard}>
        <Trash2 size={15} aria-hidden="true" />
        {ja ? "下書きを破棄" : "Discard draft"}
      </button>
    </div>
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
