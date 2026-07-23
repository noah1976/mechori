"use client";

import {
  createEmptyActionDraft,
  getPreferredVehicle,
  maintenanceRecordDateKey,
  validateRecordDraft,
  type MaintenanceOccurrencePrecision,
  type MaintenanceRecord,
  type PrototypeOdometerEpisodeReason,
  type RecordActionDraft,
  type RecordDraft,
  type SupportedUiLocale,
  type Vehicle,
} from "@mechori/core";
import { translate, type TranslationKey } from "@mechori/i18n";
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
import { OccurrenceDateFields } from "@/components/occurrence-date-fields";

const meterChangeReasons: PrototypeOdometerEpisodeReason[] = [
  "replacement",
  "repair",
  "reset",
  "unit_change",
  "unknown",
];

function draftFromRecord(record: MaintenanceRecord | undefined, vehicle: Vehicle): RecordDraft {
  const primaryAction = record?.actions[0];
  const recordedReading = record?.odometerReading;
  const recordedEpisode = recordedReading
    ? vehicle.odometerEpisodes.find((episode) => episode.id === recordedReading.episodeId)
    : undefined;
  const recordedMeterChange =
    recordedEpisode &&
    recordedEpisode.reason !== "initial" &&
    record &&
    recordedEpisode.startedAt === maintenanceRecordDateKey(record);
  return {
    serviceDate: record?.serviceDate ?? new Date().toISOString().slice(0, 10),
    serviceDatePrecision: record?.serviceDatePrecision ?? "day",
    servicePeriodNote: record?.servicePeriodNote ?? "",
    odometerKm: record
      ? recordedReading?.displayedValue.toString() ?? ""
      : vehicle.ownershipType === "previously_owned" || vehicle.currentOdometerReading.displayedValue === 0
        ? ""
        : vehicle.currentOdometerReading.displayedValue.toString(),
    odometerUnit: recordedReading?.unit ?? vehicle.currentOdometerReading.unit,
    odometerEpisodeId: recordedReading?.episodeId ?? vehicle.currentOdometerReading.episodeId,
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
    evidenceBasis:
      record?.evidenceBasis ??
      (vehicle.ownershipType === "previously_owned" ? "recalled_later" : "contemporaneous"),
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
  const vehicle = data.vehicles.find((item) => item.id === (record?.vehicleId ?? vehicleId)) ?? getPreferredVehicle(data.vehicles);
  if (!vehicle) {
    return (
      <div className="empty-state">
        <h2>{translate(locale, "noVehicleForRecord")}</h2>
        <p>{translate(locale, "addVehicleForRecordsIntro")}</p>
        <Link href="/garage/new" className="primary-action">{translate(locale, "addVehicle")}</Link>
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
      ? translate(locale, "checkField")
      : undefined;
  const recordsExistingMeterChange = Boolean(
    record && draft.odometerChangeReason !== "same_episode",
  );
  const hasMeterChange = draft.odometerChangeReason !== "same_episode";

  return (
    <form ref={formRef} className="record-form" onSubmit={onSubmit} noValidate aria-busy={saving}>
      <LocalDraftStatus status={draftStatus} locale={locale} onDiscard={discardDraft} />
      <section className="form-section">
        <div className="section-heading compact">
          <div><span className="eyebrow">01</span><h2>{translate(locale, "basics")}</h2></div>
          <span className="required-note">{translate(locale, "required")}</span>
        </div>
        <OccurrenceDateFields
          value={recordOccurrenceValue(draft)}
          locale={locale}
          legend={translate(locale, "serviceOccurrence")}
          error={errorText("serviceDate")}
          onChange={(patch) => setDraft((current) => applyOccurrencePatch(current, patch))}
        />
        <div className="form-grid two-columns">
          <Field label={translate(locale, hasMeterChange ? "odometerAfterChangeRequired" : "odometerOptional")} error={errorText("odometerKm")}>
            <input type="number" min="0" inputMode="numeric" value={draft.odometerKm} onChange={(event) => setField("odometerKm", event.target.value)} />
          </Field>
          <Field label={translate(locale, "displayUnit")}>
            <select value={draft.odometerUnit} onChange={(event) => setField("odometerUnit", event.target.value as RecordDraft["odometerUnit"])}>
              <option value="km">km</option>
              <option value="mi">mi</option>
              <option value="unknown">{translate(locale, "unknown")}</option>
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
            <span>{translate(locale, "meterChanged")}</span>
          </label>
          {recordsExistingMeterChange && <small>{translate(locale, "savedMeterChange")}</small>}
          {hasMeterChange && <div className="meter-change-fields">
            <Field label={translate(locale, "whatChanged")}>
              <select
                value={draft.odometerChangeReason}
                disabled={recordsExistingMeterChange}
                onChange={(event) => setField("odometerChangeReason", event.target.value as PrototypeOdometerEpisodeReason)}
              >
                {meterChangeReasons.map((reason) => <option key={reason} value={reason}>{episodeReasonLabel(reason, locale)}</option>)}
              </select>
            </Field>
            <p>{translate(locale, "lowerOdometerNotice")}</p>
          </div>}
        </div>
        <Field label={translate(locale, "recordTitleRequired")} error={errorText("summary")}>
          <input value={draft.summary} onChange={(event) => setField("summary", event.target.value)} placeholder={translate(locale, "recordTitleExample")} />
        </Field>
        <Field label={translate(locale, "evidenceBasis")}>
          <select
            value={draft.evidenceBasis}
            onChange={(event) => setField("evidenceBasis", event.target.value as RecordDraft["evidenceBasis"])}
          >
            <option value="contemporaneous">{translate(locale, "evidenceContemporaneous")}</option>
            <option value="invoice_or_receipt">{translate(locale, "evidenceInvoice")}</option>
            <option value="photo_or_service_book">{translate(locale, "evidencePhotoBook")}</option>
            <option value="recalled_later">{translate(locale, "evidenceRecalled")}</option>
            <option value="unknown">{translate(locale, "evidenceUnknown")}</option>
          </select>
        </Field>
      </section>

      <section className="form-section">
        <div className="section-heading compact"><div><span className="eyebrow">02</span><h2>{translate(locale, "serviceReasonHeading")}</h2></div></div>
        <Field label={translate(locale, "serviceReasonRequired")} error={errorText("symptoms")}>
          <textarea rows={3} value={draft.symptoms} onChange={(event) => setField("symptoms", event.target.value)} />
        </Field>
      </section>

      <section className="form-section">
        <div className="section-heading compact"><div><span className="eyebrow">03</span><h2>{translate(locale, "actionNumber", { number: 1 })}</h2></div></div>
        <ActionFields
          locale={locale}
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
          <Field label={translate(locale, "costWholeVisit")}><input type="number" min="0" value={draft.cost} onChange={(event) => setField("cost", event.target.value)} /></Field>
        </div>
      </section>

      {draft.additionalActions.map((action, index) => (
        <section className="form-section action-section" key={action.clientId}>
          <div className="section-heading compact">
            <div><span className="eyebrow">{String(index + 4).padStart(2, "0")}</span><h2>{translate(locale, "actionNumber", { number: index + 2 })}</h2></div>
            <button
              type="button"
              className="icon-action danger-icon"
              aria-label={translate(locale, "removeActionAria", { number: index + 2 })}
              title={translate(locale, "removeAction")}
              onClick={() => setField("additionalActions", draft.additionalActions.filter((_, actionIndex) => actionIndex !== index))}
            ><Trash2 size={18} /></button>
          </div>
          <ActionFields
            locale={locale}
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
      ><Plus size={18} />{translate(locale, "addAnotherAction")}</button>
      {errorText("additionalActions") && <p className="form-error-summary" role="alert">{translate(locale, "additionalActionError")}</p>}

      <section className="sharing-panel">
        <LockKeyhole size={21} aria-hidden="true" />
        <div>
          <strong>{translate(locale, "privateByDefault")}</strong>
          <p>{translate(locale, "shareReviewNotice")}</p>
          <label className="checkbox-row">
            <input type="checkbox" checked={draft.requestSharing} onChange={(event) => setField("requestSharing", event.target.checked)} />
            <span>{translate(locale, "requestKnowledgeReview")}</span>
          </label>
        </div>
      </section>

      {[draft.hazardLevel, ...draft.additionalActions.map((action) => action.hazardLevel)].includes("CRITICAL") && (
        <div className="critical-warning" role="alert">
          <AlertTriangle size={22} />
          <div><strong>{translate(locale, "safetyCriticalPossible")}</strong><p>{translate(locale, "safetyCriticalNotice")}</p></div>
        </div>
      )}

      {!validation.valid && submitted && <p className="form-error-summary" role="alert">{translate(locale, "validationReview")}</p>}
      {saveError && <p className="form-error-summary" role="alert">
        {isRemoteAlpha
          ? translate(locale, "remoteRecordSaveError")
          : translate(locale, "localRecordSaveError")}
      </p>}

      <div className="form-actions">
        <button type="button" className="secondary-action" onClick={() => router.back()}>{translate(locale, "back")}</button>
        <button type="submit" className="primary-action" disabled={saving}><Save size={18} />{translate(locale, saving ? "saving" : record ? "saveChanges" : "savePrivately")}{draft.requestSharing && <Check size={16} />}</button>
      </div>
    </form>
  );
}

type RecordOccurrencePatch = {
  occurredOn?: string;
  occurredYear?: number;
  occurredMonth?: number;
  occurredPrecision?: MaintenanceOccurrencePrecision;
  occurredPeriodNote?: string;
};

function recordOccurrenceValue(draft: RecordDraft): RecordOccurrencePatch {
  const [year, month] = draft.serviceDate.split("-").map(Number);
  return {
    occurredOn: draft.serviceDatePrecision === "day" ? draft.serviceDate : undefined,
    occurredYear:
      draft.serviceDatePrecision === "month" || draft.serviceDatePrecision === "year"
        ? year
        : undefined,
    occurredMonth: draft.serviceDatePrecision === "month" ? month : undefined,
    occurredPrecision: draft.serviceDatePrecision,
    occurredPeriodNote: draft.servicePeriodNote,
  };
}

function applyOccurrencePatch(
  draft: RecordDraft,
  patch: RecordOccurrencePatch,
): RecordDraft {
  const precision = patch.occurredPrecision ?? draft.serviceDatePrecision;
  const current = recordOccurrenceValue(draft);
  const year = patch.occurredYear ?? current.occurredYear;
  const month = patch.occurredMonth ?? current.occurredMonth;
  let serviceDate = draft.serviceDate;

  if (precision === "day") {
    serviceDate = patch.occurredOn ?? (draft.serviceDatePrecision === "day" ? draft.serviceDate : "");
  } else if (precision === "month") {
    serviceDate = year && month ? `${year}-${String(month).padStart(2, "0")}` : "";
  } else if (precision === "year") {
    serviceDate = year ? String(year) : "";
  } else {
    serviceDate = "";
  }

  return {
    ...draft,
    serviceDate,
    serviceDatePrecision: precision,
    servicePeriodNote: patch.occurredPeriodNote ?? draft.servicePeriodNote,
  };
}

function LocalDraftStatus({
  status,
  locale,
  onDiscard,
}: {
  status: "idle" | "restored" | "saved" | "error";
  locale: SupportedUiLocale;
  onDiscard(): void;
}) {
  if (status === "idle") return null;
  return (
    <div className={`local-draft-status is-${status}`} role={status === "error" ? "alert" : "status"}>
      <span>
        {status === "restored"
          ? translate(locale, "draftRestored")
          : status === "saved"
            ? translate(locale, "draftSaved")
            : translate(locale, "draftError")}
      </span>
      <button type="button" onClick={onDiscard}>
        <Trash2 size={15} aria-hidden="true" />
        {translate(locale, "discardDraft")}
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
  locale,
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
  locale: SupportedUiLocale;
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
    {showSummary && <Field label={translate(locale, "actionTitleRequired")}><input value={summary} onChange={(event) => setField("summary", event.target.value)} /></Field>}
    <div className="form-grid two-columns">
      <Field label={translate(locale, "possibleCauses")}><textarea rows={3} value={causeCandidates} onChange={(event) => setField("causeCandidates", event.target.value)} /></Field>
      <Field label={translate(locale, "checksPerformed")}><textarea rows={3} value={checksPerformed} onChange={(event) => setField("checksPerformed", event.target.value)} /></Field>
    </div>
    <Field label={translate(locale, "workPerformed")}><textarea rows={3} value={workPerformed} onChange={(event) => setField("workPerformed", event.target.value)} /></Field>
    <div className="form-grid three-columns">
      <Field label={translate(locale, "partName")}><input value={partName} onChange={(event) => setField("partName", event.target.value)} /></Field>
      <Field label={translate(locale, "manufacturer")}><input value={partManufacturer} onChange={(event) => setField("partManufacturer", event.target.value)} /></Field>
      <Field label={translate(locale, "partNumberVerify")} error={partNumberError}><input value={partNumber} onChange={(event) => setField("partNumber", event.target.value)} /></Field>
    </div>
    <div className="form-grid two-columns">
      <Field label={translate(locale, "result")}>
        <select value={resolutionStatus} onChange={(event) => setField("resolutionStatus", event.target.value)}>
          <option value="unresolved">{translate(locale, "unresolved")}</option>
          <option value="resolved">{translate(locale, "resolved")}</option>
        </select>
      </Field>
      <Field label={translate(locale, "hazardLevel")}>
        <select value={hazardLevel} onChange={(event) => setField("hazardLevel", event.target.value)}>
          <option value="LOW">LOW</option><option value="CAUTION">CAUTION</option><option value="CRITICAL">CRITICAL</option>
        </select>
      </Field>
    </div>
  </>;
}

function episodeReasonLabel(reason: PrototypeOdometerEpisodeReason, locale: SupportedUiLocale) {
  const labels: Record<PrototypeOdometerEpisodeReason, TranslationKey> = {
    initial: "episodeInitial",
    replacement: "episodeReplacement",
    repair: "episodeRepair",
    reset: "episodeReset",
    rollover: "episodeRollover",
    unit_change: "episodeUnitChange",
    unknown: "episodeUnknown",
  };
  return translate(locale, labels[reason]);
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
