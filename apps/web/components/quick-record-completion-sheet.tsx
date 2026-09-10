"use client";

import { OccurrenceDateFields } from "@/components/occurrence-date-fields";
import { ServiceAttributionField } from "@/components/service-attribution-field";
import { captureIntentForJournal, captureIntentLabel } from "@/lib/quick-record";
import {
  displayVehicleModel,
  journalOccurrenceLabel,
  journalSupportsServiceAttribution,
  journalToDraft,
  normalizeServiceAttribution,
  type GarageJournalPost,
  type JournalDraft,
  type JournalEventType,
  type MaintenanceServiceAttributionV1,
  type Locale,
  type Vehicle,
} from "@mechori/core";
import { CarFront, CheckCircle2, ListPlus, LoaderCircle, X } from "lucide-react";
import { useState, type FormEvent } from "react";

const eventTypes: Array<{ value: JournalEventType; ja: string; en: string }> = [
  { value: "issue", ja: "不具合・気になること", en: "Issue / something noticed" },
  { value: "other", ja: "その他", en: "Other" },
  { value: "inspection", ja: "点検・整備", en: "Inspection" },
  { value: "repair", ja: "修理", en: "Repair" },
  { value: "part", ja: "部品交換", en: "Part" },
  { value: "drive", ja: "ドライブ", en: "Drive" },
  { value: "memory", ja: "思い出", en: "Memory" },
];

const serviceDetailTypes = eventTypes.filter((item) =>
  ["inspection", "repair", "part"].includes(item.value),
);

type OccurrenceDraft = Pick<
  JournalDraft,
  "occurredOn" | "occurredYear" | "occurredMonth" | "occurredPrecision" | "occurredPeriodNote"
>;

export function QuickRecordCompletionSheet({
  journal,
  vehicle,
  locale,
  onClose,
  onViewGarage,
  onSaveEnrichment,
}: {
  journal: GarageJournalPost;
  vehicle?: Vehicle;
  locale: Locale;
  onClose(): void;
  onViewGarage(): void;
  onSaveEnrichment(draft: JournalDraft): Promise<GarageJournalPost>;
}) {
  const ja = locale === "ja";
  const vehicleLabel = vehicle ? `${vehicle.make} ${displayVehicleModel(vehicle, locale)}` : journal.vehicleLabel;
  const photoCount = journal.media.filter((item) => item.kind === "image").length;
  const stored = journalToDraft(journal);
  const captureIntent = captureIntentForJournal(journal.captureIntent, journal.eventType);
  const [mode, setMode] = useState<"prompt" | "form" | "saved">("prompt");
  const [eventType, setEventType] = useState<JournalEventType | undefined>(journal.eventType);
  const [occurrence, setOccurrence] = useState<OccurrenceDraft>({
    occurredOn: stored.occurredOn,
    occurredYear: stored.occurredYear,
    occurredMonth: stored.occurredMonth,
    occurredPrecision: stored.occurredPrecision,
    occurredPeriodNote: stored.occurredPeriodNote,
  });
  const [serviceAttribution, setServiceAttribution] = useState<MaintenanceServiceAttributionV1>(
    () => normalizeServiceAttribution(journal.serviceAttribution),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedJournal, setSavedJournal] = useState(journal);
  const isIssue = savedJournal.eventType === "issue" && savedJournal.issueStatus === "open";

  async function saveEnrichment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const draft: JournalDraft = {
      ...journalToDraft(journal),
      captureIntent,
      eventType,
      issueStatus: eventType === "issue" ? "open" : undefined,
      ...occurrence,
    };
    if (journalSupportsServiceAttribution(eventType)) {
      draft.serviceAttribution = serviceAttribution;
    } else {
      delete draft.serviceAttribution;
    }

    setSaving(true);
    setError("");
    try {
      const updated = await onSaveEnrichment(draft);
      setSavedJournal(updated);
      setMode("saved");
    } catch {
      setError(
        ja
          ? "記録の詳細を保存できませんでした。元の記録は残っています。"
          : "Record details could not be saved. Your original record is still saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="quick-record-sheet-backdrop" role="presentation">
      <section className="quick-record-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-record-sheet-title">
        {mode === "prompt" && <>
          <CheckCircle2 className="quick-record-sheet-icon" size={30} aria-hidden="true" />
          <h1 id="quick-record-sheet-title">{ja ? `${vehicleLabel}に記録を残しました` : `Record saved to ${vehicleLabel}`}</h1>
          <p>{ja ? "このクルマの履歴に加わりました。" : "It is now part of this vehicle's history."}</p>
          <section className="quick-record-evidence-preview" aria-label={ja ? "保存した記録" : "Saved record"}>
            <p><CarFront size={17} aria-hidden="true" />{vehicleLabel}</p>
            <blockquote>{savedJournal.bodyOriginal}</blockquote>
            <dl>
              <div><dt>{ja ? "記録日" : "Date"}</dt><dd>{journalOccurrenceLabel(savedJournal, locale)}</dd></div>
              {isIssue && <div><dt>{ja ? "状態" : "Status"}</dt><dd>{ja ? "未解決" : "Unresolved"}</dd></div>}
              {photoCount > 0 && <div><dt>{ja ? "写真" : "Photos"}</dt><dd>{ja ? `${photoCount}枚` : `${photoCount}`}</dd></div>}
            </dl>
          </section>
          <div className="quick-record-sheet-actions">
            <button type="button" className="primary-action" onClick={onViewGarage}><CarFront size={17} aria-hidden="true" />{ja ? "ガレージで見る" : "View in Garage"}</button>
            <button type="button" className="secondary-action" onClick={onClose}>{ja ? "記録を見る" : "View record"}</button>
          </div>
          <button type="button" className="text-action quick-record-enrich-action" onClick={() => setMode("form")}>
            <ListPlus size={16} aria-hidden="true" />{ja ? "種類や時期を追加" : "Add type or timing"}
          </button>
        </>}

        {mode === "form" && <>
          <div className="quick-record-sheet-heading">
            <div>
              <h1 id="quick-record-sheet-title">{ja ? "記録の詳細" : "Record details"}</h1>
              <p>{ja ? "分かる項目だけ追加できます。" : "Add only the details you know."}</p>
            </div>
            <button type="button" className="icon-action" onClick={onClose} aria-label={ja ? "閉じる" : "Close"}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <form className="quick-record-enrichment-form" onSubmit={saveEnrichment}>
            <div className="quick-record-known-detail">
              <span>{ja ? "残した内容" : "Capture intent"}</span>
              <strong>{captureIntentLabel(captureIntent, locale)}</strong>
              {captureIntent === "issue" && <small>{ja ? "未解決として保存済み" : "Saved as unresolved"}</small>}
            </div>
            {(captureIntent === "service" || captureIntent === "other") && (
              <fieldset className="event-type-picker">
                <legend>{ja ? "細かい種類（任意）" : "More specific type (optional)"}</legend>
                {(captureIntent === "service" ? serviceDetailTypes : eventTypes).map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={eventType === item.value ? "is-selected" : ""}
                    aria-pressed={eventType === item.value}
                    onClick={() => setEventType(item.value)}
                  >
                    {ja ? item.ja : item.en}
                  </button>
                ))}
              </fieldset>
            )}
            <OccurrenceDateFields
              value={occurrence}
              locale={locale}
              onChange={(patch) => setOccurrence((current) => ({ ...current, ...patch }))}
            />
            {journalSupportsServiceAttribution(eventType) && (
              <ServiceAttributionField
                value={serviceAttribution}
                onChange={setServiceAttribution}
                locale={locale}
                compact
              />
            )}
            {error && <p className="form-error-summary" role="alert">{error}</p>}
            <div className="quick-record-sheet-actions">
              <button type="submit" className="primary-action" disabled={saving}>
                {saving && <LoaderCircle className="spin" size={17} aria-hidden="true" />}
                {ja ? "詳細を保存" : "Save details"}
              </button>
              <button type="button" className="secondary-action" onClick={onClose}>{ja ? "閉じる" : "Close"}</button>
            </div>
          </form>
        </>}

        {mode === "saved" && <>
          <CheckCircle2 className="quick-record-sheet-icon" size={30} aria-hidden="true" />
          <h1 id="quick-record-sheet-title">{ja ? "記録の詳細を保存しました" : "Record details saved"}</h1>
          <p>
            {isIssue
              ? ja ? "気になることとして、未解決のまま車両履歴に残っています。" : "It remains in the vehicle history as an unresolved issue."
              : ja ? "元の記録にも反映されています。" : "The original record has been updated."}
          </p>
          <section className="quick-record-evidence-preview" aria-label={ja ? "保存した記録" : "Saved record"}>
            <p><CarFront size={17} aria-hidden="true" />{vehicleLabel}</p>
            <blockquote>{savedJournal.bodyOriginal}</blockquote>
            <dl><div><dt>{ja ? "記録日" : "Date"}</dt><dd>{journalOccurrenceLabel(savedJournal, locale)}</dd></div></dl>
          </section>
          <div className="quick-record-sheet-actions">
            <button type="button" className="primary-action" onClick={onViewGarage}><CarFront size={17} aria-hidden="true" />{ja ? "ガレージで見る" : "View in Garage"}</button>
            <button type="button" className="secondary-action" onClick={onClose}>{ja ? "記録を見る" : "View record"}</button>
          </div>
        </>}
      </section>
    </div>
  );
}
